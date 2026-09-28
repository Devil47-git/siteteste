import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { TESTS, GHID_URL, GHID_SECTIUNI, linkGhid } from "@/lib/config";
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
      if (att.finalizat) {
        return {
          id: t.id,
          stare: "gata" as const,
          admis: att.admis ?? att.scor > 0,
          corecte: att.corecte ?? 0,
          picatLa: att.picatLa ?? null,
          total: att.total ?? null,
        };
      }
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
        <div className="section-subtitle">SITE DE TESTARE TEORETICĂ</div>
        <h1 className="section-title">Teste departamentul medical</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Pentru a începe un test trebuie să soliciți un cod. Cererea va fi trimisă automat pe Discord către HR/Conducere.
        </p>
      </div>

      <div className="grid two">
        {TESTS.map((t) => {
          const s = status.find((x) => x.id === t.id)!;
          const acces = membru ? areAccesLaTest(membru, t.id) : { permis: false, motiv: "Nu ești în departament" };
          const ghid = GHID_SECTIUNI[t.id];

          return (
            <div className={`test-row futuristic-card ${!acces.permis ? "locked" : ""}`} key={t.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div className="test-name">{t.nume}</div>
                  {s.stare === "gata" && (
                    <span className={`rezultat-istoric ${s.admis ? "admis" : "respins"}`}>
                      {s.admis ? "ADMIS" : "RESPINS"}
                      {s.total
                        ? ` · ${s.admis
                          ? `${s.corecte}/${s.total}`
                          : `${s.picatLa ?? s.corecte}/${s.total}`}`
                        : ""}
                    </span>
                  )}
                  {!acces.permis && <span className="pill-locked">BLOCAT</span>}
                </div>
                {!acces.permis && (
                  <div className="muted lock-reason">{acces.motiv}</div>
                )}
                {ghid && (
                  <a
                    href={linkGhid(t.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="muted"
                    style={{ fontSize: 12, display: "inline-block", marginTop: 6 }}
                  >
                    📘 Învață: {ghid.label}
                  </a>
                )}
              </div>

              <div>
                {s.stare === "in_curs" ? (
                  <Link className="btn btn-continue" href={`/test/${t.id}?a=${s.attemptId}`}>Continuă</Link>
                ) : acces.permis ? (
                  <Link className="btn medical" href={`/cod/${t.id}`}>
                    {s.stare === "gata" ? "Reluează testul" : "Solicită cod"}
                  </Link>
                ) : (
                  <button className="btn ghost" disabled title={acces.motiv}>Restricționat</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulament obligatoriu - fix sub cele 4 teste */}
      <Regulament />

      {/* Unde inveti - sub regulament */}
      <div className="card ghid-link" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>📘</span>
          <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Unde înveți pentru fiecare test</h2>
        </div>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          Toate materiile oficiale sunt în Ghidul Departamentului Medical. Citește secțiunea corespunzătoare
          testului înainte să îl susții.
        </p>
        {TESTS.map((t) => {
          const ghid = GHID_SECTIUNI[t.id];
          return (
            <a key={t.id} href={linkGhid(t.id)} target="_blank" rel="noopener noreferrer">
              <span>📖 {t.nume} — {ghid ? ghid.label : "Ghidul general"}</span>
              <span style={{ color: "var(--accent-cyan)" }}>Deschide →</span>
            </a>
          );
        })}
        <a href={GHID_URL} target="_blank" rel="noopener noreferrer">
          <span>🏥 Ghidul complet al Departamentului Medical</span>
          <span style={{ color: "var(--accent-cyan)" }}>Deschide →</span>
        </a>
      </div>
    </main>
  );
}
