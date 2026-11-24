"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { industries } from "@/config/profile";
import { normalizeEmail, requireSuper, throttled, validEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { ipFrom } from "@/lib/rate-limit";
import { turnstileOk } from "@/lib/turnstile";
import { confirmWaitlist, moveWaitlistEntry, OCCUPATION_KEYS, requestWaitlistConfirmation, ROLE_KEYS } from "@/lib/waitlist";

const text = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);
const pick = (v: string, allowed: string[]) => (allowed.includes(v) ? v : null);

const back = (params: Record<string, string>): never => redirect(`/waitlist?${new URLSearchParams(params)}`);

/** Same message for every outcome (new address, already on the list, throttled), so the form cannot be used to check who has joined. */
const CHECK_EMAIL = { joined: "check" };

/**
 * Public: ask to join the waitlist. This only sends a confirmation email (double opt-in); the pilot place (cohort A, then B,
 * after 30 the public-launch list) is assigned when the emailed link is confirmed, see confirmWaitlistAction.
 */
export async function joinWaitlistAction(form: FormData) {
  // Honeypot: real people never fill this hidden field. Pretend success so bots learn nothing.
  if (text(form, "website")) back(CHECK_EMAIL);

  const h = await headers();
  const ip = ipFrom(h);
  if (await throttled(`waitlist-ip:${ip ?? "?"}`, 8, 60 * 60 * 1000)) back({ error: "Too many attempts from this connection. Try again in an hour." });

  const email = normalizeEmail(text(form, "email", 254));
  const src = text(form, "src", 40).toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
  const keep: Record<string, string> = src ? { src } : {};
  if (!validEmail(email)) back({ error: "Enter a valid email address.", ...keep });
  const track = text(form, "track");
  if (track !== "SEEKER" && track !== "PITCH" && track !== "BOTH") back({ error: "Choose what you want to use Opportuneer for.", ...keep });
  if (form.get("consent") !== "on") back({ error: "Please tick the box to agree we can contact you about your place.", ...keep });
  if (!(await turnstileOk(text(form, "cf-turnstile-response", 2048), ip))) back({ error: "We could not verify that you are human. Reload the page and try again.", ...keep });

  const proto = h.get("x-forwarded-proto") ?? "http";
  await requestWaitlistConfirmation(
    {
      email,
      name: text(form, "name") || null,
      trackInterest: track as "SEEKER" | "PITCH" | "BOTH",
      roleType: pick(text(form, "roleType"), ROLE_KEYS),
      occupation: pick(text(form, "occupation"), OCCUPATION_KEYS),
      industry: pick(
        text(form, "industry"),
        industries.map((i) => i.key),
      ),
      country: text(form, "country", 60) || null,
      source: src,
      consentMarketing: form.get("marketing") === "on",
    },
    `${proto}://${h.get("host")}`,
  );
  back(CHECK_EMAIL);
}

/** Public: the person clicked the button on the confirmation page. Assigns the place. */
export async function confirmWaitlistAction(form: FormData) {
  const ip = ipFrom(await headers());
  if (await throttled(`waitlist-confirm:${ip ?? "?"}`, 20, 60 * 60 * 1000)) back({ error: "Too many attempts from this connection. Try again in an hour." });
  const r = await confirmWaitlist(text(form, "token", 200));
  revalidatePath("/waitlist");
  revalidatePath("/");
  if (r.kind === "invalid") back({ error: "That confirmation link has expired or was already used. If you have not been confirmed yet, join again below." });
  // "duplicate" can only happen to someone who is already on the list, who gets the public message either way.
  else back({ joined: r.kind === "joined" && r.phase === "PILOT" ? r.cohort! : "P" });
}

const adminBack = (msg: { ok?: string; error?: string }, form: FormData): never => {
  const p = new URLSearchParams();
  const ret = text(form, "returnTo", 300);
  if (ret.startsWith("?")) new URLSearchParams(ret).forEach((v, k) => p.set(k, v));
  p.delete("ok");
  p.delete("error");
  if (msg.ok) p.set("ok", msg.ok);
  if (msg.error) p.set("error", msg.error);
  return redirect(`/admin/waitlist?${p}`);
};

/** Admin: move a waiting person to cohort A, B or the public list (respects cohort sizes). */
export async function moveWaitlistEntryAction(form: FormData) {
  await requireSuper();
  const target = text(form, "target");
  if (target !== "A" && target !== "B" && target !== "PUBLIC") return adminBack({ error: "Invalid target." }, form);
  const r = await moveWaitlistEntry(text(form, "id"), target);
  revalidatePath("/admin/waitlist");
  return adminBack(r.ok ? { ok: "Entry moved." } : { error: r.error }, form);
}

/** Admin: mark a person declined, or put a declined person back to waiting. */
export async function setWaitlistStatusAction(form: FormData) {
  await requireSuper();
  const status = text(form, "status");
  if (status !== "DECLINED" && status !== "WAITING") return adminBack({ error: "Invalid status." }, form);
  // Only touch people who haven't been invited yet, so invite links and accounts stay consistent.
  const from = status === "DECLINED" ? "WAITING" : "DECLINED";
  await db.waitlistEntry.updateMany({ where: { id: text(form, "id"), status: from }, data: { status } });
  revalidatePath("/admin/waitlist");
  return adminBack({ ok: status === "DECLINED" ? "Marked declined." : "Back on the waitlist." }, form);
}

/** Admin: remove a waitlist entry (delete-my-data requests). Frees a pilot place if it was one. */
export async function deleteWaitlistEntryAction(form: FormData) {
  await requireSuper();
  await db.waitlistEntry.deleteMany({ where: { id: text(form, "id") } });
  revalidatePath("/admin/waitlist");
  redirect(`/admin/waitlist?ok=${encodeURIComponent("Entry deleted.")}`);
}
