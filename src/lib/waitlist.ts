import { Prisma, type WaitlistEntry } from "@prisma/client";
import { db } from "@/lib/db";

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
