/**
 * KYC / search profile: what each account tells the app about itself, per track.
 *
 *  - basics     : who you are (name, phone, location, notice period, links). Used on CVs and letters.
 *  - resume     : the uploaded CV (PDF, DOCX, TXT, MD, HTML). Text is extracted and kept for tailoring.
 *  - jobPrefs   : JOB track targets: titles, industries, pay floors, locations.
 *  - pitchPrefs : PITCH track: the account's OWN agency, offer/packages, client floor and target industries.
 *
 * Saved sections override the app defaults for that account only (see applyUserPrefs). Regular users never see the
 * owner's (superuser's) profile, agency or packages: the Red Star Standard offer belongs to the superuser account.
 */
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { z } from "zod";
import { industries as defaultIndustries, titleFamilies as defaultFamilies, type Industry, type Package, type TitleFamily } from "@/config/profile";
import type { AppConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { allowsTrack } from "@/lib/tracks";
import type { Role, TrackAccess, UserProfile } from "@prisma/client";

// ---------------- helpers ----------------

/** Same folder as src/lib/pdf.ts (not imported here: this module is also loaded by the middleware). */
const STORAGE_DIR = path.join(process.cwd(), "storage");

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/** "a, b\nc" -> ["a","b","c"] (trimmed, de-duplicated case-insensitively, capped). */
export function splitList(raw: string, max = 40): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const v = part.trim().replace(/\s+/g, " ");
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v.slice(0, 120));
    if (out.length >= max) break;
  }
  return out;
}

const stripProto = (u: string) => u.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

/** Search terms per built-in title family (what the job boards are queried with). */
const PRESET_SEARCH: Record<string, string[]> = {
  "ai-automation": ["AI engineer", "automation engineer"],
  "transformation-lead": ["digital transformation"],
  fullstack: ["full stack developer", "software engineer"],
  "solutions-systems": ["solutions engineer"],
  platform: ["platform engineer"],
};

export const PRESET_FAMILIES = defaultFamilies;
export const PRESET_INDUSTRIES = defaultIndustries;

// ---------------- schemas ----------------

