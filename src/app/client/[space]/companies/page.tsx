import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addCompanyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Card, Empty, Flash, input, PAGE_SIZE, PageHeader, pageParam, Pagination, ScorePill, Segmented, TrackBadge } from "@/components/ui";
import { requireSpace } from "@/lib/auth";
import { loadUserConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { clientBase, isSpace, spaceAllowsTrack } from "@/lib/spaces";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ filter?: string }> }): Promise<Metadata> {
  const { filter } = await searchParams;
  return { title: filter === "pitch" ? "Companies worth pitching" : filter === "researched" ? "Researched companies" : "Companies" };
}

export default async function Companies({ params, searchParams }: { params: Promise<{ space: string }>; searchParams: Promise<{ error?: string; filter?: string; page?: string }> }) {
  const { space } = await params;
  if (!isSpace(space)) notFound();
  const user = await requireSpace(space);
  const base = clientBase(space);
  if (!spaceAllowsTrack(space, "PITCH")) redirect(base);

  const { industries } = await loadUserConfig(user.id);
  const sp = await searchParams;
  const filter =
    sp.filter === "pitch"
      ? { OR: [{ recommendation: "PITCH" as const }, { recommendBoth: true }] }
      : sp.filter === "researched"
        ? { research: { not: null } }
        : {};
  const where = { userId: user.id, ...filter };
  const total = await db.company.count({ where });
  const page = Math.min(pageParam(sp.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const hrefFor = (n: number) => `${base}/companies${sp.filter || n > 1 ? "?" : ""}${[sp.filter ? `filter=${sp.filter}` : "", n > 1 ? `page=${n}` : ""].filter(Boolean).join("&")}`;
  const companies = await db.company.findMany({ where, orderBy: [{ score: "desc" }, { name: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { opportunities: true } } } });

  return (
    <div className="space-y-6">
      <Flash error={sp.error} />
      <PageHeader
        eyebrow={`${total} compan${total === 1 ? "y" : "ies"}`}
        title="Companies"
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
            ).map(([f, l]) => ({ href: f ? `${base}/companies?filter=${f}` : `${base}/companies`, label: l, active: sp.filter === f }))}
          />
          <Card>
            {companies.length === 0 ? (
              <Empty>No companies yet. Add a prospect on the right; companies from scanned jobs show up here too.</Empty>
            ) : (
              <div className="divide-y divide-rule">
                {companies.map((c) => (
                  <Link key={c.id} href={`${base}/companies/${c.id}`} className="group -mx-3 flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-paper active:bg-paper-2">
                    <ScorePill score={c.score} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium group-hover:underline">{c.name}</div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                        <span>{industries.find((i) => i.key === c.industry)?.label ?? "Industry unknown"}</span>
                        <span>
                          {c._count.opportunities} opportunit{c._count.opportunities === 1 ? "y" : "ies"}
                        </span>
                        {!c.research && <span>not researched</span>}
                      </div>
                    </div>
                    <TrackBadge track={c.recommendation} both={c.recommendBoth} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Pagination page={page} total={total} hrefFor={hrefFor} />
        </div>
        <div className="self-start lg:sticky lg:top-24">
        <Card tone="dark" title="Add a prospect">
          <form action={addCompanyAction} className="space-y-3">
            <input name="name" required placeholder="Company name" className={input} />
            <input name="website" placeholder="Website (e.g. example.co.ke)" className={input} />
            <textarea name="notes" rows={5} placeholder="What you know: where you found them, branches, staff size, pain points, contacts…" className={input} />
            <SubmitButton className={btnSignal}>Add company</SubmitButton>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Places to find prospects: Kenya Association of Manufacturers members, KUSCCO SACCO lists, Kenya Healthcare Federation, KEPSA, Google Maps searches by industry and town, and companies whose job posts mention manual or Excel work.
          </p>
        </Card>
        </div>
      </div>
    </div>
  );
}
