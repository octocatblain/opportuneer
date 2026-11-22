// Seeds the superuser. Safe to run any number of times.
//   SUPERUSER_EMAIL     (default: the profile email)
//   SUPERUSER_PASSWORD  (if unset and the account doesn't exist yet, a random one is generated and printed once)
// Also adopts any pre-existing companies/opportunities that have no owner yet.
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../src/lib/auth-crypto";
import { profile } from "../src/config/profile";

const db = new PrismaClient();

async function main() {
  const email = normalizeEmail(process.env.SUPERUSER_EMAIL || profile.email);
  const given = process.env.SUPERUSER_PASSWORD;
  const existing = await db.user.findUnique({ where: { email } });
  let password = given;
  let generated = false;
  if (!existing && !password) {
    password = randomBytes(12).toString("base64url") + "9a";
    generated = true;
  }
  const passwordHash = password ? await hashPassword(password) : undefined;
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { role: "SUPERUSER", ...(passwordHash ? { passwordHash } : {}) } })
    : await db.user.create({ data: { email, name: profile.name, role: "SUPERUSER", passwordHash } });

  // Only one superuser: demote nobody automatically, but warn.
  const others = await db.user.count({ where: { role: "SUPERUSER", id: { not: user.id } } });
  if (others) console.warn(`Warning: ${others} other superuser account(s) exist.`);

  // Adopt orphaned rows (from before accounts owned data) and the old global settings.
  const c = await db.$executeRaw`UPDATE "Company" SET "userId" = ${user.id} WHERE "userId" IS NULL`.catch(() => 0);
  const o = await db.$executeRaw`UPDATE "Opportunity" SET "userId" = ${user.id} WHERE "userId" IS NULL`.catch(() => 0);
  for (const key of ["gmail", "lastScan", "scanRunning"]) {
    const row = await db.setting.findUnique({ where: { key } });
    if (row) {
      await db.setting.upsert({ where: { key: `${key}:${user.id}` }, create: { key: `${key}:${user.id}`, value: row.value as object }, update: {} });
      await db.setting.delete({ where: { key } });
    }
  }
  console.log(`Superuser ready: ${email}${existing ? " (existing account)" : " (created)"}. Adopted ${c} companies and ${o} opportunities.`);
  if (generated) console.log(`Generated password (shown once, change it in Settings): ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
