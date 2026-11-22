import type { Metadata } from "next";
import Link from "next/link";
import { inviteUserAction } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Chip, Flash, input, PageHeader } from "@/components/ui";
import { requireSuper, seatFree } from "@/lib/auth";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

/** Admin home (superuser only): the accounts, the single invitation seat, and a way into each user's content. */
export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireSuper();
  const sp = await searchParams;
  await loadConfig();
  const [users, open, counts] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }], include: { _count: { select: { companies: true, opportunities: true, sessions: true } } } }),
    seatFree(),
    db.opportunity.groupBy({ by: ["userId", "stage"], _count: true }),
  ]);
  const invited = cfg().auth.allowedEmails.filter((e) => e.toLowerCase() !== me.email.toLowerCase());
  const sentBy = (id: string) => counts.filter((c) => c.userId === id && ["SENT", "REPLIED", "INTERVIEW", "WON"].includes(c.stage)).reduce((n, c) => n + c._count, 0);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow="Admin"
        title={
          <>
            Accounts and <em>access</em>.
          </>
        }
        sub="You also use the app as a normal user (Today, Pipeline, Jobs, Companies hold only your own content). This area is only for managing access and reading other accounts."
        actions={
          <>
            <Link href="/admin/waitlist" className={btn}>
              Waitlist →
            </Link>
            <Link href="/admin/config" className={btn}>
              App configuration →
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Accounts">
            <ul className="divide-y divide-ink/5">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {u.name ?? u.email} {u.id === me.id && <span className="text-xs text-ink-4">(you)</span>}
                    </div>
                    <div className="truncate text-xs text-ink-4">
                      {u.email} · {u._count.opportunities} opportunities · {u._count.companies} companies · {sentBy(u.id)} sent or further · last sign-in{" "}
                      {u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-GB") : "never"}
                    </div>
                  </div>
                  <Chip tone={u.role === "SUPERUSER" ? "cream" : "light"}>{u.role === "SUPERUSER" ? "Superuser" : "User"}</Chip>
                  {u.id !== me.id && (
                    <Link href={`/admin/users/${u.id}`} className="link text-sm font-medium">
                      View content →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card tone="dark" title="User seat">
          {open ? (
            <form action={inviteUserAction} className="space-y-3">
              <p className="text-sm text-white/70">One seat is free. Only the invited email can create the account.</p>
              {invited.length > 0 && <p className="text-xs text-white/50">Currently invited: {invited.join(", ")}</p>}
              <input name="email" type="email" required placeholder="Email to invite" className={input} />
              <SubmitButton className={btn} pending="Saving…">
                Invite this email
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-white/70">The user seat is taken. The app allows the superuser and exactly one other account.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
