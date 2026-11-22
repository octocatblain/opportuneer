import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Card, Chip, Empty, input, OppRow, PAGE_SIZE, PageHeader, pageParam, Pagination, Segmented, STAGE_LABEL } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }): Promise<Metadata> {
  const { view, q } = await searchParams;
  if (q) return { title: `Jobs matching "${q}"` };
  return { title: view === "all" ? "All jobs" : view === "archived" ? "Archived jobs" : "New jobs" };
}

export default async function Jobs({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view ?? "new";
  const stageFilter =
    view === "archived" ? { stage: "ARCHIVED" as const } : view === "all" ? {} : { stage: { in: ["FOUND" as const, "SHORTLISTED" as const] } };
  const where: Prisma.OpportunityWhereInput = {
      userId: user.id,
      track: "JOB" as const,
      ...stageFilter,
      ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { company: { name: { contains: sp.q, mode: "insensitive" } } }] } : {}),
  };
  const total = await db.opportunity.count({ where });
  const page = Math.min(pageParam(sp.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const jobs = await db.opportunity.findMany({
    where,
    orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { company: { select: { name: true } } },
  });
  const hrefFor = (n: number) => `/jobs?view=${view}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${n > 1 ? `&page=${n}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${total} job${total === 1 ? "" : "s"}`}
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
        ].map(([v, l]) => ({ href: `/jobs?view=${v}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`, label: l, active: view === v }))}
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
      <Pagination page={page} total={total} hrefFor={hrefFor} />
    </div>
  );
}
