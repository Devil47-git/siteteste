import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { getJson, K } from "@/lib/store";
import CodForm from "./CodForm";
import SessionHeartbeat from "@/app/SessionHeartbeat";
import { finalizeazaAttempt } from "@/lib/tentativa";

export const dynamic = "force-dynamic";

export default async function PaginaCod({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const t = getTest(id);
  if (!t) notFound();

  // Daca utilizatorul are deja o tentativa activa in desfasurare pentru acest test, il redirectionam direct
  const link = await getJson<{ attemptId?: string }>(K.attemptDeUser(user.id, id));
  if (link?.attemptId) {
    const att = await getJson<any>(K.attempt(link.attemptId));
    if (att && !att.finalizat) {
      if (Date.now() < att.expira) {
        redirect(`/test/${id}?a=${link.attemptId}`);
      } else {
        // Tentativa a depășit timpul limită: o finalizăm automat cu motiv "timp"
        await finalizeazaAttempt(att, "timp", t);
      }
    }
  }

  return (
    <>
      <SessionHeartbeat enabled />
      <CodForm test={{ ...t }} />
    </>
  );
}
