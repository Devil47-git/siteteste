import Link from "next/link";
import { getUser } from "@/lib/auth";
import { discordAuthorizeUrl } from "@/lib/discord-url";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ eroare?: string; detalii?: string }>;
}) {
  const { eroare, detalii } = await searchParams;
  const user = await getUser();

  return (
    <main className="wrap" style={{ maxWidth: 480, paddingTop: 70 }}>
      <div className="card" style={{ textAlign: "center", padding: "36px 30px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(255, 42, 75, 0.15) 0%, rgba(15, 98, 254, 0.15) 100%)",
          border: "1px solid rgba(255, 42, 75, 0.4)",
          color: "var(--medical-crimson)",
          marginBottom: 18,
          boxShadow: "0 0 24px rgba(255, 42, 75, 0.3)"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 10.5h-5.5V5a1.5 1.5 0 0 0-3 0v5.5H5a1.5 1.5 0 0 0 0 3h5.5V19a1.5 1.5 0 0 0 3 0v-5.5H19a1.5 1.5 0 0 0 0-3Z"/>
          </svg>
        </div>
        <div className="section-subtitle">DEPARTMENTUL MEDICAL LOS SANTOS</div>
        <h1 style={{ fontSize: 24, margin: "6px 0 10px" }}>Site-ul de teste teoretice a departamentului medical.</h1>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Autentificarea este securizată și disponibilă exclusiv prin contul Discord asociat departamentului.
        </p>

        {eroare && (
          <div className="alert err" style={{ textAlign: "left" }}>
            Autentificarea a eșuat. {detalii ? `(${detalii})` : "Încearcă din nou."}
          </div>
        )}

        {user ? (
          <>
            <div className="alert ok" style={{ textAlign: "left" }}>
              Ești autentificat ca <strong>{user.globalName || user.username}</strong>.
            </div>
            <Link className="btn medical" style={{ width: "100%", marginTop: 12 }} href="/">
              Accesează testele disponibile
            </Link>
          </>
        ) : (
          <a className="btn" style={{ width: "100%", marginTop: 16 }} href={discordAuthorizeUrl()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.3 4.5A19 19 0 0 0 15.6 3l-.2.4c1.7.4 3.1 1 4.4 1.7a17 17 0 0 0-14 0c1.3-.7 2.7-1.3 4.4-1.7L10 3a19 19 0 0 0-4.7 1.5C2.4 9 1.6 13.4 2 17.7A19 19 0 0 0 7.5 21l.8-1.4c-1-.3-2-.8-2.9-1.4l.7-.5a13.5 13.5 0 0 0 11.8 0l.7.5c-.9.6-1.9 1.1-2.9 1.4l.8 1.4a19 19 0 0 0 5.5-3.3c.5-5-.7-9.2-2.8-13.2ZM8.7 14.9c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm6.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
            </svg>
            Autentifică-te cu Discord
          </a>
        )}
      </div>
    </main>
  );
}
