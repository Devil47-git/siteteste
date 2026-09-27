import { getTest } from "./config";
import { intrebariPentru } from "./intrebari";
import { postMessage, postWebhook } from "./discord";
import { formatMs } from "./format";

/**
 * Trimite raportul testului in canalul HR.
 * `at` primeste rezultatul din /api/test (POST sau GET).
 */
export async function trimiteRaport(
  user: { id: string; username: string; globalName: string },
  attempt: any,
  motiv: string,
) {
  const canal = process.env.DISCORD_HR_CHANNEL_ID;
  const t = getTest(attempt.testId);
  if (!t) return;

  const total = intrebariPentru(attempt.testId).length;
  const greseli = attempt.greseli ?? 0;
  const corecte = Math.max(0, total - greseli);
  const scor = attempt.scor ?? 0;
  const picat = scor === 0;
  const durataMs = Math.max(0, (attempt.ultimaActiune ?? Date.now()) - attempt.inceput);

  const verdict = picat
    ? `❌ **PICAT** — ${motiv === "greseli" ? `${greseli} greșeli` : "timp expirat"}`
    : `✅ **PROMOVAT** — ${corecte}/${total} corecte`;

  const status = picat ? ":x: Picat" : ":white_check_mark: Promovat";

  const continut =
    `📋 **Report ${t.nume}**\n` +
    `Utilizator: <@${user.id}> (\`${user.id}\`)\n` +
    `Rezultat: **${verdict}**\n` +
    `Greseli: **${greseli}**\n` +
    `Corecte: **${corecte}/${total}**\n` +
    `Scor: **${scor}**\n` +
    `Durata: **${formatMs(durataMs)}** / ${Math.floor(t.timpSecunde / 60)} min\n` +
    `Status: ${status}`;

  // prefera webhook-ul de rezultate; daca nu exista, cazi pe canalul HR
  const trimis = await postWebhook("DISCORD_WEBHOOK_REZULTATE", continut);
  if (trimis) return;
  if (canal) await postMessage(canal, continut).catch((e) => console.error("raport failed", e));
}
