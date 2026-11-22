import type { Metadata } from "next";
import Link from "next/link";
import { scanAction } from "@/app/actions";
import { Stagger } from "@/components/motion";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Card, Empty, Flash, OppRow, PageHeader, ScorePill, TrackBadge } from "@/components/ui";
import { Landing } from "@/components/landing";
import { getUser } from "@/lib/auth";
import { db, getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export const metadata: Metadata = { title: "Today" };

/** "/" is the public landing page for visitors and the Today dashboard once signed in. */
export default async function Home({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await getUser();
  if (!user) return <Landing />;
  return <Today userId={user.id} searchParams={searchParams} />;
}

async function Today({ userId, searchParams }: { userId: string; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [shortlist, followUps, prospects, counts, lastScan] = await Promise.all([
    db.opportunity.findMany({
      where: { userId, track: "JOB", stage: { in: ["FOUND", "SHORTLISTED"] }, createdAt: { gte: weekAgo } },
      orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { company: { select: { name: true } } },
    }),
    db.opportunity.findMany({
      where: { userId, stage: "SENT", followUpAt: { lte: new Date() } },
      orderBy: { followUpAt: "asc" },
      include: { company: { select: { name: true } } },
    }),
    db.company.findMany({
      where: { userId, OR: [{ recommendation: "PITCH" }, { recommendBoth: true }], opportunities: { none: { track: "PITCH" } } },
      orderBy: { score: "desc" },
      take: 8,
    }),
    db.opportunity.groupBy({ by: ["stage"], where: { userId }, _count: true }),
    getSetting<Scan>(`lastScan:${userId}`, null),
  ]);
  const count = (s: string) => counts.find((c) => c.stage === s)?._count ?? 0;

  const stats: [string, number, string][] = [
    ["Found", count("FOUND") + count("SHORTLISTED"), "bg-ink text-white"],
    ["Drafted", count("DRAFTED"), "bg-ink-2 text-white"],
    ["Sent", count("SENT"), "bg-ink-3 text-white"],
    ["Replied / meetings", count("REPLIED") + count("INTERVIEW"), "bg-ink-4 text-white"],
    ["Won", count("WON"), "bg-signal text-white"],
  ];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-8">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow={today}
        title={
          <>
            Opportunities that <em>actually</em> fit.
          </>
        }
        sub={lastScan ? `Last scan ${new Date(lastScan.at).toLocaleString("en-GB")}` : "No scan yet. Run one to fill your shortlist."}
        actions={
          <form action={scanAction} data-scan-form>
            <SubmitButton className={btnSignal} pending="Scanning job boards… (1–2 min)">
              <span aria-hidden>→</span> Scan job boards now
            </SubmitButton>
          </form>
        }
      />

      {/* Stacked dark stat cards, each tucked slightly under the next. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-0">
        {stats.map(([label, n, tone], i) => (
          <div
            key={label}
            className={`${tone} relative flex min-h-36 last:col-span-2 sm:last:col-span-1 flex-col justify-between rounded-[28px] p-5 sm:-ml-4 sm:first:ml-0 sm:pl-9 sm:first:pl-5`}
            style={{ zIndex: i + 1 }}
          >
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">{label}</div>
            <div className="font-display text-6xl leading-none tabular-nums">{n}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            index={1}
            title="Shortlist: best new jobs this week"
            actions={
              <Link href="/jobs" className="link text-sm font-medium">
                All jobs →
              </Link>
            }
          >
            {shortlist.length === 0 ? (
              <Empty>Nothing new. Scan the boards, or paste a job on “Add job”.</Empty>
            ) : (
              <Stagger className="divide-y divide-ink/5">
                {shortlist.map((o) => (
                  <OppRow key={o.id} o={o} />
                ))}
              </Stagger>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card index={2} title="Follow-ups due">
            {followUps.length === 0 ? (
              <Empty>None due.</Empty>
            ) : (
              <Stagger className="divide-y divide-ink/5">
                {followUps.map((o) => (
                  <OppRow key={o.id} o={o} />
                ))}
              </Stagger>
            )}
          </Card>
          <Card
            index={3}
            title="Companies worth pitching"
            actions={
              <Link href="/companies" className="link text-sm font-medium">
                All →
              </Link>
            }
          >
            {prospects.length === 0 ? (
              <Empty>Add and research companies to get pitch suggestions.</Empty>
            ) : (
              <ul className="space-y-1">
                {prospects.map((c) => (
                  <li key={c.id}>
                    <Link href={`/companies/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-canvas">
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
