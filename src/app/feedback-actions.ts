"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuper } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { db } from "@/lib/db";
import { removeFeedbackFiles } from "@/lib/feedback-files";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const go = (path: string, key: "ok" | "error", msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

// Sending feedback (with attachments) is handled by POST /api/feedback.

/** Admin: add (or remove, with a negative number) credits on an account. */
export async function grantCreditsAction(form: FormData) {
  await requireSuper();
  const n = Math.trunc(Number(text(form, "credits")));
  const userId = text(form, "userId");
  if (!userId || !n || Math.abs(n) > 100000) go("/admin/credits", "error", "Choose a user and a whole number of credits.");
  const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) go("/admin/credits", "error", "Unknown user.");
  await grantCredits(userId, n, "grant");
  revalidatePath("/admin/credits");
  go("/admin/credits", "ok", `${n > 0 ? "Added" : "Removed"} ${Math.abs(n)} credits.`);
}

/** Where an admin feedback action returns to: the same filtered list (same-site /admin/feedback path only). */
const backToList = (form: FormData): never => {
  const b = text(form, "back");
  revalidatePath("/admin", "layout"); // refreshes the sidebar badge too
  return redirect(b.startsWith("/admin/feedback") ? b : "/admin/feedback");
};

export async function deleteFeedbackAction(form: FormData) {
  await requireSuper();
  const id = text(form, "id");
  await db.feedback.deleteMany({ where: { id } });
  await removeFeedbackFiles([id]);
  backToList(form);
}

/** Admin: move a message between New, Read and Resolved. */
export async function setFeedbackStatusAction(form: FormData) {
  await requireSuper();
  const status = text(form, "status");
  if (["NEW", "READ", "RESOLVED"].includes(status)) await db.feedback.updateMany({ where: { id: text(form, "id") }, data: { status } });
  backToList(form);
}

/** Admin: save a private note on a message (and mark it read if it was still new). */
export async function saveFeedbackNoteAction(form: FormData) {
  await requireSuper();
  const id = text(form, "id");
  const adminNote = text(form, "note").slice(0, 2000) || null;
  await db.feedback.updateMany({ where: { id }, data: { adminNote } });
  await db.feedback.updateMany({ where: { id, status: "NEW" }, data: { status: "READ" } });
  backToList(form);
}

/** Admin: mark every new message as read. */
export async function markAllFeedbackReadAction(form: FormData) {
  await requireSuper();
  await db.feedback.updateMany({ where: { status: "NEW" }, data: { status: "READ" } });
  backToList(form);
}
