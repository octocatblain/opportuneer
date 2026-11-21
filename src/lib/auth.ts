/**
 * Authentication + session management (no external auth library).
 *  - Sign in with email + password (scrypt) or Google.
 *  - Sessions are random 256-bit tokens in an httpOnly cookie; only their SHA-256 hash is stored.
 *  - Sessions slide (extended while in use), can be listed and revoked, and end on sign-out.
 *  - Who may sign in is database-driven: config section "auth" (allowedEmails). The first account
 *    ever created is always allowed and becomes the owner.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "opp_session";
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// ---------- passwords ----------
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the work, so an unknown email can't be told apart by timing.
  const [, saltHex, keyHex] = (stored ?? `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`).split("$");
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return Boolean(stored) && timingSafeEqual(actual, expected);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Include letters and at least one number.";
  return null;
}

// ---------- throttling (in memory; enough for one server) ----------
const attempts = new Map<string, { n: number; first: number }>();
export function throttled(key: string, max = 6, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.first > windowMs) {
    attempts.set(key, { n: 1, first: now });
    return false;
  }
  a.n++;
  return a.n > max;
}

// ---------- sessions ----------
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function clientInfo() {
  const h = await headers();
  return {
    userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
  };
}

export async function startSession(userId: string, method: "password" | "google") {
  await loadConfig();
  const token = randomBytes(32).toString("base64url");
  const days = Math.max(1, cfg().auth.sessionDays);
  const info = await clientInfo();
  await db.session.create({ data: { tokenHash: hashToken(token), userId, method, ...info, expiresAt: new Date(Date.now() + days * DAY) } });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
  // Tidy up expired sessions.
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

/** Validate a raw cookie token and slide its expiry. Used by middleware and server code. */
export async function userForToken(token: string | undefined) {
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() < now) {
    await db.session.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  if (now - s.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    await loadConfig();
    const days = Math.max(1, cfg().auth.sessionDays);
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date(now), expiresAt: new Date(now + days * DAY) } }).catch(() => {});
  }
  return { user: s.user, sessionId: s.id };
}

export async function currentSession() {
  return userForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getUser(): Promise<User | null> {
  return (await currentSession())?.user ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- who may sign in ----------
export async function mayJoin(email: string): Promise<boolean> {
  if ((await db.user.count()) === 0) return true; // first account = owner
  await loadConfig();
  return cfg().auth.allowedEmails.map(normalizeEmail).includes(normalizeEmail(email));
}
