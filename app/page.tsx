import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { TESTS } from "@/lib/config";
import { getJson, K } from "@/lib/store";
import { intrebariPentru } from "@/lib/intrebari";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  const status = await Promise.all(
    TESTS.map(async (t) => {
      const a = await getJson<any>(K.attemptDeUser(user.id, t.id));
      if (!a) return { id: t.id, stare: "nou" as const };
      const att = await getJson<any>(K.attempt(a.attemptId));
      if (!att) return { id: t.id, stare: "nou" as const };
      if (att.finalizat) return { id: t.id, stare: "gata" as const, scor: att.scor };
      if (Date.now() < att.expira) return { id: t.id, stare: "in_curs" as const, attemptId: a.attemptId };
      return { id: t.id, stare: "nou" as const };
    }),
  );

  return (
    <main className="wrap">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {user.avatar ? (
            <img className="avatar" src={user.avatar} alt="" />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {user.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.globalName || user.username}</div>
            <div className="muted" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", display: "inline-block" }}></span>
              Departamentul Medical Los Santos
            </div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn ghost" type="submit">Deconectare</button>
        </form>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1>Teste departament medical</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Pentru a începe un test trebuie să soliciți un cod. Un membru HR vă va trimite codul în privat pe Discord.
        </p>
      </div>

      <div className="grid two">
        {TESTS.map((t) => {
          const s = status.find((x) => x.id === t.id)!;
          return (
            <div className="test-row" key={t.id}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t.nume}</div>
              </div>
              {s.stare === "in_curs" ? (
                <Link className="btn" href={`/test/${t.id}?a=${s.attemptId}`}>Continuă</Link>
              ) : s.stare === "gata" ? (
                <span className="muted" style={{ fontWeight: 600 }}>Finalizat</span>
              ) : (
                <Link className="btn medical" href={`/cod/${t.id}`}>Solicită cod</Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
