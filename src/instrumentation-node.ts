// Startup scan: runs a job scan in the background if the last one is stale, so
// opening the app also refreshes the shortlist. The 08:00 scheduled task covers the rest.
import { getSetting } from "@/lib/db";
import { runScan } from "@/lib/services";

const MIN_HOURS_BETWEEN_SCANS = 3; // Remotive asks for no more than 4 calls a day.

async function startupScan() {
  if (process.env.SKIP_STARTUP_SCAN === "1") return;
  const last = await getSetting<{ at: string } | null>("lastScan", null).catch(() => null);
  const ageHours = last ? (Date.now() - new Date(last.at).getTime()) / 36e5 : Infinity;
  if (ageHours < MIN_HOURS_BETWEEN_SCANS) {
    console.log(`[startup scan] skipped: last scan was ${ageHours.toFixed(1)}h ago`);
    return;
  }
  console.log("[startup scan] running in the background...");
  try {
    const r = await runScan();
    const added = Object.values(r.counts).reduce((n, c) => n + c.added, 0);
    console.log(`[startup scan] done: ${added} new jobs${r.errors.length ? `, ${r.errors.length} feed errors` : ""}`);
  } catch (e) {
    console.error("[startup scan] failed:", (e as Error).message);
  }
}

void startupScan(); // don't block server startup
