"use client";

const TITLE_STYLE = { color: "var(--accent-cyan)" } as const;
const RULE_STYLE = { margin: 0 } as const;

const RULES: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Conectați-vă cu Discord-ul ⭐️",
    body: "Poate dura până la un minut să te poți autentifica!",
  },
  {
    title: "2. Verificați dacă aveți cooldown la testul pe care doriți să îl susțineți",
    body: (
      <>
        Poți susține oricând testul, indiferent dacă l-ai trecut sau l-ai picat. Dacă apare un cooldown pe site, este cel de pe docs și 
        <strong style={TITLE_STYLE}>nu te împiedică</strong> să ceri cod și să dai testul, <strong style={TITLE_STYLE}>asta daca l-ai platit sau ti-a expirat.</strong>
      </>
    ),
  },
  {
    title: "3. Selectați testul pe care doriți să îl susțineți",
    body: "Alegeți testul corespunzător certificatului dorit.",
  },
  {
    title: "4. Solicitați codul o singură dată! ❗",
    body: (
      <>
        Nu trimiteți mai multe cereri pentru același test.{" "}
        <strong>După refreshul paginii, codul solicitat rămâne în continuare funcțional!</strong>
      </>
    ),
  },
  {
    title: "5. Așteptați cu răbdare să primiți codul de la un HR",
    body: "După trimiterea cererii, un membru HR vă va trimite codul necesar. Nu aveți voie să cereți codul direct de la un HR sau un membru al conducerii în privat, riscați sa primiți cooldown la testul respectiv!",
  },
];

export default function Regulament() {
  return (
    <div className="card" style={{ marginTop: 32, borderTop: "2px solid var(--accent-cyan)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🏥</span>
        <h2 style={{ margin: 0, fontSize: 18, color: "#fff" }}>
          Regulament SITE — Departamentul Medical FPlayT
        </h2>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}>
        {RULES.map((rule, index) => (
          <p key={rule.title} style={index === 0 ? { ...RULE_STYLE, marginTop: 0 } : RULE_STYLE}>
            <strong style={TITLE_STYLE}>{rule.title}</strong>
            <br />
            {rule.body}
          </p>
        ))}
        <div style={{ padding: "12px 16px", background: "rgba(255, 42, 75, 0.12)", border: "1px solid rgba(255, 42, 75, 0.35)", borderRadius: 8, color: "#ff9da1", fontWeight: 600, marginTop: 14 }}>
          ⚠️ NU DAȚI TESTELE DE PE TELEFON / NU SCHIMBAȚI FEREASTRA SAU DAȚI ALT+TAB (ANTI-CHEAT-UL PICĂ TESTUL AUTOMAT).
        </div>
      </div>
    </div>
  );
}