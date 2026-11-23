import { Caveat } from "next/font/google";

const hand = Caveat({ subsets: ["latin"], weight: ["600"], display: "swap" });

/**
 * Hand-drawn doodles for the public pages. Every one is a decorative SVG (aria-hidden) drawn in `currentColor`
 * with round, slightly wobbly strokes. Inside a <Motion> they draw themselves in (data-m="draw") and some bob (data-m="float").
 * Position them with Tailwind classes; hide them on small screens with `hidden md:block` so they never crowd the form.
 */
type P = { className?: string; float?: boolean };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Svg({ className = "", float, viewBox, children }: P & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg aria-hidden viewBox={viewBox} data-m="draw" data-m-float={float ? "" : undefined} className={`pointer-events-none absolute select-none ${className}`} {...base}>
      {children}
    </svg>
  );
}

/** Wobbly underline to sit under a heading. */
export const Squiggle = ({ className }: P) => (
  <Svg viewBox="0 0 220 24" className={className}>
    <path d="M4 14 C 20 2, 32 24, 50 12 S 80 2, 98 13 S 128 24, 146 11 S 176 4, 194 14 S 210 16, 216 10" />
  </Svg>
);

/** Paper plane with a looping trail. */
export const PaperPlane = ({ className, float }: P) => (
  <Svg viewBox="0 0 160 110" className={className} float={float}>
    <path d="M6 96 C 24 70, 50 98, 66 72 S 74 40, 100 46" strokeDasharray="2 9" />
    <path d="M104 14 L 152 40 L 128 52 L 120 74 L 104 56 L 86 62 Z" />
    <path d="M104 14 L 120 74 M152 40 L 104 56" />
  </Svg>
);

/** Four-point sparkle with ticks. */
export const Sparkle = ({ className, float }: P) => (
  <Svg viewBox="0 0 80 80" className={className} float={float}>
    <path d="M40 6 C 42 26, 48 34, 74 40 C 48 46, 42 54, 40 74 C 38 54, 32 46, 6 40 C 32 34, 38 26, 40 6 Z" />
    <path d="M66 8 L 70 16 M74 20 L 66 22" strokeWidth={2.5} />
  </Svg>
);

/** Envelope with a heart seal. */
export const Envelope = ({ className, float }: P) => (
  <Svg viewBox="0 0 140 100" className={className} float={float}>
    <path d="M10 18 L 128 14 L 132 84 L 12 88 Z" />
    <path d="M12 20 L 70 58 L 130 18" />
    <path d="M70 76 C 58 66, 60 56, 70 62 C 80 56, 82 66, 70 76 Z" strokeWidth={2.5} />
  </Svg>
);

/** Loose spiral. */
export const Spiral = ({ className, float }: P) => (
  <Svg viewBox="0 0 90 90" className={className} float={float}>
    <path d="M45 46 C 40 40, 50 36, 52 44 C 54 54, 38 56, 34 44 C 30 30, 52 24, 60 38 C 68 54, 46 68, 30 58 C 12 46, 24 18, 46 14 C 70 10, 82 36, 74 56" />
  </Svg>
);

/** Curly arrow with a handwritten note; the arrow points down-left toward the form. */
export const NoteArrow = ({ className, text }: P & { text: string }) => (
  <div aria-hidden className={`pointer-events-none absolute select-none ${className ?? ""}`}>
    <p className={`${hand.className} -rotate-6 text-2xl leading-none`}>{text}</p>
    <svg viewBox="0 0 110 80" className="-mt-1 ml-4 h-16 w-24" data-m="draw" {...base}>
      <path d="M92 6 C 100 36, 70 60, 28 58" />
      <path d="M42 46 L 24 58 L 44 70" />
    </svg>
  </div>
);

