import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest, COD_INTERVAL_SECUNDE, cooldownRamase } from "@/lib/config";
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

  // Cooldown per test: 5 zile (S.M.U.L.S / Rezidentiat), 3 zile (B.L.S / Radio)
  const ultima = await getJson<number>(K.cdDeUser(user.id, t.id));
  const cdMs = cooldownRamase(t.cdZile, ultima);
  if (cdMs > 0) {
    const zile = Math.ceil(cdMs / 86400000);
    return NextResponse.json(
      { ok: false, mesaj: `Ai cooldown de ${t.cdZile} zile pentru acest test. Mai poți susține peste ${zile} ${zile === 1 ? "zi" : "zile"}.` },
      { status: 429 },
    );
  }

  const intervalKey = K.attemptDeUser(user.id, `int:${t.id}`);
  const ultimaCerere = await getJson<number>(intervalKey);
  if (ultimaCerere && Date.now() - ultimaCerere < COD_INTERVAL_SECUNDE * 1000) {
    const asteapta = Math.ceil((COD_INTERVAL_SECUNDE * 1000 - (Date.now() - ultimaCerere)) / 1000);
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

  // Trimitem prin Webhook catre HR / Conducere
  const roleIdHR = process.env.DISCORD_HR_ROLE_ID || "825071956101169202";

  if (webhookUrl) {
    const webhookPayload = {
      content: `<@&${roleIdHR}>`,
      embeds: [
        {
          title: `📝 Cerere nouă de test`,
          color: 0x00d2ff,
          fields: [
            {
              name: "Utilizator",
              value: `<@${user.id}>\n\`${user.id}\``,
              inline: true,
            },
            {
              name: "Test",
              value: `**${t.nume}**`,
              inline: true,
            },
            {
              name: "Cod generat",
              value: `\`\`\`${cod}\`\`\``,
              inline: false,
            },
          ],
          footer: { text: "Departamentul Medical FPlayT" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      await webhook(webhookUrl, webhookPayload);
      await setJson(
        codKey,
        { u: user.id, t: t.id, i: requestId, exp, cod, folosit: false, livrat: true },
        COD_TTL_SEC,
      );
      trimis = true;
    } catch (e: any) {
      detaliiEroare = `webhook: ${e?.message || e}`;
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
