import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { isFormatValid, hashCode } from "@/lib/cod";
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
  if (!cod || !isFormatValid(cod)) {
    return NextResponse.json({ ok: false, mesaj: "Format de cod invalid (ex: 7F3K-92QX)." }, { status: 400 });
  }

  const hash = hashCode(cod);
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
  if (rec.livrat !== true) {
    return NextResponse.json(
      { ok: false, mesaj: "Codul nu a fost inca livrat de un membru HR." },
      { status: 400 },
    );
  }
  if (rec.folosit) {
    return NextResponse.json({ ok: false, mesaj: "Acest cod a fost deja folosit." }, { status: 400 });
  }

  // validat -> pornim tentativa
  rec.folosit = true;
  await setJson(K.cod(hash), rec, 300);

  const attemptId = crypto.randomUUID();
  await setJson(
    K.attempt(attemptId),
    {
      id: attemptId,
      userId: user.id,
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

  return NextResponse.json({ ok: true, attemptId, timp: t.timpSecunde, greseliPermise: t.greseliPermise });
}
