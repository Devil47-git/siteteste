"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SessionHeartbeat from "./SessionHeartbeat";

/**
 * Re-fetches the server-rendered data when the tab regains focus or becomes
 * visible again, so cooldowns / attempt states on the home page stay fresh
 * without a manual reload.
 */
export default function HomeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return (
    <>
      {/* Semnalizeaza periodic ca browserul e deschis; sesiunea expira daca nu vine. */}
      <SessionHeartbeat enabled />
      {/* Re-randeaza datele de pe pagina cand tab-ul devine activ la loc. */}
    </>
  );
}
