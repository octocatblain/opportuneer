import fs from "node:fs/promises";
import * as cheerio from "cheerio";
import { cfg, loadConfig } from "@/lib/config";
import { getProfile } from "@/lib/kyc";

/** Stylesheet for CVs built from an uploaded resume (no master HTML template). A4, two pages max. */
const DEFAULT_HEAD = `<meta charset="utf-8"><style>
@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.4;color:#1a1a1a;margin:0}
h1{font-size:20pt;margin:0 0 2px}.role{font-size:11.5pt;color:#444;margin:0 0 4px}.contact{font-size:9.5pt;color:#555;margin:0 0 10px}
h2{font-size:11pt;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #999;padding-bottom:2px;margin:14px 0 6px}
h3{font-size:10.5pt;margin:8px 0 1px}.meta{color:#555;font-size:9.5pt;margin:0 0 3px}ul{margin:2px 0 6px;padding-left:18px}li{margin:1px 0}p{margin:3px 0}
</style>`;

export type CvParts = { head: string; body: string; text: string; format: "html" | "text" };

/**
 * The master CV for an account. The owner's HTML template is used when it exists on disk; everyone else
 * (and the owner without a template) gets their uploaded resume as plain text plus the default stylesheet.
 */
export async function loadCvParts(userId?: string): Promise<CvParts> {
  await loadConfig();
  const file = cfg().profile.cvHtmlPath;
  if (file) {
    try {
      const html = await fs.readFile(file, "utf8");
      const $ = cheerio.load(html);
      return { head: $("head").html() ?? "", body: $("body").html() ?? "", text: $("body").text().replace(/\s+/g, " ").trim(), format: "html" };
    } catch {
      /* no template on disk: fall through to the uploaded resume */
    }
  }
  const row = userId ? await getProfile(userId) : null;
  if (!row?.resumeText) throw new Error("Upload your resume first (Profile → Resume), so applications can be tailored from it.");
  const esc = row.resumeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return { head: DEFAULT_HEAD, body: `<div class="resume-source"><pre>${esc}</pre></div>`, text: row.resumeText, format: "text" };
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
