import type { ReactNode } from "react";

/** Small figures-with-label block used in the dashboard side column. */
export function Metric({ label, value, note, tone = "leaf" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "leaf" | "amber" | "ink" }) {
  const noteTone = tone === "amber" ? "text-warn-ink" : "text-signal-dark";
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold leading-none tracking-tight tabular-nums">{value}</div>
      {note && <div className={`mt-1.5 text-xs ${tone === "ink" ? "text-muted" : noteTone}`}>{note}</div>}
    </div>
  );
}

export type BarDatum = { label: string; parts: { value: number; color: string; name: string }[] };

/**
 * Stacked column chart in plain HTML/CSS (no chart library): faint full-height tracks, with the
 * busiest column highlighted. Each column carries a title with its numbers for hover and screen readers.
 */
export function StackedBars({ data, height = 220 }: { data: BarDatum[]; height?: number }) {
  const totals = data.map((d) => d.parts.reduce((a, p) => a + p.value, 0));
  const max = Math.max(1, ...totals);
  const top = totals.indexOf(Math.max(...totals));
  const ticks = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];
  return (
    <div className="flex gap-3" role="img" aria-label={`Chart: ${data.map((d, i) => `${d.label} ${totals[i]}`).join(", ")}`}>
      <div className="flex flex-col justify-between pb-6 text-xs tabular-nums text-mist" style={{ height: height + 24 }}>
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="grid flex-1 grid-flow-col auto-cols-fr gap-3">
        {data.map((d, i) => (
          <div key={d.label} className="flex flex-col items-center gap-2" title={`${d.label}: ${d.parts.map((p) => `${p.name} ${p.value}`).join(", ")}`}>
            <div className={`flex w-full max-w-14 flex-col-reverse overflow-hidden rounded-md ${i === top && totals[i] > 0 ? "" : "bg-paper"}`} style={{ height }}>
              {d.parts.map((p) => (
                <div key={p.name} style={{ height: `${(p.value / max) * 100}%`, background: p.color, opacity: i === top || totals[i] === 0 ? 1 : 0.55 }} />
              ))}
            </div>
            <span className="text-xs text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
      {items.map((i) => (
        <li key={i.name} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal progress bar with a label row (used for stage mix, quotas, goals). */
export function Meter({ label, value, max, color = "var(--color-leaf)", right }: { label: string; value: number; max: number; color?: string; right?: ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{right ?? `${value}/${max}`}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** Half-circle gauge, like the "financial health" card. `value` is 0 to 100. */
export function Gauge({ value, caption }: { value: number; caption: string }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 80;
  const c = Math.PI * r; // half circumference
  return (
    <div className="relative mx-auto w-56">
      <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--color-paper-2)" strokeWidth="22" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--color-leaf)" strokeWidth="22" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-3xl font-semibold tabular-nums">{Math.round(v)}%</div>
        <div className="text-xs text-muted">{caption}</div>
      </div>
    </div>
  );
}

/** Rounded square icon button look for card headers. */
export function Tile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md bg-white p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}
