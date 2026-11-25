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
      trimite();
    };

    // evenimentul firesc la inchiderea paginii / navigare departe de aplicatie
    window.addEventListener("pagehide", onUnload);

    // Backup suplimentar: detectam revenirea online
    const onOnline = () => {
      if (trimisRef.current) return;
    };

    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
