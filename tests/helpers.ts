import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { sha256 } from "../src/lib/auth-crypto";

/** Every test refuses to run against anything but a database whose name ends in _test (scripts/test.ts creates it). */
export function assertTestDb() {
  const name = new URL(process.env.DATABASE_URL ?? "postgres://x/none").pathname;
  if (!name.endsWith("_test")) throw new Error(`Refusing to run tests against database "${name}". Use npm test.`);
}

export const PORT = Number(process.env.TEST_PORT) || 3199;
export const BASE = `http://localhost:${PORT}`;
const rand = () => randomBytes(4).toString("hex");

export type TestUser = { id: string; email: string; token: string; cookie: string };

/** A user plus a live session; the cookie authenticates HTTP requests as that user. */
export async function makeUser(label: string, data: { role?: "USER" | "SUPERUSER"; trackAccess?: "JOB" | "PITCH" | "BOTH"; freeUntil?: Date; credits?: number; onboarded?: boolean } = {}): Promise<TestUser> {
  assertTestDb();
  const email = `${label}-${rand()}@test.invalid`;
  const user = await db.user.create({ data: { email, role: data.role ?? "USER", trackAccess: data.trackAccess ?? "BOTH", freeUntil: data.freeUntil ?? null } });
  // Regular accounts must finish first-login KYC before the workspace opens; tests skip it unless they ask to test it (onboarded: false).
  if (data.onboarded !== false && (data.role ?? "USER") === "USER") {
    const access = data.trackAccess ?? "BOTH";
    const now = new Date();
    await db.userProfile.create({ data: { userId: user.id, basicsDoneAt: now, resumeText: "x".repeat(200), resumePath: "resumes/test/resume.txt", jobDoneAt: access !== "PITCH" ? now : null, pitchDoneAt: access !== "JOB" ? now : null } });
  }
  if (data.credits) await db.creditLedger.create({ data: { userId: user.id, action: "grant", credits: data.credits } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { tokenHash: sha256(token), userId: user.id, method: "password", expiresAt: new Date(Date.now() + 3600_000) } });
  return { id: user.id, email, token, cookie: `opp_session=${token}` };
}

export type Workspace = { companyId: string; oppId: string; docId: string; marker: string; file: string };

/** One company, one job, one drafted document and one generated file, all carrying a unique marker string. */
export async function makeWorkspace(userId: string, label: string): Promise<Workspace> {
  const marker = `SECRET-${label}-${rand()}`;
  const company = await db.company.create({ data: { userId, name: `${marker} Ltd`, notes: marker } });
  const opp = await db.opportunity.create({ data: { userId, track: "JOB", title: `${marker} Engineer`, companyId: company.id, source: "manual", sourceId: marker, description: marker, fitScore: 80, stage: "SHORTLISTED" } });
  const doc = await db.document.create({ data: { opportunityId: opp.id, kind: "COVER_LETTER", content: marker } });
  const dir = path.join(process.cwd(), "storage", opp.id);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "cv.pdf");
  await fs.writeFile(file, `%PDF-1.4 ${marker}`);
  return { companyId: company.id, oppId: opp.id, docId: doc.id, marker, file };
}

/** Delete everything the tests created (users cascade to their data; files are removed explicitly). */
export async function cleanup(users: TestUser[], workspaces: Workspace[] = []) {
  for (const w of workspaces) await fs.rm(path.dirname(w.file), { recursive: true, force: true });
  await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
}

export const get = (url: string, user?: TestUser, init: RequestInit = {}) =>
  fetch(`${BASE}${url}`, { redirect: "manual", ...init, headers: { ...(user ? { cookie: user.cookie } : {}), ...(init.headers ?? {}) } });

// ---------- a throwaway Next.js server for HTTP tests ----------
let server: ChildProcess | null = null;

export async function startServer() {
  assertTestDb();
  const up = () => fetch(`${BASE}/login`, { redirect: "manual", signal: AbortSignal.timeout(3000) }).then((r) => r.status < 500, () => false);
  if (await up()) throw new Error(`Something is already listening on port ${PORT}; stop it or set TEST_PORT.`);
  const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [next, "dev", "-p", String(PORT)], { env: { ...process.env, SKIP_STARTUP_SCAN: "1", NEXT_DIST_DIR: ".next-test" }, stdio: "ignore" });
  const t0 = Date.now();
  while (Date.now() - t0 < 240_000) {
    if (await up()) return;
    if (server.exitCode !== null) throw new Error("The test server exited early.");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("The test server did not start within 4 minutes.");
}

export function stopServer() {
  if (!server?.pid) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
  server = null;
}
