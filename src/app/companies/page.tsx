import Link from "next/link";
import { addCompanyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Flash, input, ScorePill, TrackBadge } from "@/components/ui";
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
    <div className="space-y-4">
      <Flash error={sp.error} />
      <h1 className="text-2xl font-bold">Companies</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-1 text-sm">
            {[
              [undefined, "All"],
              ["pitch", "Worth pitching"],
              ["researched", "Researched"],
            ].map(([f, l]) => (
              <Link key={l} href={f ? `/companies?filter=${f}` : "/companies"} className={`rounded-md px-3 py-1.5 ${sp.filter === f ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}>
                {l}
              </Link>
            ))}
          </div>
          <Card>
            {companies.length === 0 ? (
              <p className="text-sm text-slate-500">No companies yet. Add a prospect on the right; companies from scanned jobs show up here too.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <Link key={c.id} href={`/companies/${c.id}`} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-50">
                    <ScorePill score={c.score} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="truncate text-xs text-slate-500">
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
        <Card title="Add a prospect">
          <form action={addCompanyAction} className="space-y-3">
            <input name="name" required placeholder="Company name" className={input} />
            <input name="website" placeholder="Website (e.g. example.co.ke)" className={input} />
            <textarea name="notes" rows={5} placeholder="What you know: where you found them, branches, staff size, pain points, contacts…" className={input} />
            <SubmitButton className={btn}>Add company</SubmitButton>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Places to find prospects: Kenya Association of Manufacturers members, KUSCCO SACCO lists, Kenya Healthcare Federation, KEPSA, Google Maps searches by industry and town, and companies whose job posts mention manual or Excel work.
          </p>
        </Card>
      </div>
    </div>
  );
}
