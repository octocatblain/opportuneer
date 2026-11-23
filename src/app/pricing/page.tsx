import type { Metadata } from "next";
import Link from "next/link";
import { Bulb, Coins, GrowthChart, HandNote, Megaphone, NoteArrow, PriceTag, Rocket, Sparkle, Squiggle, Target } from "@/components/doodles";
import { Motion } from "@/components/gsap-motion";
import { PilotOffer, PricingCards, PricingFinePrint } from "@/components/pricing";
import { btnSignal } from "@/components/ui";
import { waitlistCounts } from "@/lib/waitlist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pricing" };

/** Public pricing page. Describes plans only; no account data. */
export default async function Pricing() {
  const counts = await waitlistCounts();
  return (
    <Motion className="space-y-12 pt-6">
      <header className="relative max-w-2xl space-y-3">
        {/* Marketing, sales and value-proposition doodles in the empty right-hand side of the header */}
        <div aria-hidden className="pointer-events-none absolute -top-2 left-[105%] hidden h-64 w-[34rem] lg:block">
          <Megaphone className="left-0 top-0 h-24 w-32 -rotate-6 text-signal" float />
          <HandNote className="left-2 top-[6.5rem] -rotate-3 text-signal" text="tell your story" />
          <GrowthChart className="left-[11rem] top-4 h-24 w-28 text-ink-4" float />
          <HandNote className="left-[10.5rem] top-[7.5rem] rotate-2 text-ink-4" text="close more deals" />
          <Target className="left-[25rem] top-0 h-20 w-20 text-signal" float />
          <HandNote className="left-[24.5rem] top-[6.2rem] -rotate-2 text-signal" text="a clear offer" />
          <Sparkle className="left-[31rem] top-[8rem] h-10 w-10 text-ink-4" float />
        </div>
        <h1 data-m="chars" className="page-title " style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}>
          Simple pricing, in shillings.
        </h1>
        <div aria-hidden className="relative hidden h-3 md:block">
          <Squiggle className="left-0 top-0 h-4 w-52 text-signal" />
        </div>
        <p data-m="rise" className="text-lg leading-relaxed text-muted">Pick the track you need. No free tier after the pilot, no hidden fees, and nothing is ever sent without you.</p>
      </header>

      <section aria-labelledby="pilot" className="space-y-4">
        <h2 id="pilot" className="text-lg font-semibold">
          The pilot offer
        </h2>
        <PilotOffer full={counts.full} />
      </section>

      <section aria-labelledby="plans" className="relative space-y-4">
        <div aria-hidden className="pointer-events-none absolute -top-10 right-2 hidden md:block">
          <PriceTag className="right-0 top-0 h-12 w-16 rotate-6 text-signal" float />
          <HandNote className="right-40 top-2 w-64 rotate-2 text-right text-ink-4" text="honest prices, no surprises" />
          <Bulb className="right-24 top-0 h-12 w-10 text-ink-4" float />
        </div>
        <h2 id="plans" className="text-lg font-semibold">
          Plans
        </h2>
        <PricingCards />
      </section>

      <section className="relative flex flex-wrap items-center justify-between gap-4 rounded-md bg-ink p-8 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
          <Rocket className="-top-10 right-[22rem] h-24 w-20 rotate-12 text-signal" float />
          <Coins className="-bottom-6 right-[14rem] h-16 w-20 text-ink-4" float />
          <NoteArrow className="-top-9 left-[24rem] text-signal" text="your place is waiting" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold">{counts.full ? "The pilot is full." : `${counts.left} pilot places left.`}</h2>
          <p className="mt-1 text-sm text-white/70">Join the waitlist and we will email you when it is your turn.</p>
        </div>
        <Link href="/waitlist" className={btnSignal}>
          {counts.full ? "Join the public-launch waitlist" : "Join the waitlist"}
        </Link>
      </section>

      <PricingFinePrint />
    </Motion>
  );
}
