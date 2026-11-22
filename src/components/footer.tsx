import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { Brand } from "@/components/brand-icons";
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
        ["/login", "Sign in"],
      ];
  return (
    <footer className="mt-8 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <BrandMark size={28} className="rounded-md" />
            <Wordmark />
          </span>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">A private workspace for strategic job search and client outreach. Every account sees only its own content.</p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <h2 className="mb-3 text-sm font-semibold text-white">{signedIn ? "Workspace" : "Access"}</h2>
          <ul className="space-y-2">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-white/70 transition-colors hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm">
          <h2 className="mb-3 text-sm font-semibold text-white">Works with</h2>
          <ul className="space-y-2 text-white/70">
            <li>
              <span className="inline-flex rounded-md bg-white p-0.5">
                <Brand name="Gmail" label="" />
              </span>{" "}
              <span className="align-middle">Gmail: drafts only, never auto-sent</span>
            </li>
            <li>
              <span className="inline-flex rounded-md bg-white p-0.5">
                <Brand name="LinkedIn" label="" />
              </span>{" "}
              <span className="align-middle">LinkedIn: pasted by you, never scraped</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-white/60">
          <span>© {new Date().getFullYear()} Opportuneer</span>
          <span>Brand names and logos belong to their owners.</span>
        </div>
      </div>
    </footer>
  );
}
