import type { Metadata } from "next";
import Link from "next/link";
import { joinWaitlistAction } from "@/app/waitlist-actions";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Flash, input } from "@/components/ui";
import { industries } from "@/config/profile";
import { COHORT_A_SIZE, COHORT_B_SIZE, OCCUPATIONS, PILOT_SIZE, ROLE_TYPES, waitlistCounts } from "@/lib/waitlist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join the waitlist" };

const OUTCOME: Record<string, { title: string; body: string }> = {
  A: {
    title: "You're in the first 10",
    body: "You have a pilot place in Cohort A. Invites go out by email when the pilot opens on Monday 30 November. Access is free for the first 3 months.",
  },
  B: {
    title: "You have a pilot place",
    body: "You are in Cohort B, which opens on Monday 7 December. Cohort B members are founding members: half the standard price for the first 3 months. Details come with your invite.",
  },
  P: {
    title: "You're on the public-launch waitlist",
    body: "The 30 pilot places are taken, so you're on the list for the public launch. We invite people in small batches, in the order they joined.",
  },
  dup: {
    title: "You're already on the list",
    body: "This email is already registered. There is nothing more to do; we'll email you when it's your turn.",
  },
};

/** Public waitlist. The first 10 signups become pilot cohort A, the next 20 cohort B, everyone after joins the public-launch list. */
export default async function Waitlist({ searchParams }: { searchParams: Promise<{ joined?: string; error?: string; src?: string }> }) {
  const sp = await searchParams;
  const counts = await waitlistCounts();
  const outcome = sp.joined ? OUTCOME[sp.joined] : undefined;

  if (outcome) {
    return (
      <div className="mx-auto max-w-lg space-y-5 pt-10 text-center">
        <span className="eyebrow">Opportuneer, built by Red Star Standard</span>
        <h1 className="page-title tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          {outcome.title}
        </h1>
        <p className="text-base leading-relaxed text-ink-4">{outcome.body}</p>
        <Link href="/" className="link text-sm font-medium">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-8">
      <div className="space-y-3">
        <span className="eyebrow">Opportuneer, built by Red Star Standard</span>
        <h1 className="page-title tracking-tight" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          Join the <em>waitlist</em>
        </h1>
        {counts.full ? (
          <p className="text-sm leading-relaxed text-ink-4">
            All {PILOT_SIZE} pilot places are taken. Join the public-launch waitlist and we&apos;ll invite people in small batches, in the order they joined.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-ink-4">
            The pilot has {PILOT_SIZE} places and opens on 30 November. <strong className="text-ink">{counts.left} left.</strong> The first {COHORT_A_SIZE} to join get free access for 3 months. The next {COHORT_B_SIZE} join as
            founding members at half price for 3 months. After that the waitlist stays open for the public launch.
          </p>
        )}
      </div>

      <Flash error={sp.error} />

      <form action={joinWaitlistAction} className="relative space-y-3 rounded-[28px] bg-white p-6 shadow-sm">
        <input type="hidden" name="src" value={sp.src ?? ""} />
        {/* Honeypot: hidden from people, tempting to bots. */}
        <div aria-hidden className="absolute -left-[9999px]">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Name</span>
          <input name="name" autoComplete="name" className={input} />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <fieldset className="space-y-1 text-sm">
          <legend className="text-xs font-medium text-slate-600">I want to use Opportuneer to</legend>
          {[
            ["SEEKER", "Find a job (Seeker)"],
            ["PITCH", "Win clients as a freelancer, agency or recruiter (Pitch)"],
            ["BOTH", "Both"],
          ].map(([v, label], i) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="track" value={v} required defaultChecked={i === 0} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">I am a</span>
          <select name="roleType" className={input} defaultValue="">
            <option value="">Choose (optional)</option>
            {ROLE_TYPES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Your field (job seekers)</span>
            <select name="occupation" className={input} defaultValue="">
              <option value="">Choose (optional)</option>
              {OCCUPATIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Industry you pitch to</span>
            <select name="industry" className={input} defaultValue="">
              <option value="">Choose (optional)</option>
              {industries.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-600">Country</span>
          <input name="country" defaultValue="Kenya" autoComplete="country-name" className={input} />
        </label>
        <label className="flex items-start gap-2 text-xs text-ink-4">
          <input type="checkbox" name="consent" required className="mt-0.5" />
          <span>I agree that Red Star Standard may email me about my place on the waitlist and the Opportuneer launch.</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-ink-4">
          <input type="checkbox" name="marketing" className="mt-0.5" />
          <span>Also send me occasional product updates (optional).</span>
        </label>
        <SubmitButton className={`${btnSignal} w-full`} pending="Joining…">
          {counts.full ? "Join the public-launch waitlist" : "Claim my place"}
        </SubmitButton>
      </form>

      <p className="text-xs leading-relaxed text-ink-4">
        Privacy: we store what you enter here to run the waitlist and pick the pilot mix, and nothing else. We never sell it. It is used only by Red Star Standard, and you can ask us to delete your entry at any time. Names and emails are not
        used in analytics.
      </p>
      <p className="text-center text-xs text-ink-4">
        <Link href="/" className="link">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
