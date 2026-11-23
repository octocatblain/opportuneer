/**
 * Plans and prices: the single source of truth. The pricing page, checkout, billing page and renewals all read from here,
 * so a price can never differ between screens. Prices are whole Kenyan shillings, billed monthly.
 * Plan keys match TrackAccess (JOB | PITCH | BOTH). Source: plan.md "Pricing and monthly caps".
 * Change a price only after the real credit cost has been measured in the pilot.
 */
import type { TrackAccess } from "@prisma/client";

export type PlanKey = TrackAccess;
export type PriceStage = "free" | "founding" | "standard";

export type Plan = {
  key: PlanKey;
  name: string;
  pitch: string;
  standardKes: number;
  foundingKes: number;
  credits: number; // allowance added at the start of each billing period; does not roll over
  outcome: string;
  features: string[];
  featured?: boolean;
};

export const PLANS: Record<PlanKey, Plan> = {
  JOB: {
    key: "JOB",
    name: "Jobs",
    pitch: "For people looking for work.",
    standardKes: 999,
    foundingKes: 499,
    credits: 430,
    outcome: "Up to 25 full applications a month",
    features: ["Daily scan of Kenyan and Africa-friendly remote boards", "Fit score and trust check on every role", "Company research", "Tailored CV and cover letter PDFs", "Gmail drafts and follow-ups"],
  },
  PITCH: {
    key: "PITCH",
    name: "Pitches",
    pitch: "For freelancers, agencies and recruiters.",
    standardKes: 2499,
    foundingKes: 1249,
    credits: 450,
    outcome: "Up to 30 full proposals a month",
    features: ["Prospect scoring: size, budget signals, AI readiness", "Company research", "Tailored proposal or pitch PDFs", "Gmail drafts and follow-ups", "Pipeline board with due follow-ups"],
  },
  BOTH: {
    key: "BOTH",
    name: "Duo",
    pitch: "Both tracks, one shared monthly allowance.",
    standardKes: 2999,
    foundingKes: 1499,
    credits: 660,
    outcome: "About 19 applications and 22 proposals a month",
    features: ["Everything in Jobs and Pitches", "Switch between the two spaces in one account", "Cheaper than buying both separately"],
    featured: true,
  },
};
export const PLAN_LIST = [PLANS.JOB, PLANS.PITCH, PLANS.BOTH];

/** Extra credits, bought any time. They do not expire with the billing period. */
export const TOPUP = { credits: 100, priceKes: 250 };

/** Days a failed renewal keeps working before AI actions pause (data is never removed). */
export const GRACE_DAYS = 3;
/** Refund window for everyone, in days from the payment. */
export const REFUND_DAYS = 7;

export const kes = (n: number) => `KES ${n.toLocaleString("en-US")}`;

type Dates = { freeUntil: Date | null; foundingUntil: Date | null };

/** Which price applies to a charge made at `at` (default now). */
export function priceStage(u: Dates, at = new Date()): PriceStage {
  if (u.freeUntil && at.getTime() <= u.freeUntil.getTime()) return "free";
  if (u.foundingUntil && at.getTime() <= u.foundingUntil.getTime()) return "founding";
  return "standard";
}

export type Price = {
  stage: PriceStage;
  amountKes: number; // what a charge made at `at` costs
  standardKes: number;
  /** When the price becomes the standard price (the moment after the last free or founding day), or null if it already is. */
  standardFrom: Date | null;
};

export function priceFor(u: Dates, plan: PlanKey, at = new Date()): Price {
  const p = PLANS[plan];
  const stage = priceStage(u, at);
  const amountKes = stage === "free" ? 0 : stage === "founding" ? p.foundingKes : p.standardKes;
  const end = stage === "free" ? u.freeUntil : stage === "founding" ? u.foundingUntil : null;
  return { stage, amountKes, standardKes: p.standardKes, standardFrom: end ? new Date(end.getTime() + 1000) : null };
}

/** Plain-language line for the price, e.g. "KES 499 a month until 6 Mar 2027, then KES 999". */
export function priceLine(price: Price, plan: PlanKey): string {
  const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
  if (price.stage === "free") return `Free until ${date(new Date(price.standardFrom!.getTime() - 1000))}, then ${kes(PLANS[plan].standardKes)} a month`;
  if (price.stage === "founding") return `${kes(price.amountKes)} a month until ${date(new Date(price.standardFrom!.getTime() - 1000))}, then ${kes(price.standardKes)}`;
  return `${kes(price.amountKes)} a month`;
}
