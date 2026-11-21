import path from "node:path";
import fs from "node:fs/promises";
import { Prisma, type Opportunity, type Company } from "@prisma/client";
import { cfg, loadConfig } from "@/lib/config";
import { db, setSetting } from "@/lib/db";
import { feeds, fetchPageText, type RawJob } from "@/lib/feeds";
import { parseSalary } from "@/lib/salary";
import { matchTitleFamily, recommend, scoreCompany, scoreJob, shouldMentionCompany, type JobFit } from "@/lib/scoring";
import {
  extractJob,
  researchCompany,
  tailorCv,
  writeApplicationEmail,
  writeCoverLetter,
  writeFollowUp,
  writePitch,
  writeProposal,
} from "@/lib/ai/tasks";
import { assembleHtml, loadCvParts } from "@/lib/cv";
import { htmlToPdf, letterHtml, markdownHtml, STORAGE_DIR } from "@/lib/pdf";
import { createDraft } from "@/lib/gmail";
import { providerChain } from "@/lib/ai";

function requireAI() {
  if (providerChain()[0].name === "mock") throw new Error("No AI key configured: add GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY to .env and restart the app.");
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

const FOLLOW_UP_DAYS = { JOB: 6, PITCH: 4 } as const;

export async function log(opportunityId: string, type: string, message: string) {
  await loadConfig();
  await db.activity.create({ data: { opportunityId, type, message } });
}

// ---------------- Companies ----------------

export async function upsertCompany(name: string, data: Partial<Prisma.CompanyCreateInput> = {}) {
  await loadConfig();
  const clean = name.trim() || "Unknown";
  return db.company.upsert({
    where: { name: clean },
    create: { name: clean, ...data },
    update: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "")),
  });
}

export async function rescoreCompany(id: string) {
  await loadConfig();
  const c = await db.company.findUniqueOrThrow({
    where: { id },
    include: { opportunities: { where: { track: "JOB", stage: { notIn: ["LOST", "ARCHIVED"] } }, orderBy: { fitScore: "desc" }, take: 1 } },
  });
  const cs = scoreCompany(c);
  const job = c.opportunities[0];
  const rec = recommend(c, cs, job ? { titleFamily: matchTitleFamily(job.title)?.key ?? null, employment: job.employment } : null);
  await db.company.update({
    where: { id },
    data: {
      score: cs.score,
      scoreBreakdown: { lines: cs.lines, canAffordFloor: cs.canAffordFloor } as unknown as Prisma.InputJsonValue,
      recommendation: rec.track,
      recommendBoth: rec.both,
      recommendReason: rec.reason,
    },
  });
}

export async function researchCompanyById(id: string, extraText = "") {
  await loadConfig();
  requireAI();
  const c = await db.company.findUniqueOrThrow({ where: { id } });
  let text = `${c.notes ?? ""}\n${extraText}`;
  if (c.website) {
    const base = c.website.startsWith("http") ? c.website : `https://${c.website}`;
    for (const p of ["", "/about", "/about-us", "/contact", "/contact-us"]) {
      try {
        text += `\n\n[${base}${p}]\n${(await fetchPageText(base + p)).slice(0, 8000)}`;
      } catch {
        /* page missing */
      }
    }
  }
  if (!text.trim()) throw new Error("Add a website or some notes about the company first.");
  const { data, mock } = await researchCompany(c.name, text);
  if (mock) throw new Error("No AI key configured: add GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.");
  await db.company.update({
    where: { id },
    data: {
      industry: data.industry ?? c.industry,
      location: data.location ?? c.location,
      employees: data.employees ?? c.employees,
      revenueNote: data.revenueNote ?? c.revenueNote,
      aiMaturity: data.aiMaturity ?? c.aiMaturity,
      growthSignals: data.growthSignals ?? c.growthSignals,
      recurringNeeds: data.recurringNeeds ?? c.recurringNeeds,
      contactName: c.contactName ?? data.contactName,
      contactEmail: c.contactEmail ?? data.contactEmail,
      contactRole: c.contactRole ?? data.contactRole,
      research: data.research,
    },
  });
  await rescoreCompany(id);
}

// ---------------- Jobs ----------------

function fitJson(fit: JobFit) {
  return fit as unknown as Prisma.InputJsonValue;
}

