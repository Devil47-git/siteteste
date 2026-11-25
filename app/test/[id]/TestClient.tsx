"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRAG_ROSU_S } from "@/lib/config";

const PRAG_ROSU = PRAG_ROSU_S;

type Props = {
  attemptId: string;
  numeTest: string;
  greseliPermise: number;
};

type Q = {
  intrebare: string;
  optiuni: string[];
  index: number;
  pozitie: number;
  total: number;
};

/** Mapeaza raspunsul serverului in starea intrebarii curente. */
function toQ(j: {
  intrebare: string;
  optiuni: string[];
  index: number;
  pozitie: number;
  total: number;
}): Q {
  return {
    intrebare: j.intrebare,
    optiuni: j.optiuni,
    index: j.index,
    pozitie: j.pozitie,
    total: j.total,
  };
}

type TestResult = {
  scor: number;
  corecte?: number;
  greseli: number;
  total?: number;
  motiv?: string;
  admis?: boolean;
  picatLa?: number;
};

function TestResultCard({
  finalizat,
  totalFallback,
  maxGreseli,
  onInapoi,
}: {
  finalizat: TestResult;
  totalFallback: number;
  maxGreseli: number;
  onInapoi: () => void;
}) {
  const totalIntrebari = finalizat.total ?? totalFallback;
  const picat = finalizat.admis === false || finalizat.scor === 0;
  const intrebariReusite = finalizat.corecte ?? (picat ? 0 : finalizat.scor);
  const picatLa = finalizat.picatLa ?? intrebariReusite;
  const motiv = finalizat.motiv;
  const anticheat = motiv === "anticheat";

  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <div className={`card rezultat ${picat ? "respins" : "admis"}`} style={{ textAlign: "center" }}>
        <div className="rezultat-badge">{picat ? "RESPINS" : "ADMIS"}</div>
        <h1 style={{ margin: "10px 0 4px", color: "#fff" }}>
          {picat ? "Test PICAT" : "Test TRECUT"}
        </h1>
        <p style={{ fontSize: 34, fontWeight: 800, margin: "8px 0 2px" }}>
          {picat ? `${picatLa} / ${totalIntrebari}` : `${intrebariReusite} / ${totalIntrebari}`}
        </p>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          {picat ? "Ai picat la întrebarea" : "Întrebări corecte"}
        </p>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          {anticheat && (
            <>
              Test picat automat: ai părăsit fereastra de examinare sau ai dat Alt+Tab.
              {picatLa > 1 && ` Ai răspuns corect la primele ${picatLa - 1} întrebări din ${totalIntrebari}.`}
            </>
          )}
          {motiv === "timp" && "Timpul a expirat."}
          {motiv === "greseli" &&
            `Ai picat la întrebarea ${picatLa} din ${totalIntrebari}. Ai răspuns corect la ${intrebariReusite} întrebări și ai atins ${maxGreseli} greșeli.`}
          {(!motiv || motiv === "final") &&
            `Ai răspuns corect la ${intrebariReusite} din ${totalIntrebari} întrebări. Rezultatul a fost trimis pe Discord.`}
        </p>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Poți susține din nou testul, după expirarea cooldownului sau platirea acestuia.
        </p>
        <button className="btn" style={{ marginTop: 10 }} onClick={onInapoi}>
          Înapoi la teste
        </button>
      </div>
    </main>
  );
}

