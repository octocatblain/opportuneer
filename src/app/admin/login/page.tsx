import { redirect } from "next/navigation";

/** Old admin sign-in address: there is now one shared sign-in at /login for everyone. */
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.error) q.set("error", sp.error);
  if (sp.next) q.set("next", sp.next);
  redirect(`/login${q.size ? `?${q}` : ""}`);
}
