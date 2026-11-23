/** Plans and price stages: the right price on the right date, and the right access state. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accessState } from "../src/lib/billing";
import { PLANS, priceFor, priceLine } from "../src/lib/plans";
import { COHORT_DATES } from "../src/lib/invites";

const A = { freeUntil: COHORT_DATES.A.freeUntil, foundingUntil: null };
const B = { freeUntil: null, foundingUntil: COHORT_DATES.B.foundingUntil };
const none = { freeUntil: null, foundingUntil: null };
const at = (iso: string) => new Date(iso);

describe("price stages", () => {
  it("cohort A is free until 28 Feb, then pays the standard price from 1 Mar", () => {
    assert.equal(priceFor(A, "JOB", at("2026-12-15T10:00:00+03:00")).amountKes, 0);
    assert.equal(priceFor(A, "JOB", at("2027-02-28T12:00:00+03:00")).stage, "free");
    const after = priceFor(A, "JOB", at("2027-03-01T09:00:00+03:00"));
    assert.deepEqual([after.stage, after.amountKes], ["standard", PLANS.JOB.standardKes]);
  });
  it("cohort B pays the founding price on 7 Dec, 7 Jan and 7 Feb, and the standard price from 7 Mar", () => {
    for (const d of ["2026-12-07", "2027-01-07", "2027-02-07"]) assert.equal(priceFor(B, "BOTH", at(`${d}T09:00:00+03:00`)).amountKes, PLANS.BOTH.foundingKes);
    const mar = priceFor(B, "BOTH", at("2027-03-07T09:00:00+03:00"));
    assert.deepEqual([mar.stage, mar.amountKes], ["standard", PLANS.BOTH.standardKes]);
  });
  it("founding price is half the standard price on every plan", () => {
    for (const p of Object.values(PLANS)) assert.ok(Math.abs(p.foundingKes * 2 - p.standardKes) <= 1);
  });
  it("accounts with no dates pay the standard price", () => assert.equal(priceFor(none, "PITCH").amountKes, PLANS.PITCH.standardKes));
  it("says when the price changes, in plain words", () => {
    assert.match(priceLine(priceFor(B, "JOB", at("2026-12-07T09:00:00+03:00")), "JOB"), /KES 499 a month until 6 Mar 2027, then KES 999/);
    assert.match(priceLine(priceFor(A, "JOB", at("2026-12-07T09:00:00+03:00")), "JOB"), /Free until 28 Feb 2027, then KES 999/);
    assert.equal(priceLine(priceFor(none, "JOB"), "JOB"), "KES 999 a month");
  });
});

describe("access state", () => {
  const now = at("2027-03-02T09:00:00+03:00");
  const day = 86_400_000;
  it("the owner is never limited", () => assert.equal(accessState({ role: "SUPERUSER", ...none }, null, now), "owner"));
  it("a free-window account works, and pauses (needs a plan) after the window ends", () => {
    assert.equal(accessState({ role: "USER", ...A }, null, at("2027-02-20T09:00:00+03:00")), "free");
    assert.equal(accessState({ role: "USER", ...A }, null, now), "needs_plan");
  });
  it("a paid period works until it ends, including after cancelling", () => {
    const sub = { status: "ACTIVE" as const, currentPeriodEnd: new Date(now.getTime() + day), graceUntil: null };
    assert.equal(accessState({ role: "USER", ...B }, sub, now), "active");
    assert.equal(accessState({ role: "USER", ...B }, { ...sub, status: "CANCELLED" }, now), "active");
    assert.equal(accessState({ role: "USER", ...B }, { ...sub, currentPeriodEnd: new Date(now.getTime() - day) }, now), "needs_plan");
  });
  it("grace keeps working until graceUntil, then pauses", () => {
    const g = { status: "GRACE" as const, currentPeriodEnd: new Date(now.getTime() - day), graceUntil: new Date(now.getTime() + day) };
    assert.equal(accessState({ role: "USER", ...none }, g, now), "grace");
    assert.equal(accessState({ role: "USER", ...none }, { ...g, graceUntil: new Date(now.getTime() - 1) }, now), "needs_plan");
  });
});
