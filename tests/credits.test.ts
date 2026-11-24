/** Credit ledger, per-user caps, the daily guard, the per-minute guard and the monthly spend kill-switch. */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { cfg, defaultConfig, loadConfig } from "../src/lib/config";
import { chargeCredits, creditBalance, refundCredits, spendStatus } from "../src/lib/credits";
import { resetRateLimits } from "../src/lib/rate-limit";
import { db } from "../src/lib/db";
import { assertTestDb, cleanup, makeUser, type TestUser } from "./helpers";

const users: TestUser[] = [];
const setCredits = async (patch: Record<string, unknown>) => {
  await db.setting.upsert({ where: { key: "config:credits" }, create: { key: "config:credits", value: { ...defaultConfig().credits, ...patch } }, update: { value: { ...defaultConfig().credits, ...patch } } });
  await loadConfig(true);
};
const paying = async () => {
  const u = await makeUser("pay", { credits: 1000 });
  users.push(u);
  return u;
};

before(async () => {
  assertTestDb();
  await loadConfig(true);
});
beforeEach(async () => {
  await resetRateLimits();
  await setCredits({ dailyLimit: 0, perMinute: 0, killSwitch: { alertKes: 0, pauseKes: 0 } });
  await db.creditLedger.deleteMany({ where: { action: { not: "grant" }, userId: { in: users.map((u) => u.id) } } });
});
after(async () => {
  await db.setting.deleteMany({ where: { key: { startsWith: "spendAlert:" } } });
  await cleanup(users);
  await db.$disconnect();
});

describe("ledger", () => {
  it("every charge writes a negative ledger row with its estimated cost, and the balance follows", async () => {
    const u = await paying();
    const id = await chargeCredits(u.id, "application");
    const row = await db.creditLedger.findUniqueOrThrow({ where: { id } });
    assert.equal(row.action, "application");
    assert.equal(row.credits, -cfg().credits.costs.application);
    assert.equal(Number(row.costEstimateKes), cfg().credits.costKes.application);
    assert.equal(await creditBalance(u.id), 1000 - cfg().credits.costs.application);
  });

  it("a refund is a compensating row, so the ledger keeps the history", async () => {
    const u = await paying();
    const id = await chargeCredits(u.id, "pitch");
    await refundCredits(u.id, id);
    assert.equal(await creditBalance(u.id), 1000);
    assert.equal(await db.creditLedger.count({ where: { userId: u.id } }), 3); // grant + charge + refund
  });

  it("refuses an action the balance cannot pay for", async () => {
    const u = await makeUser("broke", { credits: 1 });
    users.push(u);
    await assert.rejects(chargeCredits(u.id, "application"), /Not enough credits/);
  });

  it("refuses a track the account does not include", async () => {
    const u = await makeUser("jobonly", { trackAccess: "JOB", credits: 100 });
    users.push(u);
    await assert.rejects(chargeCredits(u.id, "pitch"), /pitching track/);
  });

  it("owner account is never limited but is still recorded", async () => {
    const owner = await makeUser("owner", { role: "SUPERUSER" });
    users.push(owner);
    await setCredits({ monthlyCaps: { JOB: 1, PITCH: 1 }, dailyLimit: 1, killSwitch: { alertKes: 1, pauseKes: 2 } });
    for (let i = 0; i < 3; i++) await chargeCredits(owner.id, "application");
    assert.equal(await db.creditLedger.count({ where: { userId: owner.id } }), 3);
  });
});

