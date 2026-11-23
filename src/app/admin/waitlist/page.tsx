import type { Metadata } from "next";
import Link from "next/link";
import { deleteWaitlistEntryAction, moveWaitlistEntryAction, setWaitlistStatusAction } from "@/app/waitlist-actions";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { btn, btnGhost, Card, Chip, Empty, Flash, input, PageHeader, Pagination, pageParam } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";
import { COHORT_A_SIZE, COHORT_B_SIZE, waitlistCounts, waitlistWhere } from "@/lib/waitlist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Waitlist" };

const PER_PAGE = 25;
type SP = { ok?: string; error?: string; q?: string; group?: string; status?: string; track?: string; page?: string };

const tone = (c: string | null) => (c === "A" ? "mint" : c === "B" ? "cream" : "light");
const STATUS_TONE = { WAITING: "light", INVITED: "sky", ACTIVE: "mint", DECLINED: "amber" } as const;
const ago = (d: Date) => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
};

function Stat({ label, value, sub, pct }: { label: string; value: React.ReactNode; sub?: string; pct?: number }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {pct !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Admin: the waitlist in join order, with cohort assignment, counts, search and filters, per-person actions, CSV export and delete. */
export default async function AdminWaitlist({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuper();
  const sp = await searchParams;
  const filters = { q: sp.q, group: sp.group, status: sp.status, track: sp.track };
  const where = waitlistWhere(filters);
  const page = pageParam(sp.page);

  const [counts, total, entries, byStatus, waitA, waitB, pilot, sources] = await Promise.all([
    waitlistCounts(),
    db.waitlistEntry.count({ where }),
    db.waitlistEntry.findMany({ where, orderBy: { seq: "asc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.waitlistEntry.groupBy({ by: ["status"], _count: true }),
    db.waitlistEntry.count({ where: { phase: "PILOT", cohort: "A", status: "WAITING" } }),
    db.waitlistEntry.count({ where: { phase: "PILOT", cohort: "B", status: "WAITING" } }),
    db.waitlistEntry.findMany({ where: { phase: "PILOT", cohort: { not: null } }, orderBy: { seq: "asc" }, select: { email: true } }),
    db.waitlistEntry.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } }, take: 6 }),
  ]);
  const waiting = { A: waitA, B: waitB };
  const st = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Record<string, number>;
  const all = counts.a + counts.b + counts.public;
  const googleEmails = pilot.map((p) => p.email);

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) query.set(k, v);
  const qs = query.toString();
  const hrefFor = (p: number) => `/admin/waitlist?${new URLSearchParams({ ...Object.fromEntries(query), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const returnTo = `?${new URLSearchParams({ ...Object.fromEntries(query), ...(page > 1 ? { page: String(page) } : {}) })}`;
  const filtered = Boolean(qs);
  const topSources = sources.filter((s) => s.source);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Waitlist"
        sub="Places are assigned automatically in join order: first 10 are cohort A, next 20 cohort B, everyone after joins the public-launch list."
        actions={
          <>
            <a href={`/api/admin/waitlist${qs ? `?${qs}` : ""}`} className={btn}>
              {filtered ? "Export filtered CSV" : "Export CSV"}
            </a>
            <Link href="/admin" className="link text-sm font-medium">
              Back to admin
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total signups" value={all} sub={`${st.WAITING ?? 0} waiting · ${st.INVITED ?? 0} invited`} />
        <Stat label="Cohort A" value={`${counts.a}/${COHORT_A_SIZE}`} pct={(counts.a / COHORT_A_SIZE) * 100} sub={`${waiting.A} waiting`} />
        <Stat label="Cohort B" value={`${counts.b}/${COHORT_B_SIZE}`} pct={(counts.b / COHORT_B_SIZE) * 100} sub={`${waiting.B} waiting`} />
        <Stat label="Public list" value={counts.public} sub="After the pilot is full" />
        <Stat label="Active / declined" value={`${st.ACTIVE ?? 0} / ${st.DECLINED ?? 0}`} sub="Accepted invites / opted out" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Invite a cohort">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-3">
            <li>Add every person as a Google test user (right).</li>
            <li>Invite the cohort: one single-use link per waiting person (7 days, works only for their email).</li>
            <li>A CSV of links downloads once and is not stored. Nothing is emailed, so send each link yourself.</li>
          </ol>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((c) => (
              <form key={c} action="/api/admin/invite-cohort" method="post">
                <input type="hidden" name="cohort" value={c} />
                <SubmitButton className={`${btn} w-full`} pending="Inviting…" confirm={`Invite every waiting person in cohort ${c}? This creates their links now.`} disabled={waiting[c] === 0}>
                  Invite cohort {c} ({waiting[c]} waiting)
                </SubmitButton>
              </form>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Plan: cohort A on 30 Nov, cohort B on 7 Dec. Free until 28 Feb 2027 (A) or founding price until 6 Mar 2027 (B) is recorded on invite. Lost a link? Use Get new link on the admin page.
          </p>
        </Card>

        <Card
          title="Google test users"
          actions={googleEmails.length > 0 && <CopyButton value={googleEmails.join(", ")} label="Copy emails" className={`${btnGhost} !min-h-8 !px-3 !py-1`} />}
        >
          <p className="text-sm text-ink-3">
            Until Google verifies the app, only listed test users can connect Gmail. In Google Cloud console open APIs &amp; Services, OAuth consent screen, Test users, and paste these.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Chip tone={googleEmails.length > 100 ? "amber" : "light"}>
              {googleEmails.length} / 100 limit
            </Chip>
            {googleEmails.length > 100 && <span className="text-warn-ink">Over Google&apos;s test user limit.</span>}
          </div>
          <textarea readOnly rows={3} value={googleEmails.join(", ")} placeholder="No pilot emails yet." className={`${input} mt-3 text-xs`} aria-label="Pilot emails for Google test users" />
        </Card>
      </div>

      {topSources.length > 0 && (
        <Card title="Top sources">
          <div className="flex flex-wrap gap-2">
            {topSources.map((s) => (
              <Link key={s.source} href={`/admin/waitlist?q=${encodeURIComponent(s.source!)}`} className="rounded-md bg-paper px-3 py-1.5 text-sm text-ink-3 hover:bg-paper-2">
                {s.source} <span className="font-semibold tabular-nums text-ink">{s._count}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card title={`Entries (${total}${filtered ? ` of ${all}` : ""})`}>
        <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search email, name, country, source" className={input} aria-label="Search" />
          <select name="group" defaultValue={sp.group ?? ""} className={input} aria-label="Group">
            <option value="">All groups</option>
            <option value="A">Cohort A</option>
            <option value="B">Cohort B</option>
            <option value="PUBLIC">Public list</option>
          </select>
          <select name="status" defaultValue={sp.status ?? ""} className={input} aria-label="Status">
            <option value="">Any status</option>
            <option value="WAITING">Waiting</option>
            <option value="INVITED">Invited</option>
            <option value="ACTIVE">Active</option>
            <option value="DECLINED">Declined</option>
          </select>
          <select name="track" defaultValue={sp.track ?? ""} className={input} aria-label="Interest">
            <option value="">Any interest</option>
            <option value="SEEKER">Seeker</option>
            <option value="PITCH">Pitch</option>
            <option value="BOTH">Both</option>
          </select>
          <button type="submit" className={btn}>
            Filter
          </button>
          {filtered && (
            <Link href="/admin/waitlist" className={btnGhost}>
              Clear
            </Link>
          )}
        </form>

        {entries.length === 0 ? (
          <Empty>{filtered ? "No entries match these filters." : "Nobody yet."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-rule text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Person</th>
                  <th className="py-2 pr-3 font-medium">Profile</th>
                  <th className="py-2 pr-3 font-medium">Group</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {entries.map((e) => {
                  const group = e.phase === "PILOT" ? (e.cohort as "A" | "B") : "PUBLIC";
                  return (
                    <tr key={e.id} className="align-top">
                      <td className="py-3 pr-3 text-xs tabular-nums text-muted">{e.seq}</td>
                      <td className="max-w-[240px] py-3 pr-3">
                        <div className="truncate font-medium">{e.name ?? e.email}</div>
                        {e.name && <div className="truncate text-xs text-muted">{e.email}</div>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted">
                        <div>
                          {e.trackInterest.toLowerCase()} · {e.roleType?.replace(/_/g, " ") ?? "no role"}
                        </div>
                        <div>
                          {e.country ?? "no country"}
                          {e.source && ` · src ${e.source}`}
                          {e.consentMarketing && " · marketing ok"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <Chip tone={tone(e.cohort)}>{group === "PUBLIC" ? "Public" : `Cohort ${group}`}</Chip>
                      </td>
                      <td className="py-3 pr-3">
                        <Chip tone={STATUS_TONE[e.status]}>{e.status.toLowerCase()}</Chip>
                        {e.invitedAt && <div className="mt-1 text-xs text-muted">invited {ago(e.invitedAt)}</div>}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 text-xs text-muted" title={e.createdAt.toLocaleString("en-GB")}>
                        {ago(e.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                          {e.status === "WAITING" &&
                            (["A", "B", "PUBLIC"] as const)
                              .filter((t) => t !== group)
                              .map((t) => (
                                <form key={t} action={moveWaitlistEntryAction}>
                                  <input type="hidden" name="id" value={e.id} />
                                  <input type="hidden" name="target" value={t} />
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <SubmitButton className="link text-xs font-medium" pending="Moving…">
                                    To {t === "PUBLIC" ? "public" : `cohort ${t}`}
                                  </SubmitButton>
                                </form>
                              ))}
                          {(e.status === "WAITING" || e.status === "DECLINED") && (
                            <form action={setWaitlistStatusAction}>
                              <input type="hidden" name="id" value={e.id} />
                              <input type="hidden" name="status" value={e.status === "WAITING" ? "DECLINED" : "WAITING"} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <SubmitButton className="link text-xs font-medium" pending="Saving…">
                                {e.status === "WAITING" ? "Mark declined" : "Restore"}
                              </SubmitButton>
                            </form>
                          )}
                          <form action={deleteWaitlistEntryAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <SubmitButton className="link text-xs font-medium" pending="Deleting…" confirm="Delete this waitlist entry? This cannot be undone.">
                              Delete
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PER_PAGE} hrefFor={hrefFor} />
      </Card>
    </div>
  );
}
