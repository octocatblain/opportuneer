import Link from "next/link";
import { addCompanyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Card, Empty, Flash, input, PageHeader, ScorePill, Segmented, TrackBadge } from "@/components/ui";
import { industries } from "@/config/profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Companies({ searchParams }: { searchParams: Promise<{ error?: string; filter?: string }> }) {
  const sp = await searchParams;
  const where =
    sp.filter === "pitch"
      ? { OR: [{ recommendation: "PITCH" as const }, { recommendBoth: true }] }
      : sp.filter === "researched"
        ? { research: { not: null } }
        : {};
  const companies = await db.company.findMany({ where, orderBy: [{ score: "desc" }, { name: "asc" }], take: 300, include: { _count: { select: { opportunities: true } } } });

  return (
    <div className="space-y-6">
      <Flash error={sp.error} />
      <PageHeader
        eyebrow={`${companies.length} compan${companies.length === 1 ? "y" : "ies"}`}
        title={
          <>
            Prospects with <em>budget</em>.
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Segmented
            items={(
              [
                [undefined, "All"],
                ["pitch", "Worth pitching"],
                ["researched", "Researched"],
              ] as const
            ).map(([f, l]) => ({ href: f ? `/companies?filter=${f}` : "/companies", label: l, active: sp.filter === f }))}
          />
          <Card>
            {companies.length === 0 ? (
              <Empty>No companies yet. Add a prospect on the right; companies from scanned jobs show up here too.</Empty>
            ) : (
              <div className="divide-y divide-ink/5">
                {companies.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`} className="group -mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-canvas">
                    <ScorePill score={c.score} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium group-hover:text-signal-dark">{c.name}</div>
                      <div className="truncate text-xs text-ink-4">
                        {industries.find((i) => i.key === c.industry)?.label ?? "Industry unknown"} · {c._count.opportunities} opportunit{c._count.opportunities === 1 ? "y" : "ies"}
                        {!c.research && " · not researched"}
                      </div>
                    </div>
                    <TrackBadge track={c.recommendation} both={c.recommendBoth} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="self-start lg:sticky lg:top-24">
        <Card tone="dark" index={1} title="Add a prospect">
          <form action={addCompanyAction} className="space-y-3">
            <input name="name" required placeholder="Company name" className={input} />
            <input name="website" placeholder="Website (e.g. example.co.ke)" className={input} />
            <textarea name="notes" rows={5} placeholder="What you know: where you found them, branches, staff size, pain points, contacts…" className={input} />
            <SubmitButton className={btnSignal}>Add company</SubmitButton>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-white/60">
            Places to find prospects: Kenya Association of Manufacturers members, KUSCCO SACCO lists, Kenya Healthcare Federation, KEPSA, Google Maps searches by industry and town, and companies whose job posts mention manual or Excel work.
          </p>
        </Card>
        </div>
      </div>
    </div>
  );
}
