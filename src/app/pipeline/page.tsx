import type { Metadata } from "next";
import Link from "next/link";
import { setStageAction } from "@/app/actions";
import { Flash, PageHeader, ScorePill, Segmented, STAGE_LABEL, TrackBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BOARD = ["SHORTLISTED", "DRAFTED", "SENT", "REPLIED", "INTERVIEW", "WON"] as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ track?: string }> }): Promise<Metadata> {
  const { track } = await searchParams;
  return { title: track === "JOB" ? "Pipeline: jobs" : track === "PITCH" ? "Pipeline: pitches" : "Pipeline" };
}

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ track?: string; ok?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const track = sp.track === "JOB" || sp.track === "PITCH" ? sp.track : undefined;
  const opps = await db.opportunity.findMany({
    where: { userId: user.id, stage: { in: [...BOARD] }, ...(track ? { track } : {}) },
    orderBy: [{ updatedAt: "desc" }],
    include: { company: { select: { name: true } } },
  });

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Pipeline"
        sub="New jobs start in “Found” (see Today / Jobs). Shortlist the ones you want, and they appear here."
        actions={
          <Segmented
            items={(
              [
                [undefined, "All"],
                ["JOB", "Jobs"],
                ["PITCH", "Pitches"],
              ] as const
            ).map(([t, l]) => ({ href: t ? `/pipeline?track=${t}` : "/pipeline", label: l, active: track === t }))}
          />
        }
      />
      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-3 xl:grid-cols-6">
        {BOARD.map((stage) => {
          const items = opps.filter((o) => o.stage === stage);
          return (
            <div key={stage} className={`min-w-0 rounded-xl border bg-paper-2 p-2 ${stage === "WON" ? "border-signal" : "border-paper-3"}`}>
              <h2 className="mb-2 flex items-baseline justify-between px-2 pt-1 text-ink">
                <span className="text-sm font-semibold">{STAGE_LABEL[stage]}</span>
                <span className="text-sm font-semibold tabular-nums text-muted">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.length === 0 && <p className="rounded-lg border border-dashed border-paper-3 px-3 py-4 text-center text-xs text-muted">Empty</p>}
                {items.map((o) => {
                  const due = o.stage === "SENT" && o.followUpAt && o.followUpAt <= new Date();
                  const idx = BOARD.indexOf(stage);
                  const next = BOARD[idx + 1];
                  return (
                    <div key={o.id} className={`rounded-lg border bg-white p-3 text-sm ${due ? "border-signal" : "border-rule"}`}>
                      <Link href={`/opportunities/${o.id}`} className="block font-semibold leading-snug hover:underline">
                        {o.title}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted">{o.company?.name}</div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex flex-wrap items-center gap-1">
                          <ScorePill score={o.fitScore} />
                          <TrackBadge track={o.track} />
                        </span>
                        {next && (
                          <form action={setStageAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="stage" value={next} />
                            <input type="hidden" name="back" value={track ? `/pipeline?track=${track}` : "/pipeline"} />
                            <button className="rounded-md border border-rule px-2.5 py-1 text-xs font-medium transition-colors hover:bg-paper-2 active:bg-paper-3" title={`Move to ${STAGE_LABEL[next]}`}>
                              Move to {STAGE_LABEL[next].split(" ")[0]}
                            </button>
                          </form>
                        )}
                      </div>
                      {due && <div className="mt-2 text-xs font-semibold text-signal-dark">Follow-up due</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
