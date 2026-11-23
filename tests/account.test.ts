/** Delete-my-data: deleting an account removes everything stored about it, including the parts that don't cascade by themselves. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { deleteAccount, exportAccount } from "../src/lib/account";
import { db } from "../src/lib/db";
import { assertTestDb, cleanup, makeUser, makeWorkspace, type TestUser } from "./helpers";

let admin: TestUser, me: TestUser, other: TestUser;

before(async () => {
  assertTestDb();
  [admin, me, other] = [await makeUser("adm", { role: "SUPERUSER" }), await makeUser("me", { credits: 50 }), await makeUser("other", { credits: 50 })];
});
after(async () => {
  await cleanup([admin, me, other]);
  await db.$disconnect();
});

describe("delete my data", () => {
  it("removes the account, its content, files, events, settings, invitation and waitlist records, and leaves other users alone", async () => {
    const [mine, theirs] = [await makeWorkspace(me.id, "ME"), await makeWorkspace(other.id, "OTHER")];
    await db.feedback.create({ data: { userId: me.id, message: "hello" } });
    await db.analyticsEvent.create({ data: { userId: me.id, name: "login" } });
    await db.setting.createMany({ data: [{ key: `gmail:${me.id}`, value: { access_token: "x" } }, { key: `lastScan:${me.id}`, value: {} }, { key: `lastScan:${other.id}`, value: {} }] });
    const w = await db.waitlistEntry.create({ data: { email: me.email, trackInterest: "BOTH", consentAt: new Date(), phase: "PILOT", cohort: "A", status: "ACTIVE" } });
    await db.invite.create({ data: { email: me.email, invitedById: admin.id, status: "ACCEPTED", acceptedById: me.id, waitlistEntryId: w.id } });

    const exported = JSON.stringify(await exportAccount(me.id));
    assert.match(exported, new RegExp(mine.marker));
    assert.match(exported, /"waitlist"/);
    assert.doesNotMatch(exported, new RegExp(theirs.marker));

    await deleteAccount(me.id);

    assert.equal(await db.user.count({ where: { id: me.id } }), 0);
    assert.equal(await db.company.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.opportunity.count({ where: { id: mine.oppId } }), 0);
    assert.equal(await db.document.count({ where: { id: mine.docId } }), 0);
    assert.equal(await db.session.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.creditLedger.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.feedback.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.analyticsEvent.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.setting.count({ where: { key: { endsWith: `:${me.id}` } } }), 0);
    assert.equal(await db.waitlistEntry.count({ where: { email: me.email } }), 0);
    assert.equal(await db.invite.count({ where: { email: me.email } }), 0);
    await assert.rejects(fs.access(mine.file), "generated files are removed from disk");

    // The other user is untouched.
    assert.equal(await db.opportunity.count({ where: { id: theirs.oppId } }), 1);
    assert.equal(await db.setting.count({ where: { key: `lastScan:${other.id}` } }), 1);
    await fs.access(theirs.file);
    await cleanup([], [theirs]);
  });
});
