import { Prisma, type WaitlistEntry } from "@prisma/client";
import { newInviteToken, sha256 } from "@/lib/auth-crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { rateLimited } from "@/lib/rate-limit";

/** Pilot launch: 30 places. The first 10 signups are cohort A, the next 20 are cohort B. Later signups go to the public-launch waitlist. */
export const COHORT_A_SIZE = 10;
export const COHORT_B_SIZE = 20;
export const PILOT_SIZE = COHORT_A_SIZE + COHORT_B_SIZE;

export const ROLE_TYPES: [string, string][] = [
  ["job_seeker", "Job seeker"],
  ["freelancer_agency", "Freelancer or agency owner"],
  ["recruiter_coach", "Recruiter or career coach"],
  ["other", "Other"],
];
export const ROLE_KEYS = ROLE_TYPES.map(([k]) => k);

export const OCCUPATIONS: [string, string][] = [
  ["software", "Software and IT"],
  ["design_media", "Design, media and marketing"],
  ["finance_admin", "Finance, accounting and admin"],
  ["sales_bd", "Sales and business development"],
  ["ops_logistics", "Operations and logistics"],
  ["health_education", "Health and education"],
  ["other", "Other"],
];
export const OCCUPATION_KEYS = OCCUPATIONS.map(([k]) => k);

export type JoinResult = { kind: "joined"; phase: "PILOT" | "PUBLIC"; cohort: "A" | "B" | null } | { kind: "duplicate" };

export type JoinInput = {
  email: string;
  name: string | null;
  trackInterest: "SEEKER" | "PITCH" | "BOTH";
  roleType: string | null;
  occupation: string | null;
  industry: string | null;
  country: string | null;
  source: string | null;
  consentMarketing: boolean;
};

/**
 * Add someone to the waitlist and assign their place automatically.
 * An advisory lock serialises signups, so two people racing for the last pilot place can never both get it
 * and the pilot can never exceed 30. Counting per cohort (not overall) means a deleted entry frees its place.
 */
export async function joinWaitlist(input: JoinInput): Promise<JoinResult> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(884201)`;
      if (await tx.waitlistEntry.findUnique({ where: { email: input.email }, select: { id: true } })) return { kind: "duplicate" as const };
      const [a, b] = await Promise.all([
        tx.waitlistEntry.count({ where: { phase: "PILOT", cohort: "A" } }),
        tx.waitlistEntry.count({ where: { phase: "PILOT", cohort: "B" } }),
      ]);
      const [phase, cohort] = a < COHORT_A_SIZE ? (["PILOT", "A"] as const) : b < COHORT_B_SIZE ? (["PILOT", "B"] as const) : (["PUBLIC", null] as const);
      await tx.waitlistEntry.create({ data: { ...input, consentAt: new Date(), phase, cohort } });
      return { kind: "joined" as const, phase, cohort };
    },
    { timeout: 10_000 },
  ).catch((e) => {
    // A unique-email race that slipped past the check is still just a duplicate.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { kind: "duplicate" as const };
    throw e;
  });
}

/** Public counters for the landing and waitlist pages (counts only, no personal data). */
export async function waitlistCounts() {
  const [a, b, pub] = await Promise.all([
    db.waitlistEntry.count({ where: { phase: "PILOT", cohort: "A" } }),
    db.waitlistEntry.count({ where: { phase: "PILOT", cohort: "B" } }),
    db.waitlistEntry.count({ where: { phase: "PUBLIC" } }),
  ]);
  const taken = a + b;
  return { a, b, taken, left: Math.max(0, PILOT_SIZE - taken), full: taken >= PILOT_SIZE, public: pub };
}

export type Entry = WaitlistEntry;

export type WaitlistFilters = { q?: string; group?: string; status?: string; track?: string };

/** Build the Prisma filter shared by the admin list and the CSV export. group: A | B | PUBLIC. */
export function waitlistWhere(f: WaitlistFilters): Prisma.WaitlistEntryWhereInput {
  const where: Prisma.WaitlistEntryWhereInput = {};
  const q = f.q?.trim();
  if (q)
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
      { source: { contains: q, mode: "insensitive" } },
    ];
  if (f.group === "A" || f.group === "B") Object.assign(where, { phase: "PILOT", cohort: f.group });
  else if (f.group === "PUBLIC") where.phase = "PUBLIC";
  if (f.status === "WAITING" || f.status === "INVITED" || f.status === "ACTIVE" || f.status === "DECLINED") where.status = f.status;
  if (f.track === "SEEKER" || f.track === "PITCH" || f.track === "BOTH") where.trackInterest = f.track;
  return where;
}

/** Move one entry to cohort A, B or the public list. Refuses when the target pilot cohort is full. */
export async function moveWaitlistEntry(id: string, target: "A" | "B" | "PUBLIC"): Promise<{ ok: true } | { ok: false; error: string }> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(884201)`;
      const e = await tx.waitlistEntry.findUnique({ where: { id }, select: { phase: true, cohort: true, status: true } });
      if (!e) return { ok: false as const, error: "Entry not found." };
      if (e.status !== "WAITING") return { ok: false as const, error: "Only people still waiting can be moved." };
      if (target === "PUBLIC") {
        await tx.waitlistEntry.update({ where: { id }, data: { phase: "PUBLIC", cohort: null } });
        return { ok: true as const };
      }
      if (e.phase === "PILOT" && e.cohort === target) return { ok: true as const };
      const size = target === "A" ? COHORT_A_SIZE : COHORT_B_SIZE;
      if ((await tx.waitlistEntry.count({ where: { phase: "PILOT", cohort: target } })) >= size) return { ok: false as const, error: `Cohort ${target} is full.` };
      await tx.waitlistEntry.update({ where: { id }, data: { phase: "PILOT", cohort: target } });
      return { ok: true as const };
    },
    { timeout: 10_000 },
  );
}

