/**
 * Cohort invites. The admin invites a whole pilot cohort from the waitlist:
 *  - each WAITING entry in the cohort gets a single-use invite (random token, only its SHA-256 stored, 7-day expiry, bound to the entry's email);
 *  - the entry moves WAITING -> INVITED and gets its free_until (cohort A) or founding_until (cohort B) date, which are copied to the user on accept;
 *  - the links are returned once. They are never stored in plain text, so they can't be shown again (use "Get new link" on /admin for that).
 * Nothing is emailed: the admin sends each link themselves.
 */
import { db } from "@/lib/db";
import { INVITE_DAYS, newInviteToken, normalizeEmail, sha256 } from "@/lib/auth-crypto";
import { accessFromWaitlist } from "@/lib/tracks";

export type Cohort = "A" | "B";
export const isCohort = (v: unknown): v is Cohort => v === "A" || v === "B";

/** Cohort A is free for 3 months from the 30 Nov 2026 launch; cohort B pays the founding price until 6 Mar 2027 (end of day, Nairobi time). */
export const COHORT_DATES = {
  A: { freeUntil: new Date("2027-02-28T23:59:59+03:00"), foundingUntil: null },
  B: { freeUntil: null, foundingUntil: new Date("2027-03-06T23:59:59+03:00") },
} as const;

export type IssuedInvite = { email: string; name: string | null; cohort: Cohort; url: string; expiresAt: Date };
export type CohortInviteResult = { issued: IssuedInvite[]; skipped: { email: string; reason: string }[] };

export async function inviteCohort(cohort: Cohort, invitedById: string, origin: string): Promise<CohortInviteResult> {
  const entries = await db.waitlistEntry.findMany({ where: { phase: "PILOT", cohort, status: "WAITING" }, orderBy: { seq: "asc" } });
  const out: CohortInviteResult = { issued: [], skipped: [] };
  for (const e of entries) {
    const email = normalizeEmail(e.email);
    if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      out.skipped.push({ email, reason: "already has an account" });
      continue;
    }
    if (await db.invite.findFirst({ where: { email, status: "PENDING" }, select: { id: true } })) {
      out.skipped.push({ email, reason: "already has a pending invite (use Get new link on /admin)" });
      continue;
    }
    const token = newInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
    await db.$transaction([
      db.invite.create({ data: { email, trackAccess: accessFromWaitlist(e.trackInterest), invitedById, waitlistEntryId: e.id, tokenHash: sha256(token), expiresAt } }),
      db.waitlistEntry.update({
        where: { id: e.id },
        data: { status: "INVITED", invitedAt: new Date(), freeUntil: e.freeUntil ?? COHORT_DATES[cohort].freeUntil, foundingUntil: e.foundingUntil ?? COHORT_DATES[cohort].foundingUntil },
      }),
    ]);
    out.issued.push({ email, name: e.name, cohort, url: `${origin}/register?invite=${token}`, expiresAt });
  }
  return out;
}
