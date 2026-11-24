import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres, so counters survive restarts and deploys and are shared by every process.
 * Returns true when the caller has gone over `max` hits inside `windowMs`. One atomic upsert per call.
 */
export async function rateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const ms = Math.max(1, Math.floor(windowMs));
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + (${ms} * interval '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + (${ms} * interval '1 millisecond') ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  // Expired windows are only dead weight: sweep them now and then (npm run prune does it too).
  if (Math.random() < 0.01) void db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
  return (rows[0]?.count ?? 1) > max;
}

/** Forget every counter (tests, and the admin's "unblock everyone" if it ever needs one). */
export const resetRateLimits = () => db.rateLimit.deleteMany().then(() => undefined);

/**
 * Client address from the proxy header (null when the request has none).
 * Takes the LAST entry: the reverse proxy appends the real peer address, whereas earlier
 * entries are client-supplied and spoofable (which would bypass per-IP throttles).
 */
export const ipFrom = (h: { get(name: string): string | null }) => h.get("x-forwarded-for")?.split(",").pop()?.trim() || null;
