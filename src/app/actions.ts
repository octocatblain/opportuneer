"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Stage } from "@prisma/client";
import { currentBase, requireSuper, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { disconnectGmail } from "@/lib/gmail";
import { resetConfigSection, saveConfigSection } from "@/lib/config";
import { detectIndustry } from "@/lib/scoring";
import * as svc from "@/lib/services";

/** Run a task; on failure, bounce back to the page with the error in the URL. */
async function attempt(back: string, fn: () => Promise<unknown>, success?: string) {
  let error: string | null = null;
  try {
    await fn();
  } catch (e) {
    error = (e as Error).message;
    console.error(e);
  }
  revalidatePath("/", "layout");
  const sep = back.includes("?") ? "&" : "?";
  if (error) redirect(`${back}${sep}error=${encodeURIComponent(error.slice(0, 500))}`);
  if (success) redirect(`${back}${sep}ok=${encodeURIComponent(success)}`);
}

/** Redirect prefix for the client space the person is in (remembered by middleware; admins may be in any). */
const baseFor = currentBase;

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === null ? null : parseInt(v, 10);
};

export async function scanAction() {
  const user = await requireUser();
  const base = await baseFor(user);
  let summary = "";
  await attempt(base, async () => {
    const r = await svc.runScan(user.id);
    const added = Object.values(r.counts).reduce((a, c) => a + c.added, 0);
    summary = `Scan done: ${added} new matching job(s).${r.errors.length ? ` Some sources failed: ${r.errors.join("; ")}` : ""}`;
  });
  redirect(`${base}?ok=${encodeURIComponent(summary)}`);
}

export async function importJobAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  let id = "";
  await attempt(`${base}/jobs?add=1`, async () => {
    const opp = await svc.importJob(user.id, { text: str(form, "text") ?? undefined, url: str(form, "url") ?? undefined });
    id = opp.id;
  });
  redirect(`${base}/opportunities/${id}`);
}

export async function addCompanyAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  let id = "";
  await attempt(`${base}/companies`, async () => {
    const name = str(form, "name");
    if (!name) throw new Error("Company name is required.");
    const c = await svc.upsertCompany(user.id, name, {
      website: str(form, "website"),
      notes: str(form, "notes"),
      industry: detectIndustry(name, str(form, "notes")),
    });
    await svc.rescoreCompany(user.id, c.id);
    id = c.id;
  });
  redirect(`${base}/companies/${id}`);
}

export async function updateCompanyAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  await attempt(`${base}/companies/${id}`, async () => {
    await db.company.findFirstOrThrow({ where: { id, userId: user.id }, select: { id: true } });
    await db.company.update({
      where: { id },
      data: {
        website: str(form, "website"),
        industry: str(form, "industry"),
        location: str(form, "location"),
        employees: int(form, "employees"),
        revenueNote: str(form, "revenueNote"),
        aiMaturity: int(form, "aiMaturity"),
        growthSignals: str(form, "growthSignals"),
        recurringNeeds: str(form, "recurringNeeds"),
        contactName: str(form, "contactName"),
        contactEmail: str(form, "contactEmail"),
        contactRole: str(form, "contactRole"),
        notes: str(form, "notes"),
      },
    });
    await svc.rescoreCompany(user.id, id);
    const jobs = await db.opportunity.findMany({ where: { userId: user.id, companyId: id, track: "JOB" }, select: { id: true } });
    for (const j of jobs) await svc.rescoreJob(user.id, j.id);
  }, "Saved and re-scored");
}

export async function researchCompanyAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  await attempt(`${base}/companies/${id}`, () => svc.researchCompanyById(user.id, id, str(form, "extra") ?? ""), "Research updated");
}

/** "About this company" paragraph, searched live on the web. Returns to the page it was started from. */
export async function aboutCompanyAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  const oppId = str(form, "oppId");
  await attempt(oppId ? `${base}/opportunities/${oppId}` : `${base}/companies/${id}`, () => svc.aboutCompanyById(user.id, id), "Company profile updated");
}

export async function startPitchAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  let oppId = "";
  await attempt(`${base}/companies/${id}`, async () => {
    oppId = (await svc.startPitch(user.id, id)).id;
  });
  redirect(`${base}/opportunities/${oppId}`);
}

export async function setStageAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  const back = str(form, "back") ?? `${base}/opportunities/${id}`;
  await attempt(back, () => svc.setStage(user.id, id, str(form, "stage") as Stage));
}

export async function generateAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  const what = str(form, "what");
  await attempt(
    `${base}/opportunities/${id}`,
    () => (what === "pitch" ? svc.generatePitch(user.id, id) : what === "followup" ? svc.generateFollowUp(user.id, id) : svc.generateApplication(user.id, id)),
    "Drafts ready below",
  );
}

export async function saveDocAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "oppId")!;
  await attempt(`${base}/opportunities/${id}`, () => svc.updateDocument(user.id, str(form, "docId")!, str(form, "subject"), str(form, "content") ?? ""), "Saved");
}

export async function gmailDraftAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "oppId")!;
  await attempt(
    `${base}/opportunities/${id}`,
    async () => {
      await svc.updateDocument(user.id, str(form, "docId")!, str(form, "subject"), str(form, "content") ?? "");
      await svc.gmailDraft(user.id, str(form, "docId")!, str(form, "to"));
    },
    "Draft created in Gmail. Review and send it there, then mark this as Sent.",
  );
}

export async function updateOpportunityAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  await attempt(`${base}/opportunities/${id}`, async () => {
    await db.opportunity.findFirstOrThrow({ where: { id, userId: user.id }, select: { id: true } });
    await db.opportunity.update({
      where: { id },
      data: {
        employment: str(form, "employment"),
        location: str(form, "location"),
        remote: form.get("remote") === "on",
        salaryMin: int(form, "salaryMin"),
        salaryMax: int(form, "salaryMax"),
        currency: str(form, "currency"),
        salaryPeriod: str(form, "salaryPeriod"),
        followUpAt: str(form, "followUpAt") ? new Date(str(form, "followUpAt")!) : null,
      },
    });
    const o = await db.opportunity.findUniqueOrThrow({ where: { id } });
    if (o.track === "JOB") await svc.rescoreJob(user.id, id);
  }, "Saved");
}

export async function deleteOpportunityAction(form: FormData) {
  const user = await requireUser();
  const base = await baseFor(user);
  const id = str(form, "id")!;
  await db.opportunity.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
  redirect(`${base}/pipeline`);
}

export async function disconnectGmailAction() {
  const user = await requireUser();
  await disconnectGmail(user.id);
  revalidatePath("/client", "layout");
}

export async function saveConfigAction(form: FormData) {
  await requireSuper();
  const section = str(form, "section") ?? "";
  await attempt("/admin/config", () => saveConfigSection(section, String(form.get("json") ?? "")), `Saved "${section}"`);
}

export async function resetConfigAction(form: FormData) {
  await requireSuper();
  const section = str(form, "section") ?? "";
  await attempt("/admin/config", () => resetConfigSection(section), `Reset "${section}" to defaults`);
}
