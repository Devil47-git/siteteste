export type MembruMedical = {
  callsign: string;
  nume: string;
  grad: string;
  eticheta: string; // [M-CALLSIGN] Nume, Grad
  numarGrad: number; // ex: 601 -> 600, 402 -> 400 etc.
  poateSMULS: boolean;
  poateRezidentiat: boolean;
  poateBLS: boolean;
  poateRadio: boolean;
};

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

      const eticheta = `[M-${callsign}] ${nume}, ${grad}`;

      mapa.set(discordId, {
        callsign,
        nume,
        grad,
        eticheta,
        numarGrad: callsignNum,
        poateSMULS,
        poateRezidentiat,
        poateBLS,
        poateRadio,
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
