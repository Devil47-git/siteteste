import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest, COD_INTERVAL_SECUNDE } from "@/lib/config";
import { generateCode, hashCode, COD_TTL_SEC } from "@/lib/cod";
import { getJson, setJson, store, K } from "@/lib/store";
import { postMessage, button, container, webhook } from "@/lib/discord";

export const dynamic = "force-dynamic";

/** Candidatul cere un cod pentru un test. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const { test } = (await req.json().catch(() => ({}))) as { test?: string };
  const t = test ? getTest(test) : null;
  if (!t) return NextResponse.json({ ok: false, mesaj: "Test inexistent." }, { status: 400 });

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

  await setJson(
    K.cod(hash),
    { u: user.id, t: t.id, i: requestId, exp, cod, folosit: false, livrat: false },
    COD_TTL_SEC,
  );
  await setJson(K.codDeUser(`${user.id}:${t.id}`), { hash }, COD_TTL_SEC);

  // anuntam canalul HR
  const canal = process.env.DISCORD_HR_CHANNEL_ID;
  if (!canal) {
    await store().del(K.cod(hash));
    await store().del(K.codDeUser(`${user.id}:${t.id}`));
    return NextResponse.json(
      { ok: false, mesaj: "Nu pot contacta canalul HR. Anunta un admin." },
      { status: 502 },
    );
  }
  const mesaj =
    `**Cerere de cod — ${t.nume}**\n` +
    `Candidat: <@${user.id}> (\`${user.id}\`)\n` +
    `Test: \`${t.id}\`\n` +
    `Cerere: \`${requestId.slice(0, 8)}\`\n` +
    `Expiră: <t:${Math.floor(exp / 1000)}:R>`;

  const butoane = container([
    button(`cod:trimite:${hash}`, "Trimite codul în privat", 2),
    button(`cod:refuza:${hash}`, "Refuză", 4),
  ]);
  const url = process.env.DISCORD_WEBHOOK_URL;

  let trimis = false;
  // Butoanele NU functioneaza pe mesaje trimise prin webhook (interactiunile
  // nu ajung la Interactions Endpoint). De aceea preferam mesajul prin bot.
  try {
    const msg = await postMessage(canal, mesaj, butoane);
    await setJson(`hr:${hash}`, { channel: canal, message: msg.id }, COD_TTL_SEC);
    trimis = true;
  } catch (e) {
    console.error("bot post failed, incerc webhook", e);
  }

  if (!trimis && url) {
    trimis = await webhook(url, { content: mesaj })
      .then(() => true)
      .catch((e) => {
        console.error("webhook failed", e);
        return false;
      });
  }

  if (!trimis) {
    // cererea a esuat: curatam codul, ca un retry sa nu mosteneasca un cod orfan
    await store().del(K.cod(hash));
    await store().del(K.codDeUser(`${user.id}:${t.id}`));
    return NextResponse.json(
      { ok: false, mesaj: "Nu pot contacta canalul HR. Anunta un admin." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, mesaj: "Cod cerut. Verifica-ti mesajele private de pe Discord." });
}
