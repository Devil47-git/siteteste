import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const SECRET = process.env.CODE_SECRET ?? "SCHIMBA-ACEASTA-VALOARE-IMPORTANT";
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // fara I, O, 0, 1

/**
 * Codul primit de candidat e scurt si lizibil (ex: 7F3K-92QX).
 * Toata informatia (cine, ce test, cand expira, daca a fost livrat) sta in Redis,
 * iar codul este stocat doar ca hash -> nimeni nu poate ghici sau falsifica un cod.
 */

export type CodRecord = {
  u: string; // discord user id
  t: string; // test id
  i: string; // id cerere
  exp: number; // expirare ms
  folosit?: boolean;
  livrat?: boolean;
};

export function normalize(cod: string) {
  return cod.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCode(cod: string) {
  return createHmac("sha256", SECRET).update(normalize(cod)).digest("hex").slice(0, 32);
}

export function generateCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABET[randomInt(0, ALFABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function isFormatValid(cod: string) {
  const n = normalize(cod);
  if (n.length !== 8) return false;
  for (const ch of n) if (!ALFABET.includes(ch)) return false;
  return true;
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const COD_TTL_SEC = 15 * 60; // 15 minute de la generare
