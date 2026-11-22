import Link from "next/link";
import { SourceLabel } from "@/components/brand-icons";
import { Reveal } from "@/components/motion";
import type { ScoreLine } from "@/lib/scoring";

export const STAGES = ["FOUND", "SHORTLISTED", "DRAFTED", "SENT", "REPLIED", "INTERVIEW", "WON", "LOST", "ARCHIVED"] as const;

export const STAGE_LABEL: Record<string, string> = {
  FOUND: "Found",
  SHORTLISTED: "Shortlisted",
  DRAFTED: "Drafted",
  SENT: "Sent",
  REPLIED: "Replied",
  INTERVIEW: "Interview / Meeting",
  WON: "Won",
  LOST: "Lost",
  ARCHIVED: "Archived",
};

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl px-5 py-4 text-sm ${error ? "bg-signal-soft text-signal-dark" : "bg-ink text-white"}`}>
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${error ? "bg-signal text-white" : "bg-white text-ink"}`}
      >
        {error ? "!" : "✓"}
      </span>
      <span>{error ?? ok}</span>
    </div>
  );
}

/** Page heading: small eyebrow, big tight title; wrap the accent word in <em> for serif italic. */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <div className="mt-3 max-w-2xl text-sm text-ink-4">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const CHIP_TONES = {
  light: "bg-canvas text-ink-3",
  dark: "bg-ink-3 text-white/80",
  signal: "bg-signal-soft text-signal-dark",
  cream: "bg-cream text-[#6b5310]",
  sky: "bg-sky-soft text-[#124a74]",
  mint: "bg-emerald-100 text-emerald-800",
} as const;

