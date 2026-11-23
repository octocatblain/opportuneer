/**
 * Real-browser walk through first-login KYC and the Profile settings: every form is filled, submitted (server actions, file
 * upload included) and the database is checked afterwards. Skipped when no Chrome/Edge is installed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import puppeteer, { type Browser, type ElementHandle, type Page } from "puppeteer-core";
import { db } from "../src/lib/db";
import { resumeDir } from "../src/lib/kyc";
import { BASE, assertTestDb, cleanup, makeUser, startServer, stopServer, type TestUser } from "./helpers";

const chrome = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => p && fs.existsSync(p));

let user: TestUser, browser: Browser, page: Page, resumeFile: string;
const RESUME = "Grace Hopper\nSystems Engineer\ngrace@example.com\n\nEXPERIENCE\nNavy Computing Lab, Lead Engineer 2015-2024\n- Built a compiler toolchain used by 40 engineers.\n- Cut batch run time by 60 percent.\n\nSKILLS\nCOBOL, compilers, mentoring";

before(async () => {
  assertTestDb();
  if (!chrome) return;
  user = await makeUser("e2e", { onboarded: false });
  resumeFile = path.join(os.tmpdir(), `kyc-e2e-${Date.now()}.txt`);
  await fsp.writeFile(resumeFile, RESUME);
  await startServer();
  browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1600 });
  await page.setCookie({ name: "opp_session", value: user.token, url: BASE });
});
after(async () => {
  await browser?.close();
  stopServer();
  if (user) {
    await fsp.rm(resumeDir(user.id), { recursive: true, force: true });
    await cleanup([user]);
  }
  if (resumeFile) await fsp.rm(resumeFile, { force: true });
  await db.$disconnect();
});

const toast = () => page.evaluate(() => document.querySelector(".swal2-popup")?.textContent?.trim() ?? "");
/** Submit a form and return the message toast the server action produced (the ?ok= / ?error= flash is shown as a toast, then stripped from the URL). */
const submit = async (formSelector: string) => {
  const prev = await toast();
  await page.$eval(formSelector, (f) => (f as HTMLFormElement).requestSubmit());
  await page.waitForFunction((t) => { const n = document.querySelector(".swal2-popup")?.textContent?.trim() ?? ""; return n !== "" && n !== t; }, { timeout: 60000 }, prev);
  return toast();
};
const shows = (sel: string) => page.waitForSelector(sel, { timeout: 60000 });
const fill = async (sel: string, value: string) => {
  await page.$eval(sel, (el) => ((el as HTMLInputElement).value = ""));
  await page.type(sel, value);
};

