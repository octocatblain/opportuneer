import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { Brand } from "@/components/brand-icons";
import { btnSignal } from "@/components/ui";
import { showSignIn } from "@/lib/flags";
import { clientBase, spaceAllowsTrack, type Space } from "@/lib/spaces";

/** Site footer. Signed-in users get app links; visitors get sign-in links. */
export function Footer({ signedIn, admin, ownSpace = "duo" }: { signedIn: boolean; admin?: boolean; ownSpace?: Space }) {
  const base = clientBase(ownSpace);
  const links = signedIn
    ? [
        [base, "Today"],
        [`${base}/pipeline`, "Pipeline"],
        ...(spaceAllowsTrack(ownSpace, "JOB") ? [[`${base}/jobs`, "Jobs"]] : []),
        ...(spaceAllowsTrack(ownSpace, "PITCH") ? [[`${base}/companies`, "Companies"]] : []),
        [`${base}/settings`, "Settings"],
        ...(admin ? [["/admin", "Admin"]] : []),
      ]
    : [
        ["/waitlist", "Join the waitlist"],
        ...(showSignIn() ? [["/login", "Sign in"]] : []),
      ];
  const heading = "mb-3 text-xs font-semibold uppercase tracking-widest text-white/50";
  const link = "text-white/75 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline";
  return (
    <footer className="mt-8 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.1fr_1.3fr]">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <BrandMark size={32} className="rounded-md" />
            <Wordmark />
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">Opportunities that actually fit, and prospects that can pay. A private workspace: every account sees only its own content.</p>
          {!signedIn && (
            <Link href="/waitlist" className={btnSignal}>
              Join the waitlist
            </Link>
          )}
        </div>

        <nav aria-label="Footer" className="text-sm">
          <h2 className={heading}>{signedIn ? "Workspace" : "Explore"}</h2>
          <ul className="space-y-2.5">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <h2 className={heading}>You stay in control</h2>
          <ul className="space-y-2.5 text-white/75">
            <li>We draft. You decide.</li>
            <li>Your data stays in your account</li>
            <li>
              <Link href="/privacy" className={link}>
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={link}>
                Terms of service
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h2 className={heading}>Works with</h2>
          <ul className="space-y-3">
            {[
              ["Gmail", "Gmail", "We draft. You decide."],
              ["LinkedIn", "LinkedIn", "Pasted by you, never scraped"],
            ].map(([brand, name, note]) => (
              <li key={brand} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white">
                  <Brand name={brand} label="" size={22} />
                </span>
                <span className="leading-tight">
                  <span className="block font-medium text-white">{name}</span>
                  <span className="block text-xs text-white/60">{note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-white/60">
          <span>© {new Date().getFullYear()} Opportuneer. Built by Red Star Standard.</span>
          <span>Brand names and logos belong to their owners.</span>
        </div>
      </div>
    </footer>
  );
}
