import type { Metadata } from "next";
import Link from "next/link";
import { grantCreditsAction } from "@/app/feedback-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Chip, Flash, input, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { cfg, loadConfig } from "@/lib/config";
import { spendStatus } from "@/lib/credits";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: credits" };

/** Admin: balances, monthly usage against the caps, estimated provider cost, and a way to grant credits. */
export default async function AdminCredits({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireSuper();
  const sp = await searchParams;
  await loadConfig();
  const caps = cfg().credits.monthlyCaps;
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1);
  const [users, balances, monthRows, recent, cost] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { id: true, email: true, name: true, role: true, trackAccess: true, freeUntil: true } }),
    db.creditLedger.groupBy({ by: ["userId"], _sum: { credits: true } }),
    db.creditLedger.groupBy({ by: ["userId", "action"], where: { createdAt: { gte: since }, NOT: { action: { startsWith: "refund:" } } }, _count: true }),
    db.creditLedger.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { user: { select: { email: true } } } }),
    db.creditLedger.aggregate({ where: { createdAt: { gte: since } }, _sum: { costEstimateKes: true } }),
  ]);
  const spend = await spendStatus();
  const bal = (id: string) => balances.find((b) => b.userId === id)?._sum.credits ?? 0;
  const used = (id: string, actions: string[]) => monthRows.filter((r) => r.userId === id && actions.includes(r.action)).reduce((n, r) => n + r._count, 0);
  const JOB = ["application", "import"];
  const PITCH = ["pitch", "research"];

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        title="Credits and usage"
        sub={`Estimated provider cost this month: KSh ${Number(cost._sum.costEstimateKes ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}. Costs, caps and the signup grant are edited in App configuration (section "credits"). The superuser is never limited.`}
        actions={
          <>
            <Link href="/admin/config" className={btn}>
              App configuration
            </Link>
            <Link href="/admin" className="link text-sm font-medium">
              Back to admin
            </Link>
          </>
        }
      />
      <Card title="Monthly spend guard" tone={spend.state === "ok" ? undefined : "dark"}>
        <p className="text-sm">
          {spend.state === "paused" ? (
            <b>AI is PAUSED for all clients.</b>
          ) : spend.state === "alert" ? (
            <b>Alert level reached: free-trial usage is paused, paying users continue.</b>
          ) : (
            <b>Within budget.</b>
          )}{" "}
          Estimated provider cost for {spend.monthKey}: KSh {Math.round(spend.spentKes).toLocaleString("en-KE")}. Alert at KSh {spend.alertKes.toLocaleString("en-KE")}, pause at KSh {spend.pauseKes.toLocaleString("en-KE")}. The owner account is never paused.
          Daily limit {cfg().credits.dailyLimit} AI actions per user. Change these in App configuration, section &quot;credits&quot;.
        </p>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Accounts">
            <ul className="divide-y divide-rule">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{u.name ?? u.email}</div>
                    <div className="text-xs text-muted">
                      {u.email} · jobs {used(u.id, JOB)}/{caps.JOB || "∞"} · pitches {used(u.id, PITCH)}/{caps.PITCH || "∞"} this month
                      {u.freeUntil && u.freeUntil > now ? ` · free until ${u.freeUntil.toLocaleDateString("en-GB")}` : ""}
                    </div>
                  </div>
                  <Chip>{u.trackAccess.toLowerCase()}</Chip>
                  {u.role === "SUPERUSER" ? <Chip tone="cream">unlimited</Chip> : <Chip tone={bal(u.id) > 0 ? "mint" : "cream"}>{bal(u.id)} credits</Chip>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card tone="dark" title="Grant credits">
          <form action={grantCreditsAction} className="space-y-3">
            <select name="userId" required className={input} aria-label="User" defaultValue="">
              <option value="" disabled>
                Choose a user
              </option>
              {users
                .filter((u) => u.role !== "SUPERUSER")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
            </select>
            <input name="credits" type="number" step="1" required placeholder="Credits (negative removes)" className={input} />
            <SubmitButton className={btn} pending="Saving…">
              Apply
            </SubmitButton>
          </form>
        </Card>
      </div>
      <Card title="Recent ledger">
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-rule text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-36 text-xs text-muted">{r.createdAt.toLocaleString("en-GB")}</span>
                <span className="min-w-0 flex-1 truncate">{r.user.email}</span>
                <span>{r.action}</span>
                <span className="w-14 text-right tabular-nums">{r.credits > 0 ? `+${r.credits}` : r.credits}</span>
                <span className="w-20 text-right text-xs text-muted tabular-nums">KSh {Number(r.costEstimateKes).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
