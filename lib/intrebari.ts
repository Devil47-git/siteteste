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

/** Verifica daca un index de intrebare raspunde corect. */
export function esteCorect(testId: string, index: number, varianta: number) {
  const q = intrebareLa(testId, index);
  return q ? indexCorect(q) === varianta : false;
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
