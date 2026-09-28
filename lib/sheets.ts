export type MembruMedical = {
  callsign: string;
  nume: string;
  grad: string;
  eticheta: string; // [M-CALLSIGN] Nume, Grad
  numarGrad: number; // ex: 601 -> 600, 402 -> 400 etc.
  esteConducere: boolean;
  poateSMULS: boolean;
  poateRezidentiat: boolean;
  poateBLS: boolean;
  poateRadio: boolean;
  /** Cooldown din coloana S a Google Sheets: data la care expiră per test. */
  cooldowns: Partial<Record<TestIdCooldown, number>>;
};

/** Testele pentru care exista cooldown pe coloana S. */
export type TestIdCooldown = "smuls" | "rezidentiat" | "bls" | "radio";

/** Zilele de cooldown per test (S.M.U.L.S/Rezidentiat: 5, B.L.S/Radio: 3). */
export const ZILE_CD: Record<TestIdCooldown, number> = {
  smuls: 5,
  rezidentiat: 5,
  bls: 3,
  radio: 3,
};
function testDinText(segment: string): TestIdCooldown | null {
  const t = segment.toLowerCase();
  // Ordinea conteaza: "smuls" inainte de "s" generice, "bls" inainte de "ls".
  if (/\bsmuls\b|smuls|s\.?m\.?u\.?l\.?s/.test(t)) return "smuls";
  if (/\brezi\b|rezidentiat/.test(t)) return "rezidentiat";
  if (/\bbls\b/.test(t)) return "bls";
  if (/\bradio\b|tet/.test(t)) return "radio";
  return null;
}

/**
 * Extrage data de EXPIRARE a cooldownului din segment: „30.09”, „30.09.2026”, „30/09”.
 * Data din coloana S este deja data la care CD-ul expiră, deci nu mai adăugăm zile.
 */
function dataDinText(segment: string): number | null {
  const m = segment.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{2,4}))?/);
  if (!m) return null;
  const zi = Number(m[1]);
  const luna = Number(m[2]);
  if (luna < 1 || luna > 12) return null;
  const acum = new Date();
  let an = m[3] ? Number(m[3]) : acum.getFullYear();
  if (m[3] && an < 100) an += 2000;
  if (!m[3]) {
    // Fără an: dacă data ar fi trecută de mai mult de 30 de zile, e anul următor.
    const candidat = new Date(an, luna - 1, zi);
    candidat.setHours(23, 59, 59, 999);
    if (candidat.getTime() < acum.getTime() - 30 * 86400000) an += 1;
  }
  const d = new Date(an, luna - 1, zi);
  d.setHours(23, 59, 59, 999);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Parsează coloana S și întoarce data la care expiră cooldownul per test.
 * Colonna e text liber, ex: „ Rezi - ( 29.09 )  /  MOTO - ( 29.09 ) /PILOT 01.10”
 * sau „SMULS P 30.09 /REZIDENTIAT 02.10”.
 * Data scrisă este data de EXPIRARE a CD-ului.
 * Segmente sunt separate prin „/”; certificările nerecunoscute sunt ignorate.
 */
export function parseCooldownS(continut: string | null | undefined): Partial<Record<TestIdCooldown, number>> {
  const rezultat: Partial<Record<TestIdCooldown, number>> = {};
  if (!continut) return rezultat;
  const text = String(continut);

  // 1) Testele recunoscute in intreaga celula (ordinea si impartirea cu "/" nu conteaza).
  const gasite: TestIdCooldown[] = [];
  for (const segment of text.split("/")) {
    const t = testDinText(segment);
    if (t && !gasite.includes(t)) gasite.push(t);
  }
  if (gasite.length === 0) return rezultat;

  // 2) Toate datele din celula.
  const dateStr = text.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{2,4}))?/g) ?? [];

  for (const t of gasite) {
    // 3) Formatul nu conteaza: "test/test data", "test /test / test data",
    //    "test data / test data" etc. Ultima data din celula se aplica
    //    tuturor testelor recunoscute (CD cel mai lung = cel mai restrictiv).
    const candidat = dateStr[dateStr.length - 1];
    const data = dataDinText(candidat);
    if (data === null) continue;
    rezultat[t] = Math.max(rezultat[t] ?? 0, data);
  }
  return rezultat;
}

const SHEET_ID = "1uaXnzKcNeOOXrQB2TU2aGrq9ZTie4AeFlAUX_FhH06M";
const SHEET_GID = "288034789";

// Cache in memorie temporar pentru a nu interoga Google la fiecare click
let cacheMembri: { timestamp: number; data: Map<string, MembruMedical> } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minut cache

