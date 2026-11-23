import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildPdf, type PdfBlock } from "@/lib/analytics-pdf";
import { getUser, isSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Spreadsheet apps run text starting with = + - @ as formulas, so neutralise those cells.
const cell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

type Section = { title: string; head: string[]; rows: (string | number)[][]; chart?: PdfBlock; widths?: number[] };

const TITLES: Record<string, string> = {
  summary: "Summary",
  daily: "Events per day",
  hours: "Activity by hour (UTC)",
  names: "Events by name",
  users: "Most active users",
  events: "Event log",
};

/**
 * Admin-only export for the analytics page, as CSV (default) or PDF (`format=pdf`, charts included).
 * `section`: events (honours name/q filters), daily, names, users, hours, summary.
 */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user || !isSuper(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const range = Number(sp.get("range"));
  const days = [1, 7, 30, 90].includes(range) ? range : 30;
  const since = new Date(Date.now() - days * 86_400_000);
  const section = sp.get("section") && TITLES[sp.get("section")!] ? sp.get("section")! : "events";
  const pdf = sp.get("format") === "pdf";
  const name = sp.get("name")?.trim();
  const q = sp.get("q")?.trim();

  let s: Section;
  if (section === "daily") {
    const rows = await db.$queryRaw<{ day: Date; n: bigint }[]>`SELECT date_trunc('day', "createdAt") AS day, count(*) AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`;
    const counts = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.n)]));
    const full = Array.from({ length: days }, (_, i) => {
      const k = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      return { k, n: counts.get(k) ?? 0 };
    });
    s = {
      title: TITLES.daily,
      head: ["date", "events"],
      rows: full.map((d) => [d.k, d.n]),
      chart: { kind: "columns", title: "Events per day", items: full.map((d) => ({ label: d.k.slice(5), value: d.n })) },
    };
  } else if (section === "hours") {
    const rows = await db.$queryRaw<{ h: number; n: bigint }[]>`SELECT extract(hour from "createdAt")::int AS h, count(*) AS n FROM "AnalyticsEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`;
    const m = new Map(rows.map((r) => [r.h, Number(r.n)]));
    const full = Array.from({ length: 24 }, (_, h) => ({ h, n: m.get(h) ?? 0 }));
    s = {
      title: TITLES.hours,
      head: ["hour_utc", "events"],
      rows: full.map((d) => [d.h, d.n]),
      chart: { kind: "columns", title: "Events by hour", items: full.map((d) => ({ label: String(d.h).padStart(2, "0"), value: d.n })), labelEvery: 3 },
    };
  } else if (section === "names") {
    const rows = await db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: true, orderBy: { _count: { name: "desc" } } });
    const total = rows.reduce((n, r) => n + r._count, 0) || 1;
    s = {
      title: TITLES.names,
      head: ["event", "count", "share_percent"],
      rows: rows.map((r) => [r.name, r._count, ((r._count / total) * 100).toFixed(1)]),
      chart: { kind: "bars", title: "By event", items: rows.slice(0, 20).map((r) => ({ label: r.name, value: r._count })) },
    };
  } else if (section === "users") {
    const rows = await db.analyticsEvent.groupBy({ by: ["userId"], where: { createdAt: { gte: since }, userId: { not: null } }, _count: true, orderBy: { _count: { userId: "desc" } }, take: 1000 });
    const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId!) } }, select: { id: true, email: true } });
    const email = new Map(users.map((u) => [u.id, u.email]));
    const list = rows.map((r) => ({ u: email.get(r.userId!) ?? "unknown", n: r._count }));
    s = {
      title: TITLES.users,
      head: ["user", "events"],
      rows: list.map((r) => [r.u, r.n]),
      chart: { kind: "bars", title: "Top users", items: list.slice(0, 15).map((r) => ({ label: r.u, value: r.n })) },
    };
  } else if (section === "summary") {
    const prev = new Date(since.getTime() - days * 86_400_000);
    const [total, totalPrev, active, activePrev, anon] = await Promise.all([
      db.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
      db.analyticsEvent.count({ where: { createdAt: { gte: prev, lt: since } } }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
      db.analyticsEvent.findMany({ where: { createdAt: { gte: prev, lt: since }, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
      db.analyticsEvent.count({ where: { createdAt: { gte: since }, userId: null } }),
    ]);
    s = {
      title: TITLES.summary,
      head: ["metric", "this_period", "previous_period"],
      rows: [
        ["events", total, totalPrev],
        ["active_users", active.length, activePrev.length],
        ["anonymous_events", anon, ""],
        ["avg_events_per_day", (total / days).toFixed(1), (totalPrev / days).toFixed(1)],
      ],
    };
  } else {
    const where: Prisma.AnalyticsEventWhereInput = {
      createdAt: { gte: since },
      ...(name ? { name } : {}),
      ...(q ? { OR: [{ user: { email: { contains: q, mode: "insensitive" } } }, ...(q.toLowerCase() === "anonymous" ? [{ userId: null }] : [])] } : {}),
    };
    const rows = await db.analyticsEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: pdf ? 1000 : 20_000, include: { user: { select: { email: true } } } });
    s = {
      title: TITLES.events,
      head: ["time", "event", "user", "properties"],
      rows: rows.map((r) => [pdf ? r.createdAt.toISOString().replace("T", " ").slice(0, 19) : r.createdAt.toISOString(), r.name, r.user?.email ?? "anonymous", r.properties ? JSON.stringify(r.properties) : ""]),
      widths: [105, 100, 150, 160],
    };
  }

  const file = `analytics-${section}-${days}d`;
  if (pdf) {
    const filters = [name && `event: ${name}`, q && `user: ${q}`].filter(Boolean).join(", ");
    const sub = `Last ${days === 1 ? "24 hours" : `${days} days`}, generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC${filters ? `, filters: ${filters}` : ""}`;
    const blocks: PdfBlock[] = [];
    if (s.chart) blocks.push(s.chart);
    blocks.push({ kind: "table", title: s.chart ? "Data" : s.title, head: s.head, rows: s.rows, widths: s.widths });
    const bytes = await buildPdf(`Analytics: ${s.title}`, sub, blocks);
    return new NextResponse(Buffer.from(bytes), {
      headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${file}.pdf"`, "cache-control": "no-store" },
    });
  }
  const body = [s.head.join(",")].concat(s.rows.map((r) => r.map(cell).join(","))).join("\r\n");
  return new NextResponse(body, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${file}.csv"`, "cache-control": "no-store" },
  });
}
