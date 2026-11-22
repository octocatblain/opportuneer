import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Chip, Empty, OppRow, PAGE_SIZE, PageHeader, pageParam, Pagination, ScorePill, Segmented, STAGE_LABEL, TrackBadge } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: user content" };

type SP = { tab?: string; page?: string };

/** Read-only view of one user's content for the superuser. */
export default async function AdminUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireSuper();
  const { id } = await params;
  const sp = await searchParams;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
  if (!user) notFound();
  const tab = sp.tab === "companies" ? "companies" : "opportunities";
  const [nOpp, nCo] = await Promise.all([db.opportunity.count({ where: { userId: id } }), db.company.count({ where: { userId: id } })]);
  const total = tab === "companies" ? nCo : nOpp;
  const page = Math.min(pageParam(sp.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const hrefFor = (n: number) => `/admin/users/${id}?tab=${tab}${n > 1 ? `&page=${n}` : ""}`;

  const opps =
    tab === "opportunities"
      ? await db.opportunity.findMany({ where: { userId: id }, orderBy: [{ updatedAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { company: { select: { name: true } } } })
      : [];
  const companies =
    tab === "companies"
      ? await db.company.findMany({ where: { userId: id }, orderBy: [{ score: "desc" }, { name: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Read-only view of ${user.email}`}
        title={`${user.name ?? user.email}'s content`}
        actions={
          <Link href="/admin" className="link text-sm font-medium">
            All accounts
          </Link>
        }
      />
      <Segmented
        items={[
          { href: `/admin/users/${id}?tab=opportunities`, label: `Opportunities (${nOpp})`, active: tab === "opportunities" },
          { href: `/admin/users/${id}?tab=companies`, label: `Companies (${nCo})`, active: tab === "companies" },
        ]}
      />
      <Card>
        {tab === "opportunities" ? (
          opps.length === 0 ? (
            <Empty>No opportunities yet.</Empty>
          ) : (
            <div className="divide-y divide-rule">
              {opps.map((o) => (
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
          )
        ) : companies.length === 0 ? (
          <Empty>No companies yet.</Empty>
        ) : (
          <div className="divide-y divide-rule">
            {companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-paper active:bg-paper-2">
                <ScorePill score={c.score} />
                <span className="min-w-0 flex-1 truncate font-medium group-hover:underline">{c.name}</span>
                <TrackBadge track={c.recommendation} both={c.recommendBoth} />
              </Link>
            ))}
          </div>
        )}
      </Card>
      <Pagination page={page} total={total} hrefFor={hrefFor} />
    </div>
  );
}
