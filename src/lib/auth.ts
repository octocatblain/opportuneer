/**
 * Authentication + session management (no external auth library).
 *  - Sign in with email + password (scrypt) or Google.
 *  - Sessions are random 256-bit tokens in an httpOnly cookie; only their SHA-256 hash is stored.
 *  - Sessions slide (extended while in use), can be listed and revoked, and end on sign-out.
 */
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, type User } from "@prisma/client";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";

import { normalizeEmail } from "@/lib/auth-crypto";
export { hashPassword, normalizeEmail, passwordProblem, validEmail, verifyPassword } from "@/lib/auth-crypto";

export const SESSION_COOKIE = "opp_session";
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

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

export const isSuper = (u: Pick<User, "role">) => u.role === "SUPERUSER";

/** Admin-only pages and actions. Regular users are sent home. */
export async function requireSuper(): Promise<User> {
  const u = await requireUser();
  if (!isSuper(u)) redirect("/");
  return u;
}

/** The superuser may read (never change) another user's records; everyone else only their own. */
export const canView = (viewer: Pick<User, "id" | "role">, ownerId: string) => viewer.id === ownerId || isSuper(viewer);

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- who may sign in ----------
export const SIGNUP_CLOSED = "Sign-up is by invitation only. This email hasn't been invited, or the invited seat is already taken.";

/**
 * Create the single regular-user account. It must be invited (allowedEmails) and the one seat must be
 * free; the unique "seat" column makes the seat limit race-proof.
 */
export async function registerMember(data: { email: string; name?: string | null; passwordHash?: string | null; googleId?: string | null }): Promise<{ user: User } | { error: string }> {
  await loadConfig();
  const email = normalizeEmail(data.email);
  if (!cfg().auth.allowedEmails.map(normalizeEmail).includes(email)) return { error: SIGNUP_CLOSED };
  try {
    const user = await db.user.create({ data: { email, name: data.name ?? null, passwordHash: data.passwordHash ?? null, googleId: data.googleId ?? null, role: "USER", seat: 1 } });
    return { user };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: SIGNUP_CLOSED };
    throw e;
  }
}

/** Is the single regular-user seat still free? */
export async function seatFree() {
  return (await db.user.count({ where: { role: "USER" } })) === 0;
}
