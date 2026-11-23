/**
 * Authentication + session management (no external auth library).
 *  - Sign in with email + password (scrypt) or Google.
 *  - Sessions are random 256-bit tokens in an httpOnly cookie; only their SHA-256 hash is stored.
 *  - Sessions slide (extended while in use), can be listed and revoked, and end on sign-out.
 */
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma, type User } from "@prisma/client";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { KYC_FLAGS } from "@/lib/kyc";
import { rateLimited } from "@/lib/rate-limit";
import { canEnterSpace, clientBase, homeFor, isSpace, spaceForAccess, SPACE_COOKIE, type Space } from "@/lib/spaces";

import { normalizeEmail, sha256 } from "@/lib/auth-crypto";
export { hashPassword, INVITE_DAYS, newInviteToken, normalizeEmail, passwordProblem, validEmail, verifyPassword } from "@/lib/auth-crypto";

export const SESSION_COOKIE = "opp_session";
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// ---------- throttling (in memory; enough for one server) ----------
export const throttled = (key: string, max = 6, windowMs = 15 * 60 * 1000): boolean => rateLimited(key, max, windowMs);

// ---------- sessions ----------
const hashToken = sha256;

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
  void logEvent("login", userId, { method });
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
  const s = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { kyc: { select: KYC_FLAGS } } } } });
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

/** Memoised per request, so the layout, the page and any guards share one session lookup instead of one each. */
export const currentSession = cache(async () => userForToken((await cookies()).get(SESSION_COOKIE)?.value));

export async function getUser(): Promise<User | null> {
  return (await currentSession())?.user ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export const isSuper = (u: Pick<User, "role">) => u.role === "SUPERUSER";

/** Admin-only pages and actions. Signed-out visitors go to the admin sign-in; clients go to their own workspace. */
export async function requireSuper(): Promise<User> {
  const u = await getUser();
  if (!u) redirect("/admin/login");
  if (!isSuper(u)) redirect(homeFor(u));
  return u;
}

/** Pages and actions inside /client/<space>. Clients may only enter their own space; the superuser may enter any. */
export async function requireSpace(space: Space): Promise<User> {
  const u = await requireUser();
  if (!canEnterSpace(u, space)) redirect(homeFor(u));
  return u;
}

/** The /client/<space> area the person is working in: the one they last visited (if allowed), else their own. */
export async function currentSpace(user: Pick<User, "role" | "trackAccess">): Promise<Space> {
  const c = (await cookies()).get(SPACE_COOKIE)?.value;
  return isSpace(c) && canEnterSpace(user, c) ? c : spaceForAccess(user.trackAccess);
}

/** URL prefix of the current client area, for server actions that redirect back into it. */
export async function currentBase(user: Pick<User, "role" | "trackAccess">): Promise<string> {
  return clientBase(await currentSpace(user));
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
export const SIGNUP_CLOSED = "Sign-up is by invitation only. Use the invitation link you were sent.";
export const inviteTokenHash = hashToken;

/** The pending, unexpired invite for a link token, or null. Used by the middleware, the register page and sign-up. */
export async function inviteForToken(token: string | null | undefined) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const inv = await db.invite.findUnique({ where: { tokenHash: hashToken(token) }, include: { waitlistEntry: true } });
  if (!inv || inv.status !== "PENDING") return null;
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) return null;
  return inv;
}

/**
 * Create a regular-user account from an invitation link. The token must belong to a pending, unexpired invite;
 * the account always gets the invite's email (the person cannot choose another). Accepting copies track access,
 * cohort, free_until and founding_until from the linked waitlist entry onto the new user.
 */
export async function registerMember(data: { token: string | null | undefined; name?: string | null; passwordHash?: string | null; googleId?: string | null; googleEmail?: string | null }): Promise<{ user: User } | { error: string }> {
  await loadConfig();
  const invite = await inviteForToken(data.token);
  if (!invite) return { error: SIGNUP_CLOSED };
  const email = normalizeEmail(invite.email);
  if (data.googleEmail && normalizeEmail(data.googleEmail) !== email) return { error: `This invitation is for ${email}. Sign in with that Google account.` };
  try {
    const user = await db.$transaction(async (tx) => {
      const w = invite?.waitlistEntry;
      const created = await tx.user.create({
        data: {
          email,
          name: data.name ?? null,
          passwordHash: data.passwordHash ?? null,
          googleId: data.googleId ?? null,
          role: "USER",
          trackAccess: invite?.trackAccess ?? "BOTH",
          cohort: w?.cohort ?? null,
          freeUntil: w?.freeUntil ?? null,
          foundingUntil: w?.foundingUntil ?? null,
        },
      });
      if (invite) {
        // Claim the invite; if another sign-up claimed it first, abort.
        const claimed = await tx.invite.updateMany({ where: { id: invite.id, status: "PENDING" }, data: { status: "ACCEPTED", acceptedById: created.id, acceptedAt: new Date() } });
        if (claimed.count !== 1) throw new Prisma.PrismaClientKnownRequestError("invite already used", { code: "P2002", clientVersion: Prisma.prismaVersion.client });
        if (invite.waitlistEntryId) await tx.waitlistEntry.update({ where: { id: invite.waitlistEntryId }, data: { status: "ACTIVE" } });
      }
      const grant = cfg().credits.signupGrant;
      if (grant > 0) await tx.creditLedger.create({ data: { userId: created.id, action: "signup_grant", credits: grant } });
      return created;
    });
    void logEvent("signup", user.id, { track: user.trackAccess });
    return { user };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: SIGNUP_CLOSED };
    throw e;
  }
}
