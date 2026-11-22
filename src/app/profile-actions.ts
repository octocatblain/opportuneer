"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentBase, currentSession, endSession, isSuper, normalizeEmail, requireSuper, throttled, validEmail, verifyPassword } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";
import { db } from "@/lib/db";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const go = (path: string, key: "ok" | "error", msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

async function me() {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  return { ...cur, settings: `${await currentBase(cur.user)}/settings` };
}

/** Update the display name. */
export async function updateProfileAction(form: FormData) {
  const { user, settings } = await me();
  const name = text(form, "name").replace(/\s+/g, " ").slice(0, 80);
  await db.user.update({ where: { id: user.id }, data: { name: name || null } });
  revalidatePath("/", "layout");
  go(settings, "ok", "Profile updated.");
}

/** Change the sign-in email. Needs the current password when the account has one; other devices are signed out. */
export async function changeEmailAction(form: FormData) {
  const { user, sessionId, settings } = await me();
  const email = normalizeEmail(text(form, "email"));
  if (!validEmail(email)) go(settings, "error", "Enter a valid email address.");
  if (email === user.email) go(settings, "error", "That is already your email.");
  if (throttled(`email-change:${user.id}`)) go(settings, "error", "Too many attempts. Try again later.");
  if (user.passwordHash && !(await verifyPassword(String(form.get("password") ?? ""), user.passwordHash))) go(settings, "error", "Password is wrong.");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) go(settings, "error", "Another account already uses that email.");
  await db.user.update({ where: { id: user.id }, data: { email } });
  await db.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } });
  revalidatePath("/", "layout");
  go(settings, "ok", "Email updated; other devices were signed out.");
}

/** Delete your own account and everything in it. Requires typing your email; the owner account cannot be deleted here. */
export async function deleteOwnAccountAction(form: FormData) {
  const { user, settings } = await me();
  if (isSuper(user)) go(settings, "error", "The owner account cannot be deleted here.");
  if (normalizeEmail(text(form, "confirm")) !== user.email) go(settings, "error", "Type your email exactly to confirm deletion.");
  if (user.passwordHash && !(await verifyPassword(String(form.get("password") ?? ""), user.passwordHash))) go(settings, "error", "Password is wrong.");
  await endSession();
  await deleteAccount(user.id);
  redirect(`/login?error=${encodeURIComponent("Your account and data were deleted.")}`);
}

// ---------- admin ----------

/** Admin: edit another account's name and track access. */
export async function adminUpdateUserAction(form: FormData) {
  await requireSuper();
  const id = text(form, "id");
  const page = `/admin/users/${id}`;
  const access = text(form, "trackAccess");
  if (access !== "JOB" && access !== "PITCH" && access !== "BOTH") go(page, "error", "Choose a track access.");
  const target = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) go("/admin", "error", "That account no longer exists.");
  await db.user.update({ where: { id }, data: { name: text(form, "name").slice(0, 80) || null, trackAccess: access as "JOB" | "PITCH" | "BOTH" } });
  revalidatePath("/admin");
  go(page, "ok", "Account updated.");
}

/** Admin: sign an account out everywhere. */
export async function adminSignOutUserAction(form: FormData) {
  await requireSuper();
  const id = text(form, "id");
  const { count } = await db.session.deleteMany({ where: { userId: id } });
  go(`/admin/users/${id}`, "ok", `Signed out ${count} ${count === 1 ? "session" : "sessions"}.`);
}

/** Admin: delete a client account and its data. Never the owner, never yourself. */
export async function adminDeleteUserAction(form: FormData) {
  const admin = await requireSuper();
  const id = text(form, "id");
  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) go("/admin", "error", "That account no longer exists.");
  if (target!.id === admin.id || target!.role === "SUPERUSER") go(`/admin/users/${id}`, "error", "Owner accounts cannot be deleted.");
  if (normalizeEmail(text(form, "confirm")) !== target!.email) go(`/admin/users/${id}`, "error", "Type the account email exactly to confirm deletion.");
  await deleteAccount(id);
  go("/admin", "ok", `Deleted ${target!.email} and all of their data.`);
}
