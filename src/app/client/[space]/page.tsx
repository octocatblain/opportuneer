import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { scanAction } from "@/app/actions";
import { Gauge, Legend, Meter, Metric, StackedBars, type BarDatum } from "@/components/dash";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Card, Empty, Flash, OppRow, PageHeader, ScorePill, TrackBadge } from "@/components/ui";
import { requireSpace } from "@/lib/auth";
import { db, getSetting } from "@/lib/db";
import { clientBase, isSpace, spaceAllowsTrack } from "@/lib/spaces";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export const metadata: Metadata = { title: "Dashboard" };

/** Dashboard of a client space. Jobs-only spaces hide pitch widgets and vice versa. */
export default async function Dashboard({ params, searchParams }: { params: Promise<{ space: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { space } = await params;
  if (!isSpace(space)) notFound();
  const { id: userId } = await requireSpace(space);
  const base = clientBase(space);
  const showJobs = spaceAllowsTrack(space, "JOB");
  const showPitches = spaceAllowsTrack(space, "PITCH");
  const sp = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const chartFrom = new Date(dayStart.getTime() - 6 * 86400_000);
  const trackFilter = showJobs && showPitches ? {} : { track: showJobs ? ("JOB" as const) : ("PITCH" as const) };
  const [shortlist, followUps, prospects, counts, lastScan, recent, fit] = await Promise.all([
    showJobs
      ? db.opportunity.findMany({
          where: { userId, track: "JOB", stage: { in: ["FOUND", "SHORTLISTED"] }, createdAt: { gte: weekAgo } },
          orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
          take: 10,
          include: { company: { select: { name: true } } },
        })
      : Promise.resolve([]),
    db.opportunity.findMany({
      where: { userId, stage: "SENT", followUpAt: { lte: new Date() }, ...trackFilter },
      orderBy: { followUpAt: "asc" },
      include: { company: { select: { name: true } } },
    }),
    showPitches
      ? db.company.findMany({
          where: { userId, OR: [{ recommendation: "PITCH" }, { recommendBoth: true }], opportunities: { none: { track: "PITCH" } } },
          orderBy: { score: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    db.opportunity.groupBy({ by: ["stage"], where: { userId, ...trackFilter }, _count: true }),
    getSetting<Scan>(`lastScan:${userId}`, null),
    db.opportunity.findMany({ where: { userId, createdAt: { gte: chartFrom }, ...trackFilter }, select: { createdAt: true, track: true } }),
    db.opportunity.aggregate({ where: { userId, track: "JOB", fitScore: { not: null }, stage: { not: "ARCHIVED" } }, _avg: { fitScore: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.stage === s)?._count ?? 0;

  const total = counts.reduce((n, c) => n + c._count, 0);
  const waiting = count("FOUND") + count("SHORTLISTED");
  const replied = count("REPLIED") + count("INTERVIEW") + count("WON");
  const sentPlus = count("SENT") + replied;
  const replyRate = sentPlus ? Math.round((replied / sentPlus) * 100) : 0;
  const days: BarDatum[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(chartFrom.getTime() + i * 86400_000);
    const mine = recent.filter((r) => r.createdAt.toDateString() === d.toDateString());
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      parts: [
        ...(showJobs ? [{ name: "Jobs found", color: "var(--color-leaf)", value: mine.filter((r) => r.track === "JOB").length }] : []),
        ...(showPitches ? [{ name: "Pitches started", color: "var(--color-amber)", value: mine.filter((r) => r.track === "PITCH").length }] : []),
      ],
    };
  });
  const stageRows: [string, number, string][] = [
    ["Found / shortlisted", waiting, "var(--color-butter)"],
    ["Drafted", count("DRAFTED"), "var(--color-leaf)"],
    ["Sent", count("SENT"), "var(--color-amber)"],
    ["Replied / meetings", count("REPLIED") + count("INTERVIEW"), "var(--color-leaf-dark)"],
    ["Won", count("WON"), "var(--color-ink)"],
  ];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow={today}
        title="Dashboard"
        sub={
          showJobs
            ? lastScan
              ? `Last scan ${new Date(lastScan.at).toLocaleString("en-GB")}`
              : "No scan yet. Run one to fill your shortlist."
            : "Your pitch pipeline and the companies worth approaching."
        }
        actions={
          showJobs ? (
            <form action={scanAction} data-scan-form>
              <SubmitButton className={btnSignal} pending="Scanning job boards… (1–2 min)">
                Scan job boards now
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card
            title={
              <span className="flex items-baseline gap-3">
                <span className="text-3xl tabular-nums">{recent.length}</span>
                <span className="text-sm font-normal text-muted">added in the last 7 days</span>
              </span>
            }
            actions={<Legend items={days[0].parts.map((p) => ({ name: p.name, color: p.color }))} />}
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_12rem]">
              <StackedBars data={days} height={200} />
              <div className="space-y-6 lg:border-l lg:border-rule lg:pl-6">
                <Metric label="In pipeline" value={total} note={`${waiting} waiting to be actioned`} />
                <Metric label="Sent or further" value={sentPlus} note={`${count("DRAFTED")} drafted, not yet sent`} tone="amber" />
                <Metric label="Reply rate" value={`${replyRate}%`} note={`${replied} of ${sentPlus} answered`} />
              </div>
            </div>
          </Card>
        </div>
        <div className="xl:col-span-4">
          <Card title="Follow-ups due" actions={<span className="rounded-lg bg-paper px-2 py-0.5 text-xs tabular-nums text-muted">{followUps.length}</span>}>
            {followUps.length === 0 ? (
              <Empty>Nothing due. Sent items appear here when their follow-up date arrives.</Empty>
            ) : (
              <div className="divide-y divide-rule">
                {followUps.slice(0, 6).map((o) => (
                  <OppRow key={o.id} o={o} base={base} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {showJobs && (
          <div className="xl:col-span-8">
            <Card
              title="Shortlist: best new jobs this week"
              actions={
                <Link href={`${base}/jobs`} className="link text-sm font-medium">
                  View all jobs
                </Link>
              }
            >
              {shortlist.length === 0 ? (
                <Empty>Nothing new. Scan the boards, or paste a job on “Add job”.</Empty>
              ) : (
                <div className="divide-y divide-rule">
                  {shortlist.map((o) => (
                    <OppRow key={o.id} o={o} base={base} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
        <div className={`space-y-4 ${showJobs ? "xl:col-span-4" : "xl:col-span-12"}`}>
          <Card title="Pipeline by stage">
            <div className="space-y-4">
              {stageRows.map(([label, n, color]) => (
                <Meter key={label} label={label} value={n} max={Math.max(1, total)} color={color} right={n} />
              ))}
            </div>
          </Card>
          {showJobs && (
            <Card title="Average job fit">
              <Gauge value={fit._avg.fitScore ?? 0} caption="mean fit score of active jobs" />
            </Card>
          )}
        </div>

        {showPitches && (
          <div className="xl:col-span-12">
            <Card
              title="Companies worth pitching"
              actions={
                <Link href={`${base}/companies`} className="link text-sm font-medium">
                  View all
                </Link>
              }
            >
              {prospects.length === 0 ? (
                <Empty>Add and research companies to get pitch suggestions.</Empty>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {prospects.map((c) => (
                    <li key={c.id}>
                      <Link href={`${base}/companies/${c.id}`} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-3 transition-colors hover:bg-paper-2">
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
        )}
      </div>
    </div>
  );
}
