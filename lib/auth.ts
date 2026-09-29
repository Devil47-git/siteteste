import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { getJson, setJson, store, K } from "./store";
import { SESIUNE_ZILE } from "./config";

const SECRET = process.env.SESSION_SECRET ?? "SCHIMBA-SESSION-SECRET-IMPORTANT";
export const COOKIE = "st_session";

/** `secure: true` ar bloca testarea locala pe http://localhost. */
export const COOKIE_SECURE = process.env.NODE_ENV === "production" && !!process.env.APP_URL?.startsWith("https://");

export type User = {
  id: string;
  username: string;
  globalName: string;
  avatar: string | null;
  membru?: {
    callsign: string;
    nume: string;
    grad: string;
    eticheta: string;
    numarGrad: number;
    poateSMULS: boolean;
    poateRezidentiat: boolean;
    poateBLS: boolean;
    poateRadio: boolean;
  } | null;
};

function sign(v: string) {
  return createHmac("sha256", SECRET).update(v).digest("base64url").slice(0, 32);
}

export function packSession(user: User) {
  const id = randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ id, uid: user.id })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function unpackSession(token: string | undefined): { id: string; uid: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const j = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (j?.id && j?.uid) return j;
  } catch { }
  return null;
}

export async function createSession(user: User) {
  const token = packSession(user);
  const j = unpackSession(token)!;
  await setJson(K.user(j.id), { ...user, sid: j.id, vazut: Date.now() }, SESIUNE_ZILE * 86400);
  return token;
}

/**
 * Sesiunea este valida doar cat timp clientul "semneaza prezenta" (heartbeat).
 * Daca browserul este inchis, semnalul se opreste, iar dupa SESIUNE_INACTIV_MS
 * sesiunea expira singura. Astfel nu mai trebuie sa ne bazam pe inchiderea
 * ferestrei (imposibil de detectat corect din JS: file de tab si schimbarea
 * de tab declanseaza aceleasi evenimente), iar o persoana eliminata din
 * LISTA DEPARTAMENT nu mai poate folosi o sesiune ramasa deschisa.
 */
export const SESIUNE_INACTIV_MS = 3 * 60 * 1000;


/** Inregistreaza activitatea curenta a utilizatorului. */
export async function marchezeActivitate(sessionId: string) {
  const u = await getJson<any>(K.user(sessionId));
  if (!u) return false;
  u.vazut = Date.now();
  await setJson(K.user(sessionId), u, SESIUNE_ZILE * 86400);
  return true;
}

export async function getUser(): Promise<User | null> {
  const jar = await cookies();
  const s = unpackSession(jar.get(COOKIE)?.value);
  if (!s) return null;
  const u = await getJson<any>(K.user(s.id));
  if (!u) return null;

  // Sesiune expirata prin inactivitate (browser inchis / calculator oprit).
  const vazut = typeof u.vazut === "number" ? u.vazut : 0;
  if (!vazut || Date.now() - vazut > SESIUNE_INACTIV_MS) {
    await store().del(K.user(s.id));
    return null;
  }

  return {
    id: u.id,
    username: u.username,
    globalName: u.globalName,
    avatar: u.avatar,
    membru: u.membru ?? null,
  };
}
