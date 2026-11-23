/**
 * Retention clean-up (the privacy note promises these).   npm run prune
 *  - product events older than 12 months
 *  - expired sessions
 *  - invitations that expired or were withdrawn more than 30 days ago
 */
import { db } from "../src/lib/db";

async function main() {
  const year = new Date(Date.now() - 365 * 86_400_000);
  const month = new Date(Date.now() - 30 * 86_400_000);
  const events = await db.analyticsEvent.deleteMany({ where: { createdAt: { lt: year } } });
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const invites = await db.invite.deleteMany({ where: { OR: [{ status: "REVOKED", createdAt: { lt: month } }, { status: "PENDING", expiresAt: { lt: month } }] } });
  console.log(`deleted ${events.count} events, ${sessions.count} sessions, ${invites.count} stale invitations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
