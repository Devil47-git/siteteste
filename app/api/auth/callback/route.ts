import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, COOKIE, COOKIE_SECURE, User } from "@/lib/auth";
import { avatarUrl } from "@/lib/discord";
import { gasesteMembruDupaDiscordId } from "@/lib/sheets";

const TOKEN = "https://discord.com/api/oauth2/token";
const ME = "https://discord.com/api/v10/users/@me";

type TokenRes = { access_token: string };

/** Cee ce intoarce Discord la /users/@me. */
type DiscordProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export async function GET(req: Request) {
  try {
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

    const base = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "") || url.origin;
    const clientId = (process.env.DISCORD_CLIENT_ID ?? "").trim();
    const clientSecret = (process.env.DISCORD_CLIENT_SECRET ?? "").trim();

    if (!clientId || !clientSecret) {
      console.error("[OAuth] DISCORD_CLIENT_ID sau DISCORD_CLIENT_SECRET lipsesc din Environment Variables!");
      return redirect("/login?eroare=config_env");
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokRes = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${base}/api/auth/callback`,
      }),
      cache: "no-store",
    });

    const resBody = await tokRes.text();
    if (!tokRes.ok) {
      console.error(`[OAuth Token Error] Discord returned status ${tokRes.status}: ${resBody}`);
      return redirect(`/login?eroare=token&detalii=${encodeURIComponent(resBody.slice(0, 100))}`);
    }
    const tok: TokenRes = JSON.parse(resBody);

    const meRes = await fetch(ME, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
      cache: "no-store",
    });
    if (!meRes.ok) return redirect("/login?eroare=user");
    const du: DiscordProfile = await meRes.json();

    // Verificam in Google Sheets daca utilizatorul exista in departament
    const membru = await gasesteMembruDupaDiscordId(du.id);

    const user: User = {
      id: du.id,
      username: du.username,
      globalName: membru ? membru.nume : (du.global_name ?? du.username),
      avatar: avatarUrl(du),
      membru: membru ?? null,
    };

    const session = await createSession(user);
    const destination = new URL("/", base);
    const res = NextResponse.redirect(destination);
    res.cookies.set(COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      path: "/",
      maxAge: 7 * 86400,
    });
    return res;
  } catch (err: any) {
    console.error("[OAuth Callback Crash]", err);
    return redirect(`/login?eroare=server&detalii=${encodeURIComponent(err?.message || "eroare-interna")}`);
  }
}
