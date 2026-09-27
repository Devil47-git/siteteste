import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { getJson, setJson, K } from "@/lib/store";
import { ordineIntrebari, esteCorect, intrebariPentru } from "@/lib/intrebari";
import { trimiteRaport } from "@/lib/raport";

export const dynamic = "force-dynamic";

/** Marcheaza tentativa ca finalizata si trimite raportul pe Discord (o singura data). */
async function finalizeaza(a: any, motiv: string, t: any) {
  if (!t) return a;
  if (!a.finalizat) {
    a.finalizat = true;
    a.motiv = motiv;
  }
  const total = intrebariPentru(a.testId).length;
  a.ultimaActiune = a.ultimaActiune ?? Date.now();
  a.scor = a.greseli > t.greseliPermise ? 0 : Math.max(0, total - a.greseli);
  await setJson(K.attempt(a.id), a, 3600);

  if (!a.raportTrimis) {
    a.raportTrimis = true;
    await setJson(K.attempt(a.id), a, 3600);
    const u = await getUser();
    if (u) await trimiteRaport(u, a, a.motiv);
  }
  return a;
}

async function load(attemptId: string | null, userId: string) {
  if (!attemptId) return null;
  const a = await getJson<any>(K.attempt(attemptId));
  if (!a || a.userId !== userId) return null;
  return a;
}

/** Starea curenta a testului (timer, greseli, intrebarea de acum). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const url = new URL(req.url);
  const a = await load(url.searchParams.get("a"), user.id);
  if (!a) return NextResponse.json({ ok: false, mesaj: "Sesiune de test inexistentă." }, { status: 404 });

  const t = getTest(a.testId);
  if (!t) {
    return NextResponse.json({ ok: false, mesaj: "Test inexistent." }, { status: 400 });
  }
  const ordine = ordineIntrebari(a.testId, a.id);
  const total = intrebariPentru(a.testId).length;

  if (a.finalizat) {
    return NextResponse.json({ ok: true, finalizat: true, scor: a.scor, greseli: a.greseli, total, motiv: a.motiv });
  }
  if (Date.now() > a.expira) {
    await finalizeaza(a, "timp", t);
    return NextResponse.json({ ok: true, finalizat: true, scor: a.scor, greseli: a.greseli, total, motiv: "timp" });
  }

  const pos = a.index;
  const idxBanc = ordine[pos];
  const q = intrebariPentru(a.testId)[idxBanc];
  if (!q) {
    return NextResponse.json({ ok: true, finalizat: true, scor: a.scor ?? 0, greseli: a.greseli, total });
  }

  return NextResponse.json({
    ok: true,
    finalizat: false,
    index: idxBanc,
    pozitie: pos,
    total,
    intrebare: q.intrebare,
    optiuni: q.optiuni,
    greseli: a.greseli,
    greseliPermise: t.greseliPermise,
    ramase: Math.max(0, Math.floor((a.expira - Date.now()) / 1000)),
  });
}

/** Candidatul confirma un raspuns. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { a?: string; varianta?: number };
  const a = await load(body.a ?? null, user.id);
  if (!a) return NextResponse.json({ ok: false, mesaj: "Sesiune de test inexistentă." }, { status: 404 });
  if (a.finalizat) return NextResponse.json({ ok: false, mesaj: "Test deja finalizat." }, { status: 400 });

  const t = getTest(a.testId);
  if (!t) {
    return NextResponse.json({ ok: false, mesaj: "Test inexistent." }, { status: 400 });
  }
  const ordine = ordineIntrebari(a.testId, a.id);
  const total = intrebariPentru(a.testId).length;

  if (Date.now() > a.expira) {
    await finalizeaza(a, "timp", t);
    return NextResponse.json({ ok: true, terminat: true, scor: a.scor, greseli: a.greseli, motiv: "timp" });
  }

  const v = body.varianta;
  if (typeof v !== "number" || v < 0) {
    return NextResponse.json({ ok: false, mesaj: "Răspuns invalid." }, { status: 400 });
  }

  const pos = a.index;
  const idxBanc = ordine[pos];
  const corect = esteCorect(a.testId, idxBanc, v);

  a.raspunsuri.push({ i: idxBanc, v, corect });
  if (!corect) a.greseli += 1;

  const preaMulte = a.greseli > t.greseliPermise;
  const ultima = pos + 1 >= total;

  if (preaMulte || ultima) {
    await finalizeaza(a, preaMulte ? "greseli" : "final", t);
    return NextResponse.json({
      ok: true,
      terminat: true,
      scor: a.scor,
      greseli: a.greseli,
      motiv: a.motiv,
    });
  }

  a.index = pos + 1;
  a.ultimaActiune = Date.now();
  await setJson(K.attempt(a.id), a, t.timpSecunde + 3600);

  return NextResponse.json({
    ok: true,
    corect,
    index: idxBanc,
    urmator: a.index,
    greseli: a.greseli,
    total,
  });
}
