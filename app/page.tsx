import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { TESTS } from "@/lib/config";
import { getJson, K } from "@/lib/store";
import { gasesteMembruDupaDiscordId, areAccesLaTest } from "@/lib/sheets";
import Regulament from "./Regulament";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Re-validam profilul din Google Sheets pentru a avea datele la zi
  const membru = await gasesteMembruDupaDiscordId(user.id);

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

  const numeAfisat = membru ? membru.nume : user.globalName || user.username;
  const esteConducere = membru ? membru.esteConducere : false;

  return ( 
    <main className="wrap">
      {/* Top Profile Bar futuristic */}
      <div className="card profile-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="avatar-wrapper">
            {user.avatar ? (
              <img className="avatar" src={user.avatar} alt="" />
            ) : (
              <div className="avatar-placeholder">
                {numeAfisat.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="status-indicator"></span>
          </div>
          <div>
            <div className="profile-name">{numeAfisat}</div>
            <div className="profile-badge">
              <span className={`badge-tag ${esteConducere ? "conducere" : ""}`}>
                {esteConducere ? "CONDUCERE" : "MEMBRU"}
              </span>
              {membru ? (
                <span>Callsign: <strong>[M-{membru.callsign}]</strong> • Grad: <strong>{membru.grad}</strong></span>
              ) : (
                <span style={{ color: "#ff8787" }}>Neînregistrat în baza de date</span>
              )}
            </div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="btn ghost logout-btn" type="submit">Deconectare</button>
        </form>
      </div>

      {!membru && (
        <div className="alert err" style={{ marginBottom: 24, fontSize: 15, padding: "16px 20px" }}>
          ⚠️ <strong>Atenție:</strong> Contul tău Discord (<code>{user.id}</code>) nu a fost găsit pe <strong>LISTA DEPARTAMENT</strong>.
          Pentru a putea solicita teste, contactează conducerea sau un membru HR pentru a-ți asocia ID-ul Discord în tabel.
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div className="section-subtitle">SISTEM DE EXAMINARE TEORETICĂ</div>
        <h1 className="section-title">Teste departament medical</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Pentru a începe un test trebuie să soliciți un cod. Cererea va fi trimisă automat pe Discord către HR/Conducere.
        </p>
      </div>

      <div className="grid two">
        {TESTS.map((t) => {
          const s = status.find((x) => x.id === t.id)!;
          const acces = membru ? areAccesLaTest(membru, t.id) : { permis: false, motiv: "Nu ești în departament" };

          return (
            <div className={`test-row futuristic-card ${!acces.permis ? "locked" : ""}`} key={t.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="test-name">{t.nume}</div>
                  {!acces.permis && <span className="pill-locked">BLOCAT</span>}
                </div>
                {!acces.permis && (
                  <div className="muted lock-reason">{acces.motiv}</div>
                )}
              </div>

              <div>
                {s.stare === "in_curs" ? (
                  <Link className="btn btn-continue" href={`/test/${t.id}?a=${s.attemptId}`}>Continuă</Link>
                ) : s.stare === "gata" ? (
                  <span className="badge-finished">Finalizat</span>
                ) : acces.permis ? (
                  <Link className="btn medical" href={`/cod/${t.id}`}>Solicită cod</Link>
                ) : (
                  <button className="btn ghost" disabled title={acces.motiv}>Restricționat</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulament obligatoriu */}
      <Regulament />
    </main>
  );
}
