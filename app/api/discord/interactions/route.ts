import { NextResponse } from "next/server";
import { verificaSemnatura } from "@/lib/semnatura";
import { getJson, setJson, K } from "@/lib/store";
import { getTest } from "@/lib/config";
import { dmMessage, editMessage, getGuildMember, button, container } from "@/lib/discord";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Interaction = {
  type: number; // 1=PING, 2=MESSAGE_COMPONENT, 3=AUTOCOMPLETE
  data?: { custom_id?: string };
  member?: { user: { id: string; username?: string } };
  user?: { id: string; username?: string };
  channel_id?: string;
  message?: { id: string };
  token: string;
};

export async function POST(req: Request) {
  const body = await req.text();

  if (!(await verificaSemnatura(req, body))) {
    return NextResponse.json({ error: "semnatura invalida" }, { status: 401 });
  }

  let p: Interaction;
  try {
    p = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "json invalid" }, { status: 400 });
  }

  // 1 = PING
  if (p.type === 1) return NextResponse.json({ type: 1 });

  if (p.type !== 2 || !p.data?.custom_id?.startsWith("cod:")) {
    return NextResponse.json({ type: 4, data: { content: "Acțiune nevalidă." } }, { status: 200 });
  }

  const [actiune, hash] = p.data.custom_id.split(":");
  const rec = await getJson<any>(K.cod(hash));
  if (!rec) {
    return ephemeral("Cererea a expirat.");
  }
  const t = getTest(rec.t);
  if (!t) return ephemeral("Testul nu mai există în configurație.");
  const hr = await getJson<any>(`hr:${hash}`);

  // doar membrii cu rolul configurat pot apasa butoanele
  const id = p.member?.user.id ?? p.user?.id;
  if (!id) return ephemeral("Nu pot identifica utilizatorul.");
  const permis = await areRolHR(id);
  if (!permis) return ephemeral("Nu ai voie să folosești acest buton.");

  if (actiune === "trimite") {
    const cod = rec.cod;
    if (!cod) return ephemeral("Codul nu mai este disponibil. Candidatul să ceară din nou.");
    try {
      await dmMessage(
        rec.u,
        `Codul tău pentru **${t.nume}**:\n\n` +
          `\`\`\`\n${cod}\n\`\`\`\n\n` +
          `Introdu-l pe site: ${process.env.APP_URL}/cod/${t.id}\n` +
          `Expiră: <t:${Math.floor(rec.exp / 1000)}:R>`,
      );
      rec.livrat = true;
      await setJson(K.cod(hash), rec, Math.max(60, Math.floor((rec.exp - Date.now()) / 1000)));
    } catch (e) {
      console.error("DM failed", e);
      return ephemeral(
        "Nu am putut trimite DM. Verifică dacă candidatul are DM-urile de la server deschise.",
      );
    }

    if (hr) {
      await editMessage(
        hr.channel,
        hr.message,
        `✅ Cod trimis în privat lui <@${rec.u}> pentru **${t.nume}**.`,
        container([
          button(`cod:trimite:${hash}`, "Trimite codul în privat", 2, true),
          button(`cod:refuza:${hash}`, "Refuză", 4, true),
        ]),
      ).catch(() => {});
    }
    return NextResponse.json({
      type: 4,
      data: { content: `Cod trimis în privat lui <@${rec.u}>.` },
    });
  }

  if (actiune === "refuza") {
    if (hr) {
      await editMessage(
        hr.channel,
        hr.message,
        `⛔ Cerere refuzată de <@${id}>.`,
        container([
          button(`cod:trimite:${hash}`, "Trimite codul în privat", 2, true),
          button(`cod:refuza:${hash}`, "Refuză", 4, true),
        ]),
      ).catch(() => {});
    }
    return ephemeral("Cerere refuzată.");
  }

  return ephemeral("Acțiune nevalidă.");
}

function ephemeral(content: string) {
  return NextResponse.json({ type: 4, data: { content } });
}

async function areRolHR(userId: string) {
  const roluri = (process.env.DISCORD_HR_ROLE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!roluri.length) return true; // daca nu e setat, orice membru al serverului poate
  const m = await getGuildMember(process.env.DISCORD_GUILD_ID!, userId).catch(() => null);
  if (!m) return false;
  return m.roles.some((r: string) => roluri.includes(r));
}
