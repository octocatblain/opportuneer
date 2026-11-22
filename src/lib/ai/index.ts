import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import { cfg } from "@/lib/config";

export type GenerateOptions = {
  system: string;
  prompt: string;
  /** Rough size of the answer. */
  maxTokens?: number;
  /** How hard the model should think (Claude effort). */
  effort?: "low" | "medium" | "high";
};

export interface AIProvider {
  name: string;
  available(): boolean;
  generate(opts: GenerateOptions): Promise<string>;
}

// ---------- Claude ----------
const claude: AIProvider = {
  name: "claude",
  available: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generate({ system, prompt, maxTokens = 32000, effort = "high" }) {
    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model: claudeModel(effort),
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("Claude declined this request");
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");
    if (!text) throw new Error(`Claude returned no text (stop_reason: ${msg.stop_reason})`);
    return text;
  },
};

const CLAUDE_DEFAULT_MODEL = "claude-sonnet-5-5";
/** ANTHROPIC_MODEL for everything; ANTHROPIC_PREMIUM_MODEL (optional) for the high-effort writing tasks (CV, cover letter, pitch, proposal). */
function claudeModel(effort: GenerateOptions["effort"]) {
  const base = process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL;
  return effort === "high" ? process.env.ANTHROPIC_PREMIUM_MODEL || base : base;
}

// ---------- OpenAI ----------
const openai: AIProvider = {
  name: "openai",
  available: () => Boolean(process.env.OPENAI_API_KEY),
  async generate({ system, prompt, maxTokens = 32000 }) {
    const client = new OpenAI();
    const res = await client.responses.create({
      model: cfg().ai.openaiModel,
      instructions: system,
      input: prompt,
      max_output_tokens: maxTokens,
    });
    if (!res.output_text) throw new Error("OpenAI returned no text");
    return res.output_text;
  },
};

// ---------- Gemini (free tier available via Google AI Studio) ----------
const gemini: AIProvider = {
  name: "gemini",
  available: () => Boolean(process.env.GEMINI_API_KEY),
  async generate({ system, prompt, maxTokens = 32000 }) {
    // v1beta: the "-latest" aliases (e.g. gemini-flash-latest) and preview models only exist there, not on v1.
    // The timeout stops a request to an overloaded model from hanging; long CV/proposal writes still fit in it.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: "v1beta", httpOptions: { timeout: 120_000 } });
    // The free tier often returns 503 "high demand" on the bigger models, so try each model in GEMINI_MODEL in turn.
    const errors: string[] = [];
    for (const model of geminiModels()) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: system, maxOutputTokens: maxTokens },
        });
        if (!res.text) throw new Error(`returned no text (${res.candidates?.[0]?.finishReason ?? "unknown reason"})`);
        return res.text;
      } catch (e) {
        errors.push(`${model}: ${(e as Error).message.slice(0, 200)}`);
      }
    }
    throw new Error(errors.join(" | "));
  },
};

const GEMINI_DEFAULT_MODELS = "gemini-flash-latest,gemini-3.8-flash,gemini-flash-lite-latest";
function geminiModels() {
  return (process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODELS).split(",").map((m) => m.trim()).filter(Boolean);
}

// ---------- Mock (no keys yet) ----------
const mock: AIProvider = {
  name: "mock",
  available: () => true,
  async generate({ prompt }) {
    return JSON.stringify({
      _mock: true,
      note: "No AI key configured. Add GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY to .env to get real drafts.",
      promptPreview: prompt.slice(0, 200),
    });
  },
};

// ---------- Daily cap on paid calls ----------
// Claude and OpenAI bill per call; this stops a runaway scan or retry loop from spending all day.
// Counts are kept in storage/ai-usage.json so the web app and the `npm run scan` task share them.
const PAID = new Set(["claude", "openai"]);
const USAGE_FILE = path.join(process.cwd(), "storage", "ai-usage.json");
type Usage = { date: string; calls: Record<string, number> };

