"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cfg, loadConfig, saveConfigSection } from "@/lib/config";
import { db } from "@/lib/db";
import { accessFromWaitlist } from "@/lib/tracks";
import { landingFor } from "@/lib/spaces";
import {
  clientInfo,
  currentBase,
  currentSession,
  endSession,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  inviteForToken,
  INVITE_DAYS,
  inviteTokenHash,
  newInviteToken,
  registerMember,
  SIGNUP_CLOSED,
  requireSuper,
  requireUser,
  startSession,
  throttled,
  validEmail,
  verifyPassword,
} from "@/lib/auth";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Only allow same-site relative redirects. */
const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/");

const fail = (page: string, next: string, msg: string): never =>
  redirect(`${page}?error=${encodeURIComponent(msg)}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);

/** Client sign-in (/login) and admin sign-in (/admin/login) share this action; the "area" field says which form it came from. */
export async function loginAction(form: FormData) {
  await loadConfig();
  const admin = text(form, "area") === "admin";
  const page = admin ? "/admin/login" : "/login";
  const email = normalizeEmail(text(form, "email"));
  const password = String(form.get("password") ?? "");
  const next = safeNext(text(form, "next"));
  if (!cfg().auth.allowPassword) fail(page, next, "Email sign-in is turned off.");
  const { ip } = await clientInfo();
  if (throttled(`login:${email}`) || throttled(`login-ip:${ip ?? "?"}`, 30)) fail(page, next, "Too many attempts. Wait 15 minutes and try again.");
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) fail(page, next, user && !user.passwordHash ? "This account uses Google sign-in." : "Wrong email or password.");
  // Each sign-in only admits its own kind of account (the admin form gives nothing away about client accounts).
  if (admin && user!.role !== "SUPERUSER") fail(page, next, "Wrong email or password.");
  if (!admin && user!.role === "SUPERUSER") fail(page, next, "Administrators sign in at /admin/login.");
  await startSession(user!.id, "password");
  redirect(landingFor(user!, next));
}

/** Create an account from an invitation link. The email always comes from the invite, never from the form. */
export async function registerAction(form: FormData) {
  await loadConfig();
  const token = text(form, "invite");
  const name = text(form, "name") || null;
  const password = String(form.get("password") ?? "");
  const back = (msg: string): never => redirect(`/register?invite=${encodeURIComponent(token)}&error=${encodeURIComponent(msg)}`);
  if (!cfg().auth.allowPassword) back("Email sign-up is turned off.");
  const { ip } = await clientInfo();
  if (throttled(`register-ip:${ip ?? "?"}`, 10)) back("Too many attempts. Try again later.");
  const invite = await inviteForToken(token);
  if (!invite) redirect(`/login?error=${encodeURIComponent(SIGNUP_CLOSED)}`);
  const problem = passwordProblem(password);
  if (problem) back(problem);
  if (password !== String(form.get("confirm") ?? "")) back("Passwords don't match.");
  const existing = await db.user.findUnique({ where: { email: normalizeEmail(invite!.email) } });
  if (existing) back("An account with this email already exists. Sign in instead.");
  const made = await registerMember({ token, name, passwordHash: await hashPassword(password) });
  if ("error" in made) back(made.error);
  const user = (made as { user: { id: string; role: "USER"; trackAccess: "JOB" | "PITCH" | "BOTH" } }).user;
  await startSession(user.id, "password");
  redirect(landingFor(user, "/"));
}

export async function logoutAction(form?: FormData) {
  await endSession();
  redirect(form?.get("area") === "admin" ? "/admin/login" : "/login");
}

/** Revoke one session of the signed-in user (not the current one: use sign out for that). */
export async function revokeSessionAction(form: FormData) {
  const user = await requireUser();
  await db.session.deleteMany({ where: { id: text(form, "id"), userId: user.id } });
  revalidatePath("/client", "layout");
}

export async function revokeOtherSessionsAction() {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  await db.session.deleteMany({ where: { userId: cur.user.id, id: { not: cur.sessionId } } });
  revalidatePath("/client", "layout");
}

export async function changePasswordAction(form: FormData) {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  const base = await currentBase(cur.user);
  const fail2 = (m: string): never => redirect(`${base}/settings?error=${encodeURIComponent(m)}`);
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (cur.user.passwordHash && !(await verifyPassword(current, cur.user.passwordHash))) fail2("Current password is wrong.");
  const problem = passwordProblem(next);
  if (problem) fail2(problem);
  await db.user.update({ where: { id: cur.user.id }, data: { passwordHash: await hashPassword(next) } });
  // Changing the password signs out every other device.
  await db.session.deleteMany({ where: { userId: cur.user.id, id: { not: cur.sessionId } } });
  redirect(`${base}/settings?ok=${encodeURIComponent("Password updated; other devices were signed out.")}`);
}

const INVITE_COOKIE = "opp_invite_link";

/** Mint a fresh secret for an invite and park the full link in a short-lived cookie so the admin page can show it once. */
async function issueInviteLink(inviteId: string) {
  const token = newInviteToken();
  await db.invite.update({ where: { id: inviteId }, data: { tokenHash: inviteTokenHash(token), expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000) } });
  const inv = await db.invite.findUniqueOrThrow({ where: { id: inviteId }, select: { email: true } });
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  (await cookies()).set(INVITE_COOKIE, JSON.stringify({ email: inv.email, url: `${origin}/register?invite=${token}` }), { httpOnly: true, sameSite: "lax", path: "/admin", maxAge: 300, secure: process.env.NODE_ENV === "production" });
}

/** Admin: invite an email. Creates the invite and one invitation link (shown once on /admin). Optionally tied to a waitlist entry so cohort and free/founding dates carry over. */
export async function inviteUserAction(form: FormData) {
  const admin = await requireSuper();
  const email = normalizeEmail(text(form, "email"));
  if (!validEmail(email)) redirect(`/admin?error=${encodeURIComponent("Enter a valid email address.")}`);
  const access = text(form, "trackAccess");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) redirect(`/admin?error=${encodeURIComponent("That email already has an account.")}`);
  if (await db.invite.findFirst({ where: { email, status: "PENDING" }, select: { id: true } })) redirect(`/admin?error=${encodeURIComponent("That email already has a pending invite. Use its Get new link button.")}`);
  const entry = await db.waitlistEntry.findUnique({ where: { email }, select: { id: true, trackInterest: true } });
  const inv = await db.invite.create({ data: { email, trackAccess: access === "JOB" || access === "PITCH" || access === "BOTH" ? access : entry ? accessFromWaitlist(entry.trackInterest) : "BOTH", invitedById: admin.id, waitlistEntryId: entry?.id ?? null } });
  if (entry) await db.waitlistEntry.update({ where: { id: entry.id }, data: { status: "INVITED", invitedAt: new Date() } });
  await issueInviteLink(inv.id);
  redirect(`/admin?ok=${encodeURIComponent(`Invitation ready for ${email}. Copy the link below and send it to them.`)}`);
}

/** Admin: replace a pending invite's link with a new one (the old link stops working). */
export async function regenerateInviteAction(form: FormData) {
  await requireSuper();
  const inv = await db.invite.findFirst({ where: { id: text(form, "id"), status: "PENDING" } });
  if (!inv) redirect(`/admin?error=${encodeURIComponent("That invitation is no longer pending.")}`);
  await issueInviteLink(inv!.id);
  redirect(`/admin?ok=${encodeURIComponent(`New link for ${inv!.email}. The previous link no longer works.`)}`);
}

/** Admin: withdraw a pending invite. */
export async function revokeInviteAction(form: FormData) {
  await requireSuper();
  const inv = await db.invite.findFirst({ where: { id: text(form, "id"), status: "PENDING" } });
  if (inv) {
    await db.invite.update({ where: { id: inv.id }, data: { status: "REVOKED", tokenHash: null, waitlistEntryId: null } });
    if (inv.waitlistEntryId) await db.waitlistEntry.update({ where: { id: inv.waitlistEntryId }, data: { status: "WAITING", invitedAt: null } }).catch(() => {});
  }
  redirect(`/admin?ok=${encodeURIComponent("Invitation withdrawn.")}`);
}
