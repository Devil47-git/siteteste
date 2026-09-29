"use client";

import { useEffect, useRef } from "react";

/**
 * Deconecteaza automat cand utilizatorul inchide browserul / tab-ul.
 *
 * Motiv: ne asiguram ca cine a primit acces la site mai este in departament.
 * Daca o persoana a fost eliminata din LISTA DEPARTAMENT, inchiderea browserului
 * ii stinge sesiunea, deci nu mai poate folosi site-ul dintr-un calculator ramas
 * deschis sau din istoricul browserului.
 *
 * Implementare: folosim sendBeacon (suporta de inchidere a tab-ului) inainte
 * de inchidere, plus un interval care detecteaza file/disconnect ca backup.
 * Nu folosim beforeunload pentru POST normal, deoarece browserul anuleaza
 * cererea chiar in momentul inchiderii.
 */
export default function LogoutOnClose() {
  const trimisRef = useRef(false);

  useEffect(() => {
    // Flag ca sa nu dublam logout-ul daca inchiderea vine din mai multe evenimente.
    let deja = false;
    const trimite = () => {
      if (deja) return;
      deja = true;
      const url = "/api/auth/logout";
      const blob = new Blob([""], { type: "application/json" });
      // sendBeacon este singura metoda care supravietuieste inchiderii tab-ului.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => { });
      }
    };

    const onUnload = () => {
      if (document.visibilityState === "hidden") trimite();
    };

    // evenimentul firesc la inchiderea paginii (desktop)
    window.addEventListener("pagehide", onUnload);
    // backup: pe mobil nu se apara "pagehide", se foloseste visibilitychange
    document.addEventListener("visibilitychange", onUnload);

    // Backup suplimentar: detectam file-ul conexiunii (inchidere fortata / crash).
    // Nu putem face request la inchidere, dar putem la revenirea in fereastra,
    // ca sa inchidem sesiunea care a ramas deschisa in server.
    const onOnline = () => {
      if (trimisRef.current) return;
    };

    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("pagehide", onUnload);
      document.removeEventListener("visibilitychange", onUnload);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
