import { Caveat } from "next/font/google";
import Link from "next/link";
import { Motion } from "@/components/gsap-motion";
import { BrandMark } from "@/components/brand-mark";

const hand = Caveat({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

// Source: plan.md "Build-in-public calendar". Times are Nairobi (UTC+3); an item is "live" from 00:00 on its date.
const at = (month: number, day: number) => Date.UTC(2026, month - 1, day, -3);

// Warm "menu board" palette: kraft paper, cream lettering, brown ink. Fixed on purpose, so it reads the same in light and dark themes.
const KRAFT = "#c9a67b";
const CREAM = "#fff4d9";
const BROWN = "#4a3320";
const BLUE = "#33508f";

type Item = { day: string; month: string; weekday: string; title: string; note: string; from: number; until?: number; tag?: string; fav?: boolean };

const ITEMS: Item[] = [
  { day: "23", month: "Nov", weekday: "Mon", title: "Build in public", note: "One real update a day, right up to the pilot launch: scan, score, research, drafts, trust.", from: at(11, 23), until: at(11, 30), tag: "DAILY · until 30 Nov" },
  { day: "24", month: "Nov", weekday: "Tue", title: "Waitlist is open", note: "Joining early decides your place in the pilot.", from: at(11, 24) },
  { day: "30", month: "Nov", weekday: "Mon", title: "Cohort A: the first 10", note: "Invited by email on opening day.", from: at(11, 30), tag: "PILOT · first 10", fav: true },
  { day: "7", month: "Dec", weekday: "Mon", title: "Cohort B: the next 20", note: "Founding members join the pilot.", from: at(12, 7), tag: "PILOT · next 20" },
];

const Star = ({ className = "" }: { className?: string }) => (
  <span aria-hidden data-m="spin" className={`absolute select-none ${className}`} style={{ color: CREAM, opacity: 0.8 }}>
    ✦
  </span>
);

/** Marketing banner for the home page, drawn as a cafe menu board: the pre-launch dates and pilot dates as "dishes" with price tags. */
export function LaunchBanner({ left, full }: { left: number; full: boolean }) {
  const now = Date.now();
  // An item is "Now" from its date until it ends: its own `until` (build in public runs to the pilot launch), else when the next item starts.
  const stateOf = (i: number): "Done" | "Now" | "Soon" => {
    const it = ITEMS[i];
    const end = it.until ?? ITEMS[i + 1]?.from ?? Infinity;
    return now < it.from ? "Soon" : now < end ? "Now" : "Done";
  };

  return (
    <Motion>
    <section aria-labelledby="launch" className="relative overflow-hidden rounded-md px-5 pb-6 pt-5 sm:px-8" style={{ background: KRAFT, color: BROWN }}>
      <Star className="left-[38%] top-6 text-2xl" />
      <Star className="right-[12%] top-24 text-xl" />
      <Star className="bottom-28 left-[6%] text-lg" />

      {/* Headline, in the poster's big cream lettering */}
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-2 lg:flex-nowrap">
        <div className="min-w-0">
          <p data-m="left" className={`${hand.className} text-xl font-bold sm:text-2xl`}>The waitlist is now open! Here is the plan:</p>
          <div className="flex items-center gap-3 sm:gap-4">
            <BrandMark size={96} className="h-[clamp(2.25rem,8vw,6rem)] w-[clamp(2.25rem,8vw,6rem)] shrink-0" />
            <h2 id="launch" data-m="chars" className="font-extrabold uppercase leading-[0.9] tracking-tight" style={{ color: CREAM, fontSize: "clamp(2.25rem, 8vw, 6.5rem)" }}>
              Launch dates
            </h2>
          </div>
        </div>
        <div data-m="right" className="max-w-xs -rotate-1 pb-1 sm:-rotate-2 lg:shrink-0 lg:text-right">
          <p className={`${hand.className} text-2xl font-bold leading-tight sm:text-3xl`}>
            Waitlist <span style={{ color: "#b5381d" }}>open now!</span> Pilot starts 30 Nov.
          </p>
          <p className={`${hand.className} text-xl`}>{full ? "All 30 places are taken. Join the public-launch waitlist." : `30 places, first come first served. ${left} left.`}</p>
        </div>
      </div>

      {/* The menu: each date is a dish on a plate, with a speech-bubble label and a price tag */}
      <ol className="relative mt-5 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it, i) => {
          const state = stateOf(i);
          const isNow = state === "Now";
          return (
            <li key={it.title} className="relative flex flex-col items-center text-center">
              <span
                data-m="pop" data-m-rot="-6" data-m-delay={i * 0.1} className={`${hand.className} mb-3 inline-block rounded-[1.25rem] px-4 py-1 text-xl font-bold`}
                style={{ background: CREAM, color: BROWN, boxShadow: isNow ? `0 0 0 3px ${BLUE}` : undefined }}
              >
                {it.weekday} {it.day} {it.month}
              </span>

              {/* Plate with the date */}
              <div data-m="pop" data-m-rot="-120" data-m-delay={i * 0.1 + 0.1} data-m-hover="4" className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: CREAM, boxShadow: `0 0 0 6px ${BLUE}, 0 0 0 9px ${CREAM}` }}>
                <div className="leading-none">
                  <span data-m="count" data-m-count={it.day} className="block text-6xl font-extrabold tabular-nums" style={{ color: BLUE }}>
                    {it.day}
                  </span>
                  <span className="mt-1 block text-sm font-bold uppercase tracking-widest" style={{ color: BROWN }}>
                    {it.month}
                  </span>
                </div>
                <span data-m="float" className={`${hand.className} absolute -right-3 -top-3 rotate-6 rounded-full px-2.5 py-0.5 text-lg font-bold`} style={{ background: isNow ? "#b5381d" : BROWN, color: CREAM }}>
                  {state}
                </span>
              </div>

              <h3 data-m="rise" className="mt-6 text-lg font-extrabold leading-snug">{it.title}</h3>
              <p data-m="rise" className="mt-1 max-w-[16rem] text-sm leading-snug" style={{ color: BROWN, opacity: 0.85 }}>
                {it.note}
              </p>

              {/* Price tag, like the poster's "$ 3,50" labels */}
              {it.tag && (
                <span data-m="pop" data-m-rot="10" data-m-delay={0.3} className="mt-3 inline-block -rotate-2 rounded-md px-3 py-1 text-sm font-extrabold tracking-wide" style={{ background: CREAM, color: "#b5381d", boxShadow: `0 0 0 2px ${BROWN} inset` }}>
                  {it.tag}
                </span>
              )}
              {it.fav && <span data-m="rise" className={`${hand.className} mt-1 -rotate-3 text-xl font-bold`}>★ customer&apos;s favourite!</span>}
            </li>
          );
        })}
      </ol>

      {/* Footer: the public launch, as the poster's "come & visit us" bubble */}
      <div data-m="rise" className="relative mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] px-6 py-3" style={{ background: CREAM }}>
        <div>
          <p className={`${hand.className} text-2xl font-bold`}>Then the public launch ♥</p>
          <p className="text-xs" style={{ color: BROWN, opacity: 0.85 }}>
            Invites go out in small weekly batches, in the order people joined. The date goes to the waitlist first.
          </p>
        </div>
        <Link href="/waitlist" data-m="pop" data-m-rot="-4" data-m-hover className="w-full rounded-md px-5 py-2.5 text-center text-sm font-extrabold transition-opacity hover:opacity-90 sm:w-auto" style={{ background: BROWN, color: CREAM }}>
          {full ? "Join the public-launch waitlist" : "Claim a pilot place"}
        </Link>
      </div>
    </section>
    </Motion>
  );
}