export function Chip({ children, tone = "light" }: { children: React.ReactNode; tone?: keyof typeof CHIP_TONES }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${CHIP_TONES[tone]}`}>{children}</span>
  );
}

export function TrackBadge({ track, both }: { track: "JOB" | "PITCH" | null; both?: boolean }) {
  if (!track) return <Chip>Hold</Chip>;
  return (
    <span className="inline-flex gap-1">
      <Chip tone={track === "JOB" ? "sky" : "signal"}>{track === "JOB" ? "Apply" : "Pitch RSS"}</Chip>
      {both && <Chip tone="signal">+ Pitch RSS</Chip>}
    </span>
  );
}

export function ScorePill({ score }: { score: number | null | undefined }) {
  const s = score ?? 0;
  const tone = score == null ? "bg-canvas text-ink-4" : s >= 70 ? "bg-signal text-white" : s >= 50 ? "bg-ink text-white" : "bg-canvas text-ink-4";
  return (
    <span
      title={score == null ? "Not scored" : `Fit score ${score}/100`}
      className={`inline-grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-2 font-display text-sm tabular-nums tracking-wide ${tone}`}
    >
      {score ?? "–"}
    </span>
  );
}

export function Breakdown({ lines }: { lines: ScoreLine[] }) {
  return (
    <ul className="space-y-3 text-sm">
      {lines.map((l) => (
        <li key={l.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{l.label}</span>
            <span className="font-display tabular-nums tracking-wide text-ink-4">
              {l.points}/{l.max}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-signal" style={{ width: `${l.max ? Math.max(0, Math.min(100, Math.round((l.points / l.max) * 100))) : 0}%` }} />
          </div>
          {l.note && <div className="mt-1 text-xs text-ink-4">{l.note}</div>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Rounded section card. `index` adds a serif numeral ("01.") like a numbered experience card;
 * `tone="dark"` gives the near-black stacked-card look.
 */
export function Card({
  title,
  children,
  actions,
  index,
  tone = "light",
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  index?: number;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Reveal>
    <section
      className={`rounded-[28px] p-6 ${dark ? "bg-ink text-white" : "bg-white shadow-[0_1px_0_rgba(14,16,20,0.04),0_12px_32px_-18px_rgba(14,16,20,0.18)]"}`}
    >
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-3">
            {index != null && <span className="font-serif text-3xl leading-none text-signal">{String(index).padStart(2, "0")}.</span>}
            {title && <h2 className={`text-lg font-semibold leading-tight ${dark ? "text-white" : "text-ink"}`}>{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
    </Reveal>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-ink/10 px-4 py-6 text-center text-sm text-ink-4">{children}</p>;
}

export function OppRow({
  o,
}: {
  o: {
    id: string;
    title: string;
    track: "JOB" | "PITCH";
    fitScore: number | null;
    location: string | null;
    remote: boolean;
    source: string;
    verified?: boolean;
    company: { name: string } | null;
    fitBreakdown?: unknown;
  };
}) {
  const fb = o.fitBreakdown as { belowTarget?: boolean } | null;
  const location = o.remote ? `Remote${o.location ? ` (${o.location})` : ""}` : (o.location ?? "");
  return (
    <Link href={`/opportunities/${o.id}`} className="group -mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-canvas">
      <ScorePill score={o.fitScore} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium group-hover:text-signal-dark">{o.title}</div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-4">
          <span className="truncate">
            {o.company?.name ?? "—"} · {location} · <SourceLabel source={o.source} />
          </span>
          {o.verified && <Chip tone="mint">verified employer</Chip>}
          {fb?.belowTarget && <Chip tone="cream">below pay target</Chip>}
        </div>
      </div>
      <TrackBadge track={o.track} />
      <span aria-hidden className="hidden text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-signal sm:inline">
        →
      </span>
    </Link>
  );
}

/** Segmented pill filter (view / track filters). */
export function Segmented({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-white p-1 text-sm shadow-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors ${i.active ? "bg-ink text-white" : "text-ink-4 hover:bg-canvas hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export const input =
  "w-full rounded-2xl border border-ink/10 bg-canvas/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-4/70 transition-colors focus:border-signal focus:bg-white focus:outline-none focus:ring-4 focus:ring-signal/15";
export const btn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-signal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/30 disabled:opacity-60";
export const btnSignal =
  "inline-flex items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-signal-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/30 disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/30 disabled:opacity-60";

export const PAGE_SIZE = 25;

/** Read ?page= safely (1-based). */
export const pageParam = (v: string | undefined) => Math.max(1, Math.floor(Number(v)) || 1);

/** Prev / numbered / next pager. `hrefFor` builds the link for a page number. Renders nothing for a single page. */
export function Pagination({ page, total, pageSize = PAGE_SIZE, hrefFor }: { page: number; total: number; pageSize?: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const cur = Math.min(page, pages);
  const nums = [...new Set([1, 2, cur - 1, cur, cur + 1, pages - 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const item = "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <span className="text-xs text-ink-4">
        Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, total)} of {total}
      </span>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-white p-1 shadow-sm">
        {cur > 1 ? (
          <Link href={hrefFor(cur - 1)} rel="prev" className={`${item} text-ink-4 hover:bg-canvas hover:text-ink`}>
            ← Prev
          </Link>
        ) : (
          <span className={`${item} text-mist`}>← Prev</span>
        )}
        {nums.map((n, i) => (
          <span key={n} className="inline-flex items-center">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-mist">…</span>}
            <Link href={hrefFor(n)} aria-current={n === cur ? "page" : undefined} className={`${item} ${n === cur ? "bg-ink text-white" : "text-ink-4 hover:bg-canvas hover:text-ink"}`}>
              {n}
            </Link>
          </span>
        ))}
        {cur < pages ? (
          <Link href={hrefFor(cur + 1)} rel="next" className={`${item} text-ink-4 hover:bg-canvas hover:text-ink`}>
            Next →
          </Link>
        ) : (
          <span className={`${item} text-mist`}>Next →</span>
        )}
      </div>
    </nav>
  );
}

/** Shown to the superuser when viewing another user's record: everything is read-only. */
export function ReadOnlyNotice({ owner }: { owner: string }) {
  return (
    <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Admin view: this belongs to <b>{owner}</b>. You can read it but not change it.
    </div>
  );
}
