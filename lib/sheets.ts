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
/**
 * Aliasurile acceptate pentru fiecare test. Ordinea din lista conteaza doar pentru
 * lizibilitate — fiecare alias este un cuvant intreg, deci nu se suprapun intre ele.
 */
const ALIASURI: { re: RegExp; test: TestIdCooldown }[] = [
  { re: /s\.?\s?m\.?\s?u\.?\s?l\.?\s?s\b|smuls/i, test: "smuls" },
  { re: /rezidentiat|rezi\b/i, test: "rezidentiat" },
  { re: /b\.?\s?l\.?\s?s\b|bls/i, test: "bls" },
  { re: /radio|tet/i, test: "radio" },
];

/** Numește testul din text, indiferent de majuscule/minuscule, sau null. */
function testDinText(segment: string): TestIdCooldown | null {
  for (const { re, test } of ALIASURI) {
    if (re.test(segment)) return test;
  }
  return null;
}

type Token =
  | { tip: "test"; test: TestIdCooldown }
  | { tip: "data"; text: string }
  | { tip: "sanctiune" };

const DATA_SINGURA = /(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{2,4}))?/;

/** Cuvintele care marcheaza o suspendare / confiscare de certificat. */
const RE_SANCTIUNE = /suspendat(?:[aoă])?|susp\.?|confiscat(?:[aoă])?|confisc\.|retinut(?:[aoă])?/i;

/**
 * Imparte celula in tokeni, in ordinea in care apar: sanctiuni, numele testelor
 * si datele. Separatorii („/”, „-”, spatii, paranteze) sunt ignorati, deci toate
 * formatele de mai jos dau acelasi rezultat:
 *   „radio/bls 20.10”   „bls 20.10 / radio 21.10”   „smuls 19.10 / rezi 18.10”
 *   „SMULS T 19.10”      „Rezi (18.10)”              „SUSPENDAT radio 20.10”
 */
function tokenizeaza(text: string): Token[] {
  const tokenuri: Token[] = [];
  // Testul apare inaintea datei sale: „test data”. Aliasurile lungi au prioritate
  // la aceeasi pozitie (ex. „rezidentiat” inainte de „rezi”), iar sufixele de
  // tip CD („SMULS T”, „SMULS P”) sunt ignorate deoarece ne intereseaza doar
  // numele testului si data de dupa el.
  const reTestCurent = new RegExp(
    `^(?:${ALIASURI.map((a) => a.re.source).join("|")})$`,
    "i"
  );
  const alias = (t: string): TestIdCooldown | null => {
    for (const { re, test } of ALIASURI) {
      if (re.test(t)) return test;
    }
    return null;
  };
  const cursor =
    /(?<sanctiune>suspendat(?:[aoă])?|susp\.?|confiscat(?:[aoă])?|confisc\.|retinut(?:[aoă])?)|(?<test>\bs\.?\s?m\.?\s?u\.?\s?l\.?\s?s\b|\bsmuls\b|\brezidentiat\b|\brezi\b|\bb\.?\s?l\.?\s?s\b|\bbls\b|\bradio\b|\btet\b)|(?<data>\d{1,2}\s*[./-]\s*\d{1,2}(?:\s*[./-]\s*\d{2,4})?)/gi;

  for (const m of text.matchAll(cursor)) {
    if (m.groups?.sanctiune) {
      tokenuri.push({ tip: "sanctiune" });
    } else if (m.groups?.test) {
      const t = m.groups.test;
      if (reTestCurent.test(t)) {
        const identificat = alias(t);
        if (identificat) tokenuri.push({ tip: "test", test: identificat });
      }
    } else if (m.groups?.data) {
      tokenuri.push({ tip: "data", text: m.groups.data });
    }
  }
  return tokenuri;
}

/**
 * Formatarea datelor de cooldown se face in fusul orar al departamentului (Romania),
 * nu in fusul serverului. Pe Vercel serverul ruleaza in UTC, iar un timestamp construit
 * la 23:59:59 local s-ar afișa in Romania cu o zi mai tarziu (ex. 29.09 -> 30.09).
 */
const TZ_DEPARTAMENT = "Europe/Bucharest";