const money = (label: string, max: number) => z.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`).min(0, `${label} cannot be negative`).max(max, `${label} is too large`);

export const basicsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().min(6, "Enter a phone number").max(30),
  location: z.string().trim().min(2, "Enter where you are based").max(80),
  noticePeriod: z.string().trim().max(40),
  github: z.string().trim().max(120),
  linkedin: z.string().trim().max(120),
  portfolio: z.string().trim().max(120),
});
export type Basics = z.infer<typeof basicsSchema>;

export const jobPrefsSchema = z
  .object({
    titleKeys: z.array(z.string()),
    customTitles: z.array(z.string().max(80)).max(20),
    industryKeys: z.array(z.string()),
    customIndustries: z.array(z.string().max(160)).max(15),
    localMonthlyUsd: money("Local pay floor", 1_000_000),
    remoteMonthlyUsd: money("Remote pay floor", 1_000_000),
    acceptedLocations: z.array(z.string()).min(1, "Add at least one location you would work in"),
    abroadNeedsSponsorship: z.boolean(),
    excludedRegions: z.array(z.string()),
  })
  .refine((v) => v.titleKeys.length + v.customTitles.length > 0, { message: "Choose or add at least one job title", path: ["titleKeys"] });
export type JobPrefs = z.infer<typeof jobPrefsSchema>;

export const pitchPrefsSchema = z.object({
  agencyName: z.string().trim().min(2, "Enter your agency or business name").max(80),
  website: z.string().trim().max(160),
  tagline: z.string().trim().max(200),
  /** One line per package: Name | price KES | monthly KES | duration | summary */
  packages: z.array(z.string().max(400)).max(40),
  services: z.array(z.string().max(120)).max(60),
  clientFloorKes: money("Client budget floor", 1_000_000_000),
  terms: z.array(z.string().max(200)).max(10),
  foundingText: z.string().trim().max(240),
  foundingMax: money("Founding clients", 1000),
  industryKeys: z.array(z.string()),
  customIndustries: z.array(z.string().max(160)).max(15),
});
export type PitchPrefs = z.infer<typeof pitchPrefsSchema>;

export type ParsedPackage = Package;

/** "Name | 15000 | 5000 | 1 week | summary" -> Package, or an error message naming the line. */
export function parsePackageLine(line: string, clientFloorKes: number): ParsedPackage | { error: string } {
  const [name = "", price = "", monthly = "", duration = "", ...rest] = line.split("|").map((s) => s.trim());
  if (!name) return { error: `Package "${line.slice(0, 30)}": start with the package name` };
  const num = (s: string) => (s === "" ? 0 : Number(s.replace(/[,\s]|kes|ksh/gi, "")));
  const priceKes = num(price);
  const monthlyKes = num(monthly);
  if (!Number.isFinite(priceKes) || !Number.isFinite(monthlyKes) || priceKes < 0 || monthlyKes < 0) return { error: `Package "${name}": price and monthly fee must be numbers (KES)` };
  const kind: Package["kind"] = monthlyKes > 0 && priceKes > 0 && priceKes !== monthlyKes ? "setup+retainer" : monthlyKes > 0 || /monthly|retainer|\/mo/i.test(duration) ? "retainer" : "one-off";
  return {
    key: slugify(name),
    name,
    priceKes: priceKes || monthlyKes,
    ...(monthlyKes ? { monthlyKes } : {}),
    kind,
    duration: duration || "custom",
    summary: rest.join(" | ") || name,
    qualifies: priceKes >= clientFloorKes || monthlyKes > 0,
  };
}

/** Custom industry line "Label: kw1, kw2" (keywords optional; the label itself is a keyword). */
export function parseIndustryLine(line: string): Industry {
  const [labelRaw, kwRaw = ""] = line.split(":");
  const label = labelRaw.trim();
  const keywords = [...new Set([label.toLowerCase(), ...splitList(kwRaw).map((k) => k.toLowerCase())])];
  return { key: `custom-${slugify(label)}`, label, keywords };
}

// ---------------- form parsing (FormData -> validated section) ----------------

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => (str(f, k) === "" ? NaN : Number(str(f, k).replace(/,/g, "")));
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again";

export function parseBasics(f: FormData): { ok: Basics } | { error: string } {
  const r = basicsSchema.safeParse({
    fullName: str(f, "fullName"),
    phone: str(f, "phone"),
    location: str(f, "location"),
    noticePeriod: str(f, "noticePeriod"),
    github: stripProto(str(f, "github")),
    linkedin: stripProto(str(f, "linkedin")),
    portfolio: stripProto(str(f, "portfolio")),
  });
  return r.success ? { ok: r.data } : { error: issue(r.error) };
}

export function parseJobPrefs(f: FormData): { ok: JobPrefs } | { error: string } {
  const presetKeys = new Set(PRESET_FAMILIES.map((x) => x.key));
  const presetInd = new Set(PRESET_INDUSTRIES.map((x) => x.key));
  const r = jobPrefsSchema.safeParse({
    titleKeys: f.getAll("titleKeys").map(String).filter((k) => presetKeys.has(k)),
    customTitles: splitList(str(f, "customTitles"), 20),
    industryKeys: f.getAll("industryKeys").map(String).filter((k) => presetInd.has(k)),
    customIndustries: str(f, "customIndustries").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 15),
    localMonthlyUsd: num(f, "localMonthlyUsd"),
    remoteMonthlyUsd: num(f, "remoteMonthlyUsd"),
    acceptedLocations: splitList(str(f, "acceptedLocations")).map((s) => s.toLowerCase()),
    abroadNeedsSponsorship: f.get("abroadNeedsSponsorship") === "on",
    excludedRegions: splitList(str(f, "excludedRegions")).map((s) => s.toLowerCase()),
  });
  return r.success ? { ok: r.data } : { error: issue(r.error) };
}

export function parsePitchPrefs(f: FormData): { ok: PitchPrefs } | { error: string } {
  const presetInd = new Set(PRESET_INDUSTRIES.map((x) => x.key));
  const lines = (k: string, max: number) => str(f, k).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, max);
  const r = pitchPrefsSchema.safeParse({
    agencyName: str(f, "agencyName"),
    website: stripProto(str(f, "website")),
    tagline: str(f, "tagline"),
    packages: lines("packages", 40),
    services: splitList(str(f, "services"), 60),
    clientFloorKes: num(f, "clientFloorKes"),
    terms: lines("terms", 10),
    foundingText: str(f, "foundingText"),
    foundingMax: str(f, "foundingMax") === "" ? 0 : num(f, "foundingMax"),
    industryKeys: f.getAll("industryKeys").map(String).filter((k) => presetInd.has(k)),
    customIndustries: lines("customIndustries", 15),
  });
  if (!r.success) return { error: issue(r.error) };
  for (const line of r.data.packages) {
    const p = parsePackageLine(line, r.data.clientFloorKes);
    if ("error" in p) return { error: p.error };
  }
  if (!r.data.packages.length && !r.data.services.length) return { error: "List at least one service or priced package you sell" };
  return { ok: r.data };
}

// ---------------- applying a profile to the app config ----------------

type Who = { role: Role; email: string; name: string | null };
type Row = Pick<UserProfile, "basics" | "jobPrefs" | "pitchPrefs" | "basicsDoneAt" | "jobDoneAt" | "pitchDoneAt"> | null;

/** Owner-specific data is removed for regular users so nothing of the superuser's profile or agency leaks into their output. */
function neutral(base: AppConfig, who: Who): AppConfig {
  return {
    ...base,
    profile: { name: who.name ?? "", email: who.email, phone: "", location: "", links: { github: "", linkedin: "", blog: "", portfolio: "" }, noticePeriod: "", cvHtmlPath: "", coverLetterArchiveDir: "" },
    titleFamilies: [],
    industries: [],
    searchTerms: [],
    locations: { accepted: [], abroadNeedsSponsorship: true, excludedRegions: [] },
    payFloors: { ...base.payFloors, localMonthlyUsd: 0, remoteMonthlyUsd: 0 },
    company: { name: "", website: "", pricingUrl: "", tagline: "", terms: [], foundingOffer: { text: "", maxFoundingClients: 0 }, clientFloorKes: 0 },
    packages: [],
    serviceLines: {},
  };
}

function familiesFrom(p: JobPrefs): { families: TitleFamily[]; terms: string[] } {
  const families: TitleFamily[] = PRESET_FAMILIES.filter((f) => p.titleKeys.includes(f.key));
  const terms = families.flatMap((f) => PRESET_SEARCH[f.key] ?? [f.label]);
  for (const t of p.customTitles) {
    const lower = t.toLowerCase();
    const bare = lower.replace(/^(senior|sr\.?|junior|jr\.?|lead|principal|staff|head of)\s+/, "");
    families.push({ key: `custom-${slugify(t)}`, label: t, keywords: [...new Set([lower, bare])], weight: 1 });
    terms.push(t);
  }
  return { families, terms: [...new Set(terms)] };
}

const industriesFrom = (keys: string[], custom: string[]): Industry[] => [...PRESET_INDUSTRIES.filter((i) => keys.includes(i.key)), ...custom.filter((l) => l.trim()).map(parseIndustryLine)];

/** The app config as seen by one account: global defaults, minus the owner's data for regular users, plus the saved sections. */
export function applyUserPrefs(base: AppConfig, who: Who, row: Row): AppConfig {
  let c: AppConfig = who.role === "USER" ? neutral(base, who) : { ...base, profile: { ...base.profile } };
  if (!row) return c;
  const industries: Industry[] = [];

  if (row.basicsDoneAt && row.basics) {
    const b = row.basics as Basics;
    c = { ...c, profile: { ...c.profile, name: b.fullName, email: who.email, phone: b.phone, location: b.location, noticePeriod: b.noticePeriod, links: { ...c.profile.links, github: b.github, linkedin: b.linkedin, portfolio: b.portfolio } } };
  }
  if (row.jobDoneAt && row.jobPrefs) {
    const p = row.jobPrefs as JobPrefs;
    const { families, terms } = familiesFrom(p);
    industries.push(...industriesFrom(p.industryKeys, p.customIndustries));
    c = {
      ...c,
      titleFamilies: families,
      searchTerms: terms,
      payFloors: { ...c.payFloors, localMonthlyUsd: p.localMonthlyUsd, remoteMonthlyUsd: p.remoteMonthlyUsd },
      locations: { accepted: p.acceptedLocations, abroadNeedsSponsorship: p.abroadNeedsSponsorship, excludedRegions: p.excludedRegions },
    };
  }
  if (row.pitchDoneAt && row.pitchPrefs) {
    const p = row.pitchPrefs as PitchPrefs;
    industries.push(...industriesFrom(p.industryKeys, p.customIndustries));
    const packages = p.packages.map((l) => parsePackageLine(l, p.clientFloorKes)).filter((x): x is Package => !("error" in x));
    const site = p.website ? (/^https?:/i.test(p.website) ? p.website : `https://${p.website}`) : "";
    c = {
      ...c,
      company: {
        name: p.agencyName,
        website: site,
        pricingUrl: site,
        tagline: p.tagline,
        terms: p.terms,
        foundingOffer: { text: p.foundingText, maxFoundingClients: p.foundingText ? p.foundingMax : 0 },
        clientFloorKes: p.clientFloorKes,
      },
      packages,
      serviceLines: p.services.length ? { "Services we offer": p.services } : {},
    };
  }
  if (industries.length) {
    const seen = new Set<string>();
    c = { ...c, industries: industries.filter((i) => !seen.has(i.key) && seen.add(i.key)) };
  }
  return c;
}