export async function saveJob(raw: RawJob, contact?: { name?: string | null; email?: string | null; website?: string | null }) {
  await loadConfig();
  const existing = await db.opportunity.findUnique({ where: { source_sourceId: { source: raw.source, sourceId: raw.sourceId } } });
  if (existing) return { opp: existing, created: false };
  // Same role from another board?
  const dup = await db.opportunity.findFirst({
    where: { track: "JOB", title: { equals: raw.title, mode: "insensitive" }, company: { name: { equals: raw.companyName, mode: "insensitive" } } },
  });
  if (dup) return { opp: dup, created: false };

  const company = await upsertCompany(raw.companyName, {
    website: contact?.website ?? undefined,
    contactName: contact?.name ?? undefined,
    contactEmail: contact?.email ?? undefined,
  });
  const fit = scoreJob({
    title: raw.title,
    description: raw.description,
    location: raw.location,
    remote: raw.remote,
    employment: raw.employment,
    salary: raw.salary,
    companyName: company.name,
    companyIndustry: company.industry,
    companyAiMaturity: company.aiMaturity,
    verified: raw.verified,
    source: raw.source,
  });
  if (fit.industry && !company.industry) await db.company.update({ where: { id: company.id }, data: { industry: fit.industry } });

  const opp = await db.opportunity.create({
    data: {
      track: "JOB",
      title: raw.title,
      companyId: company.id,
      source: raw.source,
      sourceId: raw.sourceId,
      url: raw.url,
      description: raw.description,
      location: raw.location,
      remote: raw.remote,
      verified: Boolean(raw.verified),
      employment: raw.employment,
      salaryMin: raw.salary.min ? Math.round(raw.salary.min) : null,
      salaryMax: raw.salary.max ? Math.round(raw.salary.max) : null,
      currency: raw.salary.currency,
      salaryPeriod: raw.salary.period,
      fitScore: fit.score,
      fitBreakdown: fitJson(fit),
      stage: fit.excluded ? "ARCHIVED" : "FOUND",
      postedAt: raw.postedAt,
    },
  });
  await log(opp.id, "found", `Found on ${raw.source}. Fit ${fit.score}/100${fit.excluded ? ` (auto-archived: ${fit.excludeReason})` : ""}`);
  await rescoreCompany(company.id);
  return { opp, created: true };
}

export async function rescoreJob(id: string) {
  await loadConfig();
  const o = await db.opportunity.findUniqueOrThrow({ where: { id }, include: { company: true } });
  const fit = scoreJob({
    title: o.title,
    description: o.description,
    location: o.location,
    remote: o.remote,
    employment: o.employment,
    salary: { min: o.salaryMin ?? undefined, max: o.salaryMax ?? undefined, currency: o.currency ?? undefined, period: (o.salaryPeriod as "month" | "year" | "hour" | undefined) ?? undefined },
    companyName: o.company?.name,
    companyIndustry: o.company?.industry,
    companyAiMaturity: o.company?.aiMaturity,
    verified: o.verified,
    source: o.source,
  });
  await db.opportunity.update({ where: { id }, data: { fitScore: fit.score, fitBreakdown: fitJson(fit) } });
}

export async function runScan() {
  await loadConfig();
  const counts: Record<string, { fetched: number; matched: number; added: number }> = {};
  const errors: string[] = [];
  for (const [name, fn] of Object.entries(feeds)) {
    counts[name] = { fetched: 0, matched: 0, added: 0 };
    try {
      const jobs = await fn();
      counts[name].fetched = jobs.length;
      for (const j of jobs) {
        if (!matchTitleFamily(j.title)) continue;
        counts[name].matched++;
        const { created } = await saveJob(j);
        if (created) counts[name].added++;
      }
    } catch (e) {
      errors.push(`${name}: ${(e as Error).message}`);
    }
  }
  const result = { at: new Date().toISOString(), counts, errors };
  await setSetting("lastScan", result);
  return result;
}

/** Paste a job description or a URL (LinkedIn: paste the text, not the link). */
export async function importJob(input: { text?: string; url?: string; source?: string }) {
  await loadConfig();
  requireAI();
  let raw = input.text?.trim() ?? "";
  if (!raw && input.url) raw = await fetchPageText(input.url);
  if (!raw) throw new Error("Paste the job text or a URL.");
  const { data, mock } = await extractJob(raw);
  if (mock) throw new Error("No AI key configured: add GEMINI_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.");
  const { opp } = await saveJob(
    {
      source: input.source || (input.url?.includes("linkedin") ? "linkedin-paste" : "manual"),
      sourceId: input.url || `manual-${Date.now()}`,
      title: data.title,
      companyName: data.companyName || "Unknown",
      url: input.url || "",
      description: data.description,
      location: data.location || "",
      remote: data.remote,
      employment: data.employment,
      salary: parseSalary(data.salaryText),
      postedAt: new Date(),
    },
    { name: data.contactName, email: data.contactEmail, website: data.companyWebsite },
  );
  return opp;
}

