import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { discordAuthorizeUrl } from "@/lib/discord-url";
import { COOKIE_SECURE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(discordAuthorizeUrl());
  res.cookies.set("st_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 600,
  });
  return res;
}
