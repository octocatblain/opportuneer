/**
 * Fixed-window rate limiter, in memory (enough for one server process).
 * Returns true when the caller has gone over `max` hits inside `windowMs`.
 */
const hits = new Map<string, { n: number; first: number }>();
const MAX_KEYS = 10_000;

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > MAX_KEYS) {
    // Drop expired windows so a flood of distinct keys can't grow the map without bound.
    for (const [k, v] of hits) if (now - v.first > windowMs) hits.delete(k);
    if (hits.size > MAX_KEYS) hits.clear();
  }
  const a = hits.get(key);
  if (!a || now - a.first > windowMs) {
    hits.set(key, { n: 1, first: now });
    return false;
  }
  a.n++;
  return a.n > max;
}

/** Test helper: forget every counter. */
export const resetRateLimits = () => hits.clear();

/** Best-effort client address from the proxy header (null when the request has none). */
export const ipFrom = (h: { get(name: string): string | null }) => h.get("x-forwarded-for")?.split(",")[0].trim() || null;
