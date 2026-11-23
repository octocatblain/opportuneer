import type { Metadata } from "next";
import Link from "next/link";
import { deleteWaitlistEntryAction } from "@/app/waitlist-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Chip, Flash, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";
import { COHORT_A_SIZE, COHORT_B_SIZE, waitlistCounts } from "@/lib/waitlist";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Waitlist" };

/** Admin: the waitlist in join order, with cohort assignment, counts, CSV export and delete. */
export default async function AdminWaitlist({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireSuper();
  const sp = await searchParams;
  const [counts, entries] = await Promise.all([waitlistCounts(), db.waitlistEntry.findMany({ orderBy: { seq: "asc" }, take: 500 })]);
  const waiting = { A: entries.filter((e) => e.phase === "PILOT" && e.cohort === "A" && e.status === "WAITING").length, B: entries.filter((e) => e.phase === "PILOT" && e.cohort === "B" && e.status === "WAITING").length };
  const googleEmails = entries.filter((e) => e.phase === "PILOT" && e.cohort).map((e) => e.email);
  const tone =(c: string | null) => (c === "A" ? "mint" : c === "B" ? "cream" : "light");

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Waitlist"
        sub={`Pilot: cohort A ${counts.a}/${COHORT_A_SIZE}, cohort B ${counts.b}/${COHORT_B_SIZE}. Public-launch waitlist: ${counts.public}. Places are assigned automatically in join order.`}
        actions={
          <>
            <a href="/api/admin/waitlist" className={btn}>
              Export CSV
            </a>
            <Link href="/admin" className="link text-sm font-medium">
              Back to admin
            </Link>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Invite a cohort">
          <p className="text-sm text-ink-3">
            Creates one single-use link per waiting person (expires in 7 days, works only for their email), marks them invited, and downloads the links as a CSV. Links are shown once and are not stored, so keep the file safe. Nothing is emailed:
            send each link yourself. Add every person as a Google test user first (right).
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["A", "B"] as const).map((c) => (
              <form key={c} action="/api/admin/invite-cohort" method="post">
                <input type="hidden" name="cohort" value={c} />
                <SubmitButton className={btn} pending="Inviting…" confirm={`Invite every waiting person in cohort ${c}? This creates their links now.`} disabled={waiting[c] === 0}>
                  Invite cohort {c} ({waiting[c]} waiting)
                </SubmitButton>
              </form>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Plan: cohort A on 30 Nov, cohort B on 7 Dec. Free until 28 Feb 2027 (A) or founding price until 6 Mar 2027 (B) is recorded on invite. Lost a link? Use Get new link on the admin page.</p>
        </Card>
        <Card title="Google test users">
          <p className="text-sm text-ink-3">
            Until Google verifies the app, only listed test users can connect Gmail. In Google Cloud console, open APIs &amp; Services, OAuth consent screen, Test users, and paste these ({googleEmails.length}, limit 100). Gmail connect fails for anyone
            not on the list.
          </p>
          <textarea readOnly rows={3} value={googleEmails.join(", ")} className="mt-3 w-full rounded-md border border-mist bg-white px-3 py-2 text-xs" aria-label="Pilot emails for Google test users" />
        </Card>
      </div>
      <Card title={`Entries (${entries.length})`}>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Nobody yet.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-8 text-xs tabular-nums text-muted">#{e.seq}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.name ?? e.email}</div>
                  <div className="flex flex-wrap gap-x-4 text-xs text-muted">
                    <span className="truncate">{e.email}</span>
                    <span>{e.trackInterest.toLowerCase()}</span>
                    <span>{e.roleType ?? "no role"}</span>
                    <span>{e.country ?? "no country"}</span>
                    {e.source && <span>src {e.source}</span>}
                    <span>{e.createdAt.toLocaleString("en-GB")}</span>
                  </div>
                </div>
                <Chip tone={tone(e.cohort)}>{e.phase === "PILOT" ? `Cohort ${e.cohort}` : "Public"}</Chip>
                <Chip>{e.status.toLowerCase()}</Chip>
                <form action={deleteWaitlistEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="link text-sm font-medium" pending="Deleting…" confirm="Delete this waitlist entry? This cannot be undone.">
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
