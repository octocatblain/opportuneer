import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { btn, btnGhost, Card, Chip, Empty, input, PageHeader, Pagination, pageParam } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: analytics" };

const RANGES = [1, 7, 30, 90] as const;
const PAGE_SIZES = [25, 50, 100] as const;
const DAY = 86_400_000;
type SP = { range?: string; name?: string; q?: string; page?: string; size?: string };

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function Stat({ label, value, delta, sub }: { label: string; value: React.ReactNode; delta?: number | null; sub?: string }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-ink">{value}</span>
        {delta != null && (
          <span className={`text-xs font-medium tabular-nums ${delta > 0 ? "text-success" : delta < 0 ? "text-warn-ink" : "text-muted"}`}>
            {delta > 0 ? "+" : ""}
            {delta}% vs previous
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

const pct = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100));

/** Admin: product events for a chosen period: totals with change vs the previous period, a daily chart, events by name, top users, and a filterable event log with CSV export. */
export default async function AdminAnalytics({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuper();
  const sp = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(sp.range)) ? Number(sp.range) : 30;
  const now = Date.now();
  const since = new Date(now - days * DAY);
  const prevSince = new Date(now - 2 * days * DAY);
  const page = pageParam(sp.page);
  const perPage = (PAGE_SIZES as readonly number[]).includes(Number(sp.size)) ? Number(sp.size) : 25;
  const name = sp.name?.trim() || undefined;
  const q = sp.q?.trim() || undefined;

  const logWhere: Prisma.AnalyticsEventWhereInput = {
    createdAt: { gte: since },
    ...(name ? { name } : {}),
    ...(q ? { OR: [{ user: { email: { contains: q, mode: "insensitive" } } }, ...(q.toLowerCase() === "anonymous" ? [{ userId: null }] : [])] } : {}),
  };

  const [byName, activeNow, activePrev, totalPrev, daily, hourly, topUsers, logTotal, log, anon] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: true, orderBy: { _count: { name: "desc" } } }),
    db.analyticsEvent.findMany({ where: { createdAt: { gte: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
    db.analyticsEvent.findMany({ where: { createdAt: { gte: prevSince, lt: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
    db.analyticsEvent.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    db.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, count(*) AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ h: number; n: bigint }[]>`SELECT extract(hour from "createdAt")::int AS h, count(*) AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.analyticsEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, userId: { not: null } }, _count: true, orderBy: { _count: { userId: "desc" } }, take: 8 }),
    db.analyticsEvent.count({ where: logWhere }),
    db.analyticsEvent.findMany({ where: logWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage, include: { user: { select: { email: true } } } }),
    db.analyticsEvent.count({ where: { createdAt: { gte: since }, userId: null } }),
  ]);

  const userEmails = topUsers.length
    ? await db.user.findMany({ where: { id: { in: topUsers.map((u) => u.userId!) } }, select: { id: true, email: true } })
    : [];
  const emailOf = new Map(userEmails.map((u) => [u.id, u.email]));

  const total = byName.reduce((n, r) => n + r._count, 0);
  const topMax = Math.max(1, ...byName.map((r) => r._count));
  const userMax = Math.max(1, ...topUsers.map((u) => u._count));

  // Zero-filled daily series so quiet days show as gaps instead of vanishing.
  const counts = new Map(daily.map((d) => [dayKey(d.day), Number(d.n)]));
  const series = Array.from({ length: days === 1 ? 1 : days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * DAY);
    return { key: dayKey(d), date: d, n: counts.get(dayKey(d)) ?? 0 };
  });
  const dayMax = Math.max(1, ...series.map((s) => s.n));
  const busiest = series.reduce((a, b) => (b.n > a.n ? b : a), series[0]);
  const hourMap = new Map(hourly.map((h) => [h.h, Number(h.n)]));
  const hours = Array.from({ length: 24 }, (_, h) => hourMap.get(h) ?? 0);
  const hourMax = Math.max(1, ...hours);

  const base = { range: String(days), ...(perPage !== 25 ? { size: String(perPage) } : {}), ...(name ? { name } : {}), ...(q ? { q } : {}) };
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ ...base, ...(over as Record<string, string>) });
    for (const [k, v] of Object.entries(over)) if (v === undefined) p.delete(k);
    return `/admin/analytics?${p}`;
  };
  const exportHref = (section: string, format: "csv" | "pdf", filtered = false) =>
    `/api/admin/analytics?${new URLSearchParams({ range: String(days), section, format, ...(filtered && name ? { name } : {}), ...(filtered && q ? { q } : {}) })}`;
  const exportBtns = (section: string, filtered = false) => (
    <div className="flex gap-1.5">
      {(["csv", "pdf"] as const).map((f) => (
        <a key={f} href={exportHref(section, f, filtered)} className={`${btnGhost} !min-h-8 !px-3 !py-1`}>
          {f.toUpperCase()}
        </a>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        sub={`Last ${days === 1 ? "24 hours" : `${days} days`}: ${total} events from ${activeNow.length} signed-in user(s)${anon ? ` and ${anon} anonymous` : ""}.`}
        actions={
          <>
            <div className="inline-flex rounded-md border border-rule bg-white p-0.5" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <Link
                  key={r}
                  href={href({ range: String(r), page: undefined })}
                  aria-current={r === days ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${r === days ? "bg-ink text-white" : "text-muted hover:bg-paper-2 hover:text-ink"}`}
                >
                  {r === 1 ? "24h" : `${r}d`}
                </Link>
              ))}
            </div>
            <a href={exportHref("summary", "pdf")} className={btn}>
              Export summary PDF
            </a>
            <Link href="/admin" className="link text-sm font-medium">
              Back to admin
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Events" value={total} delta={pct(total, totalPrev)} />
        <Stat label="Active users" value={activeNow.length} delta={pct(activeNow.length, activePrev.length)} sub="Signed-in users with an event" />
        <Stat label="Avg per day" value={(total / days).toFixed(1)} sub={`${byName.length} distinct event types`} />
        <Stat label="Busiest day" value={busiest.n} sub={busiest.n ? busiest.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "No events yet"} />
      </div>

      <Card title="Events per day" actions={exportBtns("daily")}>
        {total === 0 ? (
          <Empty>No events in this period.</Empty>
        ) : (
          <>
            <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Events per day">
              {series.map((s) => (
                <div key={s.key} className="group relative flex h-full flex-1 items-end" title={`${s.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}: ${s.n}`}>
                  <div className={`w-full rounded-t ${s.n ? "bg-signal" : "bg-paper"}`} style={{ height: s.n ? `${Math.max(4, (s.n / dayMax) * 100)}%` : "2px" }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>{series[0].date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              <span>peak {dayMax}</span>
              <span>{series[series.length - 1].date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
            </div>
          </>
        )}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Events by name" actions={exportBtns("names")}>
          {byName.length === 0 ? (
            <Empty>No events yet.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {byName.map((r) => (
                <li key={r.name}>
                  <Link href={href({ name: r.name, page: undefined })} className={`block rounded-md px-2 py-1.5 hover:bg-paper-2 ${name === r.name ? "bg-paper-2" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{r.name}</span>
                      <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                        {Math.round((r._count / total) * 100)}%<Chip>{r._count}</Chip>
                      </span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-paper">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${(r._count / topMax) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Most active users" actions={exportBtns("users")}>
            {topUsers.length === 0 ? (
              <Empty>No signed-in activity yet.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {topUsers.map((u) => {
                  const email = emailOf.get(u.userId!) ?? "unknown";
                  return (
                    <li key={u.userId}>
                      <Link href={href({ q: email, page: undefined })} className="block hover:text-signal-dark">
                        <div className="flex justify-between gap-3">
                          <span className="truncate">{email}</span>
                          <span className="tabular-nums text-muted">{u._count}</span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-paper">
                          <div className="h-full rounded-full bg-ink-3" style={{ width: `${(u._count / userMax) * 100}%` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Activity by hour (UTC)" actions={exportBtns("hours")}>
            <div className="flex h-16 items-end gap-[2px]">
              {hours.map((n, h) => (
                <div key={h} className="flex h-full flex-1 items-end" title={`${String(h).padStart(2, "0")}:00: ${n}`}>
                  <div className={`w-full rounded-t ${n ? "bg-signal" : "bg-paper"}`} style={{ height: n ? `${Math.max(6, (n / hourMax) * 100)}%` : "2px" }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </Card>
        </div>
      </div>

      <Card title={`Event log (${logTotal})`} actions={exportBtns("events", true)}>
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-md bg-paper p-3">
          <input type="hidden" name="range" value={days} />
          <label className="min-w-[180px] flex-1 basis-48">
            <span className="mb-1 block text-xs font-medium text-muted">Event</span>
            <select name="name" defaultValue={name ?? ""} className={`${input} !border-mist`}>
              <option value="">All events</option>
              {byName.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name} ({r._count})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[220px] flex-[2] basis-64">
            <span className="mb-1 block text-xs font-medium text-muted">User</span>
            <input name="q" defaultValue={q ?? ""} placeholder="Email, or “anonymous”" className={`${input} !border-mist`} />
          </label>
          <label className="w-36">
            <span className="mb-1 block text-xs font-medium text-muted">Rows</span>
            <select name="size" defaultValue={String(perPage)} className={`${input} !border-mist`}>
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className={btn}>
              Apply
            </button>
            {(name || q) && (
              <Link href={`/admin/analytics?range=${days}${perPage !== 25 ? `&size=${perPage}` : ""}`} className={btnGhost}>
                Clear
              </Link>
            )}
          </div>
        </form>
        {log.length === 0 ? (
          <Empty>No events match.</Empty>
        ) : (
          <ul className="divide-y divide-rule text-sm">
            {log.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-36 shrink-0 text-xs text-muted">{e.createdAt.toLocaleString("en-GB")}</span>
                <Link href={href({ name: e.name, page: undefined })} className="font-medium hover:underline">
                  {e.name}
                </Link>
                <span className="min-w-0 flex-1 truncate text-muted">{e.user?.email ?? "anonymous"}</span>
                {e.properties != null && (
                  <code className="max-w-full truncate rounded bg-paper px-1.5 py-0.5 text-xs text-ink-3" title={JSON.stringify(e.properties)}>
                    {JSON.stringify(e.properties)}
                  </code>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} total={logTotal} pageSize={perPage} hrefFor={(p) => href({ page: p > 1 ? String(p) : undefined })} />
      </Card>
    </div>
  );
}
