import type { Intrebare } from "@/intrebari/README";
import { banc as smuls } from "@/intrebari/smuls";
import { banc as rezidentiat } from "@/intrebari/rezidentiat";
import { banc as bls } from "@/intrebari/bls";
import { banc as radio } from "@/intrebari/radio";

const BANCOURI: Record<string, Intrebare[]> = {
  smuls: smuls.intrebari,
  rezidentiat: rezidentiat.intrebari,
  bls: bls.intrebari,
  radio: radio.intrebari,
};

export function intrebariPentru(testId: string): Intrebare[] {
  return BANCOURI[testId] ?? [];
}

export function intrebareLa(testId: string, index: number): Intrebare | null {
  const l = intrebariPentru(testId);
  return l[index] ?? null;
}

/** Verifica daca un index de intrebare raspunde corect. */
export function esteCorect(testId: string, index: number, varianta: number) {
  const q = intrebareLa(testId, index);
  return q ? q.corect === varianta : false;
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
