"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentBase, requireSuper, requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { grantCredits } from "@/lib/credits";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const go = (path: string, key: "ok" | "error", msg: string): never => redirect(`${path}?${key}=${encodeURIComponent(msg)}`);

/** Any signed-in user: send feedback to the owner. */
export async function submitFeedbackAction(form: FormData) {
  const user = await requireUser();
  // Go back to the page the feedback was sent from (same-site path only, query dropped); Settings if unknown.
  const from = text(form, "page").split("?")[0];
  const settings = from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") ? from : `${await currentBase(user)}/settings`;
  const message = text(form, "message").slice(0, 4000);
  if (message.length < 3) go(settings, "error", "Write a few words of feedback first.");
  if (rateLimited(`feedback:${user.id}`, 10, 60 * 60 * 1000)) go(settings, "error", "That's a lot of feedback in an hour. Please try again later.");
  const kind = ["general", "bug", "idea"].includes(text(form, "kind")) ? text(form, "kind") : "general";
  const r = Math.floor(Number(text(form, "rating")));
  const rating = r >= 1 && r <= 5 ? r : null;
  await db.feedback.create({ data: { userId: user.id, kind, rating, message, page: text(form, "page").slice(0, 200) || null } });
  void logEvent("feedback_sent", user.id, { kind });
  go(settings, "ok", "Thanks, your feedback was sent.");
}

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

export async function deleteFeedbackAction(form: FormData) {
  await requireSuper();
  await db.feedback.deleteMany({ where: { id: text(form, "id") } });
  revalidatePath("/admin/feedback");
  redirect("/admin/feedback");
}
