import type { Metadata } from "next";
import Link from "next/link";
import { setStageAction } from "@/app/actions";
import { Flash, PageHeader, ScorePill, Segmented, STAGE_LABEL, TrackBadge } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BOARD = ["SHORTLISTED", "DRAFTED", "SENT", "REPLIED", "INTERVIEW", "WON"] as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ track?: string }> }): Promise<Metadata> {
  const { track } = await searchParams;
  return { title: track === "JOB" ? "Pipeline: jobs" : track === "PITCH" ? "Pipeline: pitches" : "Pipeline" };
}

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ track?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const track = sp.track === "JOB" || sp.track === "PITCH" ? sp.track : undefined;
  const opps = await db.opportunity.findMany({
    where: { stage: { in: [...BOARD] }, ...(track ? { track } : {}) },
    orderBy: [{ updatedAt: "desc" }],
    include: { company: { select: { name: true } } },
  });

  return (
    <div>
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow="Pipeline"
        title={
          <>
            From shortlist to <em>signed</em>.
          </>
        }
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
            <div key={stage} className={`min-w-0 rounded-[28px] p-3 ${stage === "WON" ? "bg-signal" : "bg-ink"}`}>
              <h2 className="mb-3 flex items-baseline justify-between px-2 pt-1 text-white">
                <span className="text-sm font-semibold">{STAGE_LABEL[stage]}</span>
                <span className="font-display text-2xl leading-none tabular-nums text-white/70">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-white/50">Empty</p>}
                {items.map((o) => {
                  const due = o.stage === "SENT" && o.followUpAt && o.followUpAt <= new Date();
                  const idx = BOARD.indexOf(stage);
                  const next = BOARD[idx + 1];
                  return (
                    <div key={o.id} className={`rounded-2xl bg-white p-3 text-sm transition-transform hover:-rotate-1 ${due ? "ring-2 ring-signal" : ""}`}>
                      <Link href={`/opportunities/${o.id}`} className="block font-semibold leading-snug hover:text-signal-dark">
                        {o.title}
                      </Link>
                      <div className="mt-0.5 text-xs text-ink-4">{o.company?.name}</div>
                      <div className="mt-3 flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <ScorePill score={o.fitScore} />
                          <TrackBadge track={o.track} />
                        </span>
                        {next && (
                          <form action={setStageAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="stage" value={next} />
                            <input type="hidden" name="back" value={track ? `/pipeline?track=${track}` : "/pipeline"} />
                            <button className="rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium transition-colors hover:border-ink hover:bg-ink hover:text-white" title={`Move to ${STAGE_LABEL[next]}`}>
                              → {STAGE_LABEL[next].split(" ")[0]}
                            </button>
                          </form>
                        )}
                      </div>
                      {due && <div className="mt-2 text-xs font-semibold text-signal-dark">● Follow-up due</div>}
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
