import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

export const STORAGE_DIR = path.join(process.cwd(), "storage");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

function browserPath() {
  const found = CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error("No Chrome or Edge found. Set CHROME_PATH in .env.");
  return found;
}

/** Render HTML to an A4 PDF. Returns the path relative to /storage. */
export async function htmlToPdf(html: string, relPath: string): Promise<string> {
  const out = path.join(STORAGE_DIR, relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const browser = await puppeteer.launch({ executablePath: browserPath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
  return relPath.replace(/\\/g, "/");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Simple letter layout matching the CV's colours. */
export function letterHtml(opts: { from: string[]; date: string; to?: string[]; subject: string; body: string }) {
  const paras = opts.body
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 20mm 20mm 18mm; }
body { font-family: Lato, Calibri, "Segoe UI", sans-serif; font-size: 10.8pt; line-height: 1.5; color: #1f2328; }
.from { text-align: right; color: #5b6470; font-size: 9.6pt; margin-bottom: 14pt; }
.from b { color: #1f3a63; font-size: 13pt; display: block; }
.subject { font-weight: 700; color: #1f3a63; margin: 12pt 0; }
p { margin: 0 0 9pt; }
</style></head><body>
<div class="from"><b>${esc(opts.from[0])}</b>${opts.from.slice(1).map(esc).join("<br>")}</div>
<div>${esc(opts.date)}</div>
${opts.to?.length ? `<div style="margin-top:8pt">${opts.to.map(esc).join("<br>")}</div>` : ""}
<div class="subject">${esc(opts.subject)}</div>
${paras}
</body></html>`;
}

/** Minimal Markdown → HTML for proposals (headings, lists, bold, paragraphs). */
export function markdownHtml(md: string, title: string) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let inList = false;
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
  for (const line of lines) {
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inline(li[1])}</li>`;
      continue;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page { size: A4; margin: 18mm; }
body { font-family: Lato, Calibri, "Segoe UI", sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1f2328; }
h1 { color: #b3121b; font-size: 18pt; margin: 0 0 6pt; } h2 { color: #1f3a63; font-size: 12pt; border-bottom: 1px solid #c9d2de; padding-bottom: 2pt; margin-top: 14pt; }
h3 { font-size: 11pt; margin: 10pt 0 4pt; } ul { padding-left: 16pt; } p { margin: 0 0 6pt; }
</style></head><body>${html}</body></html>`;
}