describe("per-user caps", () => {
  it("monthly cap per track blocks the next action", async () => {
    await setCredits({ monthlyCaps: { JOB: 2, PITCH: 40 } });
    const u = await paying();
    await chargeCredits(u.id, "application");
    await chargeCredits(u.id, "import");
    await assert.rejects(chargeCredits(u.id, "application"), /Monthly limit reached/);
    await chargeCredits(u.id, "pitch"); // the other track is unaffected
  });

  it("daily guard stops the 31st AI action of a day (limit 30)", async () => {
    await setCredits({ dailyLimit: 30, perMinute: 0, monthlyCaps: { JOB: 0, PITCH: 0 }, costs: { ...defaultConfig().credits.costs, import: 1 } });
    const u = await paying();
    for (let i = 0; i < 30; i++) await chargeCredits(u.id, "import");
    await assert.rejects(chargeCredits(u.id, "import"), /Daily limit reached \(30 AI actions a day\)/);
    await assert.rejects(chargeCredits(u.id, "followup"), /Daily limit reached/, "follow-ups count too");
  });

  it("a refunded action does not count against the daily guard", async () => {
    await setCredits({ dailyLimit: 2, monthlyCaps: { JOB: 0, PITCH: 0 } });
    const u = await paying();
    const first = await chargeCredits(u.id, "import");
    await chargeCredits(u.id, "import");
    await assert.rejects(chargeCredits(u.id, "import"), /Daily limit/);
    await refundCredits(u.id, first);
    await chargeCredits(u.id, "import");
  });

  it("the daily guard is per user", async () => {
    await setCredits({ dailyLimit: 1, monthlyCaps: { JOB: 0, PITCH: 0 } });
    const [x, y] = [await paying(), await paying()];
    await chargeCredits(x.id, "import");
    await assert.rejects(chargeCredits(x.id, "import"), /Daily limit/);
    await chargeCredits(y.id, "import");
  });

  it("per-minute guard slows bursts", async () => {
    await setCredits({ perMinute: 3, monthlyCaps: { JOB: 0, PITCH: 0 } });
    const u = await paying();
    for (let i = 0; i < 3; i++) await chargeCredits(u.id, "import");
    await assert.rejects(chargeCredits(u.id, "import"), /going a bit fast/);
  });
});

describe("monthly kill-switch (alert 6,000, pause 8,000 KES by default)", () => {
  it("ships with the agreed thresholds and a 30-a-day guard", () => {
    const c = defaultConfig().credits;
    assert.deepEqual(c.killSwitch, { alertKes: 6000, pauseKes: 8000 });
    assert.equal(c.dailyLimit, 30);
  });

  it("alert pauses free-window users first; paying users carry on; pause stops everyone but the owner", async () => {
    const base = (await spendStatus()).spentKes;
    await setCredits({ monthlyCaps: { JOB: 0, PITCH: 0 }, killSwitch: { alertKes: base + 50, pauseKes: base + 100 } });
    const free = await makeUser("free", { freeUntil: new Date(Date.now() + 86_400_000), credits: 100 });
    const owner = await makeUser("boss", { role: "SUPERUSER" });
    users.push(free, owner);
    const payer = await paying();
    const spend = (kes: number) => db.creditLedger.create({ data: { userId: payer.id, action: "grant", credits: 0, costEstimateKes: kes } });

    assert.equal((await spendStatus()).state, "ok");
    await chargeCredits(free.id, "import"); // below alert: free users work normally

    await spend(60); // crosses alert
    assert.equal((await spendStatus()).state, "alert");
    await assert.rejects(chargeCredits(free.id, "import"), /Free-trial AI use is paused/);
    await chargeCredits(payer.id, "import");

    await spend(60); // crosses pause
    assert.equal((await spendStatus()).state, "paused");
    await assert.rejects(chargeCredits(payer.id, "import"), /paused for everyone/);
    await assert.rejects(chargeCredits(free.id, "import"), /paused/);
    await chargeCredits(owner.id, "import"); // admin override
  });

  it("raises a once-a-month alert flag when the alert level is crossed", async () => {
    const base = (await spendStatus()).spentKes;
    await db.setting.deleteMany({ where: { key: { startsWith: "spendAlert:" } } });
    await setCredits({ monthlyCaps: { JOB: 0, PITCH: 0 }, killSwitch: { alertKes: base + 1, pauseKes: base + 1_000_000 } });
    const u = await paying();
    await db.creditLedger.create({ data: { userId: u.id, action: "grant", credits: 0, costEstimateKes: 10 } });
    await chargeCredits(u.id, "import");
    await new Promise((r) => setTimeout(r, 300)); // the flag is written without blocking the action
    const key = `spendAlert:${(await spendStatus()).monthKey}`;
    assert.ok(await db.setting.findUnique({ where: { key } }), "alert flag should exist");
  });
});
