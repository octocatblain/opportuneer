/** KYC / profile: parsing, per-account config, onboarding state, resume upload and reading, and isolation between accounts. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { cfg, defaultConfig, loadUserConfig, runForUser } from "../src/lib/config";
import { deleteAccount } from "../src/lib/account";
import { db } from "../src/lib/db";
import { applyUserPrefs, extractResumeText, formDefaults, getProfile, missingSteps, parseBasics, parseJobPrefs, parsePackageLine, parsePitchPrefs, removeResume, resumeDir, saveResume, saveSection, type JobPrefs, type PitchPrefs } from "../src/lib/kyc";
import { htmlToPdf, STORAGE_DIR } from "../src/lib/pdf";
import { matchTitleFamily, scoreJob, shouldMentionCompany } from "../src/lib/scoring";
import * as svc from "../src/lib/services";
import { assertTestDb, cleanup, makeUser, type TestUser } from "./helpers";

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};
const who = (role: "USER" | "SUPERUSER" = "USER") => ({ role, email: "u@test.invalid", name: "Ada Lovelace" });

const jobForm = (extra: Record<string, string | string[]> = {}) =>
  form({ titleKeys: ["fullstack"], customTitles: "Senior Data Analyst\nProduct Manager", industryKeys: ["finance"], customIndustries: "Energy: solar, utilities", localMonthlyUsd: "1500", remoteMonthlyUsd: "2200", acceptedLocations: "Nairobi, Kenya", excludedRegions: "uganda", abroadNeedsSponsorship: "on", ...extra });
const pitchForm = (extra: Record<string, string | string[]> = {}) =>
  form({
    agencyName: "Acme Digital",
    website: "https://acme.example",
    tagline: "Web and automation for retailers",
    packages: "Site Starter | 40000 | | 2 weeks | A fast brochure site\nCare Plan | 0 | 8000 | monthly | Hosting and updates",
    services: "Web design, Automation",
    clientFloorKes: "40000",
    foundingText: "20% off for the first two clients",
    foundingMax: "2",
    industryKeys: ["services"],
    ...extra,
  });

let u1: TestUser, u2: TestUser, owner: TestUser;
before(async () => {
  assertTestDb();
  [u1, u2, owner] = [await makeUser("kyc1", { onboarded: false }), await makeUser("kyc2", { onboarded: false }), await makeUser("kycown", { role: "SUPERUSER" })];
});
after(async () => {
  await cleanup([u1, u2, owner]);
  await fs.rm(resumeDir(u1.id), { recursive: true, force: true });
  await db.$disconnect();
});

describe("form validation", () => {
  it("basics requires name, phone and location and strips link protocols", () => {
    assert.ok("error" in parseBasics(form({ fullName: "A", phone: "123456", location: "Nairobi" })));
    assert.ok("error" in parseBasics(form({ fullName: "Ada L", phone: "", location: "Nairobi" })));
    const r = parseBasics(form({ fullName: "Ada L", phone: "+254700000000", location: "Nairobi", linkedin: "https://linkedin.com/in/ada/" }));
    assert.ok("ok" in r && r.ok.linkedin === "linkedin.com/in/ada");
  });

  it("job targets need a title and numeric floors; custom titles and industries are parsed", () => {
    assert.ok("error" in parseJobPrefs(jobForm({ titleKeys: [], customTitles: "" })));
    assert.match((parseJobPrefs(jobForm({ localMonthlyUsd: "abc" })) as { error: string }).error, /Local pay floor/);
    assert.match((parseJobPrefs(jobForm({ acceptedLocations: "" })) as { error: string }).error, /location/i);
    const r = parseJobPrefs(jobForm());
    assert.ok("ok" in r);
    if ("ok" in r) {
      assert.deepEqual(r.ok.customTitles, ["Senior Data Analyst", "Product Manager"]);
      assert.deepEqual(r.ok.titleKeys, ["fullstack"]);
      assert.equal(r.ok.customIndustries[0], "Energy: solar, utilities");
      assert.equal(r.ok.abroadNeedsSponsorship, true);
    }
    // unknown preset keys are dropped, not trusted
    assert.ok("error" in parseJobPrefs(jobForm({ titleKeys: ["nope"], customTitles: "" })));
  });

  it("pitch profile validates packages and parses prices", () => {
    assert.ok("error" in parsePitchPrefs(pitchForm({ agencyName: "" })));
    assert.match((parsePitchPrefs(pitchForm({ packages: "Broken | abc" })) as { error: string }).error, /numbers/);
    assert.ok("error" in parsePitchPrefs(pitchForm({ packages: "", services: "" })));
    assert.ok("ok" in parsePitchPrefs(pitchForm()));
    const p = parsePackageLine("Care Plan | 0 | 8000 | monthly | Hosting", 40000);
    assert.ok(!("error" in p) && p.kind === "retainer" && p.priceKes === 8000 && p.monthlyKes === 8000 && p.qualifies);
    const q = parsePackageLine("Setup | KES 30,000 | 5000 | 1 week | x", 40000);
    assert.ok(!("error" in q) && q.kind === "setup+retainer" && q.priceKes === 30000);
  });
});

describe("per-account config", () => {
  const job = (parseJobPrefs(jobForm()) as { ok: JobPrefs }).ok;
  const pitch = (parsePitchPrefs(pitchForm()) as { ok: PitchPrefs }).ok;
  const done = new Date();
  const row = { basics: null, jobPrefs: job as object, pitchPrefs: pitch as object, basicsDoneAt: null, jobDoneAt: done, pitchDoneAt: done };

  it("a regular user starts with none of the owner's data", () => {
    const c = applyUserPrefs(defaultConfig(), who(), null);
    assert.equal(c.company.name, "");
    assert.equal(c.packages.length, 0);
    assert.equal(c.titleFamilies.length, 0);
    assert.equal(c.profile.phone, "");
    assert.ok(!JSON.stringify([c.company, c.packages, c.profile, c.serviceLines]).includes("Red Star"));
  });

  it("saved job targets become that account's titles, search terms, floors and industries", () => {
    const c = applyUserPrefs(defaultConfig(), who(), row);
    assert.deepEqual(c.titleFamilies.map((f) => f.label), ["Senior / Full-Stack Software Engineer", "Senior Data Analyst", "Product Manager"]);
    assert.ok(c.searchTerms.includes("Product Manager") && c.searchTerms.includes("full stack developer"));
    assert.equal(c.payFloors.localMonthlyUsd, 1500);
    assert.equal(c.payFloors.remoteMonthlyUsd, 2200);
    assert.deepEqual(c.locations.accepted, ["nairobi", "kenya"]);
    assert.ok(c.industries.some((i) => i.key === "finance") && c.industries.some((i) => i.label === "Energy" && i.keywords.includes("solar")));
    assert.ok(c.titleFamilies[1].keywords.includes("data analyst"), "seniority is dropped so plain 'data analyst' posts match");
  });

  it("saved pitch profile replaces the agency, offer and client floor; Red Star is not leaked", () => {
    const c = applyUserPrefs(defaultConfig(), who(), row);
    assert.equal(c.company.name, "Acme Digital");
    assert.equal(c.company.clientFloorKes, 40000);
    assert.deepEqual(c.packages.map((p) => p.name), ["Site Starter", "Care Plan"]);
    assert.equal(c.company.foundingOffer.maxFoundingClients, 2);
    assert.ok(!JSON.stringify(c.company).includes("Red Star") && !JSON.stringify(c.packages).includes("WhatsApp"));
  });

  it("the owner keeps Red Star Standard until they save their own profile", () => {
    const c = applyUserPrefs(defaultConfig(), who("SUPERUSER"), null);
    assert.equal(c.company.name, "Red Star Standard");
    assert.ok(c.packages.length > 10);
    const d = formDefaults(defaultConfig(), who("SUPERUSER"), null);
    assert.equal(d.pitch.agencyName, "Red Star Standard");
    assert.ok(d.job.titleKeys.length === 5 && d.job.localMonthlyUsd === 2000);
    const regular = formDefaults(defaultConfig(), who(), null);
    assert.equal(regular.pitch.agencyName, "");
    assert.ok(Number.isNaN(regular.job.localMonthlyUsd));
  });

  it("onboarding steps depend on the tracks the account has", () => {
    assert.deepEqual(missingSteps("BOTH", null), ["basics", "resume", "job", "pitch"]);
    assert.deepEqual(missingSteps("JOB", null), ["basics", "resume", "job"]);
    assert.deepEqual(missingSteps("PITCH", null), ["basics", "pitch"]);
    assert.deepEqual(missingSteps("PITCH", { basicsDoneAt: done, jobDoneAt: null, pitchDoneAt: done, resumePath: null }), []);
    assert.deepEqual(missingSteps("BOTH", { basicsDoneAt: done, jobDoneAt: done, pitchDoneAt: null, resumePath: "x" }), ["pitch"]);
  });

  it("scoring and matching use the profile of the account they run for, even concurrently", async () => {
    await saveSection(u1.id, "basics", { fullName: "Ada Lovelace", phone: "+254700000001", location: "Nairobi", noticePeriod: "2 weeks", github: "", linkedin: "", portfolio: "" });
    await saveSection(u1.id, "jobPrefs", job);
    await saveSection(u1.id, "pitchPrefs", pitch);
    await saveSection(u2.id, "jobPrefs", { ...job, titleKeys: ["platform"], customTitles: [] });
    const title = "Senior Data Analyst (Nairobi)";
    const [a, b, none] = await Promise.all([
      runForUser(u1.id, async () => {
        await new Promise((r) => setTimeout(r, 20));
        return matchTitleFamily(title)?.label ?? null;
      }),
      runForUser(u2.id, async () => matchTitleFamily(title)?.label ?? null),
      Promise.resolve(matchTitleFamily(title)?.label ?? null), // outside any account: global defaults
    ]);
    assert.equal(a, "Senior Data Analyst");
    assert.equal(b, null);
    assert.equal(none, null);
    const fit = await runForUser(u1.id, async () => scoreJob({ title, description: "x".repeat(500), location: "Nairobi", remote: false, employment: "full-time", salary: { min: 1200, max: 1200, currency: "USD", period: "month" }, companyName: "Co" }));
    const far = await runForUser(u1.id, async () => scoreJob({ title, description: "x".repeat(500), location: "Nairobi", remote: false, employment: "full-time", salary: { min: 500, max: 500, currency: "USD", period: "month" }, companyName: "Co" }));
    assert.ok(far.excluded, "$500 is far below the user's own floor");
    assert.equal(fit.titleFamily, "custom-senior-data-analyst");
    assert.ok(fit.belowTarget, "$1,200 is below the user's own $1,500 floor");
    assert.equal((await loadUserConfig(u1.id)).company.name, "Acme Digital");
    assert.equal((await loadUserConfig(u2.id)).company.name, "");
    assert.equal(await runForUser(u2.id, async () => shouldMentionCompany("AI Lead", "contract")), false, "no agency, so nothing to mention");
    assert.equal(cfg().company.name, "Red Star Standard", "outside runForUser the global config is untouched");
  });

  it("a scan refuses to run before the job profile exists", async () => {
    const fresh = await makeUser("kyc3", { onboarded: false, trackAccess: "JOB" });
    await assert.rejects(svc.runScan(fresh.id), /Finish your job search profile/);
    await cleanup([fresh]);
  });
});

describe("resume upload", () => {
  const sample = `Ada Lovelace\nSenior Data Analyst\nada@example.com | +254 700 000001\n\nEXPERIENCE\nAnalytical Engines Ltd, Lead Analyst 2019-2024\n- Built reporting pipelines that cut month-end close from 6 days to 2.\n- Mentored four analysts and introduced code review.\n\nSKILLS\nSQL, Python, dashboards, stakeholder management`;

  it("reads text, markdown and html", async () => {
    assert.match(await extractResumeText(Buffer.from(sample), "cv.txt"), /Lead Analyst/);
    assert.match(await extractResumeText(Buffer.from(sample), "cv.md"), /Senior Data Analyst/);
    const html = `<html><head><style>p{}</style></head><body><h1>Ada Lovelace</h1><p>${sample.replace(/\n/g, "<br>")}</p></body></html>`;
    assert.match(await extractResumeText(Buffer.from(html), "cv.html"), /month-end close/);
  });

  it("reads a real PDF and a real DOCX", async () => {
    const rel = `kyc-test/${Date.now()}.pdf`;
    await htmlToPdf(`<html><body><h1>Ada Lovelace</h1><pre>${sample}</pre></body></html>`, rel);
    const pdf = await fs.readFile(path.join(STORAGE_DIR, rel));
    assert.match(await extractResumeText(pdf, "cv.pdf"), /Analytical Engines/);
    await fs.rm(path.join(STORAGE_DIR, "kyc-test"), { recursive: true, force: true });

    const JSZip = (await import("jszip")).default;
    const z = new JSZip();
    z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    z.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${sample.split("\n").map((l) => `<w:p><w:r><w:t>${l.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`);
    const docx = await z.generateAsync({ type: "nodebuffer" });
    assert.match(await extractResumeText(docx, "cv.docx"), /Mentored four analysts/);
  });

  it("rejects wrong types, fake PDFs, empty and oversized files with readable errors", async () => {
    await assert.rejects(extractResumeText(Buffer.from(sample), "cv.exe"), /PDF, Word/);
    await assert.rejects(extractResumeText(Buffer.from("not a pdf"), "cv.pdf"), /not a valid PDF/);
    await assert.rejects(extractResumeText(Buffer.from("short"), "cv.txt"), /enough text/);
    await assert.rejects(saveResume(u1.id, { name: "cv.txt", type: "text/plain", bytes: Buffer.alloc(0) }), /Choose a resume/);
    await assert.rejects(saveResume(u1.id, { name: "cv.txt", type: "text/plain", bytes: Buffer.alloc(5 * 1024 * 1024, "a") }), /too large/);
  });

  it("stores the file and text per user, replaces on re-upload, and removes both on delete", async () => {
    await saveResume(u1.id, { name: "../../evil name.txt", type: "text/plain", bytes: Buffer.from(sample) });
    let row = await getProfile(u1.id);
    assert.equal(row?.resumePath, `resumes/${u1.id}/resume.txt`);
    assert.match(row?.resumeName ?? "", /evil name\.txt$/);
    assert.ok(!row?.resumeName?.includes("/"));
    await fs.access(path.join(STORAGE_DIR, row!.resumePath!));
    assert.ok(row?.jobDoneAt && row.pitchDoneAt, "the profile sections survive an upload");

    await saveResume(u1.id, { name: "cv.md", type: "text/markdown", bytes: Buffer.from(sample + "\nExtra line for the second upload.") });
    row = await getProfile(u1.id);
    assert.equal(row?.resumePath, `resumes/${u1.id}/resume.md`);
    await assert.rejects(fs.access(path.join(resumeDir(u1.id), "resume.txt")), "old file is gone");
    assert.match(row?.resumeText ?? "", /second upload/);

    await removeResume(u1.id);
    assert.equal((await getProfile(u1.id))?.resumeText, null);
    await saveResume(u1.id, { name: "cv.txt", type: "text/plain", bytes: Buffer.from(sample) });
    await deleteAccount(u1.id);
    await assert.rejects(fs.access(resumeDir(u1.id)), "deleting the account deletes the resume file");
    assert.equal(await db.userProfile.count({ where: { userId: u1.id } }), 0);
  });
});
