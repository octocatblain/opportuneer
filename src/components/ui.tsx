import Link from "next/link";
import { SourceLabel } from "@/components/brand-icons";
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
    <div
      role="status"
      className={`mb-6 rounded-2xl px-4 py-3 text-sm ${error ? "bg-signal-soft text-signal-dark" : "bg-leaf-soft text-leaf-deep"}`}
    >
      <span className="font-semibold">{error ? "Error: " : "Done: "}</span>
      {error ?? ok}
    </div>
  );
}

/** Page heading: a plain roman title, an optional meta line (a count or a date) and sub copy. */
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {eyebrow && <p className="mt-1 text-sm text-muted">{eyebrow}</p>}
        {sub && <div className="mt-2 max-w-2xl text-sm text-muted">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const CHIP_TONES = {
  light: "bg-paper text-ink-3",
  dark: "bg-ink-3 text-white",
  signal: "bg-leaf-soft text-leaf-deep",
  cream: "bg-warn-soft text-warn-ink",
  sky: "bg-info-soft text-info-ink",
  mint: "bg-leaf-soft text-leaf-deep",
  amber: "bg-amber-soft text-warn-ink",
} as const;

export function Chip({ children, tone = "light" }: { children: React.ReactNode; tone?: keyof typeof CHIP_TONES }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${CHIP_TONES[tone]}`}>{children}</span>
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
  const tone = score == null ? "bg-paper text-muted" : s >= 70 ? "bg-leaf text-ink" : s >= 50 ? "bg-ink text-white" : "bg-paper-2 text-ink-3";
  return (
    <span
      title={score == null ? "Not scored" : `Fit score ${score}/100`}
      className={`inline-grid h-8 min-w-9 shrink-0 place-items-center rounded-md px-2 text-sm font-semibold tabular-nums ${tone}`}
    >
      {score ?? "n/a"}
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
            <span className="tabular-nums text-muted">
              {l.points}/{l.max}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-leaf" style={{ width: `${l.max ? Math.max(0, Math.min(100, Math.round((l.points / l.max) * 100))) : 0}%` }} />
          </div>
          {l.note && <div className="mt-1 text-xs text-muted">{l.note}</div>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Section card: a flat white panel with a hairline border. `tone="dark"` is a recessed panel
 * (the second neutral). `index` is still accepted by callers but is no longer drawn.
 */
export function Card({
  title,
  children,
  actions,
  tone = "light",
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  index?: number;
  tone?: "light" | "dark";
}) {
  return (
    <section className={`rounded-[20px] p-5 shadow-[var(--shadow-card)] ${tone === "dark" ? "bg-paper-2" : "bg-white"}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          {title && <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-rule px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function OppRow({
  o,
  base,
}: {
  /** URL prefix of the client space the row is shown in, e.g. /client/duo. */
  base: string;
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
    <Link
      href={`${base}/opportunities/${o.id}`}
      className="group -mx-3 grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-paper active:bg-paper-2 md:grid-cols-[2.5rem_minmax(0,1fr)_11rem_9rem_auto]"
    >
      <ScorePill score={o.fitScore} />
      <div className="min-w-0">
        <div className="truncate font-medium group-hover:underline">{o.title}</div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="truncate">{o.company?.name ?? "No company"}</span>
          {location && <span className="truncate md:hidden">{location}</span>}
          {o.verified && <Chip tone="mint">verified employer</Chip>}
          {fb?.belowTarget && <Chip tone="cream">below pay target</Chip>}
        </div>
      </div>
      <span className="hidden truncate text-sm text-muted md:block">{location}</span>
      <span className="hidden text-sm text-muted md:block">
        <SourceLabel source={o.source} />
      </span>
      <TrackBadge track={o.track} />
    </Link>
  );
}

/** Segmented filter (view / track filters). */
export function Segmented({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-xl bg-white p-1 text-sm shadow-[var(--shadow-card)]">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${i.active ? "bg-ink text-white" : "text-muted hover:bg-paper-2 hover:text-ink active:bg-paper-3"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export const input =
  "w-full rounded-xl border border-rule bg-white px-3 py-2 text-sm text-ink placeholder:text-mist transition-colors hover:border-ink-3 disabled:bg-paper disabled:text-mist";
export const btn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-3 active:translate-y-px active:bg-ink-2 disabled:opacity-60";
export const btnSignal =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#7db835] active:translate-y-px disabled:opacity-60";
export const btnGhost =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rule bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-2 active:translate-y-px active:bg-paper-3 disabled:opacity-60";

export const PAGE_SIZE = 25;

/** Read ?page= safely (1-based). */
export const pageParam = (v: string | undefined) => Math.max(1, Math.floor(Number(v)) || 1);

/** Prev / numbered / next pager. `hrefFor` builds the link for a page number. Renders nothing for a single page. */
export function Pagination({ page, total, pageSize = PAGE_SIZE, hrefFor }: { page: number; total: number; pageSize?: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const cur = Math.min(page, pages);
  const nums = [...new Set([1, 2, cur - 1, cur, cur + 1, pages - 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const item = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <span className="text-xs text-muted">
        Showing {(cur - 1) * pageSize + 1} to {Math.min(cur * pageSize, total)} of {total}
      </span>
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-rule bg-white p-0.5">
        {cur > 1 ? (
          <Link href={hrefFor(cur - 1)} rel="prev" className={`${item} text-muted hover:bg-paper-2 hover:text-ink active:bg-paper-3`}>
            Previous
          </Link>
        ) : (
          <span className={`${item} text-mist`}>Previous</span>
        )}
        {nums.map((n, i) => (
          <span key={n} className="inline-flex items-center">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-mist">…</span>}
            <Link
              href={hrefFor(n)}
              aria-current={n === cur ? "page" : undefined}
              className={`${item} tabular-nums ${n === cur ? "bg-ink text-white" : "text-muted hover:bg-paper-2 hover:text-ink active:bg-paper-3"}`}
            >
              {n}
            </Link>
          </span>
        ))}
        {cur < pages ? (
          <Link href={hrefFor(cur + 1)} rel="next" className={`${item} text-muted hover:bg-paper-2 hover:text-ink active:bg-paper-3`}>
            Next
          </Link>
        ) : (
          <span className={`${item} text-mist`}>Next</span>
        )}
      </div>
    </nav>
  );
}

/** Shown to the superuser when viewing another user's record: everything is read-only. */
export function ReadOnlyNotice({ owner }: { owner: string }) {
  return (
    <div role="status" className="rounded-lg border border-warn-ink/25 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
      Admin view: this belongs to <b>{owner}</b>. You can read it but not change it.
    </div>
  );
}
