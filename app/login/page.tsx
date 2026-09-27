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
    <main className="wrap" style={{ maxWidth: 460, paddingTop: 80 }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: 12, background: "rgba(224, 49, 49, 0.12)", border: "1px solid rgba(224, 49, 49, 0.3)", color: "#ff4d4f", marginBottom: 14 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 10.5h-5.5V5a1.5 1.5 0 0 0-3 0v5.5H5a1.5 1.5 0 0 0 0 3h5.5V19a1.5 1.5 0 0 0 3 0v-5.5H19a1.5 1.5 0 0 0 0-3Z"/>
          </svg>
        </div>
        <h1>Site teste departamentul medical los santos</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Accesul este disponibil exclusiv prin contul Discord.
        </p>

        {eroare && (
          <div className="alert err">
            Autentificarea a eșuat. {detalii ? `(${detalii})` : "Încearcă din nou."}
          </div>
        )}

        {user ? (
          <>
            <div className="alert ok">
              Ești autentificat ca <strong>{user.globalName || user.username}</strong>.
            </div>
            <Link className="btn" href="/">
              Mergi la teste
            </Link>
          </>
        ) : (
          <a className="btn" href={discordAuthorizeUrl()}>
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
