import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { isFormatValid, hashCode, COD_TTL_SEC } from "@/lib/cod";
import { getJson, setJson, store, K } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Candidatul introduce codul primit in privat. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, mesaj: "Neautentificat." }, { status: 401 });

  const { cod, test } = (await req.json().catch(() => ({}))) as {
    cod?: string;
    test?: string;
  };
  const t = test ? getTest(test) : null;
  if (!t) return NextResponse.json({ ok: false, mesaj: "Test inexistent." }, { status: 400 });

  const rawCod = String(cod ?? "");
  if (!rawCod || !isFormatValid(rawCod)) {
    return NextResponse.json({ ok: false, mesaj: "Format de cod invalid (ex: 7F3K-92QX)." }, { status: 400 });
  }

  const hash = hashCode(rawCod);
  const rec = await getJson<any>(K.cod(hash));

  if (!rec) {
    return NextResponse.json(
      { ok: false, mesaj: "Cod invalid sau expirat. Cere un cod nou." },
      { status: 400 },
    );
  }
  if (rec.u !== user.id) {
    return NextResponse.json(
      { ok: false, mesaj: "Acest cod nu iti apartine." },
      { status: 403 },
    );
  }
  if (rec.t !== t.id) {
    return NextResponse.json({ ok: false, mesaj: "Codul nu este pentru acest test." }, { status: 400 });
  }
  if (Date.now() > rec.exp) {
    await store().del(K.cod(hash));
    return NextResponse.json({ ok: false, mesaj: "Cod expirat. Cere un cod nou." }, { status: 400 });
  }
  if (rec.folosit) {
    // Daca utilizatorul are deja o tentativa activa generata cu acest cod, il redirectionam in test
    if (rec.attemptId) {
      const existing = await getJson<any>(K.attempt(rec.attemptId));
      if (existing && !existing.finalizat && Date.now() < existing.expira) {
        return NextResponse.json({
          ok: true,
          attemptId: rec.attemptId,
          timp: t.timpSecunde,
          greseliPermise: t.greseliPermise,
          reanudat: true,
        });
      }
    }
    return NextResponse.json({ ok: false, mesaj: "Acest cod a fost deja folosit." }, { status: 400 });
  }

  // validat -> pornim tentativa
  const attemptId = crypto.randomUUID();
  rec.folosit = true;
  rec.attemptId = attemptId;
  await setJson(K.cod(hash), rec, COD_TTL_SEC);

  await setJson(
    K.attempt(attemptId),
    {
      id: attemptId,
      userId: user.id,
      userSnapshot: {
        id: user.id,
        username: user.username,
        globalName: user.globalName,
        avatar: user.avatar,
        membru: user.membru ?? null,
      },
      testId: t.id,
      inceput: Date.now(),
      expira: Date.now() + t.timpSecunde * 1000,
      greseli: 0,
      index: 0,
      raspunsuri: [],
      finalizat: false,
    },
    t.timpSecunde + 3600,
  );
  await setJson(K.attemptDeUser(user.id, t.id), { attemptId }, t.timpSecunde + 3600);
  // Retinem cand a fost susținut testul, ca sa calculam cooldown-ul per test.
  await setJson(K.cdDeUser(user.id, t.id), Date.now(), t.cdZile * 24 * 3600 + 86400);

  return NextResponse.json({ ok: true, attemptId, timp: t.timpSecunde, greseliPermise: t.greseliPermise });
}