/** Formateaza un timestamp ca data calendaristica „29.09.2026”, in fusul departamentului. */
export function formatDataRo(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ro-RO", {
    timeZone: TZ_DEPARTAMENT,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Extrage data de EXPIRARE a cooldownului din segment: „30.09”, „30.09.2026”, „30/09”.
 * Data din coloana S este deja data la care CD-ul expiră, deci nu mai adăugăm zile.
 *
 * Intoarcem 23:59:59.999 in fusul departamentului, exprimat in UTC, ca serverul
 * (UTC) si browserul (Romania) sa arate aceeasi zi.
 */
/** Construiește timestampul pentru 23:59:59.999 al zilei (zi/luna/an) din fusul departamentului. */
function sfarsitDeZiInDepartament(zi: number, luna: number, an: number): number {
  // Calendarul are 28/29/30/31 de zile; daca ziua nu exista in luna aia, o clampam.
  const zileInLuna = new Date(Date.UTC(an, luna, 0)).getUTCDate();
  const ziClampata = Math.min(Math.max(zi, 1), zileInLuna);
  // 23:59:59.999 local in Romania = 20:59:59.999 UTC in timpul de vara (UTC+3).
  const oraLocala = Date.UTC(an, luna - 1, ziClampata, 20, 59, 59, 999);
  return oraLocala;
}

function dataDinText(segment: string): number | null {
  const m = segment.match(DATA_SINGURA);
  if (!m) return null;
  const zi = Number(m[1]);
  const luna = Number(m[2]);
  if (luna < 1 || luna > 12 || zi < 1 || zi > 31) return null;
  const acum = new Date();
  let an = m[3] ? Number(m[3]) : acum.getFullYear();
  if (m[3] && an < 100) an += 2000;
  if (!m[3]) {
    // Fără an: dacă data ar fi trecută de mai mult de 30 de zile, e anul următor.
    const candidat = sfarsitDeZiInDepartament(zi, luna, an);
    if (candidat < acum.getTime() - 30 * 86400000) an += 1;
  }
  const d = sfarsitDeZiInDepartament(zi, luna, an);
  return isNaN(d) ? null : d;
}

/**
 * Parsează coloana S și întoarce data la care expiră cooldownul per test.
 * Colonna e text liber și ordinea nu conteaza, ex:
 *   „Rezi - ( 29.09 ) / MOTO - ( 29.09 ) / PILOT 01.10”
 *   „SMULS P 30.09 / REZIDENTIAT 02.10”
 *   „radio/bls 20.10”          — o singură dată pentru ambele teste
 *   „bls 20.10 / radio 21.10” — fiecare test cu data lui
 *   „SUSPENDAT radio 20.10”   — sanctiune: CD pana la data, doar pentru radio
 * Data scrisă este data de EXPIRARE a CD-ului.
 * Un test fără data este ignorat; certificările nerecunoscute sunt ignorate.
 */
export function parseCooldownS(continut: string | null | undefined): Partial<Record<TestIdCooldown, number>> {
  const rezultat: Partial<Record<TestIdCooldown, number>> = {};
  if (!continut) return rezultat;
  const text = String(continut);

  const tokenuri = tokenizeaza(text);
  if (!tokenuri.some((tk) => tk.tip === "test")) return rezultat;

  // O data se aplica doar testelor care o preceda si care nu au primit deja alta.
  // Astfel functioneaza ambele formate:
  //   „radio/bls 20.10”          — o singura data pentru ambele teste
  //   „bls 20.10 / radio 21.10” — fiecare test cu data lui
  //
  // Un test scris fara data (ex. „radio” singur) este IGNORAT: nu avem de unde sa
  // stim pana cand expireaza CD-ul, deci nu presupunem nimic.
  const neasociate = new Set<TestIdCooldown>();

  for (const tk of tokenuri) {
    if (tk.tip === "test") {
      neasociate.add(tk.test);
      continue;
    }
    if (tk.tip === "sanctiune") {
      // „SUSPENDAT” / „CONFISCAT” nu schimba atribuirea: testul care urmeaza ramane
      // in asteptarea unei date, exact ca orice alt test. Fara data, nu se blocheaza
      // nimic pe site (CD-ul exista doar informativ, vezi app/page.tsx).
      continue;
    }
    const data = dataDinText(tk.text);
    if (data === null) continue;
    for (const t of neasociate) rezultat[t] = Math.max(rezultat[t] ?? 0, data);
    neasociate.clear();
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
