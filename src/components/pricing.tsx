import Link from "next/link";
import { BestValueSeal, ScribbleRing } from "@/components/doodles";
import { Motion } from "@/components/gsap-motion";
import { btn, btnSignal } from "@/components/ui";

// Source: plan.md "Pricing and monthly caps". KES, billed monthly. Change a price only after the real credit cost is measured in the pilot.
const PLANS = [
  {
    name: "Jobs",
    pitch: "For people looking for work.",
    standard: 999,
    founding: 499,
    outcome: "Up to 25 full applications a month",
    features: ["Daily scan of Kenyan and Africa-friendly remote boards", "Fit score and trust check on every role", "Company research", "Tailored CV and cover letter PDFs", "Gmail drafts and follow-ups"],
  },
  {
    name: "Pitches",
    pitch: "For freelancers, agencies and recruiters.",
    standard: 2499,
    founding: 1249,
    outcome: "Up to 30 full proposals a month",
    features: ["Prospect scoring: size, budget signals, AI readiness", "Company research", "Tailored proposal or pitch PDFs", "Gmail drafts and follow-ups", "Pipeline board with due follow-ups"],
  },
  {
    name: "Duo",
    pitch: "Both tracks, one shared monthly allowance.",
    standard: 2999,
    founding: 1499,
    outcome: "About 19 applications and 22 proposals a month",
    features: ["Everything in Jobs and Pitches", "Switch between the two spaces in one account", "Cheaper than buying both separately"],
    featured: true,
  },
];

const kes = (n: number) => `KES ${n.toLocaleString("en-US")}`;

const FINE_PRINT = [
  "Prices are in Kenyan shillings, billed monthly. M-Pesa and card payments are planned; checkout opens with the public launch.",
  "Allowances reset on your billing date and do not roll over. Extra credits (100 for KES 250) will be available as a top-up.",
  "Opportuneer never sends anything for you. Every email stays a Gmail draft until you send it.",
  "These are launch prices and may change after the pilot. Anyone already on a plan is told first.",
];

/** Plan cards. Shared by the /pricing page and the home page teaser. */
export function PricingCards() {
  return (
    <Motion className="grid gap-4 lg:grid-cols-3">
      {PLANS.map((p) => (
        <div key={p.name} data-m="rise" data-m-hover className={`relative flex h-full flex-col rounded-md border p-6 ${p.featured ? "border-signal-dark bg-white ring-1 ring-signal-dark" : "border-rule bg-white"}`}>
          {p.featured && <BestValueSeal className="-right-5 -top-9 hidden h-20 w-16 rotate-12 text-signal-dark sm:block" float />}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            {p.featured && (
              <span className="relative px-1">
                <span data-m="pop" data-m-rot="-10" data-m-delay={0.4} className="relative inline-block rounded-full bg-signal px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">
                  Best value
                </span>
                <ScribbleRing className="-inset-x-1.5 -inset-y-2 hidden h-[calc(100%+1rem)] w-[calc(100%+0.75rem)] text-signal-dark sm:block" />
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{p.pitch}</p>
          <p className="mt-5 text-4xl font-extrabold tabular-nums">
            {kes(p.standard)}
            <span className="ml-1 text-sm font-medium text-muted">/month</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Founding members: <strong className="text-ink">{kes(p.founding)}</strong> for the first 3 months
          </p>
          <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm font-medium">{p.outcome}</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden className="text-signal-dark">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Motion>
  );
}

/** The pilot offer: who pays what in the first three months. */
export function PilotOffer({ full }: { full: boolean }) {
  return (
    <Motion className="grid gap-4 sm:grid-cols-3">
      {[
        ["First 10 to join", "Free for 3 months", "Pilot Cohort A opens 30 November. Standard price after."],
        ["Next 20 to join", "Half price for 3 months", "Founding members, Cohort B opens 7 December. Standard price after."],
        ["Everyone after", "Standard price", "Public-launch waitlist, invited in small batches in join order."],
      ].map(([who, what, note]) => (
        <div key={who} data-m="rise" data-m-hover className="rounded-md bg-ink p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{who}</p>
          <p className="mt-2 text-xl font-extrabold">{what}</p>
          <p className="mt-1 text-sm text-white/70">{note}</p>
        </div>
      ))}
      {full && <p className="text-xs text-muted sm:col-span-3">All 30 pilot places are taken. The public-launch waitlist is open.</p>}
    </Motion>
  );
}

export function PricingFinePrint() {
  return (
    <ul className="space-y-1 text-xs leading-relaxed text-muted">
      {FINE_PRINT.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function PricingCta({ full }: { full: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/waitlist" className={btnSignal}>
        {full ? "Join the public-launch waitlist" : "Join the waitlist"}
      </Link>
      <Link href="/pricing" className={btn}>
        See full pricing
      </Link>
    </div>
  );
}
