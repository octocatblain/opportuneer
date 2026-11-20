import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { z } from "zod";

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
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
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

// ---------- OpenAI ----------
const openai: AIProvider = {
  name: "openai",
  available: () => Boolean(process.env.OPENAI_API_KEY),
  async generate({ system, prompt, maxTokens = 32000 }) {
    const client = new OpenAI();
    const res = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5",
      instructions: system,
      input: prompt,
      max_output_tokens: maxTokens,
    });
    if (!res.output_text) throw new Error("OpenAI returned no text");
    return res.output_text;
  },
};

// ---------- Mock (no keys yet) ----------
const mock: AIProvider = {
  name: "mock",
  available: () => true,
  async generate({ prompt }) {
    return JSON.stringify({
      _mock: true,
      note: "No AI key configured. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env to get real drafts.",
      promptPreview: prompt.slice(0, 200),
    });
  },
};

const registry: Record<string, AIProvider> = { claude, openai };

/** Providers in the order set by AI_PROVIDERS (default: claude, then openai). */
export function providerChain(): AIProvider[] {
  const order = (process.env.AI_PROVIDERS || "claude,openai")
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
      return { text: await p.generate(opts), provider: p.name };
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
      const text = await p.generate({ ...opts, system });
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
    order: providerChain().map((p) => p.name),
    claudeModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    openaiModel: process.env.OPENAI_MODEL || "gpt-5",
  };
}
