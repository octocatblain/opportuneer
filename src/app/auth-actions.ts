"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";
import {
  clientInfo,
  currentSession,
  endSession,
  hashPassword,
  mayJoin,
  normalizeEmail,
  passwordProblem,
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

export async function loginAction(form: FormData) {
  await loadConfig();
  const email = normalizeEmail(text(form, "email"));
  const password = String(form.get("password") ?? "");
  const next = safeNext(text(form, "next"));
  if (!cfg().auth.allowPassword) fail("/login", next, "Email sign-in is turned off.");
  const { ip } = await clientInfo();
  if (throttled(`login:${email}`) || throttled(`login-ip:${ip ?? "?"}`, 30)) fail("/login", next, "Too many attempts. Wait 15 minutes and try again.");
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) fail("/login", next, user && !user.passwordHash ? "This account uses Google sign-in." : "Wrong email or password.");
  await startSession(user!.id, "password");
  redirect(next);
}

export async function registerAction(form: FormData) {
  await loadConfig();
  const email = normalizeEmail(text(form, "email"));
  const name = text(form, "name") || null;
  const password = String(form.get("password") ?? "");
  const next = safeNext(text(form, "next"));
  if (!cfg().auth.allowPassword) fail("/register", next, "Email sign-up is turned off.");
  const { ip } = await clientInfo();
  if (throttled(`register-ip:${ip ?? "?"}`, 10)) fail("/register", next, "Too many attempts. Try again later.");
  if (!validEmail(email)) fail("/register", next, "Enter a valid email address.");
  const problem = passwordProblem(password);
  if (problem) fail("/register", next, problem);
  if (password !== String(form.get("confirm") ?? "")) fail("/register", next, "Passwords don't match.");
  if (!(await mayJoin(email))) fail("/register", next, "This email isn't on the allowed list. Ask the owner to add it in Settings → auth.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) fail("/register", next, "An account with this email already exists. Sign in instead.");
  const first = (await db.user.count()) === 0;
  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  if (first) {
    // The owner is always on the allowed list.
    const auth = cfg().auth;
    if (!auth.allowedEmails.map(normalizeEmail).includes(email)) {
      const updated = { ...auth, allowedEmails: [...auth.allowedEmails, email] };
      await db.setting.upsert({ where: { key: "config:auth" }, create: { key: "config:auth", value: updated }, update: { value: updated } });
      await loadConfig(true);
    }
  }
  await startSession(user.id, "password");
  redirect(next);
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

/** Revoke one session of the signed-in user (not the current one: use sign out for that). */
export async function revokeSessionAction(form: FormData) {
  const user = await requireUser();
  await db.session.deleteMany({ where: { id: text(form, "id"), userId: user.id } });
  revalidatePath("/settings");
}

export async function revokeOtherSessionsAction() {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  await db.session.deleteMany({ where: { userId: cur.user.id, id: { not: cur.sessionId } } });
  revalidatePath("/settings");
}

export async function changePasswordAction(form: FormData) {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  const fail2 = (m: string): never => redirect(`/settings?error=${encodeURIComponent(m)}`);
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (cur.user.passwordHash && !(await verifyPassword(current, cur.user.passwordHash))) fail2("Current password is wrong.");
  const problem = passwordProblem(next);
  if (problem) fail2(problem);
  await db.user.update({ where: { id: cur.user.id }, data: { passwordHash: await hashPassword(next) } });
  // Changing the password signs out every other device.
  await db.session.deleteMany({ where: { userId: cur.user.id, id: { not: cur.sessionId } } });
  redirect(`/settings?ok=${encodeURIComponent("Password updated; other devices were signed out.")}`);
}
