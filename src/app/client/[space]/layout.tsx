import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { onboardingSteps } from "@/lib/kyc";

/** Gate: regular accounts finish first-login KYC (details, resume, track targets) before using the workspace. */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (user && (await onboardingSteps(user)).length) redirect("/onboarding");
  return children;
}