// ---------------- onboarding state ----------------

export type Step = "basics" | "resume" | "job" | "pitch";

/** Steps still missing for this account, in the order they are asked. */
export function missingSteps(access: TrackAccess, row: Pick<UserProfile, "basicsDoneAt" | "jobDoneAt" | "pitchDoneAt" | "resumeText"> | null): Step[] {
  const out: Step[] = [];
  if (!row?.basicsDoneAt) out.push("basics");
  if (allowsTrack(access, "JOB") && !row?.resumeText) out.push("resume");
  if (allowsTrack(access, "JOB") && !row?.jobDoneAt) out.push("job");
  if (allowsTrack(access, "PITCH") && !row?.pitchDoneAt) out.push("pitch");
  return out;
}

export const getProfile = (userId: string) => db.userProfile.findUnique({ where: { userId } });

/** Regular users must finish every step for their tracks before using the workspace; the owner is never forced. */
export async function onboardingSteps(user: { id: string; role: Role; trackAccess: TrackAccess }): Promise<Step[]> {
  if (user.role === "SUPERUSER") return [];
  return missingSteps(user.trackAccess, await getProfile(user.id));
}

// ---------------- saving ----------------

type Section = "basics" | "jobPrefs" | "pitchPrefs";
const DONE = { basics: "basicsDoneAt", jobPrefs: "jobDoneAt", pitchPrefs: "pitchDoneAt" } as const;

