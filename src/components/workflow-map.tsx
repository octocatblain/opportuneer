import { Motion } from "@/components/gsap-motion";
import { Caveat } from "next/font/google";
import { LoopArrows } from "@/components/loop-arrows";

const hand = Caveat({ subsets: ["latin"], weight: ["700"], display: "swap" });

// The user journey, in the order it really happens, drawn as a loop: scan, filter, score, draft, the user sends from Gmail,
// follow through, then back to scanning. On extra-wide screens the six cards sit clockwise on a circle around the core
// promise (positions are percentages of the board, so the ring scales); below that they stack in numbered order.
// Brand colours only (ink, signal, neutrals).
type Step = {
  n: string;
  title: string;
  lead: string;
  chips: string[];
  note?: string;
  area: string;
  you?: boolean;
  start?: boolean;
};

const STEPS: Step[] = [
  {
    n: "1",
    title: "Scan",
    start: true,
    lead: "Boards are read for you, every day.",
    chips: ["BrighterMonday", "MyJobMag", "Remote4Africa", "Himalayas", "+ 3 more", "LinkedIn: you paste"],
    area: "xl:left-[33.33%] xl:top-[16%]",
  },
  {
    n: "2",
    title: "Filter",
    lead: "The noise is archived, each with a reason.",
    chips: ["Asks for a fee", "Hides the employer", "Vague duties", "Not open to Kenya"],
    area: "xl:left-[66.67%] xl:top-[16%]",
  },
  {
    n: "3",
    title: "Score",
    lead: "Every role and company gets a fit score.",
    chips: ["Size", "Budget signals", "Late to AI", "Growth"],
    note: "Then one call: apply, pitch, or both.",
    area: "xl:left-[83.33%] xl:top-1/2",
  },
  {
    n: "4",
    title: "Draft",
    lead: "Documents are written for you.",
    chips: ["Tailored CV", "Cover letter", "Proposal / pitch", "Gmail draft"],
    note: "A full job application is about 10 credits, a full proposal about 8.",
    area: "xl:left-[66.67%] xl:top-[84%]",
  },
  {
    n: "5",
    title: "You send",
    lead: "Nothing goes out without you.",
    chips: ["Review in Gmail", "Edit", "Press send"],
    note: "The one step Opportuneer never does for you.",
    area: "xl:left-[33.33%] xl:top-[84%]",
    you: true,
  },
  {
    n: "6",
    title: "Follow through",
    lead: "Every send is tracked on one board.",
    chips: ["Sent", "Replied", "Interview", "Won"],
    note: "Follow-ups come due on their own, and the loop starts again.",
    area: "xl:left-[16.67%] xl:top-1/2",
  },
];

/** Round "Start" sticker: the word curves gently along an arc inside the circle, with a hand-drawn underline swoosh. Same handwriting as the launch banner. */
function StartSticker() {
  return (
    <svg aria-hidden viewBox="0 0 84 84" className="absolute -right-2 -top-9 z-40 h-[64px] w-[64px] rotate-[8deg] sm:h-[72px] sm:w-[72px] xl:-left-7 xl:-top-8 xl:right-auto xl:h-[84px] xl:w-[84px] xl:-rotate-[10deg]">
      <circle cx="44" cy="45" r="39" className="fill-ink" opacity="0.14" />
      <circle cx="42" cy="42" r="39" className="fill-signal" />
      <circle cx="42" cy="42" r="34" fill="none" className="stroke-ink" strokeWidth="1.3" strokeDasharray="3 3.5" />
      <defs>
        <path id="start-arc" d="M 20 52 A 24 24 0 0 1 64 52" />
      </defs>
      <text className={`${hand.className} fill-ink`} fontSize="27" fontWeight="700" textAnchor="middle">
        <textPath href="#start-arc" startOffset="50%">
          Start
        </textPath>
      </text>
      <path d="M 27 62 C 35 68, 49 68, 57 60" className="stroke-ink" fill="none" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 51 58 L 58 60 L 56 67" className="stroke-ink" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HUB_FACTS = [
  ["10", "credits for a full job application"],
  ["8", "credits for a full proposal"],
  ["0", "emails sent without you"],
];

/** Full-width infographic: the user journey as a loop around the core promise. */
export function WorkflowMap() {
  return (
    <Motion>
    <section aria-labelledby="workflow" className="space-y-8">
      <div className="space-y-2">
        <h2 id="workflow" data-m="chars" className="page-title " style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)" }}>
          The whole loop, on one page.
        </h2>
        <p data-m="rise" className="max-w-xl text-muted">Six steps, in order. Opportuneer does the first four. You do the fifth. Then it starts again.</p>
      </div>

            <div className="relative grid gap-4 rounded-md border border-rule bg-white p-4 sm:grid-cols-2 sm:p-6 xl:block xl:aspect-[1200/940] xl:p-0">
        <LoopArrows />
        {/* Core promise, in the middle of the loop (first on small screens) */}
        <div data-m="pop" data-m-rot="0" className="order-first flex flex-col items-center justify-center gap-4 rounded-md bg-ink p-6 text-center text-white sm:col-span-2 xl:absolute xl:left-1/2 xl:top-1/2 xl:w-[29%] xl:-translate-x-1/2 xl:-translate-y-1/2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">The promise</p>
          <p className="font-extrabold uppercase leading-none text-signal" style={{ fontSize: "clamp(2.25rem, 4vw, 3.25rem)" }}>
            We draft.
            <br />
            You
            <br />
            decide.
          </p>
          <ul className="w-full space-y-3 border-t border-white/20 pt-4 text-left">
            {HUB_FACTS.map(([n, t]) => (
              <li key={t} className="flex items-baseline gap-3">
                <span data-m="count" data-m-count={n} className="w-9 shrink-0 text-right text-2xl font-extrabold tabular-nums">{n}</span>
                <span className="text-xs text-white/75">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {STEPS.map((s) => (
          <div key={s.n} data-loop-step={s.n} data-m="fade" className={`${s.area} relative xl:absolute xl:w-[25%] xl:-translate-x-1/2 xl:-translate-y-1/2 rounded-md border-2 p-5 ${s.you ? "border-signal bg-paper" : "border-dashed border-rule bg-paper"}`}>
            {s.start && <StartSticker />}
            <div className="flex items-center gap-3">
              <span data-m="pop" data-m-rot="-180" className="grid h-8 w-8 place-items-center rounded-full bg-signal text-sm font-extrabold text-ink">{s.n}</span>
              <h3 className="text-xl font-extrabold uppercase tracking-tight">{s.title}</h3>
            </div>
            <p className="mt-3 text-sm font-medium">{s.lead}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {s.chips.map((t) => (
                <li key={t} className="rounded-full border border-rule bg-white px-2.5 py-0.5 text-xs text-muted">
                  {t}
                </li>
              ))}
            </ul>
            {s.note && <p className="mt-3 text-xs leading-relaxed text-muted">{s.note}</p>}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Credit figures are launch estimates and may change after the pilot.</p>
    </section>
    </Motion>
  );
}