/** A row of little hearts. */
export const Hearts = ({ className, float }: P) => (
  <Svg viewBox="0 0 120 60" className={className} float={float}>
    <path d="M24 46 C 6 32, 8 14, 22 16 C 28 17, 30 22, 30 22 C 30 22, 33 17, 39 16 C 53 14, 52 32, 34 46 Z" transform="translate(-4 -2) scale(.9)" />
    <path d="M86 40 C 74 30, 76 18, 85 20 C 90 21, 91 25, 91 25 C 91 25, 94 21, 99 20 C 108 18, 108 30, 96 40 Z" strokeWidth={2.5} />
  </Svg>
);

/** Circled tick, for the "you're in" screen. */
export const CircleTick = ({ className }: P) => (
  <Svg viewBox="0 0 90 90" className={className}>
    <path d="M44 8 C 66 6, 84 24, 82 46 C 80 68, 60 84, 40 80 C 18 76, 6 56, 10 36 C 14 18, 30 10, 46 10" />
    <path d="M26 46 L 40 60 L 64 30" />
  </Svg>
);

// ---- marketing, sales and value-proposition doodles ----

/** Handwritten label (no arrow) to caption a doodle. */
export const HandNote = ({ className, text }: P & { text: string }) => (
  <p aria-hidden className={`${hand.className} pointer-events-none absolute select-none text-2xl leading-none ${className ?? ""}`}>
    {text}
  </p>
);

/** Megaphone with sound lines: marketing. */
export const Megaphone = ({ className, float }: P) => (
  <Svg viewBox="0 0 130 100" className={className} float={float}>
    <path d="M14 38 L 24 36 L 78 12 L 80 78 L 26 58 L 14 56 Z" />
    <path d="M30 60 L 38 88 L 52 86 L 46 66" />
    <path d="M92 28 C 104 34, 104 56, 92 62" />
    <path d="M102 16 C 120 28, 122 62, 102 76" />
  </Svg>
);

/** Price tag with a shilling mark: sales. */
export const PriceTag = ({ className, float }: P) => (
  <Svg viewBox="0 0 120 100" className={className} float={float}>
    <path d="M10 46 L 52 8 L 108 12 L 104 68 L 62 94 Z" />
    <path d="M86 26 C 80 24, 78 32, 84 34 C 90 36, 88 44, 82 42" strokeWidth={2.5} />
    <path d="M36 50 L 60 52 M34 62 L 52 64" strokeWidth={2.5} />
    <path d="M16 56 C 20 52, 26 52, 30 56" strokeDasharray="2 8" />
  </Svg>
);

/** Rising bars with an arrow: growth and sales. */
export const GrowthChart = ({ className, float }: P) => (
  <Svg viewBox="0 0 130 110" className={className} float={float}>
    <path d="M12 98 L 120 98" />
    <path d="M22 98 L 22 76 L 36 76 L 36 98" />
    <path d="M50 98 L 50 58 L 64 58 L 64 98" />
    <path d="M78 98 L 78 40 L 92 40 L 92 98" />
    <path d="M14 62 C 40 52, 62 36, 100 14" />
    <path d="M82 12 L 102 12 L 100 30" />
  </Svg>
);

/** Bullseye with an arrow: the value proposition lands. */
export const Target = ({ className, float }: P) => (
  <Svg viewBox="0 0 110 110" className={className} float={float}>
    <path d="M55 8 C 82 8, 102 28, 100 56 C 98 82, 78 102, 54 100 C 28 98, 8 78, 10 54 C 12 28, 30 8, 56 8" />
    <path d="M55 28 C 70 28, 82 40, 80 56 C 78 70, 66 82, 54 80 C 40 78, 30 66, 32 54 C 34 40, 44 30, 56 30" />
    <path d="M55 46 C 60 46, 64 50, 62 56 C 60 62, 52 62, 50 56 C 48 50, 52 46, 56 46" strokeWidth={2.5} />
    <path d="M58 54 L 98 14 M86 14 L 98 14 L 98 26" />
  </Svg>
);

