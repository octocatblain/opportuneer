import type { Metadata } from "next";
import { Card, Chip, Empty, input, OppRow, PageHeader, Segmented, STAGE_LABEL, tab } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }): Promise<Metadata> {
  const { view, q } = await searchParams;
  if (q) return { title: `Jobs matching "${q}"` };
  return { title: view === "all" ? "All jobs" : view === "archived" ? "Archived jobs" : "New jobs" };
}

export default async function Jobs({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const sp = await searchParams;
  const view = sp.view ?? "new";
  const stageFilter =
    view === "archived" ? { stage: "ARCHIVED" as const } : view === "all" ? {} : { stage: { in: ["FOUND" as const, "SHORTLISTED" as const] } };
  const jobs = await db.opportunity.findMany({
    where: {
      track: "JOB",
      ...stageFilter,
      ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { company: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    },
    orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { company: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
        title={
          <>
            Roles <em>worth</em> your time.
          </>
        }
        actions={
          <form className="w-72 max-w-full" action="/jobs" role="search">
            <input type="hidden" name="view" value={view} />
            <input name="q" defaultValue={sp.q} placeholder="Search title or company" aria-label="Search jobs" className={input} />
          </form>
        }
      />
      <Segmented
        items={[
          ["new", "New & shortlisted"],
          ["all", "All"],
          ["archived", "Auto-archived (pay, location or unclear post)"],
        ].map(([v, l]) => ({ href: `/jobs?view=${v}`, label: l, active: view === v }))}
      />
      <Card>
        {jobs.length === 0 ? (
          <Empty>No jobs here yet.</Empty>
        ) : (
          <div className="divide-y divide-ink/5">
            {jobs.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <OppRow o={o} />
                </div>
                <span className="hidden w-28 justify-end sm:flex">
                  <Chip>{STAGE_LABEL[o.stage]}</Chip>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
