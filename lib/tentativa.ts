import { getTest, type TestId } from "./config";
import { intrebariPentru } from "./intrebari";
import { getJson, setJson, K } from "./store";
import { getUser } from "./auth";
import { trimiteRaport } from "./raport";

export type TestConfigItem = NonNullable<ReturnType<typeof getTest>>;

export interface AttemptData {
  id: string;
  userId: string;
  userSnapshot?: any;
  testId: string;
  inceput: number;
  expira: number;
  greseli: number;
  index: number;
  raspunsuri?: { i: number; v: number; corect: boolean }[];
  finalizat: boolean;
  motiv?: string;
  ultimaActiune?: number;
  corecte?: number;
  total?: number;
  admis?: boolean;
  scor?: number;
  picatLa?: number;
  raportTrimis?: boolean;
}

/**
 * Marchează tentativa ca finalizată, calculează rezultatul și trimite raportul pe Discord.
 * Poate fi apelată din api/test, dar și server-side din app/page.tsx sau app/cod/[id]/page.tsx
 * pentru a sincroniza tentativele expirate în timp ce utilizatorul nu era pe pagină.
 */
export async function finalizeazaAttempt(
  a: AttemptData,
  motiv: string,
  t: TestConfigItem | null | undefined,
  picatFortat = false,
): Promise<AttemptData> {
  if (!t) return a;
  if (!a.finalizat) {
    a.finalizat = true;
    a.motiv = motiv;
  }
  const total = intrebariPentru(a.testId).length;
  a.ultimaActiune = a.ultimaActiune ?? Date.now();
  const corecte = (a.raspunsuri ?? []).filter((r: any) => r.corect).length;
  a.corecte = corecte;
  a.total = total;

  const picatFortatDeMotiv = motiv === "greseli" || motiv === "timp" || motiv === "anticheat";
  const picat = picatFortat || picatFortatDeMotiv || a.greseli > t.greseliPermise;
  a.admis = !picat;
  a.scor = picat ? 0 : Math.max(0, total - a.greseli);
  a.picatLa = picat ? Math.min(total, Math.max(1, (a.raspunsuri?.length ?? 0) + (motiv === "greseli" ? 0 : 1))) : total;

  await setJson(K.attempt(a.id), a, 3600);

  if (!a.raportTrimis) {
    try {
      const u = (await getUser()) ?? a.userSnapshot;
      if (u) {
        const trimis = await trimiteRaport(u, a, a.motiv ?? motiv);
        if (trimis) {
          a.raportTrimis = true;
          await setJson(K.attempt(a.id), a, 3600);
        }
      }
    } catch (err) {
      console.error("[finalizeazaAttempt] Eroare la trimiterea raportului:", err);
    }
  }

  return a;
}
