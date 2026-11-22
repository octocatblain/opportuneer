import Link from "next/link";
import { Brand } from "@/components/brand-icons";
import { Reveal } from "@/components/motion";
import { btn, btnGhost, btnSignal } from "@/components/ui";
import { waitlistCounts } from "@/lib/waitlist";

const FEATURES: [string, string, string][] = [
  ["01", "Scans the boards for you", "Kenyan job boards and remote boards that hire in Africa are checked every day. Only roles that match your target titles survive."],
  ["02", "Filters out the noise", "Posts that ask for fees, hide the employer or leave duties vague are archived with a reason, so your shortlist stays trustworthy."],
  ["03", "Scores every company", "Size, budget signals, how late a company is to AI and its growth. You see whether to apply, pitch your agency, or both."],
  ["04", "Drafts, never sends", "Tailored CVs, cover letters and pitch proposals are written as PDFs. Emails land in your Gmail as drafts, so you stay in control."],
  ["05", "One pipeline", "A Kanban board from shortlist to won, with follow-ups that come due on their own."],
  ["06", "Private by design", "Every account sees only its own jobs, companies and documents. Nothing is shared between accounts."],
];

const STEPS: [string, string][] = [
  ["Join the waitlist", "Access is by invitation. Pilot places go out in join order, then the public launch in batches."],
  ["Scan or paste", "Run a scan, or paste a post from LinkedIn, BrighterMonday or Fuzu."],
  ["Review the fit", "See the score, the reasons and the company research."],
  ["Send from Gmail", "Review the drafts in Gmail and send them yourself."],
];

/** Public home page shown before sign-in. Describes the app only; no account data. */
export async function Landing() {
  const counts = await waitlistCounts();
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <h1 className="page-title " style={{ fontSize: "clamp(2.5rem, 6vw, 4.75rem)" }}>
            Opportunities that actually fit. Prospects that can pay.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Opportuneer finds and scores jobs, researches companies, and drafts tailored applications and pitches, then leaves every send to you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/waitlist" className={btnSignal}>
              {counts.full ? "Join the public-launch waitlist" : "Join the waitlist"}
            </Link>
            <Link href="/login" className={btnGhost}>
              Sign in
            </Link>
          </div>
          <p className="text-xs text-muted">
            {counts.full ? "All 30 pilot places are taken. The public-launch waitlist is open." : `The pilot opens 30 November with 30 places. ${counts.left} left.`} Signed-out visitors can see public pages only.
          </p>
        </div>
        <div className="relative lg:col-span-2">
                              <div className="relative space-y-4 rounded-xl bg-ink p-6 text-white">
            <h2 className="text-sm font-semibold text-white/70">How the day looks</h2>
            {[
              ["92", "Platform Engineer", "Remote, open to Kenya"],
              ["84", "AI Automation Lead", "Nairobi, verified employer"],
              ["71", "Pitch: logistics firm", "Budget signals found"],
            ].map(([score, title, sub]) => (
              <div key={title} className="flex items-center gap-4 rounded-lg bg-white/5 p-3">
                <span className="text-2xl font-semibold tabular-nums text-signal">{score}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{title}</span>
                  <span className="block truncate text-xs text-white/70">{sub}</span>
                </span>
              </div>
            ))}
            <p className="text-xs text-white/70">Illustration only.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="features" className="space-y-8">
        <div className="space-y-2">
          <h2 id="features" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
            From noisy boards to a short list.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([n, title, body], i) => (
            <Reveal key={n} delay={i * 0.04}>
              <div className="h-full rounded-xl border border-rule bg-white p-6">
                <span className="text-lg font-semibold tabular-nums text-signal-dark">{n}</span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps" className="space-y-8">
        <h2 id="steps" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
          Four steps, one sitting.
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-xl bg-ink p-6 text-white">
              <span className="text-3xl font-semibold tabular-nums text-white/60">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-white/70">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sources" className="rounded-xl border border-rule bg-white p-8">
        <h2 id="sources" className="text-lg font-semibold">
          Sources and services
        </h2>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
          {["BrighterMonday", "MyJobMag", "Remote4Africa", "Himalayas", "Remotive", "Jobicy", "RemoteOK"].map((b) => (
            <li key={b}>
              <Brand name={b} />
            </li>
          ))}
          <li>
            <Brand name="LinkedIn" label="LinkedIn (pasted by you)" />
          </li>
          <li>
            <Brand name="Gmail" label="Gmail (drafts only)" />
          </li>
          <li>
            <Brand name="Google" label="Google sign-in" />
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/waitlist" className={btn}>
            Join the waitlist
          </Link>
          <Link href="/login" className="link text-sm font-medium">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