// ---------------- Stages ----------------

export async function setStage(id: string, stage: Opportunity["stage"]) {
  await loadConfig();
  const o = await db.opportunity.findUniqueOrThrow({ where: { id } });
  const data: Prisma.OpportunityUpdateInput = { stage };
  if (stage === "SENT") {
    data.sentAt = new Date();
    data.followUpAt = new Date(Date.now() + FOLLOW_UP_DAYS[o.track] * 86400_000);
  }
  if (["REPLIED", "INTERVIEW", "WON", "LOST", "ARCHIVED"].includes(stage)) data.followUpAt = null;
  await db.opportunity.update({ where: { id }, data });
  await log(id, "stage", `${o.stage} → ${stage}`);
}

// ---------------- Documents ----------------

async function saveDoc(opportunityId: string, kind: Prisma.DocumentCreateInput["kind"], content: string, extra: { subject?: string; pdfPath?: string; provider?: string } = {}) {
  return db.document.create({ data: { opportunityId, kind, content, ...extra } });
}

async function archiveCopy(rel: string, name: string) {
  try {
    await fs.mkdir(cfg().profile.coverLetterArchiveDir, { recursive: true });
    await fs.copyFile(path.join(STORAGE_DIR, rel), path.join(cfg().profile.coverLetterArchiveDir, name));
  } catch {
    /* archive is optional */
  }
}

export async function generateApplication(id: string) {
  await loadConfig();
  requireAI();
  const o = await db.opportunity.findUniqueOrThrow({ where: { id }, include: { company: true } });
  const companyName = o.company?.name ?? "the company";
  const mention = shouldMentionCompany(o.title, o.employment, o.description);
  const cv = await loadCvParts();
  const date = new Date().toISOString().slice(0, 10);
  const base = `${o.id}/${date}-${slug(companyName)}`;

  const tailored = await tailorCv({ cvBodyHtml: cv.body, jobTitle: o.title, companyName, jobDescription: o.description ?? "", mentionCompany: mention });
  const cvPdf = await htmlToPdf(assembleHtml(cv.head, tailored.bodyHtml), `${base}-blain-muema-cv.pdf`);
  await saveDoc(id, "CV", tailored.bodyHtml, { pdfPath: cvPdf, provider: tailored.provider, subject: tailored.changes.slice(0, 1000) });

  const letter = await writeCoverLetter({ cvText: cv.text, jobTitle: o.title, companyName, jobDescription: o.description ?? "", companyResearch: o.company?.research, mentionCompany: mention });
  const letterPdf = await htmlToPdf(
    letterHtml({
      from: [cfg().profile.name, cfg().profile.location, cfg().profile.email, cfg().profile.phone],
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      to: [companyName],
      subject: letter.data.subject,
      body: letter.data.body,
    }),
    `${base}-cover-letter.pdf`,
  );
  await saveDoc(id, "COVER_LETTER", letter.data.body, { subject: letter.data.subject, pdfPath: letterPdf, provider: letter.provider });
  await archiveCopy(letterPdf, `${date}-${slug(companyName)}-${slug(o.title)}-cover-letter.pdf`);

  const email = await writeApplicationEmail({ jobTitle: o.title, companyName, contactName: o.company?.contactName, coverLetter: letter.data.body });
  await saveDoc(id, "EMAIL", email.data.body, { subject: email.data.subject, provider: email.provider });

  if (["FOUND", "SHORTLISTED"].includes(o.stage)) await db.opportunity.update({ where: { id }, data: { stage: "DRAFTED" } });
  await log(id, "generated", `Tailored CV, cover letter and email drafted (${tailored.provider}). Red Star Standard ${mention ? "mentioned" : "not mentioned"}.`);
}

export async function foundingOfferActive() {
  await loadConfig();
  const won = await db.opportunity.count({ where: { track: "PITCH", stage: "WON" } });
  return won < cfg().company.foundingOffer.maxFoundingClients;
}

export async function startPitch(companyId: string) {
  await loadConfig();
  const c = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  const existing = await db.opportunity.findFirst({ where: { companyId, track: "PITCH", stage: { notIn: ["LOST", "ARCHIVED"] } } });
  if (existing) return existing;
  const opp = await db.opportunity.create({
    data: { track: "PITCH", title: `${cfg().company.name} pitch: ${c.name}`, companyId, source: "research", sourceId: `pitch-${companyId}-${Date.now()}`, fitScore: c.score, stage: "SHORTLISTED" },
  });
  await log(opp.id, "created", "Pitch opportunity created");
  return opp;
}

