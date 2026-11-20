// Daily scan: `npm run scan` (schedule it with Windows Task Scheduler, see README).
import { runScan } from "@/lib/services";
import { db } from "@/lib/db";

runScan()
  .then((r) => {
    console.log(`Scan at ${r.at}`);
    for (const [k, v] of Object.entries(r.counts)) console.log(`  ${k}: fetched ${v.fetched}, matching ${v.matched}, new ${v.added}`);
    if (r.errors.length) console.log("Errors:\n  " + r.errors.join("\n  "));
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
