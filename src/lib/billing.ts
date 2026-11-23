/**
 * What an account owes and what it can use right now, derived from its dates, subscription and payments.
 * Pure derivation lives in `accessState`, so it can be tested without a database.
 */
import type { SubscriptionStatus, TrackAccess } from "@prisma/client";
import { db } from "@/lib/db";
import { GRACE_DAYS, priceFor, priceStage, type Price, type PlanKey } from "@/lib/plans";

/**
 * - owner: the superuser, never limited.
 * - free: inside the free window; no payment needed.
 * - active: paid up.
 * - grace: a renewal is overdue; still works until graceUntil.
 * - needs_plan: no active plan and nothing free left (a new account, or a free period that has ended). AI actions are paused, data stays.
 */
export type AccessState = "owner" | "free" | "active" | "grace" | "needs_plan";

type SubLike = { status: SubscriptionStatus; currentPeriodEnd: Date; graceUntil: Date | null } | null;
type UserLike = { role: string; freeUntil: Date | null; foundingUntil: Date | null };

export function accessState(user: UserLike, sub: SubLike, now = new Date()): AccessState {
  if (user.role === "SUPERUSER") return "owner";
  if (sub) {
    const t = now.getTime();
    if ((sub.status === "ACTIVE" || sub.status === "CANCELLED") && sub.currentPeriodEnd.getTime() > t) return "active";
    if (sub.status === "GRACE" && sub.graceUntil && sub.graceUntil.getTime() > t) return "grace";
  }
  if (priceStage(user, now) === "free") return "free";
  return "needs_plan";
}

/** Where a failed renewal's grace period ends, counted from when the period ran out. */
export const graceEnd = (periodEnd: Date) => new Date(periodEnd.getTime() + GRACE_DAYS * 86_400_000);

export type BillingState = {
  access: AccessState;
  plan: PlanKey; // the plan to show: their subscription, else the one matching their track access
  price: Price;
  subscription: { status: SubscriptionStatus; currentPeriodEnd: Date; graceUntil: Date | null; cancelledAt: Date | null; plan: TrackAccess } | null;
  /** Days until access runs out (free period end, period end or grace end), for reminders; null if not applicable. */
  daysLeft: number | null;
};

export async function billingState(userId: string, now = new Date()): Promise<BillingState> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, trackAccess: true, freeUntil: true, foundingUntil: true, subscription: { select: { status: true, currentPeriodEnd: true, graceUntil: true, cancelledAt: true, plan: true } } },
  });
  const sub = user.subscription;
  const access = accessState(user, sub, now);
  const plan = sub?.plan ?? user.trackAccess;
  const end = access === "active" ? sub!.currentPeriodEnd : access === "grace" ? sub!.graceUntil : access === "free" ? user.freeUntil : null;
  return {
    access,
    plan,
    price: priceFor(user, plan, now),
    subscription: sub,
    daysLeft: end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)) : null,
  };
}
