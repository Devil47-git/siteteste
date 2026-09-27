import { getTest } from "./config";
import { intrebariPentru } from "./intrebari";
import { postMessage, postWebhook } from "./discord";
import { formatMs } from "./format";

/**
 * Trimite raportul testului in canalul HR.
 * `at` primeste rezultatul din /api/test (POST sau GET).
 */
export async function trimiteRaport(
  user: { id: string; username: string; globalName: string; membru?: any },
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

  const status = picat ? "❌ Picat" : "✅ Promovat";
  const numeCandidat = user.membru?.eticheta || user.globalName || user.username;

  const continut =
    `📋 **Raport Final — ${t.nume}**\n` +
    `Candidat: **${numeCandidat}** (<@${user.id}>)\n` +
    `Rezultat: **${verdict}**\n` +
    `Greșeli: **${greseli}** / maxim ${t.greseliPermise}\n` +
    `Răspunsuri corecte: **${corecte}/${total}**\n` +
    `Scor final: **${scor} puncte**\n` +
    `Timp scurs: **${formatMs(durataMs)}**\n` +
    `Status: ${status}`;

  // prefera webhook-ul de rezultate; daca nu exista, cazi pe canalul HR sau webhook general
  let trimis = await postWebhook("DISCORD_WEBHOOK_REZULTATE", continut);
  if (!trimis) {
    trimis = await postWebhook("DISCORD_WEBHOOK_URL", continut);
  }
  if (!trimis && canal && process.env.DISCORD_BOT_TOKEN) {
    await postMessage(canal, continut).catch((e) => console.error("raport failed", e));
  }
}
