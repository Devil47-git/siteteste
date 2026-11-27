"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TestConfig } from "./types";
import { sanitizeCodeInput } from "@/lib/format";

export default function CodForm({ test }: { test: TestConfig }) {
  const router = useRouter();
  const [cod, setCod] = useState("");
  const [busy, setBusy] = useState(false);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "err"; text: string } | null>(null);
  const [cerut, setCerut] = useState(false);

  function handleCodChange(val: string) {
    const curatat = sanitizeCodeInput(val);

    // Pastram maxim 8 caractere alfanumerice si adaugam cratima automat
    const doarCaractere = curatat.slice(0, 8);
    const formatat =
      doarCaractere.length > 4
        ? `${doarCaractere.slice(0, 4)}-${doarCaractere.slice(4)}`
        : doarCaractere;

    setCod(formatat);
  }

  async function cere() {
    setBusy(true);
    setMesaj(null);
    try {
      const r = await fetch("/api/cod/cerere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: test.id }),
      });
      const j = await r.json().catch(() => null);
      if (j) {
        setMesaj({ tip: j.ok ? "ok" : "err", text: j.mesaj });
        if (j.ok) setCerut(true);
      } else {
        setMesaj({ tip: "err", text: "Eroare la trimiterea cererii. Te rugăm să reîncerci." });
      }
    } catch {
      setMesaj({ tip: "err", text: "Eroare de conexiune. Verifică conexiunea la internet și reîncearcă." });
    } finally {
      setBusy(false);
    }
  }

  async function valideaza() {
    if (busy) return;
    setBusy(true);
    setMesaj(null);
    try {
      const r = await fetch("/api/cod/valideaza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cod, test: test.id }),
      });
      const j = await r.json().catch(() => null);
      if (!j?.ok) {
        setMesaj({ tip: "err", text: j?.mesaj || "Codul nu a putut fi validat." });
        return;
      }
      router.push(`/test/${test.id}?a=${j.attemptId}`);
    } catch {
      setMesaj({ tip: "err", text: "Eroare de conexiune. Te rugăm să reîncerci." });
    } finally {
      setBusy(false);
    }
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
            ⚠️ Atenție: Nu contacta membrii HR sau conducerea în privat pentru cod! Dacă dai mesaje în privat la HR sau conducere poți primi cooldown (CD).
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
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => handleCodChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && cod.replace(/[^A-Z0-9]/g, "").length === 8 && valideaza()}
        />
        <button
          className="btn"
          style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
          onClick={valideaza}
          disabled={busy || cod.replace(/[^A-Z0-9]/g, "").length !== 8}
        >
          {busy ? "Se verifică…" : "Începe testul"}
        </button>
      </div>
    </main>
  );
}
