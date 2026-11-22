import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { btnSignal } from "@/components/ui";

/** Header for visitors who aren't signed in: only the landing page and sign-in are reachable. */
export function PublicNav() {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-ink py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white transition-colors hover:bg-ink-3 active:bg-ink-2">
        <BrandMark size={28} className="rounded-md" />
        <Wordmark />
      </Link>
      <nav aria-label="Account" className="flex items-center gap-2 text-sm">
        <Link href="/waitlist" className="rounded-md px-3 py-2 font-medium text-muted transition-colors hover:bg-paper hover:text-ink active:bg-paper-2">
          Join waitlist
        </Link>
        <Link href="/login" className={btnSignal}>
          Sign in
        </Link>
      </nav>
    </>
  );
}
