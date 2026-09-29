import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, unpackSession, marchezeActivitate } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Heartbeat: confirma faptul ca browserul este inca deschis.
 *
 * Daca inchizi browserul (sau inchizi calculatorul), semnalul se opreste.
 * Dupa SESIUNE_INACTIV_MS sesiunea este considerata expirata si utilizatorul
 * trebuie sa se autentifice din nou cu Discord — ne asiguram astfel ca cine a
 * fost eliminat din LISTA DEPARTAMENT nu mai poate folosi site-ul.
 */
export async function POST() {
  const jar = await cookies();
  const s = unpackSession(jar.get(COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const ok = await marchezeActivitate(s.id);
  if (!ok) {
    // sesiunea a expirat deja in server; stergem si cookie-ul din browser
    const res = NextResponse.json({ ok: false, mesaj: "Sesiune expirata." }, { status: 401 });
    res.cookies.delete(COOKIE);
    return res;
  }

  return NextResponse.json({ ok: true });
}
