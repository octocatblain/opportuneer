import { cfg } from "@/lib/config";

export type Salary = {
  min?: number;
  max?: number;
  currency?: string;
  period?: "month" | "year" | "hour";
};

const fxToUsd = (): Record<string, number> => ({
  USD: 1,
  KES: 1 / cfg().fx.kesPerUsd,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
});

/** Monthly salary in USD (uses the top of the range when present). */
export function monthlyUsd(s: Salary): number | null {
  const amount = s.max ?? s.min;
  if (!amount) return null;
  const rate = fxToUsd()[(s.currency ?? "USD").toUpperCase()];
  if (rate === undefined) return null;
  let monthly = amount;
  if (s.period === "year") monthly = amount / 12;
  if (s.period === "hour") monthly = amount * 160;
  // Guess the period when it is missing: big numbers are yearly (except KES).
  if (!s.period) {
    const usd = amount * rate;
    if (usd > 25000) monthly = amount / 12;
  }
  return Math.round(monthly * rate);
}

function toNumber(raw: string): number {
  const cleaned = raw.toLowerCase().replace(/[, ]/g, "");
  const k = cleaned.endsWith("k");
  const m = cleaned.endsWith("m");
  const n = parseFloat(cleaned.replace(/[km]$/, ""));
  return k ? n * 1000 : m ? n * 1_000_000 : n;
}

/** Best-effort salary extraction from free text ("KES 250,000 - 300,000 per month", "$80k-$100k"). */
export function parseSalary(text: string | null | undefined): Salary {
  if (!text) return {};
  const t = text.replace(/ /g, " ");
  const re =
    /(KES|KSh\.?|Ksh\.?|USD|US\$|\$|EUR|€|GBP|£)\s?(\d[\d,. ]*[kKmM]?)(?:\s?(?:-|–|to)\s?(?:KES|KSh\.?|Ksh\.?|USD|US\$|\$|EUR|€|GBP|£)?\s?(\d[\d,. ]*[kKmM]?))?/;
  const m = t.match(re);
  if (!m) return {};
  const sym = m[1].toUpperCase();
  const currency = sym.startsWith("K")
    ? "KES"
    : sym === "€" || sym === "EUR"
      ? "EUR"
      : sym === "£" || sym === "GBP"
        ? "GBP"
        : "USD";
  const min = toNumber(m[2]);
  const max = m[3] ? toNumber(m[3]) : undefined;
  const after = t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 30).toLowerCase();
  const period: Salary["period"] = /year|annum|annual|p\.a|\/yr/.test(after)
    ? "year"
    : /hour|\/hr/.test(after)
      ? "hour"
      : /month|\/mo|pm\b/.test(after)
        ? "month"
        : undefined;
  if (!Number.isFinite(min) || min <= 0) return {};
  return { min, max, currency, period };
}
