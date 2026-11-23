/**
 * Test runner.   npm test
 * Tests never touch the real database: this creates (if needed) and migrates "<name>_test" on the same PostgreSQL server,
 * then runs tests/*.test.ts against it. The isolation test starts its own Next.js dev server on port 3199 (build folder
 * .next-test), so a running `npm run dev` is not disturbed.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const real = process.env.DATABASE_URL;
if (!real) throw new Error("DATABASE_URL is not set (run through npm test so .env is loaded).");
const u = new URL(real);
const name = `${u.pathname.slice(1).replace(/_test$/, "")}_test`;
const testUrl = (() => {
  const t = new URL(real);
  t.pathname = `/${name}`;
  return t.toString();
})();

async function ensureDatabase() {
  const admin = new URL(real!);
  admin.pathname = "/postgres";
  const c = new PrismaClient({ datasourceUrl: admin.toString() });
  try {
    const rows = await c.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = ${name}`;
    if (!rows.length) {
      await c.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
      console.log(`created database ${name}`);
    }
  } finally {
    await c.$disconnect();
  }
}

const env = { ...process.env, DATABASE_URL: testUrl, SKIP_STARTUP_SCAN: "1", NEXT_DIST_DIR: ".next-test", NEXT_TELEMETRY_DISABLED: "1" };
const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" }).status ?? 1;

(async () => {
  await ensureDatabase();
  if (run("npx", ["prisma", "migrate", "deploy"]) !== 0) process.exit(1);
  const files = fs.readdirSync("tests").filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`);
  process.exit(run("npx", ["tsx", "--test", "--test-concurrency=1", "--test-timeout=300000", ...files]));
})();