function today() {
  return new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
}
function readUsage(): Usage {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8")) as Usage;
    if (u.date === today() && u.calls) return u;
  } catch {
    // missing or unreadable file: start a fresh day
  }
  return { date: today(), calls: {} };
}
function dailyPaidLimit() {
  const n = Number(process.env.AI_DAILY_PAID_CALL_LIMIT || 60);
  return Number.isFinite(n) && n >= 0 ? n : 60;
}
function paidCallsToday(u = readUsage()) {
  return Object.entries(u.calls).reduce((sum, [k, v]) => sum + (PAID.has(k) ? v : 0), 0);
}
function recordCall(provider: string) {
  const u = readUsage();
  u.calls[provider] = (u.calls[provider] ?? 0) + 1;
  try {
    fs.mkdirSync(path.dirname(USAGE_FILE), { recursive: true });
    fs.writeFileSync(USAGE_FILE, JSON.stringify(u, null, 2));
  } catch {
    // usage tracking must never break generation
  }
}

/** Runs one provider call, refusing paid providers once today's cap is reached. */
async function callProvider(p: AIProvider, opts: GenerateOptions): Promise<string> {
  if (PAID.has(p.name)) {
    const limit = dailyPaidLimit();
    if (paidCallsToday() >= limit) throw new Error(`daily paid-call limit reached (${limit}); raise AI_DAILY_PAID_CALL_LIMIT in .env`);
    recordCall(p.name); // counted before the call: a failed request may still be billed
  }
  return p.generate(opts);
}

const registry: Record<string, AIProvider> = { claude, openai, gemini };

/** Providers in the order set by AI_PROVIDERS (default: claude, then openai, then gemini). */
export function providerChain(): AIProvider[] {
  const order = (process.env.AI_PROVIDERS || "claude,openai,gemini")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const chain = order.map((n) => registry[n]).filter((p): p is AIProvider => Boolean(p?.available()));
  return chain.length ? chain : [mock];
}

export async function generateText(opts: GenerateOptions): Promise<{ text: string; provider: string }> {
  const errors: string[] = [];
  for (const p of providerChain()) {
    try {
      return { text: await callProvider(p, opts), provider: p.name };
    } catch (e) {
      errors.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new Error(`All AI providers failed. ${errors.join(" | ")}`);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  if (start < 0 || end < start) throw new Error("No JSON found in AI response");
  return JSON.parse(body.slice(start, end + 1));
}

/** Ask for JSON matching `schema`. Retries once with the next provider on a bad shape. */
export async function generateJson<T>(
  schema: z.ZodType<T>,
  opts: GenerateOptions,
): Promise<{ data: T; provider: string; mock: boolean }> {
  const system = `${opts.system}\n\nReply with a single JSON object only. No prose before or after it.`;
  const errors: string[] = [];
  for (const p of providerChain()) {
    try {
      const text = await callProvider(p, { ...opts, system });
      if (p.name === "mock") return { data: extractJson(text) as T, provider: "mock", mock: true };
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return { data: parsed.data, provider: p.name, mock: false };
      errors.push(`${p.name}: ${parsed.error.message.slice(0, 300)}`);
    } catch (e) {
      errors.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new Error(`AI could not produce valid output. ${errors.join(" | ")}`);
}

export function aiStatus() {
  return {
    claude: claude.available(),
    openai: openai.available(),
    gemini: gemini.available(),
    order: providerChain().map((p) => p.name),
    claudeModel: process.env.ANTHROPIC_MODEL || CLAUDE_DEFAULT_MODEL,
    claudePremiumModel: process.env.ANTHROPIC_PREMIUM_MODEL || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5",
    geminiModel: geminiModels().join(", "),
    paidCallsToday: paidCallsToday(),
    paidCallLimit: dailyPaidLimit(),
  };
}