export async function saveSection(userId: string, section: Section, value: Basics | JobPrefs | PitchPrefs) {
  const data = { [section]: value as object, [DONE[section]]: new Date() };
  await db.userProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

// ---------------- resume ----------------

export const RESUME_MAX_BYTES = 4 * 1024 * 1024;
const RESUME_EXT = [".pdf", ".docx", ".txt", ".md", ".html", ".htm"];
export const RESUME_ACCEPT = RESUME_EXT.join(",");

/** Plain text from an uploaded resume. Throws a readable error for unsupported or empty (e.g. scanned) files. */
export async function extractResumeText(buf: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (!RESUME_EXT.includes(ext)) throw new Error("Upload a PDF, Word (.docx), text, Markdown or HTML file.");
  let text = "";
  if (ext === ".pdf") {
    if (buf.subarray(0, 5).toString() !== "%PDF-") throw new Error("That file is not a valid PDF.");
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    text = (await extractText(pdf, { mergePages: true })).text;
  } else if (ext === ".docx") {
    const mammoth = await import("mammoth");
    try {
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } catch {
      throw new Error("That file is not a valid Word (.docx) document.");
    }
  } else if (ext === ".html" || ext === ".htm") {
    const $ = cheerio.load(buf.toString("utf8"));
    $("script,style,noscript").remove();
    text = $("body").text();
  } else {
    text = buf.toString("utf8");
  }
  text = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 150) throw new Error("Could not read enough text from that file (scanned image PDFs are not supported). Upload a text-based PDF, Word or text file.");
  return text.slice(0, 60_000);
}

