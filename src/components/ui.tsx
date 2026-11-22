import Link from "next/link";
import { Reveal, StaggerItem } from "@/components/motion";
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
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}
    >
      {error ?? ok}
    </div>
  );
}

export function TrackBadge({ track, both }: { track: "JOB" | "PITCH" | null; both?: boolean }) {
  if (!track) return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Hold</span>;
  return (
    <span className="inline-flex gap-1">
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${track === "JOB" ? "bg-slate-200 text-slate-800" : "bg-brand-100 text-brand-800"}`}>
        {track === "JOB" ? "Apply" : "Pitch RSS"}
      </span>
      {both && <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">+ Pitch RSS</span>}
    </span>
  );
}

export function ScorePill({ score }: { score: number | null | undefined }) {
  const s = score ?? 0;
  const tone = s >= 70 ? "bg-emerald-600" : s >= 50 ? "bg-amber-500" : "bg-slate-400";
  return <span className={`inline-block min-w-10 rounded px-2 py-0.5 text-center text-xs font-semibold text-white ${tone}`}>{score ?? "–"}</span>;
}

export function Breakdown({ lines }: { lines: ScoreLine[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {lines.map((l) => (
          <tr key={l.label} className="border-b border-slate-100 last:border-0">
            <td className="py-1.5 pr-3 font-medium">{l.label}</td>
            <td className="py-1.5 pr-3 tabular-nums text-slate-500">
              {l.points}/{l.max}
            </td>
            <td className="py-1.5 text-slate-600">{l.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Reveal>
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
    </Reveal>
  );
}

export function OppRow({
  o,
}: {
  o: { id: string; title: string; track: "JOB" | "PITCH"; fitScore: number | null; location: string | null; remote: boolean; source: string; verified?: boolean; company: { name: string } | null; fitBreakdown?: unknown };
}) {
  const fb = o.fitBreakdown as { belowTarget?: boolean } | null;
  const location = o.remote ? `Remote${o.location ? ` (${o.location})` : ""}` : (o.location ?? "");
  return (
    <StaggerItem>
    <Link href={`/opportunities/${o.id}`} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-brand-50">
      <ScorePill score={o.fitScore} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{o.title}</div>
        <div className="truncate text-xs text-slate-500">
          {o.company?.name ?? "—"} · {location} · {o.source}
          {o.verified && <span className="ml-2 rounded bg-emerald-100 px-1.5 text-emerald-800">verified employer</span>}
          {fb?.belowTarget && <span className="ml-2 rounded bg-amber-100 px-1.5 text-amber-800">below pay target</span>}
        </div>
      </div>
      <TrackBadge track={o.track} />
    </Link>
    </StaggerItem>
  );
}

export const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600";
export const btn = "inline-flex items-center justify-center rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800 active:scale-[0.98] disabled:opacity-60";
export const btnGhost = "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60";

/** Brand pill used for filter tabs (active / inactive). */
export const tab = (on: boolean) => `rounded-md px-3 py-1.5 transition-colors ${on ? "bg-brand-700 text-white" : "border border-slate-300 bg-white hover:border-brand-200 hover:bg-brand-50"}`;
