import Link from "next/link";
import { Brand } from "@/components/brand-icons";
import { Motion } from "@/components/gsap-motion";
import { LaunchBanner } from "@/components/launch-banner";
import { WorkflowMap } from "@/components/workflow-map";
import { btn, btnGhost, btnSignal } from "@/components/ui";
import { waitlistCounts } from "@/lib/waitlist";

const FEATURES: [string, string, string][] = [
  ["01", "Scans the boards for you", "Kenyan job boards and remote boards that hire in Africa are checked every day. Only roles that match your target titles survive."],
  ["02", "Filters out the noise", "Posts that ask for fees, hide the employer or leave duties vague are archived with a reason, so your shortlist stays trustworthy."],
  ["03", "Scores every company", "Size, budget signals, how late a company is to AI and its growth. You see whether to apply, pitch your agency, or both."],
  ["04", "We draft. You decide.", "Tailored CVs, cover letters and pitch proposals are written as PDFs. Emails land in your Gmail as drafts, so you stay in control."],
  ["05", "One pipeline", "A Kanban board from shortlist to won, with follow-ups that come due on their own."],
  ["06", "Private by design", "Every account sees only its own jobs, companies and documents. Nothing is shared between accounts."],
];

const STEPS: [string, string][] = [
  ["Join the waitlist", "Access is by invitation. Pilot places go out in join order, then the public launch in batches."],
  ["Scan or paste", "Run a scan, or paste a post from LinkedIn, BrighterMonday or Fuzu."],
  ["Review the fit", "See the score, the reasons and the company research."],
  ["Send from Gmail", "Review the drafts in Gmail and send them yourself."],
];

const SOURCE_GROUPS: { title: string; note: string; items: [string, string?][] }[] = [
  { title: "Kenyan job boards", note: "Checked daily. Every post passes a trust check before it reaches you.", items: [["BrighterMonday"], ["MyJobMag"]] },
  { title: "Remote boards", note: "Kept only when the post names Africa or Kenya.", items: [["Remote4Africa"], ["Himalayas"], ["Remotive"], ["Jobicy"], ["RemoteOK"]] },
  { title: "You paste it in", note: "No scraping. Paste a post and it is scored like any other.", items: [["LinkedIn", "LinkedIn (pasted by you)"]] },
  { title: "Your accounts", note: "Sign in with Google. Emails land as drafts and you press send.", items: [["Gmail", "Gmail (drafts only)"], ["Google", "Google sign-in"]] },
];

