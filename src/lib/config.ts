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
import { db } from "@/lib/db";

export type AppConfig = {
  profile: typeof profile;
  fx: { kesPerUsd: number };
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
};

/** Seed defaults. Non-secret env values seed the ai/gmail sections; API keys stay in .env. */
export function defaultConfig(): AppConfig {
  return structuredClone({
    profile,
    fx: { kesPerUsd: KES_PER_USD },
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
  });
}

export type ConfigSection = keyof AppConfig;
export const CONFIG_SECTIONS = Object.keys(defaultConfig()) as ConfigSection[];

const PREFIX = "config:";
const TTL_MS = 5000;
const g = globalThis as unknown as { __cfg?: { value: AppConfig; at: number } };

/** Current config (cache, or defaults before the first load). */
export function cfg(): AppConfig {
  return g.__cfg?.value ?? defaultConfig();
}

/** Refresh the cache from the database, seeding any missing section from the defaults. */
export async function loadConfig(force = false): Promise<AppConfig> {
  if (!force && g.__cfg && Date.now() - g.__cfg.at < TTL_MS) return g.__cfg.value;
  const defaults = defaultConfig();
  const rows = await db.setting.findMany({ where: { key: { startsWith: PREFIX } } });
  const stored = new Map(rows.map((r) => [r.key.slice(PREFIX.length), r.value]));
  const value = { ...defaults } as Record<string, unknown>;
  for (const section of CONFIG_SECTIONS) {
    if (stored.has(section)) value[section] = stored.get(section);
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
