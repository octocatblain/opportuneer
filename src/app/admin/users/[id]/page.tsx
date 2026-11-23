import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDeleteUserAction, adminSignOutUserAction, adminUpdateUserAction } from "@/app/profile-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, btnGhost, Flash, input, Card, Chip, Empty, OppRow, PAGE_SIZE, PageHeader, pageParam, Pagination, ScorePill, Segmented, STAGE_LABEL, TrackBadge } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile, missingSteps, type JobPrefs, type PitchPrefs } from "@/lib/kyc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: user content" };

type SP = { tab?: string; page?: string; ok?: string; error?: string };

/** Read-only view of one user's content for the superuser. */
export default async function AdminUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  await requireSuper();
  const { id } = await params;
  const sp = await searchParams;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, trackAccess: true, createdAt: true, lastLoginAt: true, passwordHash: true, googleId: true } });
  if (!user) notFound();
  const kyc = await getProfile(id);
  const todo = missingSteps(user.trackAccess, kyc);
  const jp = kyc?.jobPrefs as JobPrefs | null;
  const pp = kyc?.pitchPrefs as PitchPrefs | null;
  const tab = sp.tab === "companies" ? "companies" : "opportunities";
  const [nOpp, nCo, sessions] = await Promise.all([db.opportunity.count({ where: { userId: id } }), db.company.count({ where: { userId: id } }), db.session.count({ where: { userId: id, expiresAt: { gt: new Date() } } })]);
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
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow={user.email}
        title={user.name ?? user.email}
        actions={
          <Link href="/admin" className="link text-sm font-medium">
            All accounts
          </Link>
        }
      />
      <Card title="Account">
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={adminUpdateUserAction} className="space-y-2 text-sm">
            <input type="hidden" name="id" value={user.id} />
            <label className="block text-xs font-medium text-ink-3" htmlFor="u-name">
              Display name
            </label>
            <input id="u-name" name="name" defaultValue={user.name ?? ""} maxLength={80} className={input} />
            <label className="block text-xs font-medium text-ink-3" htmlFor="u-access">
              Track access
            </label>
            <select id="u-access" name="trackAccess" defaultValue={user.trackAccess} className={input}>
              <option value="BOTH">Jobs and pitches</option>
              <option value="JOB">Jobs only</option>
              <option value="PITCH">Pitches only</option>
            </select>
            <SubmitButton className={btn} pending="Saving…">
              Save changes
            </SubmitButton>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs text-muted">
              <dt>Email</dt>
              <dd className="truncate text-ink">{user.email}</dd>
              <dt>Joined</dt>
              <dd className="text-ink">{user.createdAt.toLocaleDateString("en-GB")}</dd>
              <dt>Last sign-in</dt>
              <dd className="text-ink">{user.lastLoginAt ? user.lastLoginAt.toLocaleString("en-GB") : "never"}</dd>
              <dt>Sign-in</dt>
              <dd className="text-ink">{[user.passwordHash && "password", user.googleId && "Google"].filter(Boolean).join(", ") || "none"}</dd>
              <dt>Active sessions</dt>
              <dd className="text-ink">{sessions}</dd>
            </dl>
          </form>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <a href={`/api/account/export?user=${user.id}`} className={btnGhost}>
                Export data
              </a>
              <form action={adminSignOutUserAction}>
                <input type="hidden" name="id" value={user.id} />
                <button className={btnGhost}>Sign out everywhere</button>
              </form>
            </div>
            {user.role !== "SUPERUSER" && (
              <form action={adminDeleteUserAction} className="space-y-2 border-t border-rule pt-3">
                <input type="hidden" name="id" value={user.id} />
                <p className="font-medium text-error">Delete account</p>
                <p className="text-xs text-muted">Removes the account and all of its companies, opportunities and documents. Cannot be undone.</p>
                <input name="confirm" required placeholder={`Type ${user.email} to confirm`} autoComplete="off" className={input} aria-label="Type the account email to confirm" />
                <SubmitButton className={btnGhost} pending="Deleting…">
                  Delete account
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Card>
      <Card title="Profile (KYC)">
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Status</dt>
          <dd>{user.role === "SUPERUSER" ? "Owner (not required)" : todo.length ? `Incomplete: ${todo.join(", ")}` : "Complete"}</dd>
          <dt className="text-muted">Resume</dt>
          <dd>{kyc?.resumeName ? <a className="link" href={`/api/profile/resume?user=${user.id}`}>{kyc.resumeName}</a> : "none"}</dd>
          {jp && (
            <>
              <dt className="text-muted">Job targets</dt>
              <dd>{[...jp.titleKeys, ...jp.customTitles].join(", ")} · floor ${jp.localMonthlyUsd}/${jp.remoteMonthlyUsd} per month</dd>
            </>
          )}
          {pp && (
            <>
              <dt className="text-muted">Agency</dt>
              <dd>{pp.agencyName} · {pp.packages.length} packages · client floor KES {pp.clientFloorKes.toLocaleString()}</dd>
            </>
          )}
        </dl>
      </Card>
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
                    <OppRow o={o} base="/client/duo" />
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
              <Link key={c.id} href={`/client/duo/companies/${c.id}`} className="group -mx-3 flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-paper active:bg-paper-2">
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