/** Public home page shown before sign-in. Describes the app only; no account data. */
export async function Landing() {
  const counts = await waitlistCounts();
  return (
    <Motion className="space-y-14 sm:space-y-20">
      <LaunchBanner left={counts.left} full={counts.full} />

      <section className="grid items-center gap-10 pt-4 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <h1 data-m="chars" className="page-title " style={{ fontSize: "clamp(2.5rem, 6vw, 4.75rem)" }}>
            Opportunities that actually fit. Prospects that can pay.
          </h1>
          <p data-m="rise" className="max-w-xl text-lg leading-relaxed text-muted">
            Opportuneer finds and scores jobs, researches companies, and drafts tailored applications and pitches, then leaves every send to you.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/waitlist" data-m="pop" data-m-rot="-6" data-m-hover className={btnSignal}>
              {counts.full ? "Join the public-launch waitlist" : "Join the waitlist"}
            </Link>
            <Link href="/login" data-m="pop" data-m-rot="6" data-m-delay={0.1} data-m-hover className={btnGhost}>
              Sign in
            </Link>
          </div>
          <p data-m="rise" className="text-xs text-muted">
            {counts.full ? "All 30 pilot places are taken. The public-launch waitlist is open." : `The pilot opens 30 November with 30 places. ${counts.left} left.`} Signed-out visitors can see public pages only.
          </p>
        </div>
        <div data-m-parallax="18" className="relative lg:col-span-2">
          <div data-m="right" className="relative overflow-hidden rounded-md bg-ink text-white">
            <div className="px-6 pt-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">How the day looks</p>
              <h2 className="mt-2 text-2xl font-extrabold uppercase leading-tight tracking-tight">Two tracks, one inbox</h2>
            </div>

            {/* Split poster: the job hunt on the left, the agency pitch on the right, joined by a centre spine. */}
            <div className="relative mt-5 grid grid-cols-2">
              <div aria-hidden className="absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/30" />
              <div aria-hidden data-m="pop" data-m-rot="180" data-m-delay={0.5} className="absolute left-1/2 top-1/2 z-20 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-lg font-extrabold text-ink">
                +
              </div>

              {[
                { tone: "bg-white/5", label: "The job hunt", score: "92", title: "Platform Engineer", sub: "Remote, open to Kenya", rows: [["84", "AI Automation Lead"], ["79", "Data Platform Lead"]], stat: "Roles that fit", num: "12" },
                { tone: "bg-signal-dark", label: "The agency pitch", score: "71", title: "Logistics firm", sub: "Budget signals found", rows: [["68", "Retail chain"], ["65", "Clinic group"]], stat: "Prospects that can pay", num: "5" },
              ].map((s, i) => (
                <div key={s.label} data-m={i === 0 ? "left" : "right"} className={`${s.tone} min-w-0 space-y-4 px-3 py-6 sm:px-4`}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">{s.label}</p>
                  <div>
                    <span data-m="count" data-m-count={s.score} className="block text-5xl font-extrabold leading-none tabular-nums sm:text-6xl">{s.score}</span>
                    <span className="mt-2 block text-sm font-semibold leading-snug">{s.title}</span>
                    <span className="block text-xs text-white/75">{s.sub}</span>
                  </div>
                  <ul className="space-y-2 border-t border-white/20 pt-3 text-xs">
                    {s.rows.map(([n, t]) => (
                      <li key={t} className="flex items-baseline gap-2">
                        <span className="font-bold tabular-nums">{n}</span>
                        <span className="text-white/80">{t}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/20 pt-3">
                    <span data-m="count" data-m-count={s.num} className="block text-3xl font-extrabold tabular-nums">{s.num}</span>
                    <span className="block text-[11px] uppercase tracking-wide text-white/75">{s.stat}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Closing strip, like the poster's headline band. */}
            <div className="bg-white px-6 py-4 text-center text-ink">
              <p className="text-sm font-extrabold uppercase tracking-wide">Scan. Score. Draft. You send.</p>
              <p className="mt-1 text-[11px] text-muted">Illustration only. Numbers are examples.</p>
            </div>
          </div>
        </div>
      </section>

      <WorkflowMap />

      <section aria-labelledby="features"className="space-y-8">
        <div className="space-y-2">
          <h2 id="features" data-m="chars" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
            From noisy boards to a short list.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([n, title, body]) => (
            <div key={n} data-m="rise" data-m-hover className="h-full rounded-md border border-rule bg-white p-6">
                <span data-m="pop" data-m-rot="-20" className="inline-block text-lg font-semibold tabular-nums text-signal-dark">{n}</span>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps" className="space-y-8">
        <h2 id="steps" data-m="chars" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
          Four steps, one sitting.
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} data-m="rise" data-m-hover className="rounded-md bg-ink p-6 text-white">
              <span data-m="pop" data-m-rot="-30" className="inline-block text-3xl font-semibold tabular-nums text-white/60">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-white/70">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sources" className="space-y-8">
        <div className="space-y-2">
          <h2 id="sources" data-m="chars" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
            Where it looks, and what it touches.
          </h2>
          <p data-m="rise" className="max-w-xl text-muted">Public boards are read for you. LinkedIn is only ever what you paste. Your Gmail is used for drafts, never for sending.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.title} data-m="rise" data-m-hover className="rounded-md border border-rule bg-white p-5">
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{g.note}</p>
              <ul className="mt-4 space-y-2.5 border-t border-rule pt-4 text-sm text-muted">
                {g.items.map(([name, label]) => (
                  <li key={name}>
                    <Brand name={name} label={label} size={20} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/waitlist" data-m="pop" data-m-rot="-4" data-m-hover className={btn}>
            Join the waitlist
          </Link>
          <Link href="/login" className="link text-sm font-medium">
            Sign in
          </Link>
        </div>
      </section>
    </Motion>
  );
}
