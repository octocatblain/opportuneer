"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { industries } from "@/config/profile";
import { clientInfo, normalizeEmail, requireSuper, throttled, validEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { joinWaitlist, OCCUPATION_KEYS, ROLE_KEYS } from "@/lib/waitlist";

const text = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);
const pick = (v: string, allowed: string[]) => (allowed.includes(v) ? v : null);

const back = (params: Record<string, string>): never => redirect(`/waitlist?${new URLSearchParams(params)}`);

/** Public: join the waitlist. Pilot place (cohort A, then B) is assigned automatically; after 30 it becomes the public-launch list. */
export async function joinWaitlistAction(form: FormData) {
  // Honeypot: real people never fill this hidden field. Pretend success so bots learn nothing.
  if (text(form, "website")) back({ joined: "P" });

  const { ip } = await clientInfo();
  if (throttled(`waitlist-ip:${ip ?? "?"}`, 8, 60 * 60 * 1000)) back({ error: "Too many attempts from this connection. Try again in an hour." });

  const email = normalizeEmail(text(form, "email", 254));
  const src = text(form, "src", 40).toLowerCase().replace(/[^a-z0-9_-]/g, "") || null;
  const keep: Record<string, string> = src ? { src } : {};
  if (!validEmail(email)) back({ error: "Enter a valid email address.", ...keep });
  const track = text(form, "track");
  if (track !== "SEEKER" && track !== "PITCH" && track !== "BOTH") back({ error: "Choose what you want to use Opportuneer for.", ...keep });
  if (form.get("consent") !== "on") back({ error: "Please tick the box to agree we can contact you about your place.", ...keep });

  const result = await joinWaitlist({
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
  });
  revalidatePath("/waitlist");
  revalidatePath("/");
  if (result.kind === "duplicate") back({ joined: "dup" });
  else back({ joined: result.phase === "PILOT" ? result.cohort! : "P" });
}

/** Admin: remove a waitlist entry (delete-my-data requests). Frees a pilot place if it was one. */
export async function deleteWaitlistEntryAction(form: FormData) {
  await requireSuper();
  await db.waitlistEntry.deleteMany({ where: { id: text(form, "id") } });
  revalidatePath("/admin/waitlist");
  redirect(`/admin/waitlist?ok=${encodeURIComponent("Entry deleted.")}`);
}
