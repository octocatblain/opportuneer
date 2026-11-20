import Link from "next/link";
import { Card, OppRow, STAGE_LABEL } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <form className="flex gap-2" action="/jobs">
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={sp.q} placeholder="Search title or company" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
        </form>
      </div>
      <div className="flex flex-wrap gap-1 text-sm">
        {[
          ["new", "New & shortlisted"],
          ["all", "All"],
          ["archived", "Auto-archived (pay/location mismatch)"],
        ].map(([v, l]) => (
          <Link key={v} href={`/jobs?view=${v}`} className={`rounded-md px-3 py-1.5 ${view === v ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}>
            {l}
          </Link>
        ))}
      </div>
      <Card>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No jobs here yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <OppRow o={o} />
                </div>
                <span className="hidden w-24 text-right text-xs text-slate-500 sm:block">{STAGE_LABEL[o.stage]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