export const resumeDir = (userId: string) => path.join(STORAGE_DIR, "resumes", userId);

/** Validate, extract and store a resume, replacing the previous one. */
export async function saveResume(userId: string, file: { name: string; type: string; bytes: Buffer }) {
  if (!file.bytes.length) throw new Error("Choose a resume file to upload.");
  if (file.bytes.length > RESUME_MAX_BYTES) throw new Error("That file is too large (4 MB maximum).");
  const text = await extractResumeText(file.bytes, file.name);
  const ext = path.extname(file.name).toLowerCase();
  const dir = resumeDir(userId);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  const stored = `resume${ext}`;
  await fs.writeFile(path.join(dir, stored), file.bytes);
  const data = { resumeName: path.basename(file.name).slice(0, 120), resumePath: `resumes/${userId}/${stored}`, resumeMime: file.type || null, resumeText: text, resumeUpdatedAt: new Date() };
  await db.userProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { chars: text.length };
}

export async function removeResume(userId: string) {
  await fs.rm(resumeDir(userId), { recursive: true, force: true });
  await db.userProfile.updateMany({ where: { userId }, data: { resumeName: null, resumePath: null, resumeMime: null, resumeText: null, resumeUpdatedAt: null } });
}

// ---------------- form defaults ----------------

/** Values to prefill the forms: what the account saved, else the app config (the owner) or blanks (regular users). */
export function formDefaults(base: AppConfig, who: Who, row: Row) {
  const c = applyUserPrefs(base, who, row);
  const isOwner = who.role === "SUPERUSER";
  const basics: Basics = (row?.basics as Basics | null) ?? {
    fullName: c.profile.name || "",
    phone: c.profile.phone,
    location: c.profile.location,
    noticePeriod: c.profile.noticePeriod,
    github: c.profile.links.github,
    linkedin: c.profile.links.linkedin,
    portfolio: c.profile.links.portfolio,
  };
  const job: JobPrefs = (row?.jobPrefs as JobPrefs | null) ?? {
    titleKeys: isOwner ? c.titleFamilies.map((f) => f.key) : [],
    customTitles: [],
    industryKeys: isOwner ? c.industries.map((i) => i.key) : [],
    customIndustries: [],
    localMonthlyUsd: isOwner ? c.payFloors.localMonthlyUsd : NaN,
    remoteMonthlyUsd: isOwner ? c.payFloors.remoteMonthlyUsd : NaN,
    acceptedLocations: (isOwner ? c.locations.accepted : base.locations.accepted) as string[],
    abroadNeedsSponsorship: base.locations.abroadNeedsSponsorship,
    excludedRegions: base.locations.excludedRegions,
  };
  const pitch: PitchPrefs = (row?.pitchPrefs as PitchPrefs | null) ?? {
    agencyName: c.company.name,
    website: c.company.website.replace(/^https?:\/\//, ""),
    tagline: c.company.tagline,
    packages: c.packages.map((p) => [p.name, p.priceKes, p.monthlyKes ?? "", p.duration, p.summary].join(" | ")),
    services: Object.values(c.serviceLines).flat(),
    clientFloorKes: isOwner ? c.company.clientFloorKes : NaN,
    terms: c.company.terms,
    foundingText: c.company.foundingOffer.text,
    foundingMax: c.company.foundingOffer.maxFoundingClients,
    industryKeys: isOwner ? c.industries.map((i) => i.key) : [],
    customIndustries: [],
  };
  return { basics, job, pitch };
}
