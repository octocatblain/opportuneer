import { z } from "zod";
import { cfg } from "@/lib/config";
import type { Package } from "@/config/profile";
import { generateGroundedText, generateJson, generateText } from "@/lib/ai";
import { extractBody } from "@/lib/cv";

const VOICE = `Write in plain, confident British English as used in Kenya. Short sentences. No buzzwords
("synergy", "leverage", "cutting-edge", "passionate", "delve"), no exclamation marks, no emojis.
Never invent facts, employers, numbers, certifications or results that are not in the source material.`;

// ---------- Job extraction (pasted text or fetched page) ----------

export const JobExtract = z.object({
  title: z.string(),
  companyName: z.string().nullable(),
  companyWebsite: z.string().nullable().optional(),
  location: z.string().nullable(),
  remote: z.boolean(),
  employment: z.string().nullable(),
  salaryText: z.string().nullable(),
  contactEmail: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  description: z.string(),
});

export function extractJob(raw: string) {
  return generateJson(JobExtract, {
    system: "You extract structured job-posting data. Copy facts exactly; use null when a field is missing.",
    prompt: `Extract this job posting. "description" should keep the full responsibilities and requirements text (plain text, up to ~6000 characters).
"employment" is one of: full-time, contract, part-time, fractional, internship, or null. "salaryText" is the salary exactly as written, or null.

<posting>
${raw.slice(0, 40000)}
</posting>

JSON keys: title, companyName, companyWebsite, location, remote, employment, salaryText, contactEmail, contactName, description`,
    maxTokens: 8000,
    effort: "low",
  });
}

// ---------- Company profile (live web search) ----------

/** A short, factual paragraph about a company, from a Google-grounded search. Never invents: says so when the company can't be identified. */
export async function researchCompanyProfile(input: { name: string; website?: string | null; location?: string | null; industry?: string | null; jobTitle?: string | null }) {
  const hints = [input.website && `website: ${input.website}`, input.location && `location: ${input.location}`, input.industry && `industry: ${input.industry}`, input.jobTitle && `currently hiring for: ${input.jobTitle}`].filter(Boolean).join("; ");
  const r = await generateGroundedText({
    system: "You write short, factual company profiles for a job seeker. Use web search and state only facts found in the search results. Never guess or pad.",
    prompt: `Search the web for the company "${input.name}"${hints ? ` (${hints})` : ""} and write ONE paragraph of 3-5 sentences about it: what it does, where it is based and operates, its size or history, notable products, clients or recent news, if found.

Rules:
- Plain text only: no markdown, no bullet points, no citations or links inside the paragraph.
- Only include facts you actually found. Leave out anything uncertain rather than guessing numbers.
- If several different companies share the name, pick the one that matches the hints. If you cannot confidently identify the company, reply exactly: NOT_FOUND`,
    maxTokens: 3000,
  });
  const text = r.text.replace(/\*\*|__/g, "").replace(/\s*\n+\s*/g, " ").trim();
  return { about: text === "NOT_FOUND" || text.startsWith("NOT_FOUND") ? null : text, sources: r.sources, model: r.model };
}

// ---------- Company research ----------

export const companyResearchSchema = () => z.object({
  industry: z.enum(cfg().industries.map((i) => i.key) as [string, ...string[]]).nullable(),
  location: z.string().nullable(),
  employees: z.number().int().nullable(),
  revenueNote: z.string().nullable(),
  aiMaturity: z.number().int().min(1).max(5).nullable(),
  growthSignals: z.string().nullable(),
  recurringNeeds: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactRole: z.string().nullable(),
  research: z.string(),
});

export function researchCompany(name: string, sourceText: string) {
  return generateJson(companyResearchSchema(), {
    system: `You are a business analyst helping ${cfg().company.name || "an agency"}, a consultancy, qualify prospects. Be sceptical and evidence-based.`,
    prompt: `Assess "${name}" from the material below (their website text and any notes).

Return:
- industry: one of ${cfg().industries.map((i) => `"${i.key}" (${i.label})`).join(", ")}, or null
- employees: best estimate of headcount, or null if no evidence
- revenueNote: any budget/revenue evidence (branches, turnover, funding, client list), or null
- aiMaturity: 1 = paper/Excel, no tech team ... 5 = in-house data/AI team. null if unknown
- growthSignals: separate signals with semicolons (new branches, funding, hiring, tenders, new products), or null
- recurringNeeds: ongoing work an AI/software agency could own, separated by semicolons (customer support load, reporting, website/SEO, integrations, maintenance), or null
- contactName / contactEmail / contactRole: only if present in the material
- research: 5-7 sentence brief: what they do, where they are weak (operations, systems, data, website, marketing, customer service), 3 concrete opportunities across AI/automation, software and marketing/growth, and anything that suggests they can or cannot pay.

<material>
${sourceText.slice(0, 40000)}
</material>`,
    maxTokens: 6000,
    effort: "medium",
  });
}

// ---------- Tailored CV ----------

