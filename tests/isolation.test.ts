/**
 * One user can never read (or change) another user's data.
 * Two real accounts with real sessions hit a real server: every page and API that takes an id or lists data is tried
 * with the other user's ids. Each "must not see" check has a "can see" control for the owner, so a broken page
 * can't make the test pass by accident.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { db } from "../src/lib/db";
import * as svc from "../src/lib/services";
import { assertTestDb, cleanup, get, makeUser, makeWorkspace, startServer, stopServer, type TestUser, type Workspace } from "./helpers";

let a: TestUser, b: TestUser, wa: Workspace, wb: Workspace;
const text = async (r: Response) => await r.text();

before(async () => {
  assertTestDb();
  [a, b] = [await makeUser("iso-a"), await makeUser("iso-b")];
  [wa, wb] = [await makeWorkspace(a.id, "A"), await makeWorkspace(b.id, "B")];
  await startServer();
});

after(async () => {
  stopServer();
  await cleanup([a, b], [wa, wb]);
  await db.$disconnect();
});

describe("pages by id", () => {
  it("owner can open their own opportunity and company (control)", async () => {
    const o = await get(`/client/duo/opportunities/${wa.oppId}`, a);
    assert.equal(o.status, 200);
    assert.match(await text(o), new RegExp(wa.marker));
    const c = await get(`/client/duo/companies/${wa.companyId}`, a);
    assert.equal(c.status, 200);
    assert.match(await text(c), new RegExp(wa.marker));
  });

  it("another user gets nothing for an opportunity id", async () => {
    const r = await get(`/client/duo/opportunities/${wb.oppId}`, a);
    const body = await text(r);
    assert.ok(r.status === 404 || /not found|404/i.test(body), `expected a not-found page, got ${r.status}`);
    assert.doesNotMatch(body, new RegExp(wb.marker));
  });

  it("another user gets nothing for a company id", async () => {
    const r = await get(`/client/duo/companies/${wb.companyId}`, a);
    const body = await text(r);
    assert.ok(r.status === 404 || /not found|404/i.test(body), `expected a not-found page, got ${r.status}`);
    assert.doesNotMatch(body, new RegExp(wb.marker));
  });
});

describe("lists", () => {
  for (const page of ["", "/pipeline", "/jobs", "/companies"]) {
    it(`/client/duo${page || " (today)"} shows only the viewer's own rows`, async () => {
      const body = await text(await get(`/client/duo${page}`, a));
      assert.doesNotMatch(body, new RegExp(wb.marker), "leaked the other user's data");
      if (page === "/jobs" || page === "/companies") assert.match(body, new RegExp(wa.marker), "control: own data should be listed");
    });
  }
});

describe("files and exports", () => {
  it("owner can download their generated file (control)", async () => {
    const r = await get(`/api/files/${wa.oppId}/cv.pdf`, a);
    assert.equal(r.status, 200);
    assert.match(await text(r), new RegExp(wa.marker));
  });

  it("another user cannot download it, by guessing the path", async () => {
    const r = await get(`/api/files/${wb.oppId}/cv.pdf`, a);
    assert.equal(r.status, 404);
    assert.doesNotMatch(await text(r), new RegExp(wb.marker));
  });

  it("path traversal does not reach another user's file", async () => {
    const r = await get(`/api/files/${wa.oppId}/..%2F${wb.oppId}%2Fcv.pdf`, a);
    assert.notEqual(r.status, 200);
    assert.doesNotMatch(await text(r), new RegExp(wb.marker));
  });

  it("data export contains only the caller's data", async () => {
    const r = await get("/api/account/export", a);
    assert.equal(r.status, 200);
    const body = await text(r);
    assert.match(body, new RegExp(wa.marker));
    assert.doesNotMatch(body, new RegExp(wb.marker));
  });

  it("a user cannot export someone else's data with ?user=", async () => {
    const r = await get(`/api/account/export?user=${b.id}`, a);
    assert.equal(r.status, 404);
    assert.doesNotMatch(await text(r), new RegExp(wb.marker));
  });
});

describe("admin and signed-out access", () => {
  it("a regular user is turned away from admin pages and APIs", async () => {
    const page = await get("/admin", a);
    assert.ok(page.status >= 300 && page.status < 400, `expected a redirect, got ${page.status}`);
    assert.doesNotMatch(page.headers.get("location") ?? "", /\/admin(\/|$)/);
    assert.equal((await get(`/admin/users/${b.id}`, a)).status >= 300, true);
    assert.equal((await get("/api/admin/waitlist", a)).status, 403);
    assert.equal((await get("/api/admin/invite-cohort", a, { method: "POST", body: new URLSearchParams({ cohort: "A" }) })).status, 403);
  });

  it("signed-out visitors cannot reach data", async () => {
    const page = await get(`/client/duo/opportunities/${wb.oppId}`);
    assert.ok(page.status >= 300 && page.status < 400);
    assert.match(page.headers.get("location") ?? "", /\/login/);
    assert.equal((await get(`/api/files/${wb.oppId}/cv.pdf`)).status, 401);
    assert.equal((await get("/api/account/export")).status, 401);
  });
});

describe("new screens render", () => {
  it("privacy note is public and explains delete-my-data", async () => {
    const r = await get("/privacy");
    assert.equal(r.status, 200);
    assert.match(await text(r), /Delete my account/);
  });

  it("signed-in pages carry the feedback button", async () => {
    assert.match(await text(await get("/client/duo", a)), /Feedback/);
  });

  it("admin sees the cohort invite buttons, the Google test-user list and the spend guard", async () => {
    const boss = await makeUser("iso-boss", { role: "SUPERUSER" });
    try {
      const wl = await text(await get("/admin/waitlist", boss));
      assert.match(wl, /Invite a cohort/);
      assert.match(wl, /invite-cohort/);
      assert.match(wl, /Google test users/);
      assert.match(await text(await get("/admin/credits", boss)), /Monthly spend guard/);
    } finally {
      await cleanup([boss]);
    }
  });
});

describe("services (server actions) scope every id to the signed-in user", () => {
  it("cannot change another user's opportunity stage", async () => {
    await assert.rejects(svc.setStage(a.id, wb.oppId, "ARCHIVED"));
    assert.equal((await db.opportunity.findUniqueOrThrow({ where: { id: wb.oppId } })).stage, "SHORTLISTED");
  });

  it("cannot edit another user's document", async () => {
    await assert.rejects(svc.updateDocument(a.id, wb.docId, "hacked", "hacked"));
    assert.equal((await db.document.findUniqueOrThrow({ where: { id: wb.docId } })).content, wb.marker);
  });

  it("cannot re-score another user's job or company", async () => {
    await assert.rejects(svc.rescoreJob(a.id, wb.oppId));
    await assert.rejects(svc.rescoreCompany(a.id, wb.companyId));
  });

  it("owner can use the same calls on their own data (control)", async () => {
    await svc.setStage(a.id, wa.oppId, "SHORTLISTED");
    await svc.updateDocument(a.id, wa.docId, null, wa.marker);
  });
});
