import { redirect } from "next/navigation";

/** Pricing is hidden for now; send visitors to the waitlist. Restore from git history when pricing goes live. */
export default function Pricing() {
  redirect("/waitlist");
}
