"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { onboardingSteps, parseBasics, parseJobPrefs, parsePitchPrefs, removeResume, saveResume, saveSection } from "@/lib/kyc";
import { db } from "@/lib/db";
import { homeFor } from "@/lib/spaces";
import { allowsTrack } from "@/lib/tracks";
import { rescoreAll } from "@/lib/services";

/** Only same-site paths under /onboarding or /client/ are valid return targets (no open redirects). */
function safeReturn(f: FormData): string {
  const r = String(f.get("returnTo") ?? "");
  return /^\/(onboarding|client\/(jobs|pitches|duo)\/profile)(\?|$)/.test(r) ? r.split("?")[0] : "/onboarding";
}
/**
 * Redirect with a flash message. Redirecting straight to the right place (instead of relying on the middleware to bounce
 * us) keeps the browser URL correct: finished onboarding goes to the workspace, and removing a required item goes back to onboarding.
 */
async function finish(userId: string, to: string, key: "ok" | "error", msg: string): Promise<never> {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, role: true, trackAccess: true } });
  const pending = (await onboardingSteps(u)).length > 0;
  const dest = to === "/onboarding" && !pending ? homeFor(u) : to !== "/onboarding" && pending ? "/onboarding" : to;
  return redirect(`${dest}?${key}=${encodeURIComponent(msg)}`);
}

async function me() {
  const cur = await currentSession();
  if (!cur) redirect("/login");
  return cur.user;
}

export async function saveBasicsAction(form: FormData) {
  const user = await me();
  const to = safeReturn(form);
  const r = parseBasics(form);
  if ("error" in r) await finish(user.id, to, "error", r.error);
  else await saveSection(user.id, "basics", r.ok);
  revalidatePath("/", "layout");
  void logEvent("kyc_basics", user.id);
  await finish(user.id, to, "ok", "Your details were saved.");
}

export async function saveJobPrefsAction(form: FormData) {
  const user = await me();
  const to = safeReturn(form);
  if (!allowsTrack(user.trackAccess, "JOB")) await finish(user.id, to, "error", "Your account does not include the job search track.");
  const r = parseJobPrefs(form);
  if ("error" in r) await finish(user.id, to, "error", r.error);
  else await saveSection(user.id, "jobPrefs", r.ok);
  const n = await rescoreAll(user.id).catch(() => null);
  revalidatePath("/", "layout");
  void logEvent("kyc_job", user.id);
  await finish(user.id, to, "ok", `Job search targets saved${n ? `; ${n.jobs} jobs re-scored` : ""}. New scans use them.`);
}

export async function savePitchPrefsAction(form: FormData) {
  const user = await me();
  const to = safeReturn(form);
  if (!allowsTrack(user.trackAccess, "PITCH")) await finish(user.id, to, "error", "Your account does not include the pitching track.");
  const r = parsePitchPrefs(form);
  if ("error" in r) await finish(user.id, to, "error", r.error);
  else await saveSection(user.id, "pitchPrefs", r.ok);
  await rescoreAll(user.id).catch(() => null);
  revalidatePath("/", "layout");
  void logEvent("kyc_pitch", user.id);
  await finish(user.id, to, "ok", "Your agency and offer were saved. Pitches use them from now on.");
}

export async function uploadResumeAction(form: FormData) {
  const user = await me();
  const to = safeReturn(form);
  const file = form.get("resume");
  if (!(file instanceof File) || file.size === 0) return await finish(user.id, to, "error", "Choose a resume file to upload.");
  let outcome: { ok: string } | { error: string };
  try {
    const { chars } = await saveResume(user.id, { name: file.name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) });
    outcome = { ok: `Resume uploaded (${chars.toLocaleString()} characters read).` };
  } catch (e) {
    outcome = { error: e instanceof Error ? e.message : "Could not read that file." };
  }
  revalidatePath("/", "layout");
  if ("error" in outcome) return await finish(user.id, to, "error", outcome.error);
  void logEvent("kyc_resume", user.id);
  await finish(user.id, to, "ok", outcome.ok);
}

export async function removeResumeAction(form: FormData) {
  const user = await me();
  await removeResume(user.id);
  revalidatePath("/", "layout");
  await finish(user.id, safeReturn(form), "ok", "Resume removed.");
}
