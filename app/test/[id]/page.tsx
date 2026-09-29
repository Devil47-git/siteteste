import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import { getJson, K } from "@/lib/store";
import TestClient from "./TestClient";
import SessionHeartbeat from "@/app/SessionHeartbeat";

export const dynamic = "force-dynamic";

export default async function PaginaTest({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { a } = await searchParams;
  const t = getTest(id);
  if (!t) notFound();
  if (!a) redirect(`/cod/${id}`);

  const link = await getJson<any>(K.attemptDeUser(user.id, id));
  if (!link || link.attemptId !== a) redirect(`/cod/${id}`);

  return (
    <>
      <SessionHeartbeat enabled />
      <TestClient attemptId={a} numeTest={t.nume} greseliPermise={t.greseliPermise} />
    </>
  );
}
