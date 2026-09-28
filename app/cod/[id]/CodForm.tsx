"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TestConfig } from "./types";

export default function CodForm({ test }: { test: TestConfig }) {
  const router = useRouter();
  const [cod, setCod] = useState("");
  const [busy, setBusy] = useState(false);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "err"; text: string } | null>(null);
  const [cerut, setCerut] = useState(false);

  async function cere() {
    setBusy(true);
    setMesaj(null);
    const r = await fetch("/api/cod/cerere", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: test.id }),
    });
    const j = await r.json();
    setBusy(false);
    setMesaj({ tip: j.ok ? "ok" : "err", text: j.mesaj });
    if (j.ok) setCerut(true);
  }

  async function valideaza() {
    setBusy(true);
    setMesaj(null);
    const r = await fetch("/api/cod/valideaza", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cod, test: test.id }),
    });
    const j = await r.json();
    if (!j.ok) {
      setBusy(false);
      setMesaj({ tip: "err", text: j.mesaj });
      return;
    }
    router.push(`/test/${test.id}?a=${j.attemptId}`);
  }

  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <Link href="/" className="muted">← Înapoi</Link>

      <div className="card" style={{ marginTop: 16 }}>
        <h1>{test.nume}</h1>
        {test.id === "smuls" && (
          <p className="muted" style={{ marginTop: 0 }}>
            {test.descriere}
          </p>
        )}

        <h2 style={{ marginTop: 24 }}>1. Solicită codul</h2>
        <p className="muted">
          Trimitem o cerere către membrii HR. Unul dintre ei îți va trimite codul în privat, pe Discord.
          <br />
          <span style={{ color: "var(--medical-crimson)", fontWeight: 600 }}>
            ⚠️ Atenție: Nu contacta membrii HR sau conducerea în privat pentru cod! Dacă dai mesaje în privat la HR sau conducere poți primi sancțiuni / cooldown (CD).
          </span>
        </p>
        <button className="btn" onClick={cere} disabled={busy || cerut}>
          {cerut ? "Cerere trimisă" : busy ? "Se trimite…" : "Solicită cod"}
        </button>

        {mesaj && <div className={`alert ${mesaj.tip}`}>{mesaj.text}</div>}

        <h2 style={{ marginTop: 28 }}>2. Introdu codul</h2>
        <input
          className="cod"
          placeholder="XXXX-XXXX"
          value={cod}
          maxLength={9}
          onChange={(e) => setCod(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && valideaza()}
        />
        <button
          className="btn"
          style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
          onClick={valideaza}
          disabled={busy || cod.length < 8}
        >
          {busy ? "Se verifică…" : "Începe testul"}
        </button>
      </div>
    </main>
  );
}
