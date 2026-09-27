/**
 * Configurare centrala.
 * Modifica aici timpii si numarul de greseli permise.
 * Intrebarile sunt in fisierele din folderul `intrebari/`.
 */

export const TESTS = [
  {
    id: "smuls",
    nume: "Test Teoretic - S.M.U.L.S",
    descriere: "Testul teoretic pentru S.M.U.L.S",
    timpSecunde: 180,
    greseliPermise: 2,
  },
  {
    id: "rezidentiat",
    nume: "Rezidentiat",
    descriere: "Testul teoretic pentru Rezidentiat",
    timpSecunde: 360,
    greseliPermise: 2,
  },
  {
    id: "bls",
    nume: "B.L.S",
    descriere: "Testul teoretic pentru Basic Life Support",
    timpSecunde: 180,
    greseliPermise: 2,
  },
  {
    id: "radio",
    nume: "Radio",
    descriere: "Testul teoretic pentru Radio / TET",
    timpSecunde: 150,
    greseliPermise: 2,
  },
] as const;

export type TestId = (typeof TESTS)[number]["id"];

export function getTest(id: string) {
  return TESTS.find((t) => t.id === id);
}

export const COD_INTERVAL_SECUNDE = 60; // cat des se poate solicita un cod nou
export const PRAG_ROSU_S = 30; // timpul devine rosu sub 30s ramase
export const SESIUNE_ZILE = 7; // durata cookie-ului de autentificare