export async function tailorCv(input: {
  /** "text": the CV is plain resume text; build the HTML body from it using the default stylesheet's classes. */
  cvFormat?: "html" | "text";
  cvBodyHtml: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  mentionCompany: boolean;
}) {
  const { text, provider } = await generateText({
    system: `You tailor ${cfg().profile.name}'s CV to a specific job. ${VOICE}
You receive the CV's <body> HTML. Return the full tailored <body> inner HTML in a single \`\`\`html fenced block, followed by a short "CHANGES:" list.
Rules:
${input.cvFormat === "text" ? `- The CV is given as plain resume text inside <pre>. Build the body HTML from it using ONLY this structure: <h1>Full name</h1><p class="role">target role line</p><p class="contact">contact details separated by " | "</p>, then for each section <h2>SECTION</h2>, jobs as <h3>Role, Employer</h3><p class="meta">dates, place</p><ul><li>bullet</li></ul>, other text as <p>/<ul>. No inline styles, no scripts.` : "- Keep every existing CSS class and the overall structure, so the existing stylesheet still applies."}
- You may: rewrite the role line and summary for this job, reorder skills and bullets so the most relevant come first, drop less relevant bullets, and lightly rephrase bullets using the job's vocabulary when it is truthful.
- You may NOT add any employer, project, tool, number, date or achievement that is not already in the CV.
- Keep it to two A4 pages: if you add emphasis somewhere, trim elsewhere.
- ${input.mentionCompany ? `Keep the ${cfg().company.name} consulting angle visible: ${cfg().profile.name} runs ${cfg().company.name} (${cfg().company.website}). Mention it once in the summary only if the CV already supports it.` : `Do not mention any side business or agency; present ${cfg().profile.name || "the candidate"} purely as a candidate for this employer.`}`,
    prompt: `Job: ${input.jobTitle} at ${input.companyName}

<job_description>
${input.jobDescription.slice(0, 20000)}
</job_description>

<cv_body>
${input.cvBodyHtml}
</cv_body>`,
    maxTokens: 32000,
    effort: "high",
  });
  const changes = text.split(/CHANGES:/i)[1]?.trim() ?? "";
  return { bodyHtml: extractBody(text), changes, provider };
}

// ---------- Cover letter + application email ----------

export const Letter = z.object({
  subject: z.string(),
  body: z.string(),
});

export function writeCoverLetter(input: {
  cvText: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  companyResearch?: string | null;
  mentionCompany: boolean;
}) {
  return generateJson(Letter, {
    system: `You write cover letters for ${cfg().profile.name}. ${VOICE}`,
    prompt: `Write a cover letter (250-350 words) for ${input.jobTitle} at ${input.companyName}.
Structure: why this company (specific, from the research or posting), the 2-3 most relevant proofs from the CV (with real numbers from the CV), how ${cfg().profile.name || "the candidate"} would help this employer in practical steps (use the target roles and strengths from the CV), a short close with availability (notice period: ${cfg().profile.noticePeriod}).
${input.mentionCompany ? `Mention briefly that they run ${cfg().company.name}${cfg().company.tagline ? ` (${cfg().company.tagline})` : ""}, as supporting evidence.` : "Do not mention any side business or agency."}
"subject" is the letter's subject line. "body" is the letter text starting with "Dear ..." (use the hiring manager's name only if known, else "Dear Hiring Manager,") and ending with the sign-off "${cfg().profile.name}". Use blank lines between paragraphs.

<cv>${input.cvText}</cv>
<job>${input.jobDescription.slice(0, 15000)}</job>
${input.companyResearch ? `<company_research>${input.companyResearch}</company_research>` : ""}`,
    maxTokens: 6000,
    effort: "high",
  });
}

export function writeApplicationEmail(input: {
  jobTitle: string;
  companyName: string;
  contactName?: string | null;
  coverLetter: string;
}) {
  return generateJson(Letter, {
    system: `You write short job-application emails for ${cfg().profile.name}. ${VOICE}`,
    prompt: `Write the email that carries the attached CV and cover letter for ${input.jobTitle} at ${input.companyName}.
80-140 words. Greeting to ${input.contactName || "the hiring team"}. One line on the role, two lines with the strongest proof, mention the attachments, close politely. Signature: ${cfg().profile.name}, ${cfg().profile.phone}, ${cfg().profile.links.linkedin}.
Subject: "Application: <role> – ${cfg().profile.name}".

<cover_letter>${input.coverLetter}</cover_letter>`,
    maxTokens: 3000,
    effort: "medium",
  });
}

// ---------- Red Star Standard pitch + proposal ----------

export const Pitch = z.object({
  angles: z.array(z.object({ service: z.string(), why: z.string(), fit: z.number().int().min(1).max(10) })),
  chosenAngle: z.string(),
  subject: z.string(),
  body: z.string(),
  packageKeys: z.array(z.string()),
  otherServices: z.array(z.string()),
  rationale: z.string(),
});

