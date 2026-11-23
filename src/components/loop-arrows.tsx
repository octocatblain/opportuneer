"use client";

import { useEffect, useRef, useState } from "react";

// Curved hand-drawn arrows that follow the ring the six step cards sit on. Each one leaves a card at the point where the
// ring exits its box and ends, arrowhead first, where the ring enters the next card, so it touches both. Cards are found by
// data-loop-step and measured, so everything stays attached when the board resizes. Paints above the cards.
type Box = { l: number; t: number; r: number; b: number };
type Pt = [number, number];

const SAMPLES = 240;
const HEAD = 15;
const TAIL_W = 0.8; // width at the very tail only; the body quickly reaches full width and stays there
const TAIL_LEN = 0.35; // fraction of the arrow, from the tail, over which it thickens
const RING = 0.88; // radius of the arrows' circle as a share of the smaller card-ring radius, so they hug the centre
const HEAD_W = 4.5;
const OVERLAP = 8; // px the arrow runs into each card, so it visibly sits on top of both ends
const inside = (b: Box, [x, y]: Pt, pad = 0) => x >= b.l - pad && x <= b.r + pad && y >= b.t - pad && y <= b.b + pad;

/** Points along the ring between card a's centre and card b's centre (clockwise), trimmed to start and end OVERLAP px inside the two boxes. */
function arc(a: Box, b: Box, cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = from + ((to - from) * i) / SAMPLES;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  let s = pts.findIndex((p) => !inside(a, p, -OVERLAP));
  let e = pts.length - 1 - [...pts].reverse().findIndex((p) => !inside(b, p, -OVERLAP));
  if (s < 0) s = 0;
  if (e <= s) e = pts.length - 1;
  return pts.slice(s, e + 1);
}

/** Closed outline of a stroke that is thin only at the tail, then holds HEAD_W for the rest of the body. */
function taper(pts: Pt[]): string {
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const k = Math.min(1, i / (n - 1) / TAIL_LEN);
    const w = (TAIL_W + (HEAD_W - TAIL_W) * (k * k * (3 - 2 * k))) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const f = (q: Pt) => q[0].toFixed(1) + " " + q[1].toFixed(1);
  return "M " + [...left, ...right.reverse()].map(f).join(" L ") + " Z";
}

export function LoopArrows() {
  const ref = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ line: string; head: string }[] | null>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const measure = () => {
      const o = el.getBoundingClientRect();
      const boxes: Box[] = [];
      for (let n = 1; n <= 6; n++) {
        const c = host.querySelector<HTMLElement>(`[data-loop-step="${n}"]`);
        if (!c) return;
        const r = c.getBoundingClientRect();
        boxes.push({ l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top });
      }
      const mid = (b: Box): Pt => [(b.l + b.r) / 2, (b.t + b.b) / 2];
      const cx = o.width / 2;
      const cy = o.height / 2;
      // Card 3 sits at angle 0 and card 4 at 60 degrees, so the ring's radii come straight from where the cards are.
      const rx = mid(boxes[2])[0] - cx;
      const ry = (mid(boxes[3])[1] - cy) / Math.sin(Math.PI / 3);
      const R = RING * Math.min(rx, ry);
      const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      const out = boxes.map((a, i) => {
        const b = boxes[(i + 1) % 6];
        const from = (-120 + 60 * i) * (Math.PI / 180);
        // A true circle (not the cards' ellipse), pulled in toward the black card; it still crosses every card, so the arrows land on them.
        const base = arc(a, b, cx, cy, R, R, from, from + Math.PI / 3);
        const pts = base;
        const end = pts[pts.length - 1];
        const prev = pts[Math.max(0, pts.length - 8)];
        const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
        const wing = (d: number): Pt => [end[0] - HEAD * Math.cos(ang + d), end[1] - HEAD * Math.sin(ang + d)];
        return { line: taper(pts), head: `M ${f(wing(0.55))} L ${f(end)} L ${f(wing(-0.55))}` };
      });
      setPaths(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    host.querySelectorAll("[data-loop-step]").forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-30 hidden xl:block">
      {paths && (
        <svg className="h-full w-full overflow-visible text-ink" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          {paths.map((p, i) => (
            <g key={i}>
              <path d={p.line} stroke="none" fill="currentColor" />
              <path d={p.head} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
