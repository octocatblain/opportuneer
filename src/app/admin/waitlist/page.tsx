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
  const tone = (c: string | null) => (c === "A" ? "mint" : c === "B" ? "cream" : "light");

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            The <em>waitlist</em>.
          </>
        }
        sub={`Pilot: cohort A ${counts.a}/${COHORT_A_SIZE}, cohort B ${counts.b}/${COHORT_B_SIZE}. Public-launch waitlist: ${counts.public}. Places are assigned automatically in join order.`}
        actions={
          <>
            <a href="/api/admin/waitlist" className={btn}>
              Export CSV
            </a>
            <Link href="/admin" className="link text-sm font-medium">
              ← Admin
            </Link>
          </>
        }
      />
      <Card title={`Entries (${entries.length})`}>
        {entries.length === 0 ? (
          <p className="text-sm text-ink-4">Nobody yet.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-8 text-xs tabular-nums text-ink-4">#{e.seq}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.name ?? e.email}</div>
                  <div className="truncate text-xs text-ink-4">
                    {e.email} · {e.trackInterest.toLowerCase()} · {e.roleType ?? "no role"} · {e.country ?? "no country"} · {e.source ? `src ${e.source} · ` : ""}
                    {e.createdAt.toLocaleString("en-GB")}
                  </div>
                </div>
                <Chip tone={tone(e.cohort)}>{e.phase === "PILOT" ? `Cohort ${e.cohort}` : "Public"}</Chip>
                <Chip>{e.status.toLowerCase()}</Chip>
                <form action={deleteWaitlistEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="link text-sm font-medium" pending="Deleting…">
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
