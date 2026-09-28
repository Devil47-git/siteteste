import type { Intrebare } from "@/intrebari/tip";
import { INTREBARI_SMULS } from "@/intrebari/smuls";
import { INTREBARI_REZIDENTIAT } from "@/intrebari/rezidentiat";
import { INTREBARI_BLS } from "@/intrebari/bls";
import { INTREBARI_RADIO } from "@/intrebari/radio";

const BANCOURI: Record<string, Intrebare[]> = {
  smuls: INTREBARI_SMULS,
  rezidentiat: INTREBARI_REZIDENTIAT,
  bls: INTREBARI_BLS,
  radio: INTREBARI_RADIO,
};

/** Indexul raspunsului corect, sau -1 daca `raspunsCorect` nu se potriveste. */
export function indexCorect(q: Intrebare): number {
  return q.optiuni.indexOf(q.raspunsCorect);
}

/** Verifica daca intrebarea e utilizabila (cel putin 2 optiuni + raspuns corect valid). */
export function intrebareValida(q: Intrebare): boolean {
  if (!q || typeof q.intrebare !== "string" || !q.intrebare.trim()) return false;
  if (!Array.isArray(q.optiuni) || q.optiuni.length < 2) return false;
  return indexCorect(q) >= 0;
}

export function intrebariPentru(testId: string): Intrebare[] {
  return BANCOURI[testId] ?? [];
}

/** Pozitiile intrebarilor problematice din banca (pentru /api/health). */
export function intrebariProbleme(testId: string): number[] {
  return intrebariPentru(testId)
    .map((q, i) => (intrebareValida(q) ? -1 : i))
    .filter((i) => i >= 0);
}

export function intrebareLa(testId: string, index: number): Intrebare | null {
  return intrebariPentru(testId)[index] ?? null;
}

/** Shuffle determinist pe baza attemptId, ca reluarea aceleiasi intrebari sa difere. */
export function shuffleDeterministic<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function ordineIntrebari(testId: string, attemptId: string): number[] {
  return shuffleDeterministic(
    intrebariPentru(testId).map((_, i) => i),
    `${attemptId}:${testId}`,
  );
}

/**
 * Returneaza optiunile intrebarii amestecate si pozitia raspunsului corect.
 * Shuffle-ul e determinist pe baza attemptId + indicele intrebarii, deci:
 *  - la aceeasi intrebare, optiunile au mereu aceeasi ordine (reload nu schimba nimic),
 *  - intre doua teste diferite, raspunsul corect cade in pozitii diferite.
 */
export function optiuniAmestecate(
  testId: string,
  index: number,
  attemptId: string,
): { optiuni: string[]; indexCorect: number } | null {
  const p = permutare(testId, index, attemptId);
  if (!p) return null;
  return { optiuni: p.elemente.map((e) => e.text), indexCorect: p.pozCorect };
}

/** hash numeric determinist, in [0, 2^32) */
function hashInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Permutarea optiunilor unei intrebari, pastrand indicii originali. */
function permutare(
  testId: string,
  index: number,
  attemptId: string,
): { elemente: { text: string; i: number }[]; pozCorect: number } | null {
  const q = intrebareLa(testId, index);
  if (!q) return null;
  const corect = indexCorect(q);
  if (corect < 0) return null;

  const etichete = q.optiuni.map((text, i) => ({ text, i }));
  const amestecate = shuffleDeterministic(etichete, `${attemptId}:${testId}:opt:${index}`);
  const poz = amestecate.length
    ? hashInt(`${attemptId}:${testId}:poz:${index}`) % amestecate.length
    : 0;

  const baza = amestecate.findIndex((e) => e.i === corect);
  if (baza < 0) return null;
  const element = amestecate.splice(baza, 1)[0];
  amestecate.splice(poz, 0, element);
  return { elemente: amestecate, pozCorect: poz };
}

/**
 * Translateaza pozitia afisata de client in indexul original din banca.
 * Fiecare element e o pozitie distincta, deci maparea e bijectiva si reversibila.
 */
export function pozitieLaOriginal(
  testId: string,
  index: number,
  attemptId: string,
  pozitie: number,
): number {
  const p = permutare(testId, index, attemptId);
  if (!p || pozitie < 0 || pozitie >= p.elemente.length) return -1;
  return p.elemente[pozitie].i;
}

/** Verifica daca pozitia afisata de client este cea corecta. */
export function variantaCorecta(
  testId: string,
  index: number,
  attemptId: string,
  pozitie: number,
): boolean {
  const p = permutare(testId, index, attemptId);
  return !!p && p.pozCorect === pozitie;
}
