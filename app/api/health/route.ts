import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { STORE_ESTE_REDIS } from "@/lib/store";
import { TESTS } from "@/lib/config";
import { intrebariPentru, intrebariProbleme } from "@/lib/intrebari";

export const dynamic = "force-dynamic";

const NECESARE = [
  "APP_URL",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_GUILD_ID",
  "DISCORD_HR_CHANNEL_ID",
  "SESSION_SECRET",
  "CODE_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const WEBHOOKS = [
  "DISCORD_WEBHOOK_URL",
  "DISCORD_WEBHOOK_REZULTATE",
  "DISCORD_WEBHOOK_CONDUCERE",
];

export async function GET() {
  const lipsa = NECESARE.filter((k) => !process.env[k]);
  const user = await getUser();
  const bancuri = Object.fromEntries(
    TESTS.map((t) => [t.id, { intrebari: intrebariPentru(t.id).length, probleme: intrebariProbleme(t.id) }]),
  );

  return NextResponse.json({
    ok: lipsa.length === 0,
    lipsa,
    webhooks: Object.fromEntries(WEBHOOKS.map((k) => [k, Boolean(process.env[k])])),
    bancuri,
    store: STORE_ESTE_REDIS ? "upstash" : "MEMORIE (dev)",
    autentificat: Boolean(user),
    user,
    discord: Boolean(process.env.DISCORD_CLIENT_ID),
  });
}
