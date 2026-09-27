import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTest } from "@/lib/config";
import CodForm from "./CodForm";

export const dynamic = "force-dynamic";

export default async function PaginaCod({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const t = getTest(id);
  if (!t) notFound();

  return <CodForm test={{ ...t }} />;
}
