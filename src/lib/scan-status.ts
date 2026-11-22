import { getSetting, setSetting } from "@/lib/db";

// Stored in the DB (not memory) so the app also sees scans started by the
// scheduled `npm run scan` task, which runs in a separate process.
const key = (userId: string) => `scanRunning:${userId}`;
/** A scan older than this is treated as crashed, so the overlay can't get stuck forever. */
const STALE_MS = 30 * 60 * 1000;

export async function scanStatus(userId: string) {
  const s = await getSetting<{ startedAt: string | null } | null>(key(userId), null);
  const startedAt = s?.startedAt ?? null;
  const running = !!startedAt && Date.now() - new Date(startedAt).getTime() < STALE_MS;
  return { running, startedAt: running ? startedAt : null };
}

export async function setScanRunning(userId: string, running: boolean) {
  await setSetting(key(userId), { startedAt: running ? new Date().toISOString() : null });
}
