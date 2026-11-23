import { notFound, redirect } from "next/navigation";
import { requireSpace } from "@/lib/auth";
import { clientBase, isSpace } from "@/lib/spaces";

/** Adding a job is now a right-hand sidebar; old links land on the jobs list with it open. */
export default async function AddJob({ params }: { params: Promise<{ space: string }> }) {
  const { space } = await params;
  if (!isSpace(space)) notFound();
  await requireSpace(space);
  redirect(`${clientBase(space)}/jobs?add=1`);
}