export async function generatePitch(id: string) {
  await loadConfig();
  requireAI();
  const o = await db.opportunity.findUniqueOrThrow({ where: { id }, include: { company: true } });
  const c = o.company as Company;
  if (!c?.research) throw new Error("Research the company first (Companies → Research), so the pitch is specific.");
  const offer = await foundingOfferActive();
  const pitch = await writePitch({ companyName: c.name, research: c.research, contactName: c.contactName, contactRole: c.contactRole, includeFoundingOffer: offer });
  await saveDoc(id, "PITCH_EMAIL", pitch.data.body, { subject: pitch.data.subject, provider: pitch.provider });

  const proposal = await writeProposal({
    companyName: c.name,
    research: c.research,
    angle: pitch.data.chosenAngle,
    packageKeys: pitch.data.packageKeys,
    otherServices: pitch.data.otherServices,
  });
  const date = new Date().toISOString().slice(0, 10);
  const pdf = await htmlToPdf(markdownHtml(proposal.text, `${cfg().company.name} proposal for ${c.name}`), `${o.id}/${date}-${slug(c.name)}-red-star-standard-proposal.pdf`);
  const angles = pitch.data.angles
    .sort((x, y) => y.fit - x.fit)
    .map((a) => `${a.fit}/10 ${a.service}: ${a.why}`)
    .join("\n");
  await saveDoc(id, "PROPOSAL", proposal.text, {
    pdfPath: pdf,
    provider: proposal.provider,
    subject: `Chosen angle: ${pitch.data.chosenAngle}\n\nWhy: ${pitch.data.rationale}\n\nAngles considered:\n${angles}`,
  });

  if (["FOUND", "SHORTLISTED"].includes(o.stage)) await db.opportunity.update({ where: { id }, data: { stage: "DRAFTED" } });
  await log(id, "generated", `Pitch email and proposal drafted (${pitch.provider}); angle: ${pitch.data.chosenAngle}; packages: ${[...pitch.data.packageKeys, ...pitch.data.otherServices].join(", ")}${offer ? "; founding offer included" : ""}`);
}

export async function generateFollowUp(id: string) {
  await loadConfig();
  requireAI();
  const o = await db.opportunity.findUniqueOrThrow({ where: { id }, include: { company: true, documents: { orderBy: { createdAt: "desc" } } } });
  const prev = o.documents.find((d) => d.kind === "EMAIL" || d.kind === "PITCH_EMAIL");
  if (!prev) throw new Error("No earlier email to follow up on.");
  const days = o.sentAt ? Math.max(1, Math.round((Date.now() - o.sentAt.getTime()) / 86400_000)) : 5;
  const f = await writeFollowUp({ kind: o.track === "JOB" ? "job" : "pitch", companyName: o.company?.name ?? "", title: o.title, previous: prev.content, daysSince: days });
  await saveDoc(id, "FOLLOW_UP", f.data.body, { subject: f.data.subject, provider: f.provider });
  await log(id, "generated", "Follow-up drafted");
}

export async function updateDocument(docId: string, subject: string | null, content: string) {
  await loadConfig();
  await db.document.update({ where: { id: docId }, data: { subject, content } });
}

/** Put an email document into Gmail as a draft, attaching the latest PDFs for this opportunity. */
export async function gmailDraft(docId: string, to: string | null) {
  await loadConfig();
  const doc = await db.document.findUniqueOrThrow({ where: { id: docId }, include: { opportunity: { include: { documents: { orderBy: { createdAt: "desc" } }, company: true } } } });
  const o = doc.opportunity;
  const attachments: string[] = [];
  if (doc.kind === "EMAIL") {
    for (const k of ["CV", "COVER_LETTER"] as const) {
      const d = o.documents.find((x) => x.kind === k && x.pdfPath);
      if (d?.pdfPath) attachments.push(d.pdfPath);
    }
  }
  if (doc.kind === "PITCH_EMAIL") {
    const d = o.documents.find((x) => x.kind === "PROPOSAL" && x.pdfPath);
    if (d?.pdfPath) attachments.push(d.pdfPath);
  }
  const draftId = await createDraft({ to, subject: doc.subject ?? o.title, body: doc.content, attachments });
  await db.document.update({ where: { id: docId }, data: { gmailDraftId: draftId } });
  if (to && o.companyId && !o.company?.contactEmail) await db.company.update({ where: { id: o.companyId }, data: { contactEmail: to } });
  await log(o.id, "gmail", `Gmail draft created${to ? ` to ${to}` : ""} with ${attachments.length} attachment(s). Review and send it in Gmail, then mark this as Sent.`);
}
