import { getTest } from "./config";
import { intrebariPentru, intrebareLa } from "./intrebari";
import { postMessage, postWebhook } from "./discord";
import { formatMs } from "./format";

/**
 * ID-urile rolurilor Discord pentru fiecare grad, citite din env:
 *   DISCORD_GRAD_ROLE_IDS="MEDIC CHIRURG=123456,DIRECTOR GENERAL=789"
 * Dacă nu e setat sau gradul nu există, se afișează doar mention-ul persoanei.
 */
function roluriGrade(): Record<string, string> {
  const raw = process.env.DISCORD_GRAD_ROLE_IDS ?? "";
  const map: Record<string, string> = {};
  for (const pereche of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [nume, id] = pereche.split("=").map((s) => s.trim());
    if (nume && id) map[nume.toUpperCase()] = id;
  }
  return map;
}

/**
 * Trimite rapoartele de test pe cele doua canale:
 * 1. DISCORD_WEBHOOK_CONDUCERE (sau fallback pe canal ID 1347936263822376980)
 * 2. DISCORD_WEBHOOK_REZULTATE (sau fallback pe canal ID 1347936123950858263)
 */
export async function trimiteRaport(
  user: { id: string; username: string; globalName: string; membru?: any },
  attempt: any,
  motiv: string,
) {
  const t = getTest(attempt.testId);
  if (!t) return;

  const total = intrebariPentru(attempt.testId).length;
  const greseli = attempt.greseli ?? 0;
  const corecte = Math.max(0, total - greseli);
  const scor = attempt.scor ?? 0;
  const picat = scor === 0;
  const durataMs = Math.max(0, (attempt.ultimaActiune ?? Date.now()) - attempt.inceput);
  const timpRamasMs = Math.max(0, attempt.expira - (attempt.ultimaActiune ?? Date.now()));
  const timpRamasText = formatMs(timpRamasMs);

  // Nume afisat: daca are membru: [M-Callsign] Nume
  const callsign = user.membru?.callsign ? `[M-${user.membru.callsign}] ` : "";
  const numeCurat = user.membru?.nume || user.globalName || user.username;
  const candidatMention = `@${callsign}${numeCurat}`;

  // Tag cu rolul/gradul persoanei, afișat deasupra embled-ului.
  const gradCurat = String(user.membru?.grad ?? "").trim();
  const rolId = gradCurat ? roluriGrade()[gradCurat.toUpperCase()] : undefined;
  const tagCandidat = rolId ? `<@&${rolId}> ` : "";
  const antet = `${tagCandidat}<@${user.id}>`;

  // Cooldown calculat per test (S.M.U.L.S/Rezidentiat: 5 zile, B.L.S/Radio: 3 zile)
  const d = new Date(Date.now() + (t.cdZile ?? 3) * 24 * 3600 * 1000);
  const zi = String(d.getDate()).padStart(2, "0");
  const luna = String(d.getMonth() + 1).padStart(2, "0");
  const an = d.getFullYear();
  const cooldownData = `${zi}.${luna}.${an}`;

  let rezultatConducere = "";
  let rezultatPublic = "";

  if (motiv === "anticheat") {
    rezultatConducere = `RESPINS (ANTI-CHEAT: Fereastră schimbată / Alt+Tab) (cooldown până pe ${cooldownData})`;
    rezultatPublic = `RESPINS (ANTI-CHEAT) (${cooldownData})`;
  } else if (picat) {
    rezultatConducere = `RESPINS (cooldown până pe ${cooldownData})`;
    rezultatPublic = `RESPINS (${cooldownData})`;
  } else {
    // La admis nu mai afisam scorul intre paranteze, doar statusul.
    rezultatConducere = `ADMIS (${greseli} greseli din ${t.greseliPermise + 1} posibile)`;
    rezultatPublic = `ADMIS`;
  }

  // Colectam greselile cu intrebarea, raspunsul corect si raspunsul dat de candidat
  const greseliCampuri: string[] = [];
  const raspunsuri = attempt.raspunsuri ?? [];
  for (const r of raspunsuri) {
    if (!r.corect) {
      const q = intrebareLa(attempt.testId, r.i);
      if (q) {
        const raspunsDat = q.optiuni[r.v] ?? "Niciunul";
        greseliCampuri.push(
          `• **${q.intrebare}**\n` +
          `Răspuns corect: ${q.raspunsCorect}\n` +
          `Răspunsul tău: ${raspunsDat}`
        );
      }
    }
  }

  // Daca a picat din cauza anticheat
  if (motiv === "anticheat") {
    greseliCampuri.unshift(`⚠️ **Tentativă detectată**: Candidatul a părăsit fereastra de examinare (Alt+Tab / pierdere focus).`);
  }

  const greseliText = greseliCampuri.length > 0
    ? `\n\n❌ **Greșeli**\n${greseliCampuri.join("\n\n")}`
    : "";

  // 1. EMBED RAPORT CONDUCERE
  // Culoare: Mov/Indigo (0x9b59b6) pentru anticheat, Rosu (0xff2a4b) pentru picat, Verde (0x00e676) pentru admis
  const culoareConducere = motiv === "anticheat" ? 0x9b59b6 : picat ? 0xff2a4b : 0x00e676;
  const embedConducere = {
    title: `📊 Raport Conducere - Rezultat Test`,
    color: culoareConducere,
    fields: [
      { name: "Utilizator", value: `<@${user.id}>`, inline: true },
      { name: "Test", value: `**${t.nume}**`, inline: true },
      { name: "Rezultat", value: rezultatConducere, inline: false },
      { name: "Greșeli", value: `${greseli}/${t.greseliPermise + 1}`, inline: true },
      { name: "Timp rămas", value: timpRamasText, inline: true },
    ],
    description: greseliText.slice(0, 3900),
    footer: { text: "Departamentul Medical FPlayT" },
    timestamp: new Date().toISOString(),
  };

  // 2. EMBED REZULTAT PUBLIC / TESTE (Camera ID: 1347936123950858263)
  const culoarePublic = motiv === "anticheat" ? 0x9b59b6 : picat ? 0xff2a4b : 0x00e676;
  const embedPublic = {
    title: `Rezultat Test`,
    color: culoarePublic,
    fields: [
      { name: "Candidat:", value: `<@${user.id}>`, inline: false },
      { name: "Test:", value: `**${t.nume}**`, inline: false },
      { name: "Rezultat:", value: `**${rezultatPublic}**`, inline: false },
    ],
    footer: { text: "Departamentul Medical FPlayT" },
    timestamp: new Date().toISOString(),
  };

  // Trimite catre Conducere (Webhook conducere sau camera 1347936263822376980)
  const canalConducereId = "1347936263822376980";
  const webhookConducere = process.env.DISCORD_WEBHOOK_CONDUCERE;

  let trimisConducere = false;
  if (webhookConducere) {
    trimisConducere = await postWebhook("DISCORD_WEBHOOK_CONDUCERE", "", [embedConducere])
      .then(() => true)
      .catch((e) => {
        console.error("Webhook conducere failed:", e);
        return false;
      });
  }
  if (!trimisConducere && process.env.DISCORD_BOT_TOKEN) {
    await postMessage(canalConducereId, "", [embedConducere]).catch((e) =>
      console.error("Bot post to Conducere failed:", e)
    );
  }

  // Trimite catre canalul de REZULTATE TESTE.
  // ID-ul se poate override-a din env (DISCORD_REZULTATE_CHANNEL_ID) ca sa nu
  // ajunga rezultatele in canalul de coduri/cereri.
  const canalRezultateId = (process.env.DISCORD_REZULTATE_CHANNEL_ID ?? "").trim() || "1347936123950858263";
  const webhookRezultate = process.env.DISCORD_WEBHOOK_REZULTATE;

  let trimisRezultate = false;
  if (webhookRezultate) {
    // Tag-ul persoanei merge in `content` (deasupra embled-ului), nu in embed.
    trimisRezultate = await postWebhook("DISCORD_WEBHOOK_REZULTATE", antet, [embedPublic])
      .then(() => true)
      .catch((e) => {
        console.error("Webhook rezultate failed:", e);
        return false;
      });
  }
  if (!trimisRezultate && process.env.DISCORD_BOT_TOKEN) {
    await postMessage(canalRezultateId, antet, [embedPublic]).catch((e) =>
      console.error("Bot post to Rezultate failed:", e)
    );
  }
}
