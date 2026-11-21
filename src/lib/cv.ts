import fs from "node:fs/promises";
import * as cheerio from "cheerio";
import { cfg, loadConfig } from "@/lib/config";

export async function loadCvHtml(): Promise<string> {
  await loadConfig();
  return fs.readFile(cfg().profile.cvHtmlPath, "utf8");
}

/** Split the master CV into its <head> (styles) and <body> so the AI only edits content. */
export async function loadCvParts() {
  const html = await loadCvHtml();
  const $ = cheerio.load(html);
  return {
    head: $("head").html() ?? "",
    body: $("body").html() ?? "",
    text: $("body").text().replace(/\s+/g, " ").trim(),
  };
}

export function assembleHtml(head: string, body: string) {
  return `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
}

/** Pull the HTML body out of a model answer (handles ```html fences or a full document). */
export function extractBody(answer: string): string {
  const fenced = answer.match(/```(?:html)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : answer;
  if (/<body[\s>]/i.test(raw)) {
    const $ = cheerio.load(raw);
    return $("body").html() ?? raw;
  }
  return raw.trim();
}

export function htmlToText(html: string) {
  const $ = cheerio.load(html);
  $("script,style,noscript,nav,footer,header svg").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
