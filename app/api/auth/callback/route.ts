import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, COOKIE, User } from "@/lib/auth";
import { avatarUrl } from "@/lib/discord";

const TOKEN = "https://discord.com/api/oauth2/token";
const ME = "https://discord.com/api/v10/users/@me";

type TokenRes = { access_token: string };
type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const jar = await cookies();
  if (state && state === jar.get("st_state")?.value) {
    jar.delete("st_state");
  } else if (state) {
    // state invalid -> reincearca autentificarea curat
    return redirect("/login");
  }

  const code = url.searchParams.get("code");
  if (!code) return redirect("/login?eroare=callback");

  const basic = Buffer.from(
    `${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`,
  ).toString("base64");

  const tokRes = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
    }),
    cache: "no-store",
  });

  if (!tokRes.ok) return redirect("/login?eroare=token");
  const tok: TokenRes = await tokRes.json();

  const meRes = await fetch(ME, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return redirect("/login?eroare=user");
  const du: DiscordUser = await meRes.json();

  // optional: verifica rolul / whitelist
  const user: User = {
    id: du.id,
    username: du.username,
    globalName: du.global_name ?? du.username,
    avatar: avatarUrl(du),
  };

  const session = await createSession(user);
  const res = NextResponse.redirect(new URL("/", process.env.APP_URL));
  res.cookies.set(COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 7 * 86400,
  });
  return res;
}
