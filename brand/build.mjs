// Generates every Opportuneer brand asset (SVG sources + PNG/ICO exports) into this folder.
// Run from apps/opportuneer:  node brand/build.mjs
// Artwork matches src/lib/brand.ts (64x64 mark grid) and the Wordmark in src/components/brand-mark.tsx.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const INK = "#0e1014";
const SIGNAL = "#ef4b23";
const WHITE = "#ffffff";
const CANVAS = "#eef1f4";
const SPARK = "M46 6 Q46 18 58 18 Q46 18 46 30 Q46 18 34 18 Q46 18 46 6 Z";
const FONT = "'Inter Tight', 'Segoe UI', Arial, sans-serif";

const out = (p) => {
  const f = join(root, p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};
const svgFile = (p, s) => writeFileSync(out(p), s);

// ---- artwork pieces -------------------------------------------------------------------------
const tile = (fill = INK) => `<rect width="64" height="64" rx="16" fill="${fill}"/>`;
const ring = `<circle cx="28" cy="36" r="14" fill="none" stroke="${SIGNAL}" stroke-width="8"/>`;
const spark = (knock) =>
  `<path d="${SPARK}" fill="${knock}" stroke="${knock}" stroke-width="6" stroke-linejoin="round"/>\n  <path d="${SPARK}" fill="${WHITE}"/>`;
const markArt = (withTile = true) => `${withTile ? tile() + "\n  " : ""}${ring}\n  ${spark(INK)}`;

// Wordmark: second "e" behind, first "e" in front with a knockout outline. Drawn as two text layers.
const wordmark = (text, knock, x = 80, y = 44, size = 34) => {
  const a = `font-family="${FONT}" font-weight="600" font-size="${size}" letter-spacing="-1.2"`;
  // Three layers (no reliance on paint-order, which some rasterizers ignore): back "er" + word, knockout outline, front "e".
  const layer = (first, rest = "none") =>
    `<text x="${x}" y="${y}" ${a} fill="${rest}">Opportun${first}<tspan dx="-5">er</tspan></text>`;
  return `${layer(`<tspan fill="none">e</tspan>`, text)}
  ${layer(`<tspan fill="${knock}" stroke="${knock}" stroke-width="3" stroke-linejoin="round">e</tspan>`)}
  ${layer(`<tspan fill="${text}">e</tspan>`)}`;
};

const svg = (w, h, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n  <title>Opportuneer</title>\n${bg ? `  <rect width="${w}" height="${h}" fill="${bg}"/>\n` : ""}  ${body}\n</svg>\n`;

// ---- SVG sources ----------------------------------------------------------------------------
const sources = {
  "logos/svg/opportuneer-mark.svg": svg(64, 64, markArt(true)),
  "logos/svg/opportuneer-logo.svg": svg(276, 64, `<g>\n  ${markArt(true)}\n  </g>\n  ${wordmark(INK, WHITE)}`),
  "logos/svg/opportuneer-logo-white.svg": svg(276, 64, `<g>\n  ${markArt(true)}\n  </g>\n  ${wordmark(WHITE, INK)}`),
  "logos/svg/opportuneer-wordmark.svg": svg(196, 64, wordmark(INK, WHITE, 0)),
  "logos/svg/opportuneer-wordmark-white.svg": svg(196, 64, wordmark(WHITE, INK, 0)),
  // Full-bleed square for stores / favicons that round their own corners.
  "icons/favicon.svg": svg(64, 64, markArt(true)),
  "icons/mark-fullbleed.svg": svg(64, 64, `${tile().replace('rx="16" ', "")}\n  ${ring}\n  ${spark(INK)}`),
};
for (const [p, s] of Object.entries(sources)) svgFile(p, s);

// ---- raster helpers -------------------------------------------------------------------------
const render = (svgText, w, h, file, opts = {}) =>
  sharp(Buffer.from(svgText), { density: 384 })
    .resize(w, h, { fit: "contain", background: opts.bg ?? { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(out(file));

const mark = sources["logos/svg/opportuneer-mark.svg"];
const full = sources["icons/mark-fullbleed.svg"];
const logo = sources["logos/svg/opportuneer-logo.svg"];
const logoW = sources["logos/svg/opportuneer-logo-white.svg"];

// logos
for (const w of [276, 552, 1104]) {
  await render(logo, w, Math.round((w * 64) / 276), `logos/png/opportuneer-logo-${w}w.png`);
  await render(logoW, w, Math.round((w * 64) / 276), `logos/png/opportuneer-logo-white-${w}w.png`);
}
for (const s of [128, 256, 512, 1024]) await render(mark, s, s, `logos/png/opportuneer-mark-${s}.png`);

// favicons + app icons
const fav = {};
for (const s of [16, 32, 48]) {
  await render(mark, s, s, `icons/favicon-${s}.png`);
  fav[s] = await sharp(Buffer.from(mark), { density: 384 }).resize(s, s).png().toBuffer();
}
// .ico with embedded PNGs (16/32/48)
{
  const sizes = [16, 32, 48];
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = [];
  for (const s of sizes) {
    const e = Buffer.alloc(16);
    e.writeUInt8(s, 0);
    e.writeUInt8(s, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(fav[s].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += fav[s].length;
    dir.push(e);
  }
  writeFileSync(out("icons/favicon.ico"), Buffer.concat([head, ...dir, ...sizes.map((s) => fav[s])]));
}
await render(full, 180, 180, "icons/apple-touch-icon-180.png");
await render(mark, 192, 192, "icons/icon-192.png");
await render(mark, 512, 512, "icons/icon-512.png");
// Maskable: full-bleed ink, mark scaled into the central 80% safe zone.
{
  const inner = await sharp(Buffer.from(svg(64, 64, `${ring}\n  ${spark(INK)}`)), { density: 384 })
    .resize(Math.round(512 * 0.64), Math.round(512 * 0.64))
    .png()
    .toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: INK } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(out("icons/icon-maskable-512.png"));
}

// social
const tagline = (x, y, size, anchor = "start") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-weight="500" font-size="${size}" fill="${WHITE}" fill-opacity="0.65">Opportunities that fit.</text>`;
const centred = (w, h, scale, tagSize) => {
  const lw = 276 * scale;
  const lh = 64 * scale;
  const lx = (w - lw) / 2;
  const ly = h / 2 - lh / 2 - tagSize * 0.8;
  return `<g transform="translate(${lx} ${ly}) scale(${scale})">${markArt(true)}\n  ${wordmark(WHITE, INK)}</g>\n  ${tagline(w / 2, ly + lh + tagSize * 1.9, tagSize, "middle")}`;
};
await render(svg(1200, 630, centred(1200, 630, 2.4, 36), INK), 1200, 630, "social/og-image-1200x630.png");
await render(svg(1500, 500, centred(1500, 500, 2.2, 34), INK), 1500, 500, "social/x-banner-1500x500.png");
await render(full, 400, 400, "social/avatar-400.png");
await render(svg(1280, 720, centred(1280, 720, 2.6, 38), INK), 1280, 720, "social/poster-1280x720.png");

// brand tokens
writeFileSync(
  out("colors.json"),
  JSON.stringify(
    {
      ink: INK,
      "ink-2": "#1b1e25",
      "ink-3": "#2b2f38",
      "ink-4": "#444955",
      signal: SIGNAL,
      "signal-dark": "#c93a17",
      "signal-soft": "#fde6dd",
      canvas: CANVAS,
      white: WHITE,
    },
    null,
    2,
  ) + "\n",
);
console.log("Brand assets written to", root);