describe("first login, in a real browser", { skip: !chrome }, () => {
  it("a brand-new account is sent to onboarding and completes every step", async () => {
    await page.goto(`${BASE}/client/duo`, { waitUntil: "networkidle0", timeout: 120000 });
    assert.match(page.url(), /\/onboarding$/);
    assert.match(await page.content(), /Step 1 of 4/);

    // 1. About you (empty required field is rejected by the browser; a bad value by the server)
    await fill("#b-name", "Grace Hopper");
    await fill("#b-phone", "+254711000111");
    await fill("#b-loc", "Nairobi, Kenya");
    await fill("#b-notice", "1 month");
    await submit("form:has(#b-name)");
    await shows("#resume-file");
    assert.match(await page.content(), /Step 2 of 4/);

    // 2. Resume (a wrong file type is refused with a readable message first)
    const bad = path.join(os.tmpdir(), `kyc-e2e-${Date.now()}.exe`);
    await fsp.writeFile(bad, "MZ");
    await page.evaluate(() => document.querySelector("#resume-file")?.removeAttribute("accept"));
    await ((await page.$("#resume-file")) as ElementHandle<HTMLInputElement>).uploadFile(bad);
    assert.match(await submit("form:has(#resume-file)"), /Upload a PDF, Word/);
    await fsp.rm(bad, { force: true });
    await ((await page.$("#resume-file")) as ElementHandle<HTMLInputElement>).uploadFile(resumeFile);
    await submit("form:has(#resume-file)");
    await shows("#j-local");
    assert.match(await page.content(), /Step 3 of 4/);

    // 3. Job targets
    await page.click('input[name="titleKeys"][value="platform"]');
    await fill("#j-titles", "Compiler Engineer");
    await page.click('input[name="industryKeys"][value="logistics"]');
    await fill("#j-local", "1800");
    await fill("#j-remote", "2600");
    await submit("form:has(#j-local)");
    await shows("#p-name");
    assert.match(await page.content(), /Step 4 of 4/);

    // 4. Agency and offer
    await fill("#p-name", "Hopper Systems");
    await fill("#p-site", "hopper.example");
    await fill("#p-tag", "Legacy modernisation");
    await fill("#p-pk", "Audit | 50000 | | 2 weeks | Codebase audit");
    await fill("#p-floor", "50000");
    await page.$eval("form:has(#p-name)", (f) => (f as HTMLFormElement).requestSubmit());
    await page.waitForFunction(() => location.pathname.startsWith("/client/duo"), { timeout: 60000 });
    assert.match(page.url(), /\/client\/duo/);

    const row = await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } });
    assert.ok(row.basicsDoneAt && row.jobDoneAt && row.pitchDoneAt);
    assert.equal((row.basics as { fullName: string }).fullName, "Grace Hopper");
    assert.match(row.resumeText ?? "", /compiler toolchain/);
    assert.deepEqual((row.jobPrefs as { titleKeys: string[]; customTitles: string[] }).titleKeys, ["platform"]);
    assert.deepEqual((row.jobPrefs as { customTitles: string[] }).customTitles, ["Compiler Engineer"]);
    assert.equal((row.jobPrefs as { localMonthlyUsd: number }).localMonthlyUsd, 1800);
    assert.equal((row.pitchPrefs as { agencyName: string }).agencyName, "Hopper Systems");
    assert.ok(fs.existsSync(path.join(resumeDir(user.id), "resume.txt")));
  });

  it("the workspace is open afterwards and onboarding no longer shows", async () => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle0", timeout: 60000 });
    assert.match(page.url(), /\/client\/duo/);
  });

  it("the Profile page shows the saved values and edits apply", async () => {
    await page.goto(`${BASE}/client/duo/profile`, { waitUntil: "networkidle0", timeout: 60000 });
    assert.equal(await page.$eval("#j-local", (e) => (e as HTMLInputElement).value), "1800");
    assert.equal(await page.$eval("#p-name", (e) => (e as HTMLInputElement).value), "Hopper Systems");
    assert.equal(await page.$eval('input[name="titleKeys"][value="platform"]', (e) => (e as HTMLInputElement).checked), true);
    assert.match(await page.content(), /kyc-e2e-\d+\.txt/);

    await fill("#j-local", "2100");
    await submit("form:has(#j-local)");
    assert.match(page.url(), /\/client\/duo\/profile/);
    const saved = await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal((saved.jobPrefs as { localMonthlyUsd: number }).localMonthlyUsd, 2100);

    // removing the resume sends the account back to onboarding (it is required for the job track)
    await page.evaluate(() => (Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Remove") as HTMLButtonElement).click());
    await page.waitForFunction(() => document.querySelector(".swal2-popup")?.textContent?.includes("Resume removed"), { timeout: 60000 });
    await page.goto(`${BASE}/client/duo`, { waitUntil: "networkidle0", timeout: 60000 });
    assert.match(page.url(), /\/onboarding$/);
    assert.match(await page.content(), /Your resume/);
    assert.equal((await db.userProfile.findUniqueOrThrow({ where: { userId: user.id } })).resumeText, null);
    assert.ok(!fs.existsSync(path.join(resumeDir(user.id), "resume.txt")));
  });
});
