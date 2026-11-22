/**
 * Credits, caps and the usage ledger.
 *  - Every AI action costs credits (config "credits"). Balance = sum of the user's ledger rows.
 *  - Each track has a monthly cap on charged actions. The superuser is never limited but is still recorded.
 *  - Accounts inside their free window (freeUntil) are not charged credits; the action and its estimated cost are still logged.
 *  - A failed action is refunded with a compensating row, so the ledger stays an honest history.
 */
import type { Prisma, Track } from "@prisma/client";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { allowsTrack } from "@/lib/tracks";

export type CreditAction = "application" | "import" | "pitch" | "research" | "followup";
const ACTION_TRACK: Partial<Record<CreditAction, Track>> = { application: "JOB", import: "JOB", pitch: "PITCH", research: "PITCH" };
const GRANT_ACTIONS = ["grant", "signup_grant", "purchase"];

export async function creditBalance(userId: string) {
  const r = await db.creditLedger.aggregate({ where: { userId }, _sum: { credits: true } });
  return r._sum.credits ?? 0;
}

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export async function grantCredits(userId: string, credits: number, action = "grant", tx: Prisma.TransactionClient | typeof db = db) {
  if (!Number.isInteger(credits) || credits === 0) throw new Error("Enter a whole number of credits.");
  return tx.creditLedger.create({ data: { userId, action, credits } });
}

/** Charge for an action; throws a readable error when the account is out of credits or over its monthly cap. Returns the ledger row id. */
export async function chargeCredits(userId: string, action: CreditAction, track: Track | undefined = ACTION_TRACK[action]) {
  await loadConfig();
  const c = cfg().credits;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, trackAccess: true, freeUntil: true } });
  if (track && !allowsTrack(user.trackAccess, track)) throw new Error(`Your account doesn't include the ${track === "JOB" ? "job search" : "pitching"} track.`);
  const exempt = user.role === "SUPERUSER" || !c.enabled;
  const free = Boolean(user.freeUntil && user.freeUntil.getTime() > Date.now());
  const cost = exempt || free ? 0 : (c.costs[action] ?? 1);
  const costKes = c.costKes[action] ?? 0;

  const row = await db.$transaction(async (tx) => {
    // Serialize one user's charges so two parallel clicks can't both pass the balance check.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    if (!exempt) {
      const cap = track ? c.monthlyCaps[track] : 0;
      if (cap > 0) {
        const trackActions = (Object.keys(ACTION_TRACK) as CreditAction[]).filter((a) => ACTION_TRACK[a] === track);
        const since = { gte: monthStart() };
        const [spent, refunded] = await Promise.all([
          tx.creditLedger.count({ where: { userId, action: { in: trackActions }, createdAt: since } }),
          tx.creditLedger.count({ where: { userId, action: { in: trackActions.map((a) => `refund:${a}`) }, createdAt: since } }),
        ]);
        const used = spent - refunded;
        if (used >= cap) throw new Error(`Monthly limit reached for the ${track === "JOB" ? "job search" : "pitching"} track (${cap} actions). It resets on the 1st.`);
      }
      if (cost > 0) {
        const sum = await tx.creditLedger.aggregate({ where: { userId }, _sum: { credits: true } });
        const bal = sum._sum.credits ?? 0;
        if (bal < cost) throw new Error(`Not enough credits: this needs ${cost} and you have ${bal}. Ask the owner for more.`);
      }
    }
    return tx.creditLedger.create({ data: { userId, action, credits: -cost, costEstimateKes: costKes } });
  });
  return row.id;
}

/** Undo a charge after the action failed. */
export async function refundCredits(userId: string, ledgerId: string) {
  const row = await db.creditLedger.findFirst({ where: { id: ledgerId, userId } });
  if (!row) return;
  await db.creditLedger.create({ data: { userId, action: `refund:${row.action}`, credits: -row.credits, costEstimateKes: row.costEstimateKes.negated() } });
}

/** Run an action, charging first and refunding if it throws. */
export async function withCredits<T>(userId: string, action: CreditAction, run: () => Promise<T>, track?: Track): Promise<T> {
  const id = await chargeCredits(userId, action, track ?? ACTION_TRACK[action]);
  try {
    const out = await run();
    void logEvent("action_" + action, userId);
    return out;
  } catch (e) {
    await refundCredits(userId, id);
    throw e;
  }
}

export { GRANT_ACTIONS };
