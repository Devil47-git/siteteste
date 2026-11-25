import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { getJson, K } from "@/lib/store";
import CodForm from "./CodForm";
import SessionHeartbeat from "@/app/SessionHeartbeat";

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
    if (att && !att.finalizat && Date.now() < att.expira) {
      redirect(`/test/${id}?a=${link.attemptId}`);
    }
  }

  return (
    <>
      <SessionHeartbeat enabled />
      <CodForm test={{ ...t }} />
    </>
  );
}
