"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Cat de des confirmam ca browserul e deschis. */
const INTERVAL_MS = 60 * 1000;

/**
 * Heartbeat de sesiune.
 *
 * Trimite periodic un semnal serverului. Daca browserul se inchide, semnalul
 * se opreste, iar dupa SESIUNE_INACTIV_MS (in lib/auth.ts) sesiunea expira si
 * utilizatorul trebuie sa se autentifice din nou cu Discord.
 *
 * De ce nu inchidem sesiunea direct la inchiderea ferestrei: evenimentele
 * „pagehide” si „visibilitychange” se declanseaza si la schimbarea de tab sau
 * la navigarea in interiorul site-ului, deci ar deconecta utilizatorul din
 * mijlocul unui test. Heartbeat-ul rezolva problema fara astfel de erori.
 */
export default function SessionHeartbeat({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const esuatRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const ping = async () => {
      // Nu pingam daca pagina e ascunsa: utilizatorul nu e activ oricum,
      // iar semnalul ar prelungi artificial o sesiune lasata in calculator.
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/auth/ping", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (r.ok) {
          esuatRef.current = 0;
          return;
        }
        // 401 = sesiune expirata: trimitem utilizatorul la login.
        if (r.status === 401) {
          router.push("/login");
          router.refresh();
        }
      } catch {
        // Fara internet: ignoram, urmatorul ping va reincearca.
      }
    };

    ping();
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, router]);

  return null;
}
