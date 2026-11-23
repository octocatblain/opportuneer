import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { disconnectGmail } from "@/lib/gmail";
import { STORAGE_DIR } from "@/lib/pdf";

/** Everything stored about one account, as a plain object (no password hash, no session secrets). */
export async function exportAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, trackAccess: true, cohort: true, freeUntil: true, foundingUntil: true, createdAt: true, lastLoginAt: true, googleId: true },
  });
  const [companies, opportunities, credits, feedback, sessions, waitlist, kyc] = await Promise.all([
    db.company.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.opportunity.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { documents: true, activities: true } }),
    db.creditLedger.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.feedback.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.session.findMany({ where: { userId }, select: { method: true, userAgent: true, ip: true, createdAt: true, lastSeenAt: true, expiresAt: true } }),
    db.waitlistEntry.findUnique({ where: { email: user.email }, select: { email: true, name: true, trackInterest: true, roleType: true, occupation: true, industry: true, country: true, source: true, consentMarketing: true, consentAt: true, phase: true, cohort: true, createdAt: true } }),
    db.userProfile.findUnique({ where: { userId }, select: { basics: true, jobPrefs: true, pitchPrefs: true, resumeName: true, resumeText: true, resumeUpdatedAt: true } }),
  ]);
  const { googleId, ...rest } = user;
  return { exportedAt: new Date().toISOString(), account: { ...rest, googleLinked: !!googleId }, profile: kyc, waitlist, companies, opportunities, credits, feedback, sessions };
}

/**
 * Permanently delete an account ("delete my data"): the Gmail permission is revoked at Google, then the user's rows cascade
 * (companies, opportunities, documents, credits, feedback, sessions), and so do the things that don't cascade by themselves:
 * product events, per-user settings (Gmail tokens, scan state) and the invitation and waitlist records for the same email.
 * Generated files on disk go last.
 */
export async function deleteAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const opps = await db.opportunity.findMany({ where: { userId }, select: { id: true } });
  await disconnectGmail(userId);
  await db.$transaction([
    db.analyticsEvent.deleteMany({ where: { userId } }),
    db.setting.deleteMany({ where: { key: { endsWith: `:${userId}` } } }),
    db.invite.deleteMany({ where: { email: user.email } }),
    db.waitlistEntry.deleteMany({ where: { email: user.email } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  const root = path.resolve(STORAGE_DIR);
  await fs.rm(path.resolve(root, "resumes", userId), { recursive: true, force: true }).catch(() => {});
  await Promise.all(opps.map((o) => fs.rm(path.resolve(root, o.id), { recursive: true, force: true }).catch(() => {})));
}
