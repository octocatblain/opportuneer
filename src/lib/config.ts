/**
 * Database-driven configuration.
 *
 * Every tunable parameter lives in the `Setting` table under the key `config:<section>`.
 * src/config/profile.ts (and a few .env values) are only the SEED DEFAULTS: the first time a
 * section is missing from the database it is written from those defaults. After that the
 * database wins, and sections are edited from the Settings page.
 *
 * `cfg()` is synchronous (reads an in-memory cache). Async entry points call `await loadConfig()`
 * first, which refreshes the cache from the database (cheap; cached for a few seconds).
 */
import {
  company,
  industries,
  KES_PER_USD,
  locations,
  PER_USD,
  scoring,
  lowMaturityKeywords,
  packages,
  payFloors,
  profile,
  searchTerms,
  serviceLines,
  techCompanyKeywords,
  titleFamilies,
  type Industry,
  type Package,
  type TitleFamily,
} from "@/config/profile";
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "@/lib/db";
import { applyUserPrefs } from "@/lib/kyc";

export type AppConfig = {
  profile: typeof profile;
  fx: { kesPerUsd: number; perUsd: Record<string, number> };
  /** Scoring signals that only suit an AI-services business; off for accounts that did not opt in. */
  scoring: { lateAiAdopter: boolean; pitchAiMaturity: boolean };
  payFloors: typeof payFloors;
  locations: typeof locations;
  titleFamilies: TitleFamily[];
  industries: Industry[];
  lowMaturityKeywords: string[];
  techCompanyKeywords: string[];
  company: typeof company;
  packages: Package[];
  serviceLines: Record<string, string[]>;
  searchTerms: string[];
  ai: { providers: string; claudeModel: string; openaiModel: string; geminiModel: string };
  gmail: { account: string };
  auth: { allowedEmails: string[]; sessionDays: number; allowPassword: boolean; allowGoogle: boolean };
  /** Usage limits for regular users (the superuser is never limited). Costs are in credits; costKes is our estimated provider cost per action. */
  credits: {
    enabled: boolean;
    signupGrant: number; // credits given when an invite is accepted
    costs: Record<string, number>;
    costKes: Record<string, number>;
    monthlyCaps: { JOB: number; PITCH: number }; // max charged actions per calendar month, per track (0 = unlimited)
    dailyLimit: number; // max AI actions per user per day (0 = unlimited)
    perMinute: number; // max AI actions per user per minute, against double-clicks and scripts (0 = unlimited)
    /** Global monthly spend guard on estimated provider cost (KES). 0 disables a threshold. */
    killSwitch: { alertKes: number; pauseKes: number };
  };
};

/** Seed defaults. Non-secret env values seed the ai/gmail sections; API keys stay in .env. */
export function defaultConfig(): AppConfig {
  return structuredClone({
    profile,
    fx: { kesPerUsd: KES_PER_USD, perUsd: PER_USD },
    scoring,
    payFloors,
    locations,
    titleFamilies,
    industries,
    lowMaturityKeywords,
    techCompanyKeywords,
    company,
    packages,
    serviceLines,
    searchTerms,
    ai: {
      providers: process.env.AI_PROVIDERS || "claude,openai,gemini",
      claudeModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      openaiModel: process.env.OPENAI_MODEL || "gpt-5",
      geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
    },
    gmail: { account: process.env.GMAIL_ACCOUNT || profile.email },
    // Who may sign in. The very first account ever created is always allowed and becomes the owner.
    auth: { allowedEmails: [profile.email], sessionDays: 30, allowPassword: true, allowGoogle: true },
    credits: {
      enabled: true,
      signupGrant: 50,
      costs: { application: 5, import: 1, pitch: 6, research: 2, followup: 1 },
      costKes: { application: 25, import: 5, pitch: 30, research: 10, followup: 5 },
      monthlyCaps: { JOB: 60, PITCH: 40 },
      dailyLimit: 30,
      perMinute: 8,
      killSwitch: { alertKes: 6000, pauseKes: 8000 },
    },
  });
}

export type ConfigSection = keyof AppConfig;
export const CONFIG_SECTIONS = Object.keys(defaultConfig()) as ConfigSection[];

const PREFIX = "config:";
const TTL_MS = 5000;
const g = globalThis as unknown as { __cfg?: { value: AppConfig; at: number } };

/** Current config (cache, or defaults before the first load). */
export function cfg(): AppConfig {
  return scope.getStore()?.value ?? g.__cfg?.value ?? defaultConfig();
}

/**
 * Per-account configuration. Inside runForUser(), cfg() returns the app config as that account sees it
 * (their saved KYC profile applied; regular users never see the owner's profile or agency).
 */
const scope = new AsyncLocalStorage<{ userId: string; value: AppConfig }>();

/** The config for one account (global defaults + that account's saved profile sections). */
export async function loadUserConfig(userId: string): Promise<AppConfig> {
  const base = await loadConfig();
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, email: true, name: true, kyc: true } });
  return user ? applyUserPrefs(base, user, user.kyc) : base;
}

/** Run fn with cfg() resolved for this account. Re-entrant: nested calls for the same account reuse the scope. */
export async function runForUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  if (scope.getStore()?.userId === userId) return fn();
  const value = await loadUserConfig(userId);
  return scope.run({ userId, value }, fn);
}

/** Refresh the cache from the database, seeding any missing section from the defaults. */
export async function loadConfig(force = false): Promise<AppConfig> {
  if (!force && g.__cfg && Date.now() - g.__cfg.at < TTL_MS) return g.__cfg.value;
  const defaults = defaultConfig();
  const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } } });
  const stored = new Map(rows.map((r) => [r.key.slice(PREFIX.length), r.value]));
  const value = { ...defaults } as Record<string, unknown>;
  for (const section of CONFIG_SECTIONS) {
    if (stored.has(section)) {
      const s = stored.get(section);
      const d = defaults[section] as unknown;
      // A section saved before a field existed picks up that field's default (top level only; stored values always win).
      const plain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
      value[section] = plain(d) && plain(s) ? { ...d, ...s } : s;
    }
    else await db.setting.create({ data: { key: PREFIX + section, value: defaults[section] as object } }).catch(() => {});
  }
  g.__cfg = { value: value as AppConfig, at: Date.now() };
  return g.__cfg.value;
}

/** Validate (type must match the default) and save one section. Throws a readable error. */
export async function saveConfigSection(section: string, json: string) {
  if (!(CONFIG_SECTIONS as string[]).includes(section)) throw new Error(`Unknown section "${section}"`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const def = defaultConfig()[section as ConfigSection] as unknown;
  if (Array.isArray(def) !== Array.isArray(parsed) || typeof def !== typeof parsed || parsed === null) {
    throw new Error(`"${section}" must be a ${Array.isArray(def) ? "list" : typeof def}`);
  }
  if (!Array.isArray(def) && typeof def === "object") {
    const missing = Object.keys(def as object).filter((k) => !(k in (parsed as object)));
    if (missing.length) throw new Error(`Missing field(s): ${missing.join(", ")}`);
  }
  await db.setting.upsert({ where: { key: PREFIX + section }, create: { key: PREFIX + section, value: parsed as object }, update: { value: parsed as object } });
  await loadConfig(true);
}

export async function resetConfigSection(section: string) {
  if (!(CONFIG_SECTIONS as string[]).includes(section)) throw new Error(`Unknown section "${section}"`);
  await saveConfigSection(section, JSON.stringify(defaultConfig()[section as ConfigSection]));
}
