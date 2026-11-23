import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

export type PdfBlock =
  | { kind: "columns"; title: string; items: { label: string; value: number }[]; labelEvery?: number }
  | { kind: "bars"; title: string; items: { label: string; value: number }[] }
  | { kind: "table"; title: string; head: string[]; rows: (string | number)[][]; widths?: number[] };

const W = 595;
const H = 842;
const M = 40;
const INK = rgb(0.07, 0.07, 0.09);
const MUTED = rgb(0.42, 0.45, 0.5);
const BAR = rgb(0.94, 0.3, 0.14);
const RULE = rgb(0.88, 0.9, 0.92);

// Standard PDF fonts only cover WinAnsi, so replace anything else rather than failing.
const clean = (v: unknown) => String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7e -ÿ]/g, "?");

/** Render a simple report (title, subtitle, then charts and tables) to PDF bytes. */
export async function buildPdf(title: string, subtitle: string, blocks: PdfBlock[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const fit = (t: string, f: PDFFont, size: number, max: number) => {
    let s = clean(t);
    while (s.length > 1 && f.widthOfTextAtSize(s, size) > max) s = s.slice(0, -1);
    return s === clean(t) ? s : `${s.slice(0, -1)}...`;
  };
  const need = (h: number) => {
    if (y - h < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };

  page.drawText(clean(title), { x: M, y: y - 16, size: 20, font: bold, color: INK });
  page.drawText(clean(subtitle), { x: M, y: y - 34, size: 9, font, color: MUTED });
  y -= 56;

  for (const b of blocks) {
    need(60);
    page.drawText(clean(b.title), { x: M, y: y - 12, size: 12, font: bold, color: INK });
    y -= 26;

    if (b.kind === "columns") {
      const h = 130;
      need(h + 24);
      const max = Math.max(1, ...b.items.map((i) => i.value));
      const gap = 1.5;
      const bw = Math.max(1, (W - 2 * M - gap * (b.items.length - 1)) / Math.max(1, b.items.length));
      const base = y - h;
      page.drawLine({ start: { x: M, y: base }, end: { x: W - M, y: base }, thickness: 0.5, color: RULE });
      b.items.forEach((it, i) => {
        const bh = it.value ? Math.max(2, (it.value / max) * (h - 12)) : 0.8;
        const x = M + i * (bw + gap);
        page.drawRectangle({ x, y: base, width: bw, height: bh, color: it.value ? BAR : RULE });
      });
      const every = b.labelEvery ?? Math.max(1, Math.ceil(b.items.length / 8));
      b.items.forEach((it, i) => {
        if (i % every === 0) page.drawText(clean(it.label), { x: M + i * (bw + gap), y: base - 11, size: 7, font, color: MUTED });
      });
      page.drawText(`peak ${max}`, { x: W - M - 40, y: y - 2, size: 8, font, color: MUTED });
      y = base - 30;
    } else if (b.kind === "bars") {
      const max = Math.max(1, ...b.items.map((i) => i.value));
      for (const it of b.items) {
        need(18);
        page.drawText(fit(it.label, font, 9, 170), { x: M, y: y - 9, size: 9, font, color: INK });
        const bw = Math.max(1, (it.value / max) * 280);
        page.drawRectangle({ x: M + 180, y: y - 10, width: bw, height: 9, color: BAR });
        page.drawText(String(it.value), { x: M + 188 + bw, y: y - 9, size: 9, font, color: MUTED });
        y -= 17;
      }
      y -= 10;
    } else {
      const cols = b.head.length;
      const widths = b.widths ?? b.head.map(() => (W - 2 * M) / cols);
      const row = (cells: (string | number)[], f: PDFFont, color: typeof INK) => {
        need(16);
        let x = M;
        cells.forEach((c, i) => {
          page.drawText(fit(String(c), f, 8, widths[i] - 6), { x, y: y - 9, size: 8, font: f, color });
          x += widths[i];
        });
        y -= 15;
        page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: 0.4, color: RULE });
      };
      row(b.head, bold, MUTED);
      if (b.rows.length === 0) row(["No data in this period."], font, MUTED);
      for (const r of b.rows) {
        if (y - 16 < M) {
          page = doc.addPage([W, H]);
          y = H - M;
          row(b.head, bold, MUTED);
        }
        row(r, font, INK);
      }
      y -= 12;
    }
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - M - 60, y: 20, size: 7, font, color: MUTED }));
  return doc.save();
}