/** Light bulb: the idea behind the offer. */
export const Bulb = ({ className, float }: P) => (
  <Svg viewBox="0 0 90 110" className={className} float={float}>
    <path d="M45 8 C 20 8, 10 34, 24 52 C 30 60, 32 66, 32 74 L 58 74 C 58 66, 60 60, 66 52 C 80 34, 70 8, 45 8 Z" />
    <path d="M34 84 L 56 84 M38 94 L 52 94" />
    <path d="M45 24 C 36 26, 30 34, 32 42" strokeWidth={2.5} />
    <path d="M4 20 L 14 26 M86 20 L 76 26 M45 0 L 45 4" strokeWidth={2.5} />
  </Svg>
);

/** Stacked coins: money and value. */
export const Coins = ({ className, float }: P) => (
  <Svg viewBox="0 0 110 100" className={className} float={float}>
    <path d="M18 70 C 18 62, 70 62, 70 70 C 70 78, 18 78, 18 70 L 18 82 C 18 90, 70 90, 70 82 L 70 70" />
    <path d="M18 54 C 18 46, 70 46, 70 54 C 70 62, 18 62, 18 54 L 18 70" />
    <path d="M44 14 C 70 8, 94 18, 92 34 C 90 48, 70 52, 52 46 C 36 40, 30 24, 44 14 Z" />
    <path d="M70 22 C 62 20, 60 28, 68 30 C 76 32, 72 40, 64 38" strokeWidth={2.5} />
  </Svg>
);

/** Rocket with a swirly flame: launch. */
export const Rocket = ({ className, float }: P) => (
  <Svg viewBox="0 0 100 130" className={className} float={float}>
    <path d="M50 6 C 72 24, 76 54, 70 84 L 30 84 C 24 54, 28 24, 50 6 Z" />
    <path d="M50 40 C 58 40, 60 50, 52 52 C 44 54, 40 42, 50 40" />
    <path d="M30 70 L 14 94 L 32 90 M70 70 L 86 94 L 68 90" />
    <path d="M42 94 C 38 104, 50 108, 46 122 M54 94 C 58 104, 52 112, 56 122" />
  </Svg>
);

/** Scalloped rosette seal with a star and ribbon tails: for a "best value" tag. */
export const BestValueSeal = ({ className, float }: P) => (
  <Svg viewBox="0 0 100 120" className={className} float={float}>
    <path d="M50 6 C 58 4, 62 12, 70 12 C 78 12, 82 20, 86 26 C 92 32, 98 36, 94 46 C 92 54, 96 60, 90 68 C 86 74, 84 82, 76 84 C 68 86, 64 94, 54 92 C 46 94, 40 88, 32 86 C 24 84, 20 76, 16 70 C 10 62, 8 56, 10 48 C 8 38, 14 32, 20 26 C 24 18, 30 14, 38 12 C 44 10, 46 6, 50 6 Z" />
    <path d="M50 28 L 56 44 L 74 44 L 60 54 L 66 72 L 50 62 L 34 72 L 40 54 L 26 44 L 44 44 Z" fill="currentColor" fillOpacity={0.25} />
    <path d="M32 88 L 22 116 L 38 108 L 44 118 L 50 94" />
    <path d="M68 88 L 78 116 L 62 108 L 56 118 L 50 94" />
  </Svg>
);

/** Loose hand-drawn ring that stretches to circle a label (parent must be `relative`; give it padding around the text). */
export const ScribbleRing = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 120 40" preserveAspectRatio="none" data-m="draw" className={`pointer-events-none absolute select-none ${className ?? ""}`} {...base} strokeWidth={2.5} vectorEffect="non-scaling-stroke">
    <path vectorEffect="non-scaling-stroke" d="M18 6 C 50 -2, 100 2, 114 14 C 122 26, 90 38, 56 37 C 22 36, 2 28, 6 16 C 10 6, 40 3, 74 4 C 96 5, 110 8, 116 12" />
  </svg>
);
