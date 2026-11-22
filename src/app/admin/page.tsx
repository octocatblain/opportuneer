import type { Metadata } from "next";
import Link from "next/link";
import { inviteUserAction } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Chip, Flash, input, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

/** Admin home (superuser only): the accounts, invitations, and a way into each user's content. */
export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireSuper();
  const sp = await searchParams;
  const [users, pending, counts] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }], include: { _count: { select: { companies: true, opportunities: true, sessions: true } } } }),
    db.invite.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.opportunity.groupBy({ by: ["userId", "stage"], _count: true }),
  ]);
  const sentBy = (id: string) => counts.filter((c) => c.userId === id && ["SENT", "REPLIED", "INTERVIEW", "WON"].includes(c.stage)).reduce((n, c) => n + c._count, 0);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Accounts and access"
        sub="You also use the app as a normal user (Today, Pipeline, Jobs, Companies hold only your own content). This area is only for managing access and reading other accounts."
        actions={
          <>
            <Link href="/admin/waitlist" className={btn}>
              Waitlist
            </Link>
            <Link href="/admin/credits" className={btn}>
              Credits
            </Link>
            <Link href="/admin/feedback" className={btn}>
              Feedback
            </Link>
            <Link href="/admin/analytics" className={btn}>
              Analytics
            </Link>
            <Link href="/admin/config" className={btn}>
              App configuration
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Accounts">
            <ul className="divide-y divide-rule">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {u.name ?? u.email} {u.id === me.id && <span className="text-xs text-muted">(you)</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-xs text-muted">
                      <span className="truncate">{u.email}</span>
                      <span>{u._count.opportunities} opportunities</span>
                      <span>{u._count.companies} companies</span>
                      <span>{sentBy(u.id)} sent or further</span>
                      <span>last sign-in {u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-GB") : "never"}</span>
                    </div>
                  </div>
                  <Chip tone={u.role === "SUPERUSER" ? "cream" : "light"}>{u.role === "SUPERUSER" ? "Superuser" : "User"}</Chip>
                  {u.id !== me.id && (
                    <Link href={`/admin/users/${u.id}`} className="link text-sm font-medium">
                      View content
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card tone="dark" title="Invite a user">
          <form action={inviteUserAction} className="space-y-3">
            <p className="text-sm text-ink-3">Only an invited email can create an account. There is no limit on users.</p>
            {pending.length > 0 && <p className="text-xs text-muted">Pending: {pending.map((i) => `${i.email} (${i.trackAccess})`).join(", ")}</p>}
            <input name="email" type="email" required placeholder="Email to invite" className={input} />
            <select name="trackAccess" defaultValue="BOTH" className={input} aria-label="Tracks">
              <option value="BOTH">Both tracks</option>
              <option value="JOB">Job search only</option>
              <option value="PITCH">Pitching only</option>
            </select>
            <SubmitButton className={btn} pending="Saving…">
              Invite this email
            </SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
