import { cfg } from "@/lib/config";
import { monthlyUsd, type Salary } from "@/lib/salary";

export type ScoreLine = { label: string; points: number; max: number; note: string };

export type JobFit = {
  score: number;
  lines: ScoreLine[];
  titleFamily: string | null;
  industry: string | null;
  belowTarget: boolean;
  excluded: boolean;
  excludeReason?: string;
  monthlyUsd: number | null;
  trust: Trust;
};

export type Trust = { level: "verified" | "ok" | "unclear" | "suspicious"; reasons: string[] };

const FREE_MAIL = /@(gmail|yahoo|outlook|hotmail|live|aol|proton|protonmail|icloud|ymail)\.[a-z.]+/i;
const ANON_EMPLOYER = /^(unknown|confidential|anonymous|n\/a|-|a leading|our client|leading|undisclosed)|(company|organisation|organization|firm|client)$/i;

/**
 * Is this a real, clear post from an identifiable employer?
 * Kenyan scams usually ask for fees, use free-mail or WhatsApp-only contacts, or hide the employer.
 */
export function assessTrust(input: { companyName?: string | null; description?: string | null; verified?: boolean; source?: string }): Trust {
  const d = lc(input.description);
  const name = (input.companyName ?? "").trim();
  const reasons: string[] = [];
  let suspicious = false;
  let unclear = false;

  if (/(registration|processing|application|training|medical|interview|placement|clearance)\s+fee|pay (a |the )?fee|fee of (ksh|kes)|send (money|ksh|kes)|refundable/.test(d)) {
    suspicious = true;
    reasons.push("Asks candidates to pay a fee");
  }
  if (/(apply|send (your )?(cv|application)|contact)[^.]{0,40}(whatsapp|telegram)/.test(d)) {
    suspicious = true;
    reasons.push("Applications go through WhatsApp/Telegram");
  }
  const emails = (input.description ?? "").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
  if (emails.length && emails.every((e) => FREE_MAIL.test(e))) {
    suspicious = true;
    reasons.push(`Recruiter uses a free email address (${emails[0]})`);
  }
  if (!name || ANON_EMPLOYER.test(name)) {
    unclear = true;
    reasons.push("Employer is not named");
  }
  if (/on behalf of (a |our )?client|our client,? a|confidential client/.test(d) && !input.verified) {
    unclear = true;
    reasons.push("Agency post for an unnamed client");
  }
  if (d.length < 400) {
    unclear = true;
    reasons.push("Very short description");
  } else if (!/(responsibilit|requirement|qualification|you will|what you'll do|duties|skills|experience)/.test(d)) {
    unclear = true;
    reasons.push("No clear duties or requirements");
  }

  if (suspicious) return { level: "suspicious", reasons };
  if (unclear) return { level: "unclear", reasons };
  if (input.verified) return { level: "verified", reasons: ["Employer verified by the job board", ...reasons] };
  return { level: "ok", reasons: reasons.length ? reasons : ["Named employer, clear duties, no red flags"] };
}

const lc = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function matchTitleFamily(title: string) {
  const t = lc(title);
  let best: { key: string; label: string; weight: number } | null = null;
  for (const fam of cfg().titleFamilies) {
    if (fam.keywords.some((k) => t.includes(k))) {
      if (!best || fam.weight > best.weight) best = fam;
    }
  }
  return best;
}

const reCache = new Map<string, RegExp>();
/** Whole-word match; a trailing "*" means "word starting with" (e.g. "manufactur*"). */
function kwRegex(k: string) {
  let re = reCache.get(k);
  if (!re) {
    const stem = k.replace(/\*$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${stem}${k.endsWith("*") ? "" : "\\b"}`, "i");
    reCache.set(k, re);
  }
  return re;
}
export const countKeywords = (text: string, keywords: string[]) => keywords.filter((k) => kwRegex(k).test(text)).length;

/**
 * Industry from the company name (one hit is enough) or a description
 * (needs two different keywords, so a passing mention doesn't count).
 */
export function detectIndustry(name?: string | null, description?: string | null) {
  let best: { key: string; hits: number } | null = null;
  for (const ind of cfg().industries) {
    const nameHits = countKeywords(lc(name), ind.keywords);
    const descHits = countKeywords(lc(description).slice(0, 6000), ind.keywords);
    const hits = nameHits * 2 + descHits;
    if ((nameHits > 0 || descHits >= 2) && (!best || hits > best.hits)) best = { key: ind.key, hits };
  }
  return best?.key ?? null;
}

export type JobInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  remote?: boolean;
  employment?: string | null;
  salary?: Salary;
  companyName?: string | null;
  companyIndustry?: string | null;
  companyAiMaturity?: number | null;
  verified?: boolean;
  source?: string;
};

export function scoreJob(job: JobInput): JobFit {
  const lines: ScoreLine[] = [];
  const desc = lc(job.description);
  const loc = lc(job.location);

  // 1. Title (30)
  const fam = matchTitleFamily(job.title);
  const titlePts = fam ? Math.round(30 * fam.weight) : 0;
  lines.push({ label: "Job title", points: titlePts, max: 30, note: fam ? fam.label : "Not one of your target titles" });

  // 2. Industry (20): non-tech priority cfg().industries are the main focus
  const industry = job.companyIndustry ?? detectIndustry(job.companyName, job.description);
  lines.push({
    label: "Industry",
    points: industry ? 20 : 5,
    max: 20,
    note: industry ? cfg().industries.find((i) => i.key === industry)!.label : "Industry not in your priority list (or unknown)",
  });

  // 3. Late AI adopter (15)
  let maturityPts = 8;
  let maturityNote = "No clear signal";
  if (job.companyAiMaturity) {
    maturityPts = [0, 15, 13, 8, 4, 2][job.companyAiMaturity];
    maturityNote = `AI maturity ${job.companyAiMaturity}/5`;
  } else {
    const low = countKeywords(desc, cfg().lowMaturityKeywords);
    const tech = countKeywords(desc, cfg().techCompanyKeywords);
    if (low > tech && low >= 2) {
      maturityPts = Math.min(15, 9 + low * 2);
      maturityNote = "Post mentions manual/legacy work or transformation";
    } else if (tech > 0) {
      maturityPts = 0;
      maturityNote = "Looks like a tech company (already AI-capable)";
    }
  }
  lines.push({ label: "Late AI adopter", points: maturityPts, max: 15, note: maturityNote });

  // 4. Pay (20)
  const isLocal = !job.remote || cfg().locations.accepted.some((l) => loc.includes(l));
  const floor = isLocal ? cfg().payFloors.localMonthlyUsd : cfg().payFloors.remoteMonthlyUsd;
  const usd = job.salary ? monthlyUsd(job.salary) : null;
  let payPts = 10;
  let payNote = "Salary not stated";
  let belowTarget = false;
  let excluded = false;
  let excludeReason: string | undefined;
  if (usd !== null) {
    if (usd >= floor) {
      payPts = 20;
      payNote = `~$${usd.toLocaleString()}/mo meets your $${floor.toLocaleString()} floor`;
    } else if (usd >= floor * (1 - cfg().payFloors.belowTargetTolerance)) {
      payPts = 6;
      belowTarget = true;
      payNote = `~$${usd.toLocaleString()}/mo is below your $${floor.toLocaleString()} floor`;
    } else {
      payPts = 0;
      excluded = true;
      excludeReason = `Pay ~$${usd.toLocaleString()}/mo is far below your floor`;
      payNote = excludeReason;
    }
  }
  lines.push({ label: "Pay", points: payPts, max: 20, note: payNote });

  // 5. Location (15)
  let locPts = 0;
  let locNote = "";
  const excludedRegion = cfg().locations.excludedRegions.find((r) => loc.includes(r));
  const kenyan = cfg().locations.accepted.some((l) => loc.includes(l));
  const sponsors = /visa sponsor|sponsorship|relocation (support|package|assistance)/.test(desc);
  const mentionsAfrica = /\b(africa|african|kenya|kenyan|nairobi|east africa|sub-saharan)\b/.test(`${loc} ${desc}`);
  if (job.remote && kenyan) {
    locPts = 15;
    locNote = `Remote, Kenya-based (${job.location})`;
  } else if (job.remote) {
    const restricted =
      /(us|usa|united states|uk|eu|europe|canada|americas|emea|latam)[ -]only|must (be|reside) in (the )?(us|usa|united states|uk|europe)/.test(`${loc} ${desc}`) ||
      /\blatam\b|latin america|\(us\)|us-based|\busa\b|\bus only\b/.test(lc(job.title));
    const africaInLocation = /\b(africa|kenya|nairobi)\b/.test(loc);
    const worldwideLoc = !loc.trim() || /worldwide|anywhere|global|any location|^remote$/.test(loc.trim());
    if ((restricted || !worldwideLoc) && !africaInLocation) {
      locPts = 0;
      excluded = true;
      excludeReason = excludeReason ?? `Remote, but limited to ${job.location || "another region"}`;
      locNote = excludeReason;
    } else if (!mentionsAfrica) {
      locPts = 0;
      excluded = true;
      excludeReason = excludeReason ?? "Remote, but the post doesn't say it's open to Africa or Kenya";
      locNote = excludeReason;
    } else {
      locPts = 15;
      locNote = africaInLocation ? `Remote, open to ${job.location}` : "Remote; the post mentions Africa/Kenya";
    }
  } else if (kenyan) {
    locPts = 15;
    locNote = job.location ?? "Kenya";
  } else if (excludedRegion) {
    excluded = true;
    excludeReason = excludeReason ?? `On-site in ${excludedRegion} (East Africa excluded)`;
    locNote = excludeReason;
  } else if (sponsors) {
    locPts = 10;
    locNote = "Abroad with visa sponsorship / relocation";
  } else if (loc) {
    excluded = true;
    excludeReason = excludeReason ?? "On-site abroad without visa sponsorship";
    locNote = excludeReason;
  } else {
    locPts = 7;
    locNote = "Location unknown";
  }
  lines.push({ label: "Location", points: locPts, max: 15, note: locNote });

  // 6. Trust gate: unclear or suspicious posts are archived, not scored higher.
  const trust = assessTrust({ companyName: job.companyName, description: job.description, verified: job.verified, source: job.source });
  if (trust.level === "suspicious" || trust.level === "unclear") {
    excluded = true;
    excludeReason = excludeReason ?? `${trust.level === "suspicious" ? "Possible scam" : "Unclear post"}: ${trust.reasons.join("; ")}`;
  }

  const score = lines.reduce((a, l) => a + l.points, 0);
  return {
    trust,
    score: excluded ? Math.min(score, 25) : score,
    lines,
    titleFamily: fam?.key ?? null,
    industry,
    belowTarget,
    excluded,
    excludeReason,
    monthlyUsd: usd,
  };
}

// ---------------- Companies (pitch / apply / both) ----------------

export type CompanyInput = {
  employees?: number | null;
  revenueNote?: string | null;
  aiMaturity?: number | null;
  growthSignals?: string | null;
  recurringNeeds?: string | null;
  industry?: string | null;
};

export type CompanyScore = {
  score: number;
  lines: ScoreLine[];
  canAffordFloor: boolean;
};

const countSignals = (s?: string | null) =>
  (s ?? "")
    .split(/[\n;,•]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 2).length;

export function scoreCompany(c: CompanyInput): CompanyScore {
  const lines: ScoreLine[] = [];
  const e = c.employees ?? null;

  const sizePts = e === null ? (c.revenueNote ? 15 : 8) : e >= 200 ? 25 : e >= 50 ? 22 : e >= 20 ? 17 : e >= 10 ? 10 : 4;
  lines.push({
    label: "Size / budget",
    points: sizePts,
    max: 25,
    note: e === null ? (c.revenueNote ? `Revenue signal: ${c.revenueNote}` : "Headcount unknown") : `~${e} staff`,
  });

  const m = c.aiMaturity ?? null;
  const matPts = m === null ? 12 : [0, 25, 22, 14, 7, 3][m];
  lines.push({ label: "Low AI maturity", points: matPts, max: 25, note: m === null ? "Unknown" : `AI maturity ${m}/5 (1 = none)` });

  const g = countSignals(c.growthSignals);
  const gPts = g === 0 ? (c.growthSignals === null || c.growthSignals === undefined ? 5 : 0) : g === 1 ? 12 : g === 2 ? 16 : 20;
  lines.push({ label: "Growth signals", points: gPts, max: 20, note: g ? `${g} signal(s)` : "None recorded" });

  const r = countSignals(c.recurringNeeds);
  const rPts = r === 0 ? 4 : r === 1 ? 12 : r === 2 ? 16 : 20;
  lines.push({ label: "Recurring-work potential", points: rPts, max: 20, note: r ? `${r} ongoing need(s)` : "None recorded" });

  const indPts = c.industry && cfg().industries.some((i) => i.key === c.industry) ? 10 : 3;
  lines.push({
    label: "Priority industry",
    points: indPts,
    max: 10,
    note: cfg().industries.find((i) => i.key === c.industry)?.label ?? "Not a priority industry",
  });

  // Floor: must plausibly afford a KES 60k Strategy Sprint or a retainer.
  const canAffordFloor = (e !== null && e >= 10) || Boolean(c.revenueNote) || (e === null && g > 0);

  return { score: lines.reduce((a, l) => a + l.points, 0), lines, canAffordFloor };
}

export type Recommendation = { track: "JOB" | "PITCH" | null; both: boolean; reason: string };

export function recommend(
  c: CompanyInput,
  cs: CompanyScore,
  openJob?: { titleFamily: string | null; employment?: string | null } | null,
): Recommendation {
  const lowMaturity = (c.aiMaturity ?? 3) <= 2;
  const pitchable = cs.canAffordFloor && cs.score >= 50 && (lowMaturity || countSignals(c.recurringNeeds) > 0);
  const flexibleRole = /contract|part[- ]time|fractional|consult|freelance|temporary|fixed[- ]term/.test(lc(openJob?.employment));

  if (openJob?.titleFamily) {
    if (pitchable && (flexibleRole || openJob.titleFamily === "transformation-lead")) {
      return {
        track: "JOB",
        both: true,
        reason: "Matching role is open, and the company also fits a Red Star Standard engagement (flexible or transformation role, low AI maturity).",
      };
    }
    return {
      track: "JOB",
      both: false,
      reason: pitchable
        ? "Matching full-time role is open. Apply first; keep the agency pitch for later so it doesn't compete with your application."
        : "Matching role is open; company doesn't clear the agency bar yet.",
    };
  }
  if (pitchable) {
    return {
      track: "PITCH",
      both: false,
      reason: `No matching job open, but the company can likely afford ${cfg().company.clientFloorKes.toLocaleString()} KES+ work and has room for AI with ongoing needs.`,
    };
  }
  if (!cs.canAffordFloor && (c.employees === null || c.employees === undefined)) {
    return { track: null, both: false, reason: "Not enough information yet. Research the company (or fill in the signals) to see if they can afford you." };
  }
  if (!cs.canAffordFloor) {
    return { track: null, both: false, reason: "Probably too small to afford a Strategy Sprint or retainer. Skip for now." };
  }
  return { track: null, both: false, reason: "Not enough fit or information yet. Research the company first." };
}

/** Should Red Star Standard be mentioned in a job application? */
export function shouldMentionCompany(title: string, employment?: string | null, description?: string | null) {
  const fam = matchTitleFamily(title)?.key;
  const flexible = /contract|part[- ]time|fractional|consult|freelance|fixed[- ]term/.test(lc(employment) + " " + lc(title));
  const consultingFlavour = /consult|advis|transformation|ai lead|head of ai/.test(lc(title) + " " + lc(description).slice(0, 2000));
  return flexible || fam === "transformation-lead" || (fam === "ai-automation" && consultingFlavour);
}
