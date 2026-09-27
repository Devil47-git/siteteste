import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest, COD_INTERVAL_SECUNDE } from "@/lib/config";
import { generateCode, hashCode, COD_TTL_SEC } from "@/lib/cod";
import { getJson, setJson, store, K } from "@/lib/store";
import { postMessage, button, container, webhook } from "@/lib/discord";
import { gasesteMembruDupaDiscordId, areAccesLaTest } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/** Candidatul cere un cod pentru un test. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const { test } = (await req.json().catch(() => ({}))) as { test?: string };
  const t = test ? getTest(test) : null;
  if (!t) return NextResponse.json({ ok: false, mesaj: "Test inexistent." }, { status: 400 });

  // Verificare apartenenta la departament si permisiuni test din Google Sheets
  const membru = await gasesteMembruDupaDiscordId(user.id);
  if (!membru) {
    return NextResponse.json(
      { ok: false, mesaj: "Nu faci parte din Departamentul Medical Los Santos (nu ai fost găsit în baza de date)." },
      { status: 403 },
    );
  }

  const acces = areAccesLaTest(membru, t.id);
  if (!acces.permis) {
    return NextResponse.json(
      { ok: false, mesaj: acces.motiv || "Grad insuficient pentru acest test." },
      { status: 403 },
    );
  }

  const intervalKey = K.attemptDeUser(user.id, `int:${t.id}`);
  const ultima = await getJson<number>(intervalKey);
  if (ultima && Date.now() - ultima < COD_INTERVAL_SECUNDE * 1000) {
    const asteapta = Math.ceil((COD_INTERVAL_SECUNDE * 1000 - (Date.now() - ultima)) / 1000);
    return NextResponse.json(
      { ok: false, mesaj: `Asteapta ${asteapta}s pana la urmatoarea cerere.` },
      { status: 429 },
    );
  }
  await setJson(intervalKey, Date.now(), COD_INTERVAL_SECUNDE * 2);

  // cerere unica
  const requestId = crypto.randomUUID();
  const cod = generateCode();
  const hash = hashCode(cod);
  const exp = Date.now() + COD_TTL_SEC * 1000;
  const codKey = K.cod(hash);
  const codUserKey = K.codDeUser(`${user.id}:${t.id}`);

  const curata = async () => {
    await store().del(codKey);
    await store().del(codUserKey);
  };

  // Verificam daca avem configurat bot token SAU webhook
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const canal = process.env.DISCORD_HR_CHANNEL_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  // Daca nu exista canal sau bot activ, dar exista webhook, marcam codul ca direct livrat
  // (cand HR primeste codul prin webhook, candidatul il poate introduce)
  const livratDirect = !botToken || !canal;

  await setJson(
    codKey,
    { u: user.id, t: t.id, i: requestId, exp, cod, folosit: false, livrat: livratDirect },
    COD_TTL_SEC,
  );
  await setJson(codUserKey, { hash }, COD_TTL_SEC);

  const numeAfisat = membru.eticheta;

  const mesajBot =
    `**Cerere de cod — ${t.nume}**\n` +
    `Candidat: ${numeAfisat} (<@${user.id}>)\n` +
    `Grad: **${membru.grad}** | Callsign: **[M-${membru.callsign}]**\n` +
    `Test: \`${t.id}\`\n` +
    `Cerere: \`${requestId.slice(0, 8)}\`\n` +
    `Expiră: <t:${Math.floor(exp / 1000)}:R>`;

  let trimis = false;
  let detaliiEroare = "";

  // 1. Incercam trimiterea cu butoane prin Bot daca botul e configurat
  if (canal && botToken) {
    const butoane = container([
      button(`cod:trimite:${hash}`, "Trimite codul în privat", 2),
      button(`cod:refuza:${hash}`, "Refuză", 4),
    ]);
    try {
      const msg = await postMessage(canal, mesajBot, butoane);
      await setJson(`hr:${hash}`, { channel: canal, message: msg.id }, COD_TTL_SEC);
      trimis = true;
    } catch (e: any) {
      detaliiEroare = e?.message || String(e);
      console.warn("[Cerere Cod] Bot message failed, falling back to Webhook:", e?.message);
    }
  }

  // 2. Daca botul nu a reusit sau nu e configurat, trimitem prin Webhook direct cu codul
  if (!trimis && webhookUrl) {
    // Cand se trimite pe Webhook (unde butoanele Discord nu pot functiona),
    // trimitem un embed elegant si activam codul ca validabil pe site
    const webhookPayload = {
      content: `🔔 **Cerere Cod Test — Departamentul Medical**`,
      embeds: [
        {
          title: `Cerere: ${t.nume}`,
          color: 0x0f62fe,
          fields: [
            { name: "Candidat", value: `${numeAfisat}\n<@${user.id}> (\`${user.id}\`)`, inline: false },
            { name: "Callsign & Grad", value: `[M-${membru.callsign}] — ${membru.grad}`, inline: true },
            { name: "Test Solicitat", value: `**${t.nume}**`, inline: true },
            { name: "Cod Generat", value: `\`\`\`${cod}\`\`\``, inline: false },
            { name: "Instrucțiuni HR", value: "Puteți trimite codul de mai sus candidatului în privat.", inline: false },
          ],
          footer: { text: "Departamentul Medical Los Santos • Sistem Automat" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      await webhook(webhookUrl, webhookPayload);
      // Daca a fost trimis prin webhook, permitem candidatului sa foloseasca codul primit
      await setJson(
        codKey,
        { u: user.id, t: t.id, i: requestId, exp, cod, folosit: false, livrat: true },
        COD_TTL_SEC,
      );
      trimis = true;
    } catch (e: any) {
      detaliiEroare += ` | webhook: ${e?.message || e}`;
      console.error("[Cerere Cod] Webhook failed:", e);
    }
  }

  if (!trimis) {
    await curata();
    await store().del(intervalKey);
    return NextResponse.json(
      {
        ok: false,
        mesaj: `Nu s-a putut trimite cererea pe Discord. Asigură-te că DISCORD_WEBHOOK_URL este setat în Vercel. (${detaliiEroare.slice(0, 80)})`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mesaj: "Cererea a fost trimisă cu succes către conducere/HR pe Discord! Vei primi codul în privat.",
  });
}
