/** Rate limiter (database-backed) and waitlist double opt-in. */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { rateLimited, resetRateLimits } from "../src/lib/rate-limit";
import { confirmWaitlist, requestWaitlistConfirmation } from "../src/lib/waitlist";
import { sha256 } from "../src/lib/auth-crypto";
import { assertTestDb } from "./helpers";

const email = "optin-test@example.com";
const input = { email, name: "Opt In", trackInterest: "SEEKER" as const, roleType: null, occupation: null, industry: null, country: "Kenya", source: null, consentMarketing: false };

before(() => assertTestDb());
beforeEach(async () => {
  await resetRateLimits();
  await db.waitlistPending.deleteMany();
  await db.waitlistEntry.deleteMany({ where: { email } });
});
after(async () => {
  await db.waitlistPending.deleteMany();
  await db.waitlistEntry.deleteMany({ where: { email } });
  await db.$disconnect();
});

describe("rate limiter", () => {
  it("blocks after max hits in the window, per key, and keeps counting in the database", async () => {
    for (let i = 0; i < 3; i++) assert.equal(await rateLimited("t:a", 3, 60_000), false);
    assert.equal(await rateLimited("t:a", 3, 60_000), true);
    assert.equal(await rateLimited("t:b", 3, 60_000), false, "other keys are unaffected");
    assert.equal((await db.rateLimit.findUniqueOrThrow({ where: { key: "t:a" } })).count, 4);
  });
  it("starts a new window once the old one has ended", async () => {
    await rateLimited("t:c", 1, 60_000);
    await db.rateLimit.update({ where: { key: "t:c" }, data: { resetAt: new Date(Date.now() - 1000) } });
    assert.equal(await rateLimited("t:c", 1, 60_000), false);
  });
});

describe("waitlist double opt-in", () => {
  it("assigns no place until the link is confirmed, then assigns exactly one", async () => {
    await requestWaitlistConfirmation(input, "http://localhost");
    assert.equal(await db.waitlistEntry.count({ where: { email } }), 0, "pending signups take no seat");
    const pending = await db.waitlistPending.findUniqueOrThrow({ where: { email } });
    assert.equal((await confirmWaitlist("wrong-token")).kind, "invalid");
    assert.equal(await db.waitlistEntry.count({ where: { email } }), 0);
    assert.ok(pending.tokenHash.length === 64, "only a hash of the secret is stored");
  });
  it("confirming the emailed token creates the entry once and uses the link up", async () => {
    const { email: _e, ...rest } = input;
    await db.waitlistPending.create({ data: { email, tokenHash: sha256("tok"), payload: rest, expiresAt: new Date(Date.now() + 3600_000) } });
    const r = await confirmWaitlist("tok");
    assert.equal(r.kind, "joined");
    assert.equal(await db.waitlistEntry.count({ where: { email } }), 1);
    assert.equal((await confirmWaitlist("tok")).kind, "invalid", "a used link does nothing");
  });
  it("rejects an expired link", async () => {
    const { email: _e, ...rest } = input;
    await db.waitlistPending.create({ data: { email, tokenHash: sha256("old"), payload: rest, expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await confirmWaitlist("old")).kind, "invalid");
    assert.equal(await db.waitlistEntry.count({ where: { email } }), 0);
  });
  it("does not create a pending record for an address that is already on the list", async () => {
    await db.waitlistEntry.create({ data: { email, trackInterest: "SEEKER", consentAt: new Date(), phase: "PUBLIC" } });
    await requestWaitlistConfirmation(input, "http://localhost");
    assert.equal(await db.waitlistPending.count({ where: { email } }), 0);
  });
  it("caps confirmation emails per address", async () => {
    for (let i = 0; i < 5; i++) await requestWaitlistConfirmation(input, "http://localhost");
    await db.waitlistPending.deleteMany();
    await requestWaitlistConfirmation(input, "http://localhost");
    assert.equal(await db.waitlistPending.count({ where: { email } }), 0, "the fourth request in a day sends nothing");
  });
});
