import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { btnSignal } from "@/components/ui";
import { showSignIn } from "@/lib/flags";

/** Header for visitors who aren't signed in: only the landing page and sign-in are reachable. */
export function PublicNav() {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 py-1.5 text-sm font-semibold text-ink">
        <BrandMark size={32} tile={false} />
        <Wordmark tone="light" />
      </Link>
      <nav aria-label="Account" className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
        <Link href="/waitlist" className="rounded-md px-3 py-2 font-medium text-muted transition-colors hover:bg-paper hover:text-ink active:bg-paper-2">
          Join waitlist
        </Link>
        <ThemeToggle />
        {showSignIn() && (
          <Link href="/login" className={btnSignal}>
            Sign in
          </Link>
        )}
      </nav>
    </>
  );
}
