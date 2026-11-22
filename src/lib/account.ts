import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { STORAGE_DIR } from "@/lib/pdf";

/** Everything stored about one account, as a plain object (no password hash, no session secrets). */
export async function exportAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, trackAccess: true, cohort: true, freeUntil: true, foundingUntil: true, createdAt: true, lastLoginAt: true, googleId: true },
  });
  const [companies, opportunities, credits, feedback, sessions] = await Promise.all([
    db.company.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.opportunity.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { documents: true, activities: true } }),
    db.creditLedger.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.feedback.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.session.findMany({ where: { userId }, select: { method: true, userAgent: true, ip: true, createdAt: true, lastSeenAt: true, expiresAt: true } }),
  ]);
  const { googleId, ...rest } = user;
  return { exportedAt: new Date().toISOString(), account: { ...rest, googleLinked: !!googleId }, companies, opportunities, credits, feedback, sessions };
}

/** Permanently delete an account: its rows cascade, then its generated files on disk. */
export async function deleteAccount(userId: string) {
  const opps = await db.opportunity.findMany({ where: { userId }, select: { id: true } });
  await db.user.delete({ where: { id: userId } });
  const root = path.resolve(STORAGE_DIR);
  await Promise.all(opps.map((o) => fs.rm(path.resolve(root, o.id), { recursive: true, force: true }).catch(() => {})));
}
