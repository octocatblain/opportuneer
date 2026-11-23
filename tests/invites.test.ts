/** Invite-only signup: single-use hashed token, 7-day expiry, bound to email, and the admin "invite cohort" action. */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { inviteForToken, registerMember } from "../src/lib/auth";
import { INVITE_DAYS, sha256 } from "../src/lib/auth-crypto";
import { COHORT_DATES, inviteCohort } from "../src/lib/invites";
import { db } from "../src/lib/db";
import { assertTestDb, cleanup, makeUser, type TestUser } from "./helpers";

let admin: TestUser;
const emails: string[] = [];
const email = (l: string) => {
  const e = `${l}-${Math.random().toString(36).slice(2, 8)}@test.invalid`;
  emails.push(e);
  return e;
};
const tokenOf = (url: string) => new URL(url).searchParams.get("invite")!;
const entry = (e: string, cohort: "A" | "B" | null, extra: Record<string, unknown> = {}) =>
  db.waitlistEntry.create({ data: { email: e, trackInterest: "SEEKER", consentAt: new Date(), phase: cohort ? "PILOT" : "PUBLIC", cohort, ...extra } });

before(async () => {
  assertTestDb();
  // The invite action reads the whole waitlist, so start from a clean table (this is the _test database).
  await db.waitlistEntry.deleteMany();
  admin = await makeUser("admin", { role: "SUPERUSER" });
});
after(async () => {
  await db.invite.deleteMany({ where: { email: { in: emails } } });
  await db.waitlistEntry.deleteMany({ where: { email: { in: emails } } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await cleanup([admin]);
  await db.$disconnect();
});

describe("invite cohort action", () => {
  it("invites only waiting entries of that cohort, marks them invited, and bounds each link to its email", async () => {
    const [a1, a2, b1, pub, done] = [email("a1"), email("a2"), email("b1"), email("pub"), email("done")];
    await entry(a1, "A");
    await entry(a2, "A");
    await entry(b1, "B");
    await entry(pub, null);
    await entry(done, "A", { status: "ACTIVE" });

    const r = await inviteCohort("A", admin.id, "http://x.test");
    assert.deepEqual(r.issued.map((i) => i.email).sort(), [a1, a2].sort());
    assert.equal(r.skipped.length, 0);

    for (const e of [a1, a2]) assert.equal((await db.waitlistEntry.findUniqueOrThrow({ where: { email: e } })).status, "INVITED");
    for (const e of [b1, pub]) assert.equal((await db.waitlistEntry.findUniqueOrThrow({ where: { email: e } })).status, "WAITING", "other cohorts are untouched");
    assert.equal((await db.waitlistEntry.findUniqueOrThrow({ where: { email: done } })).status, "ACTIVE");

    const i1 = r.issued.find((i) => i.email === a1)!;
    assert.match(i1.url, /^http:\/\/x\.test\/register\?invite=[\w-]{40,}$/);
    const inv = await db.invite.findFirstOrThrow({ where: { email: a1 } });
    assert.equal(inv.email, a1, "bound to the waitlist email");
    assert.equal(inv.status, "PENDING");
    assert.equal(inv.tokenHash, sha256(tokenOf(i1.url)), "only the hash is stored");
    assert.notEqual(inv.tokenHash, tokenOf(i1.url));
    const days = (inv.expiresAt!.getTime() - Date.now()) / 86_400_000;
    assert.ok(days > INVITE_DAYS - 0.01 && days <= INVITE_DAYS, `expires in ${INVITE_DAYS} days, got ${days}`);
    assert.equal(INVITE_DAYS, 7);
  });

  it("running it twice invites nobody twice", async () => {
    const again = await inviteCohort("A", admin.id, "http://x.test");
    assert.equal(again.issued.length, 0);
  });

  it("cohort B gets its founding-price date, cohort A its free-until date, and both reach the account on accept", async () => {
    const b2 = email("b2");
    await entry(b2, "B");
    const r = await inviteCohort("B", admin.id, "http://x.test");
    const mine = r.issued.find((i) => i.email === b2)!;
    const w = await db.waitlistEntry.findUniqueOrThrow({ where: { email: b2 } });
    assert.equal(w.foundingUntil?.getTime(), COHORT_DATES.B.foundingUntil.getTime());
    assert.equal(w.freeUntil, null);
    const made = await registerMember({ token: tokenOf(mine.url), name: "B Two", passwordHash: "x" });
    assert.ok("user" in made, "error" in made ? made.error : "");
    if ("user" in made) {
      assert.equal(made.user.cohort, "B");
      assert.equal(made.user.foundingUntil?.getTime(), COHORT_DATES.B.foundingUntil.getTime());
      assert.equal(made.user.email, b2);
    }
    assert.equal((await db.waitlistEntry.findUniqueOrThrow({ where: { email: b2 } })).status, "ACTIVE");
    const a = await db.waitlistEntry.findFirstOrThrow({ where: { cohort: "A", status: "INVITED" } });
    assert.equal(a.freeUntil?.getTime(), COHORT_DATES.A.freeUntil.getTime());
  });
});

describe("the invite link", () => {
  const fresh = async (l: string, hoursToExpiry = 24) => {
    const e = email(l);
    const token = `tok-${l}-${Math.random().toString(36).slice(2)}-${"x".repeat(24)}`;
    await db.invite.create({ data: { email: e, invitedById: admin.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hoursToExpiry * 3_600_000) } });
    return { e, token };
  };

  it("works once: a second sign-up with the same link is refused", async () => {
    const { e, token } = await fresh("once");
    const first = await registerMember({ token, passwordHash: "x" });
    assert.ok("user" in first);
    const second = await registerMember({ token, passwordHash: "x" });
    assert.ok("error" in second);
    assert.equal(await db.user.count({ where: { email: e } }), 1);
    assert.equal(await inviteForToken(token), null);
  });

  it("two simultaneous sign-ups with one link create exactly one account", async () => {
    const { e, token } = await fresh("race");
    const results = await Promise.all([registerMember({ token, passwordHash: "x" }), registerMember({ token, passwordHash: "x" }), registerMember({ token, passwordHash: "x" })]);
    assert.equal(results.filter((r) => "user" in r).length, 1);
    assert.equal(await db.user.count({ where: { email: e } }), 1);
  });

  it("is refused after it expires", async () => {
    const { e, token } = await fresh("old", -1);
    assert.equal(await inviteForToken(token), null);
    assert.ok("error" in (await registerMember({ token, passwordHash: "x" })));
    assert.equal(await db.user.count({ where: { email: e } }), 0);
  });

  it("is bound to its email: a Google account with another address is refused", async () => {
    const { e, token } = await fresh("bound");
    const r = await registerMember({ token, googleId: "g-1", googleEmail: "someone.else@test.invalid" });
    assert.ok("error" in r);
    assert.equal(await db.user.count({ where: { email: e } }), 0);
    assert.equal((await inviteForToken(token))?.email, e, "the link is still usable by the right person");
  });

  it("is refused once revoked, and guessing tokens finds nothing", async () => {
    const { token } = await fresh("rev");
    await db.invite.updateMany({ where: { tokenHash: sha256(token) }, data: { status: "REVOKED", tokenHash: null } });
    assert.equal(await inviteForToken(token), null);
    assert.equal(await inviteForToken("a".repeat(43)), null);
    assert.equal(await inviteForToken(""), null);
    assert.equal(await inviteForToken(null), null);
  });
});