export async function preiaMembriDinSheet(): Promise<Map<string, MembruMedical>> {
  if (cacheMembri && Date.now() - cacheMembri.timestamp < CACHE_TTL_MS) {
    return cacheMembri.data;
  }

  const mapa = new Map<string, MembruMedical>();
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[Google Sheet] Esuat fetch: ${res.status}`);
      return cacheMembri?.data ?? mapa;
    }

    const text = await res.text();
    // Raspunsul gviz vine impachetat in: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
    if (!match || !match[1]) {
      console.error("[Google Sheet] Raspuns JSON neidentificat");
      return cacheMembri?.data ?? mapa;
    }

    const json = JSON.parse(match[1]);
    const rows = json?.table?.rows ?? [];

    for (const r of rows) {
      const c = r?.c;
      if (!c || !Array.isArray(c)) continue;

      // c[2] = NR. INSIGNA (Callsign) (Coloana C)
      // c[3] = NUME (Coloana D)
      // c[4] = RANK / Grad (Coloana E)
      // c[19] = Discord ID (Coloana T)
      const callsignRaw = c[2]?.v !== null && c[2]?.v !== undefined ? String(c[2]?.v).trim() : "";
      const numeRaw = c[3]?.v !== null && c[3]?.v !== undefined ? String(c[3]?.v).trim() : "";
      const gradRaw = c[4]?.v !== null && c[4]?.v !== undefined ? String(c[4]?.v).trim() : "";
      const cdRaw = c[18]?.v !== null && c[18]?.v !== undefined ? String(c[18]?.v).trim() : "";
      const discordIdRaw = c[19]?.v !== null && c[19]?.v !== undefined ? String(c[19]?.v).trim() : "";

      if (!discordIdRaw) continue;

      // Curatam discord ID de posibile spatii sau virgule
      const discordId = discordIdRaw.replace(/[^0-9]/g, "");
      if (!discordId) continue;

      const callsign = callsignRaw || "000";
      const nume = numeRaw || "Necunoscut";
      const grad = gradRaw || "Membru";

      // Extragem numarul de grad / callsign (ex: "601" -> 601, "001" -> 1)
      const callsignNum = parseInt(callsign.replace(/[^0-9]/g, ""), 10) || 999;

      // Reguli cerute de acces teste:
      // - Daca e 600 (ex: 600 - 699): doar BLS + Radio
      // - Daca e 400 (ex: 400 - 499): tot inafara de rezidentiat (adica SMULS, BLS, Radio)
      // - Daca e 300+ (sau grade superioare / directie ex: 300-399, 200, 100, 001-099): orice test
      let poateSMULS = true;
      let poateRezidentiat = true;
      let poateBLS = true;
      let poateRadio = true;

      if (callsignNum >= 600 && callsignNum < 700) {
        poateBLS = true;
        poateRadio = true;
        poateSMULS = false;
        poateRezidentiat = false;
      } else if (callsignNum >= 400 && callsignNum < 500) {
        poateBLS = true;
        poateRadio = true;
        poateSMULS = true;
        poateRezidentiat = false;
      } else if (callsignNum >= 500 && callsignNum < 600) {
        // Cazul 500 (asimilabil 600/400, permisiune standard fara rezidentiat)
        poateBLS = true;
        poateRadio = true;
        poateSMULS = true;
        poateRezidentiat = false;
      } else {
        // 300+, 200+, 100+, conducere: orice test
        poateBLS = true;
        poateRadio = true;
        poateSMULS = true;
        poateRezidentiat = true;
      }

      // Conducere: Medic Chirurg, Medic Inspector, Director Adjunct, Director General
      const gradUpper = grad.toUpperCase();
      const esteConducere =
        gradUpper.includes("CHIRURG") ||
        gradUpper.includes("INSPECTOR") ||
        gradUpper.includes("DIRECTOR") ||
        callsignNum < 100;

      const eticheta = `[M-${callsign}] ${nume}, ${grad}`;

      mapa.set(discordId, {
        callsign,
        nume,
        grad,
        eticheta,
        numarGrad: callsignNum,
        esteConducere,
        poateSMULS,
        poateRezidentiat,
        poateBLS,
        poateRadio,
        cooldowns: parseCooldownS(cdRaw),
      });
    }

    cacheMembri = { timestamp: Date.now(), data: mapa };
  } catch (err) {
    console.error("[Google Sheet] Eroare parsare tabel:", err);
  }

  return cacheMembri?.data ?? mapa;
}

export async function gasesteMembruDupaDiscordId(discordId: string): Promise<MembruMedical | null> {
  const cleanId = discordId.trim().replace(/[^0-9]/g, "");
  const mapa = await preiaMembriDinSheet();
  return mapa.get(cleanId) ?? null;
}

export function areAccesLaTest(membru: MembruMedical, testId: string): { permis: boolean; motiv?: string } {
  switch (testId) {
    case "smuls":
      if (!membru.poateSMULS) {
        return { permis: false, motiv: "Acces restricționat pentru gradul tău (necesar minim grad 400+)." };
      }
      return { permis: true };
    case "rezidentiat":
      if (!membru.poateRezidentiat) {
        return { permis: false, motiv: "Acces restricționat pentru gradul tău (necesar minim grad 300+)." };
      }
      return { permis: true };
    case "bls":
      if (!membru.poateBLS) {
        return { permis: false, motiv: "Nu ai permisiunea pentru acest test." };
      }
      return { permis: true };
    case "radio":
      if (!membru.poateRadio) {
        return { permis: false, motiv: "Nu ai permisiunea pentru acest test." };
      }
      return { permis: true };
    default:
      return { permis: true };
  }
}
