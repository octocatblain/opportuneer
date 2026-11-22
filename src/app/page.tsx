import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getUser } from "@/lib/auth";
import { homeFor } from "@/lib/spaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opportuneer" };

/** "/" is the public landing page; signed-in accounts go to their own area. */
export default async function Home() {
  const user = await getUser();
  if (!user) return <Landing />;
  redirect(homeFor(user));
}
