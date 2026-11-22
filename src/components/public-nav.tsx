import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/** Header for visitors who aren't signed in: only the landing page and sign-in are reachable. */
export function PublicNav() {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-lg shadow-ink/10">
        <BrandMark size={28} className="rounded-full" />
        Opportuneer
      </Link>
      <nav aria-label="Account" className="flex items-center gap-1 rounded-full border border-white/70 bg-white/70 p-1 text-sm shadow-lg shadow-ink/5 backdrop-blur-md">
        <Link href="/waitlist" className="rounded-full px-4 py-1.5 font-medium text-ink-4 transition-colors hover:bg-canvas hover:text-ink">
          Join waitlist
        </Link>
        <Link href="/login" className="rounded-full bg-signal px-4 py-1.5 font-semibold text-white transition-colors hover:bg-signal-dark">
          Sign in
        </Link>
      </nav>
    </>
  );
}