// ---------- double opt-in ----------
const CONFIRM_HOURS = 48;

/** The public site address used in emailed links. Set SITE_URL in production; the request's own host is only a fallback for development. */
export const siteUrl = (fallback: string) => (process.env.SITE_URL || fallback).replace(/\/+$/, "");

/**
 * Step 1 of signup: remember the form answers and email a confirmation link. No place is assigned yet, so bots and
 * mistyped or stranger's addresses cannot take pilot seats. The caller shows the same "check your email" message
 * whether the address is new, already on the list or throttled, so the form cannot be used to look up who has joined.
 */
export async function requestWaitlistConfirmation(input: JoinInput, origin: string): Promise<void> {
  const { email, ...rest } = input;
  if (await db.waitlistEntry.findUnique({ where: { email }, select: { id: true } })) return;
  // At most 3 emails per address per day, however many different connections ask.
  if (await rateLimited(`waitlist-mail:${email}`, 3, 24 * 60 * 60 * 1000)) return;
  const token = newInviteToken();
  const data = { tokenHash: sha256(token), payload: rest as Prisma.InputJsonObject, sentAt: new Date(), expiresAt: new Date(Date.now() + CONFIRM_HOURS * 3600_000) };
  await db.waitlistPending.upsert({ where: { email }, create: { email, ...data }, update: data });
  const link = `${siteUrl(origin)}/waitlist/confirm?token=${token}`;
  // Not awaited: how long sending takes must not reveal whether the address was new.
  void sendMail(
    email,
    "Confirm your place on the Opportuneer waitlist",
    `Hi${input.name ? ` ${input.name}` : ""},\n\nSomeone (hopefully you) asked to join the Opportuneer waitlist with this email address. Your place is only reserved once you confirm:\n\n${link}\n\nThe link works for ${CONFIRM_HOURS} hours. If you did not ask for this, ignore this email and nothing will happen.\n\nRed Star Standard`,
  );
}

export type ConfirmResult = { kind: "joined"; phase: "PILOT" | "PUBLIC"; cohort: "A" | "B" | null } | { kind: "duplicate" } | { kind: "invalid" };

/** Step 2: the emailed link was used. Assigns the place (pilot cohort A, B or the public list) and removes the pending record. */
export async function confirmWaitlist(token: string): Promise<ConfirmResult> {
  if (!token) return { kind: "invalid" };
  const p = await db.waitlistPending.findUnique({ where: { tokenHash: sha256(token) } });
  if (!p || p.expiresAt.getTime() < Date.now()) return { kind: "invalid" };
  const r = await joinWaitlist({ ...(p.payload as Omit<JoinInput, "email">), email: p.email });
  await db.waitlistPending.deleteMany({ where: { id: p.id } });
  return r;
}
