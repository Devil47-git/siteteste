"use client";

export default function Regulament() {
  return (
    <div className="card" style={{ marginTop: 32, borderTop: "2px solid var(--accent-cyan)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🏥</span>
        <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
          Regulament Examinare — Departamentul Medical FPlayT
        </h2>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
        <p style={{ marginTop: 0 }}>
          <strong style={{ color: "var(--accent-cyan)" }}>1. Conectați-vă cu Discord-ul ⭐️</strong><br />
          Poate dura până la un minut să te poți autentifica!
        </p>
        <p>
          <strong style={{ color: "var(--accent-cyan)" }}>2. Poți relua oricând un test</strong><br />
          Nu există cooldown automat. Poți susține din nou același test oricând, indiferent
          dacă l-ai trecut sau l-ai picat. Cooldown-ul se pune doar dacă conducerea decide.
        </p>
        <p>
          <strong style={{ color: "var(--accent-cyan)" }}>3. Selectați testul pe care doriți să îl susțineți</strong><br />
          Alegeți testul corespunzător certificatului dorit.
        </p>
        <p>
          <strong style={{ color: "var(--accent-cyan)" }}>4. Solicitați codul o singură dată! ❗</strong><br />
          Nu trimiteți mai multe cereri pentru același test. <strong>După refreshul paginii, codul solicitat rămâne în continuare funcțional!</strong>
        </p>
        <p>
          <strong style={{ color: "var(--accent-cyan)" }}>5. Așteptați cu răbdare să primiți codul de la un HR</strong><br />
          După trimiterea cererii, un membru HR vă va trimite codul necesar. Nu aveți voie să cereți codul direct de la un HR sau conducere în privat, riscați sancțiuni!
        </p>
        <div style={{ padding: "12px 16px", background: "rgba(255, 42, 75, 0.12)", border: "1px solid rgba(255, 42, 75, 0.35)", borderRadius: 8, color: "#ff9da1", fontWeight: 600, marginTop: 14 }}>
          ⚠️ NU DAȚI TESTELE DE PE TELEFON / NU SCHIMBAȚI FEREASTRA SAU DAȚI ALT+TAB (ANTI-CHEAT-UL PICĂ TESTUL AUTOMAT).
        </div>
      </div>
    </div>
  );
}