import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteOpportunityAction,
  generateAction,
  gmailDraftAction,
  saveDocAction,
  setStageAction,
  updateOpportunityAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Breakdown, btn, btnGhost, Card, Flash, input, ScorePill, STAGE_LABEL, STAGES, TrackBadge } from "@/components/ui";
import { db } from "@/lib/db";
import { gmailAccount } from "@/lib/gmail";
import { shouldMentionCompany, type JobFit } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const DOC_LABEL: Record<string, string> = {
  CV: "Tailored CV",
  COVER_LETTER: "Cover letter",
  EMAIL: "Application email",
  PITCH_EMAIL: "Pitch email",
  PROPOSAL: "Proposal",
  FOLLOW_UP: "Follow-up email",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const o = await db.opportunity.findUnique({ where: { id }, select: { title: true, company: { select: { name: true } } } });
  if (!o) return { title: "Not found" };
  return { title: o.company?.name ? `${o.title} at ${o.company.name}` : o.title };
}

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const o = await db.opportunity.findUnique({
    where: { id },
    include: { company: true, documents: { orderBy: { createdAt: "desc" } }, activities: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!o) notFound();
  const gmail = await gmailAccount();
  const fit = o.fitBreakdown as JobFit | null;
  const isJob = o.track === "JOB";
  const mention = isJob && shouldMentionCompany(o.title, o.employment, o.description);
  // Show only the newest document of each kind.
  const latest = Object.values(Object.fromEntries([...o.documents].reverse().map((d) => [d.kind, d])));
  const emailKinds = ["EMAIL", "PITCH_EMAIL", "FOLLOW_UP"];

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title tracking-tight text-ink">{o.title}</h1>
            <ScorePill score={o.fitScore} />
            <TrackBadge track={o.track} />
          </div>
          <p className="mt-1 text-sm text-ink-4">
            {o.company ? (
              <Link href={`/companies/${o.company.id}`} className="font-medium link">
                {o.company.name}
              </Link>
            ) : (
              "No company"
            )}
            {o.location && ` · ${o.location}`}
            {o.remote && " · Remote"}
            {o.employment && ` · ${o.employment}`}
            {o.salaryMax || o.salaryMin ? ` · ${o.currency ?? ""} ${(o.salaryMin ?? o.salaryMax)?.toLocaleString()}${o.salaryMax && o.salaryMin ? `–${o.salaryMax.toLocaleString()}` : ""}${o.salaryPeriod ? `/${o.salaryPeriod}` : ""}` : ""}
            {" · "}source: {o.source}
            {o.url && (
              <>
                {" · "}
                <a href={o.url} target="_blank" className="link">
                  original post ↗
                </a>
              </>
            )}
          </p>
        </div>
        <form action={setStageAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={o.id} />
          <select name="stage" defaultValue={o.stage} className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium">
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
          <SubmitButton className={btnGhost}>Update stage</SubmitButton>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card index={1} title={isJob ? "Application" : "Pitch"}>
            <div className="flex flex-wrap items-center gap-2">
              <form action={generateAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="what" value={isJob ? "application" : "pitch"} />
                <SubmitButton className={btn} pending={isJob ? "Tailoring CV, letter and email… (1–3 min)" : "Writing pitch and proposal… (1–2 min)"}>
                  {o.documents.length ? "Regenerate drafts" : isJob ? "Generate CV, cover letter & email" : "Generate pitch & proposal"}
                </SubmitButton>
              </form>
              {o.stage === "SENT" && (
                <form action={generateAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="what" value="followup" />
                  <SubmitButton className={btnGhost} pending="Writing follow-up…">
                    Draft a follow-up
                  </SubmitButton>
                </form>
              )}
            </div>
            {isJob && (
              <p className="mt-2 text-xs text-ink-4">
                Red Star Standard will {mention ? "" : "not "}be mentioned for this role
                {mention ? " (contract, fractional or AI-lead role)." : " (traditional full-time role)."}
              </p>
            )}
            {!isJob && !o.company?.research && (
              <p className="mt-2 text-sm text-amber-700">
                Research the company first so the pitch is specific:{" "}
                <Link href={`/companies/${o.companyId}`} className="underline">
                  open company
                </Link>
              </p>
            )}
          </Card>

          {latest.map((d) => (
            <Card
              key={d.id}
              title={DOC_LABEL[d.kind]}
              actions={
                d.pdfPath ? (
                  <a href={`/api/files/${d.pdfPath}`} target="_blank" className="text-sm link">
                    Open PDF ↗
                  </a>
                ) : null
              }
            >
              {d.kind === "CV" ? (
                <div className="text-sm text-ink-4">
                  <p>Built from your master CV. Open the PDF to review it.</p>
                  {d.subject && <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-canvas p-2 text-xs">What changed: {d.subject}</pre>}
                </div>
              ) : d.kind === "PROPOSAL" ? (
                <div className="space-y-2 text-sm">
                  {d.subject && <pre className="whitespace-pre-wrap rounded bg-signal-soft p-3 text-xs text-ink-3">{d.subject}</pre>}
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-canvas p-3 text-xs">{d.content}</pre>
                </div>
              ) : (
                <form action={gmail && emailKinds.includes(d.kind) ? gmailDraftAction : saveDocAction} className="space-y-2">
                  <input type="hidden" name="docId" value={d.id} />
                  <input type="hidden" name="oppId" value={o.id} />
                  {d.subject !== null && <input name="subject" defaultValue={d.subject ?? ""} className={`${input} font-medium`} />}
                  <textarea name="content" defaultValue={d.content} rows={d.kind === "COVER_LETTER" ? 16 : 10} className={`${input} leading-relaxed`} />
                  {emailKinds.includes(d.kind) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input name="to" type="email" placeholder="Recipient email (optional)" defaultValue={o.company?.contactEmail ?? ""} className={`${input} max-w-xs`} />
                      <SubmitButton className={btn} pending="Creating Gmail draft…">
                        {gmail ? "Save & create Gmail draft" : "Save"}
                      </SubmitButton>
                      {gmail && (
                        <button formAction={saveDocAction} className={btnGhost}>
                          Save only
                        </button>
                      )}
                      {d.gmailDraftId && <span className="text-xs text-emerald-700">Draft in Gmail ✓</span>}
                      {!gmail && (
                        <Link href="/settings" className="text-xs link">
                          Connect Gmail to send drafts there
                        </Link>
                      )}
                    </div>
                  ) : (
                    <button formAction={saveDocAction} className={btnGhost}>
                      Save edits
                    </button>
                  )}
                </form>
              )}
              {d.kind === "COVER_LETTER" && <p className="mt-2 text-xs text-ink-4">Text edits here update the email copy only; regenerate to rebuild the PDF.</p>}
              <p className="mt-2 text-xs text-mist">
                {d.provider} · {d.createdAt.toLocaleString("en-GB")}
              </p>
            </Card>
          ))}

          {o.description && (
            <Card index={2} title={isJob ? "Job description" : "Notes"}>
              <p className="max-h-96 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-3">{o.description}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {fit?.lines && (
            <Card index={3} title="Why this score">
              <Breakdown lines={fit.lines} />
              {fit.trust && (
                <div className="mt-3 border-t border-ink/5 pt-2 text-sm">
                  <span className="font-medium">Trust: </span>
                  <span
                    className={
                      fit.trust.level === "verified"
                        ? "text-emerald-700"
                        : fit.trust.level === "ok"
                          ? "text-ink-3"
                          : "text-red-700"
                    }
                  >
                    {{ verified: "Verified employer", ok: "Looks genuine", unclear: "Unclear post", suspicious: "Possible scam" }[fit.trust.level]}
                  </span>
                  <ul className="mt-1 list-disc pl-5 text-xs text-ink-4">
                    {fit.trust.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-ink-4">Always check the employer&apos;s own website or LinkedIn page, and never pay to apply.</p>
                </div>
              )}
              {fit.excluded && <p className="mt-2 text-sm text-red-700">Auto-archived: {fit.excludeReason}</p>}
            </Card>
          )}
          {o.company && (
            <Card index={4} title="Company">
              <p className="text-sm">
                <TrackBadge track={o.company.recommendation} both={o.company.recommendBoth} />
              </p>
              <p className="mt-2 text-sm text-ink-4">{o.company.recommendReason}</p>
              <Link href={`/companies/${o.company.id}`} className="mt-2 block text-sm link">
                Research / edit company →
              </Link>
            </Card>
          )}
          {isJob && (
            <Card index={5} title="Details (correct if wrong)">
              <form action={updateOpportunityAction} className="space-y-2 text-sm">
                <input type="hidden" name="id" value={o.id} />
                <input name="location" defaultValue={o.location ?? ""} placeholder="Location" className={input} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="remote" defaultChecked={o.remote} /> Remote
                </label>
                <input name="employment" defaultValue={o.employment ?? ""} placeholder="full-time / contract / part-time" className={input} />
                <div className="grid grid-cols-2 gap-2">
                  <input name="salaryMin" type="number" defaultValue={o.salaryMin ?? ""} placeholder="Pay min" className={input} />
                  <input name="salaryMax" type="number" defaultValue={o.salaryMax ?? ""} placeholder="Pay max" className={input} />
                  <input name="currency" defaultValue={o.currency ?? ""} placeholder="KES / USD" className={input} />
                  <select name="salaryPeriod" defaultValue={o.salaryPeriod ?? ""} className={input}>
                    <option value="">period?</option>
                    <option value="month">per month</option>
                    <option value="year">per year</option>
                    <option value="hour">per hour</option>
                  </select>
                </div>
                <label className="block text-xs text-ink-4">
                  Follow up on
                  <input name="followUpAt" type="date" defaultValue={o.followUpAt?.toISOString().slice(0, 10) ?? ""} className={input} />
                </label>
                <SubmitButton className={btnGhost}>Save and re-score</SubmitButton>
              </form>
            </Card>
          )}
          <Card index={6} title="Activity">
            <ul className="space-y-2 text-xs">
              {o.activities.map((a) => (
                <li key={a.id}>
                  <span className="text-mist">{a.createdAt.toLocaleString("en-GB")}</span>
                  <br />
                  {a.message}
                </li>
              ))}
            </ul>
          </Card>
          <form action={deleteOpportunityAction}>
            <input type="hidden" name="id" value={o.id} />
            <button className="text-xs text-red-600 hover:underline">Delete this opportunity</button>
          </form>
        </div>
      </div>
    </div>
  );
}
