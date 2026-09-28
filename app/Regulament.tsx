"use client";

import { useState, useEffect } from "react";

export default function Regulament() {
  const [deschis, setDeschis] = useState(false);
  const [text, setText] = useState("");
  const [confirmat, setConfirmat] = useState(false);
  const [eroare, setEroare] = useState(false);

  useEffect(() => {
    const acord = localStorage.getItem("regulament_acord_hr");
    if (!acord) setDeschis(true);
    else setConfirmat(true);
  }, []);

  const handleConfirma = () => {
    const c = text.trim().toUpperCase();
    if (c.includes("HR") || c.includes("AM CITIT") || c.includes("FPLAYT") || c.includes("MEDICAL")) {
      localStorage.setItem("regulament_acord_hr", "true");
      setConfirmat(true);
      setDeschis(false);
      setEroare(false);
    } else {
      setEroare(true);
    }
  };

  return (
    <>
      <div className="card" style={{ marginTop: 32, borderTop: "2px solid var(--accent-cyan)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
              Regulament Examinare — Departamentul Medical FPlayT
            </h2>
          </div>
          {confirmat ? (
            <span style={{ color: "var(--success-green)", fontSize: 13, fontWeight: 700 }}>✓ Asumat</span>
          ) : (
            <button className="btn medical" style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setDeschis(true)}>
              Citește & Confirmă
            </button>
          )}
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
          <p style={{ marginTop: 0 }}>
            <strong style={{ color: "var(--accent-cyan)" }}>1. Conectați-vă cu Discord-ul ⭐️</strong><br />
            Poate dura până la un minut să te poți autentifica!
          </p>
          <p>
            <strong style={{ color: "var(--accent-cyan)" }}>2. Verificați dacă aveți cooldown</strong><br />
            Dacă ați susținut recent un test, este posibil să trebuiască să așteptați înainte de a da un altul.
          </p>
          <p>
            <strong style={{ color: "var(--accent-cyan)" }}>3. Selectați testul pe care doriți să îl susțineți</strong><br />
            Alegeți testul corespunzător certificatului dorit.
          </p>
          <p>
            <strong style={{ color: "var(--accent-cyan)" }}>4. Solicitați codul o singură dată! ❗</strong><br />
            Nu trimiteți mai multe cereri pentru același test.
          </p>
          <p>
            <strong style={{ color: "var(--accent-cyan)" }}>5. Așteptați cu răbdare să primiți codul de la un HR</strong><br />
            După trimiterea cererii, un membru HR vă va trimite codul necesar. Nu aveți voie să cereți codul direct de la un HR!
          </p>
          <div style={{ padding: "12px 16px", background: "rgba(255, 42, 75, 0.12)", border: "1px solid rgba(255, 42, 75, 0.35)", borderRadius: 8, color: "#ff9da1", fontWeight: 600, marginTop: 14 }}>
            ⚠️ NU DAȚI TESTELE DE PE TELEFON / NU SCHIMBAȚI FEREASTRA SAU DAȚI ALT+TAB (ANTI-CHEAT-UL PICĂ TESTUL AUTOMAT).
          </div>
        </div>
      </div>

      {deschis && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3, 7, 18, 0.9)", backdropFilter: "blur(10px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 480, width: "100%", border: "1px solid var(--accent-cyan)" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>🏥</span>
              <h2 style={{ fontSize: 18, margin: "6px 0 2px", color: "#fff" }}>Confirmare Regulament Medical</h2>
              <div className="section-subtitle">OBLIGATORIU ÎNAINTE DE TESTARE</div>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-main)", background: "var(--bg-card2)", padding: 12, borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <p style={{ margin: "0 0 6px" }}>⭐️ <strong>1.</strong> Conectare securizată Discord.</p>
              <p style={{ margin: "0 0 6px" }}>⏳ <strong>2.</strong> Cooldown aplicat în caz de eșec.</p>
              <p style={{ margin: "0 0 6px" }}>📋 <strong>3.</strong> Alege doar testul permis gradului tău.</p>
              <p style={{ margin: "0 0 6px" }}>📩 <strong>4.</strong> Așteaptă codul în privat de la echipa HR.</p>
              <p style={{ margin: "6px 0 0", color: "#ff8587", fontWeight: 700 }}>
                🚨 ANTI-CHEAT: Orice schimbare a ferestrei (Alt+Tab) pică testul instant!
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Scrie <strong>HR</strong> sau <strong>AM CITIT</strong> mai jos:
              </label>
              <input
                type="text"
                className="cod"
                style={{ fontSize: 15, letterSpacing: 2, padding: "8px 12px", textTransform: "uppercase" }}
                placeholder="Exemplu: HR"
                value={text}
                onChange={(e) => { setText(e.target.value); setEroare(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirma()}
              />
              {eroare && (
                <div style={{ color: "var(--medical-crimson)", fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                  ⚠️ Te rugăm să introduci textul corect (ex: HR sau AM CITIT).
                </div>
              )}
              <button className="btn medical" style={{ width: "100%", marginTop: 10 }} onClick={handleConfirma} disabled={!text.trim()}>
                Confirmă
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}