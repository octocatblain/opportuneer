/** First-login gate, profile pages and resume download access, against a real server. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { db } from "../src/lib/db";
import { resumeDir, saveResume } from "../src/lib/kyc";
import { assertTestDb, cleanup, get, makeUser, startServer, stopServer, type TestUser } from "./helpers";

let fresh: TestUser, done: TestUser, other: TestUser, admin: TestUser, pitchOnly: TestUser;
before(async () => {
  assertTestDb();
  [fresh, done, other, admin, pitchOnly] = [
    await makeUser("g-new", { onboarded: false }),
    await makeUser("g-done"),
    await makeUser("g-other"),
    await makeUser("g-admin", { role: "SUPERUSER" }),
    await makeUser("g-pitch", { onboarded: false, trackAccess: "PITCH" }),
  ];
  await saveResume(done.id, { name: "mycv.txt", type: "text/plain", bytes: Buffer.from("My private resume text. ".repeat(20)) });
  await startServer();
});
after(async () => {
  stopServer();
  await fs.rm(resumeDir(done.id), { recursive: true, force: true });
  await cleanup([fresh, done, other, admin, pitchOnly]);
  await db.$disconnect();
});

const loc = (r: Response) => r.headers.get("location") ?? "";

describe("first-login gate", () => {
  it("sends a new account to onboarding from every workspace page", async () => {
    for (const p of ["/client/duo", "/client/duo/jobs", "/client/duo/pipeline", "/client/duo/settings", "/client/duo/profile"]) {
      const r = await get(p, fresh);
      assert.equal(r.status, 307, p);
      assert.match(loc(r), /\/onboarding$/, p);
    }
  });

  it("onboarding asks for the first missing step, and a pitch-only account never sees resume or job steps", async () => {
    const html = await (await get("/onboarding", fresh)).text();
    assert.match(html, /Step 1 of 4/);
    assert.match(html, /name="fullName"/);
    const pHtml = await (await get("/onboarding", pitchOnly)).text();
    assert.match(pHtml, /Step 1 of 2/);
    assert.doesNotMatch(pHtml, /Your resume/);
  });

  it("an onboarded account goes straight to the workspace and onboarding bounces back", async () => {
    assert.equal((await get("/client/duo", done)).status, 200);
    const r = await get("/onboarding", done);
    assert.equal(r.status, 307);
    assert.match(loc(r), /\/client\/duo/);
  });

  it("the owner is never forced through onboarding", async () => {
    assert.equal((await get("/client/duo", admin)).status, 200);
  });

  it("signed-out visitors cannot open onboarding or profile", async () => {
    assert.match(loc(await get("/onboarding")), /\/login/);
    assert.match(loc(await get("/client/duo/profile")), /\/login/);
  });
});

describe("profile page", () => {
  it("shows every section for a duo account, with the saved values", async () => {
    const html = await (await get("/client/duo/profile", done)).text();
    for (const s of ["About you", "Resume", "Job search targets", "Your agency and offer"]) assert.match(html, new RegExp(s));
    assert.match(html, /mycv\.txt/);
    assert.doesNotMatch(html, /Quick-Win Sprint/, "regular accounts never see the owner's offer");
  });

  it("the owner sees their own Red Star Standard offer prefilled", async () => {
    const html = await (await get("/client/duo/profile", admin)).text();
    assert.match(html, /Red Star Standard/);
    assert.match(html, /AI Quick-Win Sprint/);
  });
});

describe("resume download", () => {
  it("owner of the file can download it; another user and signed-out visitors cannot; the superuser can", async () => {
    const mine = await get("/api/profile/resume", done);
    assert.equal(mine.status, 200);
    assert.match(await mine.text(), /My private resume text/);
    assert.equal((await get(`/api/profile/resume?user=${done.id}`, other)).status, 404);
    assert.equal((await get("/api/profile/resume", other)).status, 404, "other has no resume");
    assert.equal((await get("/api/profile/resume")).status, 401);
    assert.equal((await get(`/api/profile/resume?user=${done.id}`, admin)).status, 200);
  });
});
