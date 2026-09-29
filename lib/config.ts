/**
 * Configurare centrala.
 * Modifica aici timpii si numarul de greseli permise.
 * Intrebarile sunt in fisierele din folderul `intrebari/`.
 */

/** Linkul spre ghidul oficial al Departamentului Medical. */
export const GHID_URL = "https://ghidul-departamentului-medical-eight.vercel.app/";

/** Secțiunea din ghid de unde se poate învăța pentru fiecare test. */
export const GHID_SECTIUNI: Record<string, { section: string; label: string }> = {
  smuls: { section: "rp-smuls", label: "Rp S.M.U.L.S. / Cert. S.M.U.L.S." },
  rezidentiat: { section: "rezidentiat", label: "Rezidentiat" },
  bls: { section: "rp-teren", label: "Rp teren / Cert. BLS" },
  radio: { section: "coduri-radio", label: "Coduri Radio" },
};

/** Link direct spre secțiunea de învățare a unui test. */
export function linkGhid(testId: string): string {
  const s = GHID_SECTIUNI[testId];
  return s ? `${GHID_URL}#${s.section}` : GHID_URL;
}

export const TESTS = [
  {
    id: "smuls",
    nume: "S.M.U.L.S Teoretic",
    descriere: "Testul teoretic pentru S.M.U.L.S",
    timpSecunde: 180,
    greseliPermise: 2,
    cdZile: 5,
  },
  {
    id: "rezidentiat",
    nume: "Rezidentiat",
    descriere: "Testul teoretic pentru Rezidentiat",
    timpSecunde: 360,
    greseliPermise: 2,
    cdZile: 5,
  },
  {
    id: "bls",
    nume: "B.L.S",
    descriere: "Testul teoretic pentru Basic Life Support",
    timpSecunde: 180,
    greseliPermise: 2,
    cdZile: 3,
  },
  {
    id: "radio",
    nume: "Radio",
    descriere: "Testul teoretic pentru Radio / TET",
    timpSecunde: 150,
    greseliPermise: 2,
    cdZile: 3,
  },
] as const;

export type TestId = (typeof TESTS)[number]["id"];

export function getTest(id: string) {
  return TESTS.find((t) => t.id === id);
}

export const COD_INTERVAL_SECUNDE = 60; // cat des se poate solicita un cod nou
export const PRAG_ROSU_S = 30; // timpul devine rosu sub 30s ramase
export const SESIUNE_ZILE = 7; // durata cookie-ului de autentificare

/** Cat timp mai trebuie sa treaca pana cand utilizatorul poate relua testul. */
export function cooldownRamase(cdZile: number, ultimaData: number | null | undefined): number {
  if (!ultimaData) return 0;
  const trece = cdZile * 24 * 3600 * 1000;
  const ramase = ultimaData + trece - Date.now();
  return ramase > 0 ? ramase : 0;
}