function priceLabel(p: Package) {
  if (!p.priceKes) return "price on request";
  return `from KES ${p.priceKes.toLocaleString()}${p.monthlyKes && p.kind !== "retainer" ? ` + KES ${p.monthlyKes.toLocaleString()}/mo` : p.kind === "retainer" ? "/mo" : ""}`;
}

export function serviceMenu() {
  const priced = cfg().packages
    .map((p) => `- ${p.key}: ${p.name} (${priceLabel(p)}; ${p.duration}). ${p.summary}${p.qualifies ? "" : " [small entry offer: use only as a first step towards bigger or ongoing work]"}`)
    .join("\n");
  const lines = Object.entries(cfg().serviceLines)
    .map(([group, items]) => `- ${group}: ${items.join(", ")}`)
    .join("\n");
  return `<priced_packages>
${priced}
</priced_packages>
<all_service_lines note="custom-quoted after the free call">
${lines}
</all_service_lines>`;
}

export function writePitch(input: {
  companyName: string;
  research: string;
  contactName?: string | null;
  contactRole?: string | null;
  includeFoundingOffer: boolean;
}) {
  return generateJson(Pitch, {
    system: `You are the business-development lead for ${cfg().company.name} (${cfg().company.website}), ${cfg().company.tagline || "an agency"}, run by ${cfg().profile.name}${cfg().profile.location ? ` in ${cfg().profile.location}` : ""}. ${VOICE}
You choose the strongest angle for each prospect from the WHOLE service menu below, then write the first-contact email. The goal of the email is a free 30-minute call, not a sale.`,
    prompt: `Step 1: Consider every service line and package below against the research. In "angles", list the 3-5 strongest options, each with the service, why it fits this company (evidence from the research), and a fit score 1-10. Weigh: size of the pain, whether they can afford it (they must be able to pay at least KES ${cfg().company.clientFloorKes.toLocaleString()} or a monthly retainer), and how likely it leads to long-term, recurring work.
Step 2: Set "chosenAngle" to the single best way in. It may combine a quick, low-risk first step with the bigger engagement it leads to.
Step 3: Write the email to ${input.contactName ? `${input.contactName}${input.contactRole ? ` (${input.contactRole})` : ""}` : "the decision maker"} at ${input.companyName}:
- 120-180 words. Open with one specific observation about their business, not "I hope this finds you well".
- One concrete problem, one concrete fix (from the chosen angle) with a believable outcome. Mention a starting price only if it helps.
- ${input.includeFoundingOffer ? `One sentence on the founding-client offer: ${cfg().company.foundingOffer.text}.` : "Do not mention discounts."}
- Call to action: a free 30-minute call${cfg().company.pricingUrl ? `; more at ${cfg().company.pricingUrl}` : ""}.
- Signature: ${cfg().profile.name}, ${cfg().company.name}, ${cfg().profile.phone}, ${cfg().company.website}
"packageKeys": keys of the priced packages that belong in the proposal. "otherServices": any custom-quoted service lines to include. "rationale": 2 sentences on why this angle fits their budget and retention potential.

${serviceMenu()}

<research>${input.research}</research>`,
    maxTokens: 8000,
    effort: "high",
  });
}

export async function writeProposal(input: { companyName: string; research: string; angle: string; packageKeys: string[]; otherServices: string[] }) {
  const chosen = cfg().packages.filter((p) => input.packageKeys.includes(p.key)).map((p) => ({ name: p.name, price: priceLabel(p), duration: p.duration, summary: p.summary }));
  return generateText({
    system: `You write one-page proposals for ${cfg().company.name}. ${VOICE} Output clean Markdown only.`,
    prompt: `Write a one-page proposal for ${input.companyName} built around this angle: ${input.angle}
Sections: Where you are today; What we propose (phases with outcomes, starting with a low-risk first phase and showing the ongoing work it leads to); Investment (use the package prices exactly, KES before VAT; custom-quoted services say "quoted after a free scoping call"); Timeline; Payment terms; Next step.
Payment terms: ${cfg().company.terms.join("; ") || "to be agreed after the scoping call"}.

<packages>${JSON.stringify(chosen)}</packages>
<custom_services>${input.otherServices.join(", ")}</custom_services>
<research>${input.research}</research>`,
    maxTokens: 6000,
    effort: "high",
  });
}

export function writeFollowUp(input: { kind: "job" | "pitch"; companyName: string; title: string; previous: string; daysSince: number }) {
  return generateJson(Letter, {
    system: `You write polite, short follow-up emails for ${cfg().profile.name}. ${VOICE}`,
    prompt: `Write a follow-up (60-100 words) ${input.daysSince} days after this ${input.kind === "job" ? "job application" : "pitch"} for "${input.title}" at ${input.companyName}. Add one new piece of value (a relevant idea or proof), and ask one easy question. Subject should start with "Re: ".

<previous_email>${input.previous}</previous_email>`,
    maxTokens: 2000,
    effort: "medium",
  });
}
