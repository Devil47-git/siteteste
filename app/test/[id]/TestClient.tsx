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

export default function TestClient({ attemptId, numeTest, greseliPermise }: Props) {
  const router = useRouter();
  const [q, setQ] = useState<Q | null>(null);
  const [ales, setAles] = useState<number | null>(null);
  const [greseli, setGreseli] = useState(0);
  const [ramase, setRamase] = useState<number | null>(null);
  const [finalizat, setFinalizat] = useState<null | {
    scor: number;
    corecte?: number;
    greseli: number;
    total?: number;
    motiv?: string;
    admis?: boolean;
    picatLa?: number;
  }>(null);
  const [eroare, setEroare] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const trimisRef = useRef(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inceputRef = useRef<number>(Date.now());

  // timerul de flash nu trebuie sa arate dupa ce componenta s-a demontat
  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  const a = attemptId;



  const finalizeaza = useCallback(
    async (motiv?: string) => {
      if (trimisRef.current) return;
      trimisRef.current = true;
      try {
        const r = await fetch(`/api/test?a=${a}`, { cache: "no-store" });
        const j = await r.json();
        if (j.ok && j.finalizat) {
          setFinalizat({
            scor: j.scor,
            corecte: j.corecte,
            greseli: j.greseli,
            total: j.total,
            motiv: j.motiv ?? motiv,
            admis: j.admis,
            picatLa: j.picatLa,
          });
        }
      } catch {
        // serverul nu raspunde: aratam tot rezultatul, ca sa nu ramana ecranul blocat
        setFinalizat({ scor: 0, corecte: 0, greseli, motiv: motiv ?? "timp", admis: false });
      }
    },
    [a, greseli],
  );

  // incarcare initiala
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/test?a=${a}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) {
          setEroare(j.mesaj || "Nu pot încărca testul.");
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
        if (alive) setEroare("Nu pot încărca testul.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [a]);

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
        const j = await r.json();
        setFinalizat({
          scor: 0,
          greseli: j.greseli ?? greseli,
          total: j.total,
          motiv: "anticheat",
          admis: false,
          picatLa: j.picatLa,
        });
      } catch {
        setFinalizat({
          scor: 0,
          greseli,
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
      triggerAntiCheat();
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [q, finalizat, a, greseli]);

  async function confirma() {
    if (ales === null || busy || trimisRef.current) return;
    setBusy(true);
    const r = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, varianta: ales }),
    });
    const j = await r.json();
    setBusy(false);
    if (!j.ok) {
      setEroare(j.mesaj || "Eroare la salvare.");
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
    // reincarce intrebarea urmatoare
    const s = await fetch(`/api/test?a=${a}`, { cache: "no-store" });
    const k = await s.json();
    if (k.ok && !k.finalizat) {
      setQ(toQ(k));
      setRamase(k.ramase);
    } else if (k.ok) {
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

  const mm = ramase === null ? "--:--" : `${Math.floor(ramase / 60)}:${String(ramase % 60).padStart(2, "0")}`;
  const rosu = ramase !== null && ramase <= PRAG_ROSU;
  // 2 greseli sunt admise, a 3-a pica testul -> afisam x/3
  const maxGreseli = greseliPermise + 1;

  if (eroare) {
    return (
      <main className="wrap" style={{ maxWidth: 560 }}>
        <div className="card">
          <h1>Nu merge</h1>
          <div className="alert err">{eroare}</div>
          <button className="btn" onClick={() => router.push("/")}>Înapoi la teste</button>
        </div>
      </main>
    );
  }

  if (finalizat) {
    const totalIntrebari = finalizat.total ?? q?.total ?? 0;
    // Statusul afisat: ADMIS doar daca nu s-a depasit numarul de greseli permise.
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
            {picat ? "Test nereușit" : "Test susținut cu succes"}
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
                Test picat automat: ai părăsit fereastra de examinare / ai dat Alt+Tab.
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
            Poți susține din nou testul oricând.
          </p>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => router.push("/")}>
            Înapoi la teste
          </button>
        </div>
      </main>
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
          <div className="greseli" style={{ color: greseli >= greseliPermise ? "var(--bad)" : undefined }}>
            {greseli} <span>/ {maxGreseli}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>TIMP RĂMAS</div>
          <div className={`timp ${rosu ? "rosu" : "normal"}`}>{mm}</div>
        </div>
      </div>

      <div className="card">
        <div className="muted">
          {numeTest} · întrebarea {q.pozitie + 1} din {q.total}
        </div>
        <h1 className="intrebare">{q.intrebare}</h1>

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
