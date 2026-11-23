import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { inviteUserAction, regenerateInviteAction, revokeInviteAction } from "@/app/auth-actions";
import { Legend, Meter, Metric, StackedBars, type BarDatum } from "@/components/dash";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Chip, Flash, input, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { spendStatus } from "@/lib/credits";
import { db } from "@/lib/db";
import { SPACE_LABEL, spaceForAccess } from "@/lib/spaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

/** Admin home (superuser only): the health of the whole app, the accounts, invitations, and a way into each user's content. */
export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireSuper();
  const sp = await searchParams;
  // The full invitation link is shown only right after it is made (kept 5 minutes in a cookie, never stored in clear).
  const raw = (await cookies()).get("opp_invite_link")?.value;
  let link: { email: string; url: string } | null = null;
  try {
    link = raw ? JSON.parse(raw) : null;
  } catch {}
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const chartFrom = new Date(dayStart.getTime() - 6 * 86400_000);
  const now = new Date();
  const [users, pending, counts, recentOpps, recentUsers, activeSessions, waitlist] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }], include: { _count: { select: { companies: true, opportunities: true, sessions: true } } } }),
    db.invite.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.opportunity.groupBy({ by: ["userId", "stage"], _count: true }),
    db.opportunity.findMany({ where: { createdAt: { gte: chartFrom } }, select: { createdAt: true, track: true } }),
    db.user.findMany({ where: { createdAt: { gte: chartFrom } }, select: { createdAt: true } }),
    db.session.count({ where: { expiresAt: { gt: now } } }),
    db.waitlistEntry.count({ where: { status: "WAITING" } }).catch(() => 0),
  ]);
  const spend = await spendStatus();
  const sentBy = (id: string) => counts.filter((c) => c.userId === id && ["SENT", "REPLIED", "INTERVIEW", "WON"].includes(c.stage)).reduce((n, c) => n + c._count, 0);
  const clients = users.filter((u) => u.role !== "SUPERUSER");
  const totalOpps = counts.reduce((n, c) => n + c._count, 0);
  const sentAll = counts.filter((c) => ["SENT", "REPLIED", "INTERVIEW", "WON"].includes(c.stage)).reduce((n, c) => n + c._count, 0);
  const days: BarDatum[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(chartFrom.getTime() + i * 86400_000);
    const key = d.toDateString();
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      parts: [
        { name: "Jobs", color: "var(--color-leaf)", value: recentOpps.filter((o) => o.track === "JOB" && o.createdAt.toDateString() === key).length },
        { name: "Pitches", color: "var(--color-amber)", value: recentOpps.filter((o) => o.track === "PITCH" && o.createdAt.toDateString() === key).length },
        { name: "New accounts", color: "var(--color-butter)", value: recentUsers.filter((u) => u.createdAt.toDateString() === key).length },
      ],
    };
  });
  const bySpace = (["jobs", "pitches", "duo"] as const).map((s) => [s, clients.filter((u) => spaceForAccess(u.trackAccess) === s).length] as const);

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow="Administrator console"
        title="Overview"
        sub="Every client area is one click away from the role switcher. This page is for access, invitations and reading other accounts."
        actions={
          <Link href="/admin/config" className={btn}>
            App configuration
          </Link>
        }
      />

      {spend.state !== "ok" && (
        <Card tone="dark" title={spend.state === "paused" ? "AI is paused for clients" : "AI spend alert"}>
          <p className="text-sm">
            Estimated provider cost this month is KSh {Math.round(spend.spentKes).toLocaleString("en-KE")} (alert {spend.alertKes.toLocaleString("en-KE")}, pause {spend.pauseKes.toLocaleString("en-KE")}).{" "}
            {spend.state === "paused" ? "New AI actions are blocked for everyone except you." : "Free-trial usage is paused; paying users continue."}{" "}
            <Link href="/admin/credits" className="underline">
              Open credits
            </Link>
          </p>
        </Card>
      )}

      {link && (
        <Card title={`Invitation link for ${link.email}`}>
          <p className="mb-2 text-sm text-muted">Send this to them yourself. It works once, for 7 days, and only for this email. It is shown here now and cannot be shown again (use “Get new link” if you lose it).</p>
          <input readOnly value={link.url} aria-label="Invitation link" className={`${input} font-mono text-xs`} />
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card
            title={
              <span className="flex items-baseline gap-3">
                <span className="text-3xl tabular-nums">{recentOpps.length}</span>
                <span className="text-sm font-normal text-muted">items added across all accounts, last 7 days</span>
              </span>
            }
            actions={<Legend items={days[0].parts.map((p) => ({ name: p.name, color: p.color }))} />}
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_12rem]">
              <StackedBars data={days} height={200} />
              <div className="space-y-6 lg:border-l lg:border-rule lg:pl-6">
                <Metric label="Client accounts" value={clients.length} note={`${pending.length} invited, not yet joined`} />
                <Metric label="Signed in now" value={activeSessions} note="active sessions" tone="ink" />
                <Metric label="Waitlist" value={waitlist} note="waiting for an invite" tone="amber" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card title="Accounts by workspace">
            <div className="space-y-4">
              {bySpace.map(([s, n]) => (
                <Meter key={s} label={SPACE_LABEL[s]} value={n} max={Math.max(1, clients.length)} right={n} color={s === "jobs" ? "var(--color-leaf)" : s === "pitches" ? "var(--color-amber)" : "var(--color-ink)"} />
              ))}
            </div>
          </Card>
          <Card title="All-time activity">
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Opportunities" value={totalOpps} tone="ink" />
              <Metric label="Sent or further" value={sentAll} tone="ink" />
            </div>
          </Card>
        </div>

        <div className="xl:col-span-8">
          <Card title="Accounts" actions={<span className="rounded-md bg-paper px-2 py-0.5 text-xs tabular-nums text-muted">{users.length}</span>}>
            <ul className="divide-y divide-rule">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal-soft text-sm font-semibold text-signal-dark">{(u.name ?? u.email)[0]?.toUpperCase()}</span>
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
                  <Chip tone={u.role === "SUPERUSER" ? "amber" : "mint"}>{u.role === "SUPERUSER" ? "Superuser" : SPACE_LABEL[spaceForAccess(u.trackAccess)].split(" ")[0]}</Chip>
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

        <div className="xl:col-span-4">
          <Card title="Invite a user">
            <form action={inviteUserAction} className="space-y-3">
              <p className="text-sm text-ink-3">Accounts can only be created from the one-time link made here. The workspace they land in follows the tracks you choose.</p>
              <input name="email" type="email" required placeholder="Email to invite" className={input} />
              <select name="trackAccess" defaultValue="BOTH" className={input} aria-label="Tracks">
                <option value="BOTH">Duo: both tracks</option>
                <option value="JOB">Jobs: job search only</option>
                <option value="PITCH">Pitches: pitching only</option>
              </select>
              <SubmitButton className={`${btn} w-full`} pending="Saving…">
                Create invitation link
              </SubmitButton>
            </form>
            {pending.length > 0 && (
              <div className="mt-5 border-t border-rule pt-4">
                <h3 className="mb-2 text-sm font-semibold">Pending invitations</h3>
                <ul className="space-y-3">
                  {pending.map((i) => (
                    <li key={i.id} className="text-sm">
                      <div className="truncate font-medium">{i.email}</div>
                      <div className="text-xs text-muted">
                        {SPACE_LABEL[spaceForAccess(i.trackAccess)].split(" ")[0]} · {i.expiresAt ? (i.expiresAt.getTime() < Date.now() ? "link expired" : `link valid until ${i.expiresAt.toLocaleDateString("en-GB")}`) : "no link yet"}
                      </div>
                      <div className="mt-1 flex gap-3">
                        <form action={regenerateInviteAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <SubmitButton className="link text-xs font-medium" pending="Making…">Get new link</SubmitButton>
                        </form>
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <SubmitButton className="link text-xs font-medium" pending="Withdrawing…" confirm={`Withdraw the invitation for ${i.email}?`}>Withdraw</SubmitButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
