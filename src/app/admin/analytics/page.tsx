import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: analytics" };

const DAYS = 30;

/** Admin: product events over the last 30 days: totals by event, active users, a daily series, and the latest events. */
export default async function AdminAnalytics() {
  await requireSuper();
  const since = new Date(Date.now() - DAYS * 86400_000);
  const [byName, active, daily, latest] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: true, orderBy: { _count: { name: "desc" } } }),
    db.analyticsEvent.findMany({ where: { createdAt: { gte: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
    db.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, count(*) AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { email: true } } } }),
  ]);
  const total = byName.reduce((n, r) => n + r._count, 0);
  const max = Math.max(1, ...daily.map((d) => Number(d.n)));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        sub={`Last ${DAYS} days: ${total} events from ${active.length} signed-in user(s).`}
        actions={
          <Link href="/admin" className="link text-sm font-medium">
            Back to admin
          </Link>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Events by name">
          {byName.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : (
            <ul className="divide-y divide-rule text-sm">
              {byName.map((r) => (
                <li key={r.name} className="flex items-center justify-between py-2">
                  <span>{r.name}</span>
                  <Chip>{r._count}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Events per day">
          {daily.length === 0 ? (
            <p className="text-sm text-muted">No events yet.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {daily.map((d) => (
                <li key={d.day.toISOString()} className="flex items-center gap-2">
                  <span className="w-20 text-muted">{d.day.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                  <span className="h-3 rounded bg-signal" style={{ width: `${(Number(d.n) / max) * 70}%` }} />
                  <span className="tabular-nums">{Number(d.n)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Latest events">
        <ul className="divide-y divide-rule text-sm">
          {latest.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-36 text-xs text-muted">{e.createdAt.toLocaleString("en-GB")}</span>
              <span className="font-medium">{e.name}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{e.user?.email ?? "anonymous"}</span>
              {e.properties != null && <span className="truncate text-xs text-muted">{JSON.stringify(e.properties)}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