export default function TestClient({ attemptId, numeTest, greseliPermise }: Props) {
  const router = useRouter();
  const [q, setQ] = useState<Q | null>(null);
  const [ales, setAles] = useState<number | null>(null);
  const [greseli, setGreseli] = useState(0);
  const [ramase, setRamase] = useState<number | null>(null);
  const [finalizat, setFinalizat] = useState<TestResult | null>(null);
  const [eroareIncarcare, setEroareIncarcare] = useState("");
  const [eroareSalvare, setEroareSalvare] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const trimisRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inceputRef = useRef<number>(Date.now());

  // timerul de flash nu trebuie sa arate dupa ce componenta s-a demontat
  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const a = attemptId;

  const finalizeaza = useCallback(
    async (motiv = "timp") => {
      if (trimisRef.current) return;
      trimisRef.current = true;
      try {
        const r = await fetch("/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ a, timeout: true }),
        });
        const j = await r.json().catch(() => null);
        if (j?.ok && (j.terminat || j.finalizat)) {
          setFinalizat({
            scor: j.scor ?? 0,
            corecte: j.corecte ?? 0,
            greseli: j.greseli ?? greseli,
            total: j.total ?? q?.total,
            motiv: j.motiv ?? motiv,
            admis: j.admis ?? false,
            picatLa: j.picatLa,
          });
          return;
        }
      } catch {
        // serverul nu raspunde: continuam cu fallback local ca sa nu blocam ecranul
      }
      setFinalizat({
        scor: 0,
        corecte: 0,
        greseli,
        total: q?.total,
        motiv,
        admis: false,
      });
    },
    [a, greseli, q?.total],
  );

  const incarcaTest = useCallback(async () => {
    setEroareIncarcare("");
    try {
      const r = await fetch(`/api/test?a=${a}`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!j) {
        setEroareIncarcare("Nu pot încărca testul. Verifică conexiunea.");
        return;
      }
      if (!j.ok) {
        setEroareIncarcare(j.mesaj || "Nu pot încărca testul.");
        return;
      }
      if (j.finalizat) {
        setFinalizat({
          scor: j.scor,
          corecte: j.corecte,
          greseli: j.greseli,
          total: j.total,
          motiv: j.motiv,
          admis: j.admis,
          picatLa: j.picatLa,
        });
        return;
      }
      inceputRef.current = Date.now();
      setQ(toQ(j));
      setGreseli(j.greseli);
      setRamase(j.ramase);
    } catch {
      setEroareIncarcare("Nu pot încărca testul. Verifică conexiunea.");
    }
  }, [a]);

  // incarcare initiala
  useEffect(() => {
    let alive = true;
    incarcaTest();
    return () => {
      alive = false;
    };
  }, [incarcaTest]);

  // timer: bazat pe ceasul serverului la fiecare intrebare
  useEffect(() => {
    if (!q || finalizat) return;
    const t0 = Date.now();
    const initial = ramase!;
    const id = setInterval(() => {
      const r = initial - Math.floor((Date.now() - t0) / 1000);
      setRamase(Math.max(0, r));
      if (r <= 0) finalizeaza("timp");
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, finalizat]);

  // ANTI-CHEAT: Daca utilizatorul da Alt+Tab sau paraseste fereastra de test
  useEffect(() => {
    if (!q || finalizat) return;

    const triggerAntiCheat = async () => {
      if (trimisRef.current) return;
      trimisRef.current = true;
      try {
        const r = await fetch("/api/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ a, anticheat: true }),
        });
        const j = await r.json().catch(() => null);
        setFinalizat({
          scor: 0,
          greseli: j?.greseli ?? greseli,
          total: j?.total ?? q?.total,
          motiv: "anticheat",
          admis: false,
          picatLa: j?.picatLa,
        });
      } catch {
        setFinalizat({
          scor: 0,
          greseli,
          total: q?.total,
          motiv: "anticheat",
          admis: false,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerAntiCheat();
      }
    };

    const handleBlur = () => {
      // Buffer scurt (300ms) pentru a nu declansa la micro-glitch-uri de focus de sistem
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          triggerAntiCheat();
        }
      }, 300);
    };

    const handleFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [q, finalizat, a, greseli]);

  async function confirma() {
    if (ales === null || busy || trimisRef.current) return;
    setBusy(true);
    setEroareSalvare("");
    try {
      const r = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, varianta: ales }),
      });
      const j = await r.json().catch(() => null);
      if (!j || !j.ok) {
        setEroareSalvare(j?.mesaj || "Eroare la salvare. Te rugăm să apeși din nou pe confirmare.");
        return;
      }
      if (j.terminat) {
        setFinalizat({
          scor: j.scor,
          corecte: j.corecte,
          greseli: j.greseli,
          total: j.total ?? q?.total,
          motiv: j.motiv,
          admis: j.admis,
          picatLa: j.picatLa,
        });
        return;
      }

      setGreseli(j.greseli);
      setAles(null);
      setFlash(j.corect ? "ok" : "bad");
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(null), 250);

      // Daca serverul a trimis deja urmatoarea intrebare in raspuns, o folosim direct
      if (j.urmatoareaIntrebare) {
        setQ(toQ(j.urmatoareaIntrebare));
        if (typeof j.ramase === "number") setRamase(j.ramase);
      } else {
        // Fallback: reincarca intrebarea urmatoare
        const s = await fetch(`/api/test?a=${a}`, { cache: "no-store" });
        const k = await s.json().catch(() => null);
        if (k?.ok && !k.finalizat) {
          setQ(toQ(k));
          setRamase(k.ramase);
        } else if (k?.ok && k.finalizat) {
          setFinalizat({
            scor: k.scor,
            corecte: k.corecte,
            greseli: k.greseli,
            total: k.total,
            motiv: k.motiv,
            admis: k.admis,
            picatLa: k.picatLa,
          });
        }
      }
    } catch {
      setEroareSalvare("Conexiunea a fost întreruptă. Apasă din nou pe 'Confirmă răspunsul'.");
    } finally {
      setBusy(false);
    }
  }

  const mm = ramase === null ? "--:--" : `${Math.floor(ramase / 60)}:${String(ramase % 60).padStart(2, "0")}`;
  const rosu = ramase !== null && ramase <= PRAG_ROSU;
  // 2 greseli sunt admise, a 3-a pica testul -> afisam x/3
  const maxGreseli = greseliPermise + 1;
  // La 2/3 (ultima greseala admisa) contorul devine rosu, ca avertisment.
  const greseliPericuloase = greseli >= greseliPermise && greseli > 0;

  if (eroareIncarcare) {
    return (
      <main className="wrap" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1>Nu pot încărca testul</h1>
          <div className="alert err">{eroareIncarcare}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn" onClick={incarcaTest}>
              Reîncearcă
            </button>
            <button className="btn ghost" onClick={() => router.push("/")}>
              Înapoi la teste
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (finalizat) {
    return (
      <TestResultCard
        finalizat={finalizat}
        totalFallback={q?.total ?? 0}
        maxGreseli={maxGreseli}
        onInapoi={() => router.push("/")}
      />
    );
  }

  if (!q) {
    return (
      <main className="wrap" style={{ maxWidth: 560 }}>
        <div className="card">Se încarcă…</div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      {/* deasupra: greseli, sub ele timpul */}
      <div className="topbar">
        <div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>GREȘELI</div>
          <div className={`greseli ${greseliPericuloase ? "rosu" : ""}`}>
            {greseli} <span>/ {maxGreseli}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>TIMP RĂMAS</div>
          <div className={`timp ${rosu ? "rosu" : "normal"}`}>{mm}</div>
        </div>
      </div>

      {greseliPericuloase && (
        <div className="greseli-avertisment">
          ⚠️ Ai {greseli} din {maxGreseli} greseli. La urmatoarea greseala testul este picat automat.
        </div>
      )}

      <div className="card">
        <div className="muted">
          {numeTest} · întrebarea {q.pozitie + 1} din {q.total}
        </div>
        <h1 className="intrebare">{q.intrebare}</h1>

        {eroareSalvare && (
          <div className="alert err" style={{ marginBottom: 14, fontSize: 14 }}>
            {eroareSalvare}
          </div>
        )}

        {q.optiuni.map((v, i) => (
          <button
            key={i}
            className={`varianta ${ales === i ? "ales" : ""}`}
            onClick={() => setAles(i)}
            disabled={busy}
          >
            <strong style={{ marginRight: 10 }}>{String.fromCharCode(65 + i)}.</strong>
            {v}
          </button>
        ))}

        <button
          className="btn"
          style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
          onClick={confirma}
          disabled={ales === null || busy}
        >
          {busy ? "Se salvează…" : "Confirmă răspunsul"}
        </button>

        <div className="progress">
          <div style={{ width: `${((q.pozitie + 1) / q.total) * 100}%` }} />
        </div>
      </div>

      {flash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            boxShadow: flash === "bad" ? "inset 0 0 0 6px var(--bad)" : "inset 0 0 0 6px var(--ok)",
            transition: "box-shadow .2s",
          }}
        />
      )}
    </main>
  );
}
