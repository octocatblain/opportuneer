import type { Metadata } from "next";
import Link from "next/link";
import { scanAction } from "@/app/actions";
import { CountUp, Stagger, StaggerItem } from "@/components/motion";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Flash, OppRow, ScorePill, TrackBadge } from "@/components/ui";
import { db, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export const metadata: Metadata = { title: "Today" };

export default async function Today({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [shortlist, followUps, prospects, counts, lastScan] = await Promise.all([
    db.opportunity.findMany({
      where: { track: "JOB", stage: { in: ["FOUND", "SHORTLISTED"] }, createdAt: { gte: weekAgo } },
      orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { company: { select: { name: true } } },
    }),
    db.opportunity.findMany({
      where: { stage: "SENT", followUpAt: { lte: new Date() } },
      orderBy: { followUpAt: "asc" },
      include: { company: { select: { name: true } } },
    }),
    db.company.findMany({
      where: { OR: [{ recommendation: "PITCH" }, { recommendBoth: true }], opportunities: { none: { track: "PITCH" } } },
      orderBy: { score: "desc" },
      take: 8,
    }),
    db.opportunity.groupBy({ by: ["stage"], _count: true }),
    getSetting<Scan>("lastScan", null),
  ]);
  const count = (s: string) => counts.find((c) => c.stage === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Today</h1>
          <p className="text-sm text-slate-500">
            {lastScan ? `Last scan ${new Date(lastScan.at).toLocaleString("en-GB")}` : "No scan yet. Run one to fill your shortlist."}
          </p>
        </div>
        <form action={scanAction}>
          <SubmitButton className={btn} pending="Scanning job boards… (1–2 min)">
            Scan job boards now
          </SubmitButton>
        </form>
      </div>

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Found", count("FOUND") + count("SHORTLISTED")],
          ["Drafted", count("DRAFTED")],
          ["Sent", count("SENT")],
          ["Replied / meetings", count("REPLIED") + count("INTERVIEW")],
          ["Won", count("WON")],
        ].map(([l, n]) => (
          <StaggerItem key={l} className="rounded-lg border border-slate-200 border-t-2 border-t-brand-600 bg-white p-3">
            <CountUp value={Number(n)} className="block text-2xl font-bold tabular-nums" />
            <div className="text-xs text-slate-500">{l}</div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Shortlist: best new jobs this week" actions={<Link href="/jobs" className="text-sm text-brand-700 hover:underline">All jobs →</Link>}>
            {shortlist.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing new. Scan the boards, or paste a job on “Add job”.</p>
            ) : (
              <Stagger className="divide-y divide-slate-100">
                {shortlist.map((o) => (
                  <OppRow key={o.id} o={o} />
                ))}
              </Stagger>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Follow-ups due">
            {followUps.length === 0 ? (
              <p className="text-sm text-slate-500">None due.</p>
            ) : (
              <Stagger className="divide-y divide-slate-100">
                {followUps.map((o) => (
                  <OppRow key={o.id} o={o} />
                ))}
              </Stagger>
            )}
          </Card>
          <Card title="Companies worth pitching" actions={<Link href="/companies" className="text-sm text-brand-700 hover:underline">All →</Link>}>
            {prospects.length === 0 ? (
              <p className="text-sm text-slate-500">Add and research companies to get pitch suggestions.</p>
            ) : (
              <ul className="space-y-2">
                {prospects.map((c) => (
                  <li key={c.id}>
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-brand-50">
                      <ScorePill score={c.score} />
                      <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                      <TrackBadge track={c.recommendation} both={c.recommendBoth} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
