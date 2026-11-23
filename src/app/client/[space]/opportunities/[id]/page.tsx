import type { Metadata } from "next";
import { JobDescription } from "@/components/job-description";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteOpportunityAction,
  generateAction,
  aboutCompanyAction,
  gmailDraftAction,
  saveDocAction,
  updateOpportunityAction,
} from "@/app/actions";
import { SourceLabel } from "@/components/brand-icons";
import { StageSelect } from "@/components/stage-select";
import { SubmitButton } from "@/components/submit-button";
import { Breakdown, btn, btnGhost, btnSignal, Card, Flash, input, ReadOnlyNotice, ScoreHeadline, ScorePill, TrackBadge } from "@/components/ui";
import { canView, getUser, requireSpace } from "@/lib/auth";
import { clientBase, isSpace, spaceAllowsTrack } from "@/lib/spaces";
import { db } from "@/lib/db";
import { gmailAccount } from "@/lib/gmail";
import { shouldMentionCompany, type JobFit } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const META = "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-card)]";
function MetaIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const DOC_LABEL: Record<string, string> = {
  CV: "Tailored CV",
  COVER_LETTER: "Cover letter",
  EMAIL: "Application email",
  PITCH_EMAIL: "Pitch email",
  PROPOSAL: "Proposal",
  FOLLOW_UP: "Follow-up email",
};

export async function generateMetadata({ params }: { params: Promise<{ space: string; id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getUser();
  const o = viewer ? await db.opportunity.findUnique({ where: { id }, select: { title: true, userId: true, company: { select: { name: true } } } }) : null;
  if (!o || !viewer || !canView(viewer, o.userId)) return { title: "Not found" };
  return { title: o.company?.name ? `${o.title} at ${o.company.name}` : o.title };
}

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ space: string; id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { space, id } = await params;
  if (!isSpace(space)) notFound();
  const viewer = await requireSpace(space);
  const base = clientBase(space);
  const sp = await searchParams;
  const o = await db.opportunity.findUnique({
    where: { id },
    include: { user: { select: { email: true } }, company: true, documents: { orderBy: { createdAt: "desc" } }, activities: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!o || !canView(viewer, o.userId) || !spaceAllowsTrack(space, o.track)) notFound();
  const readOnly = o.userId !== viewer.id;
  const gmail = await gmailAccount(viewer.id);
  const fit = o.fitBreakdown as JobFit | null;
  const isJob = o.track === "JOB";
  const mention = isJob && shouldMentionCompany(o.title, o.employment, o.description);
  // Show only the newest document of each kind.
  const latest = Object.values(Object.fromEntries([...o.documents].reverse().map((d) => [d.kind, d])));
  const emailKinds = ["EMAIL", "PITCH_EMAIL", "FOLLOW_UP"];

  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-4 border-0 p-0">
      {readOnly && <ReadOnlyNotice owner={o.user.email} />}
      <Flash ok={sp.ok} error={sp.error} />
      <Link href={`${base}/${isJob ? "jobs" : "companies"}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {isJob ? "All jobs" : "All companies"}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="page-title">{o.title}</h1>
            <ScorePill score={o.fitScore} />
            <TrackBadge track={o.track} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-3">
            {o.company && (
              <Link href={`${base}/companies/${o.company.id}`} className={`${META} text-ink hover:text-signal-dark`}>
                <MetaIcon d="M4 21V5l8-2v18M12 9l8 2v10M8 9h1M8 13h1M8 17h1" />
                {o.company.name}
              </Link>
            )}
            {o.location && (
              <span className={META}>
                <MetaIcon d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z" />
                {o.location}
              </span>
            )}
            {o.remote && (
              <span className={META}>
                <MetaIcon d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" />
                Remote
              </span>
            )}
            {o.employment && (
              <span className={`${META} capitalize`}>
                <MetaIcon d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                {o.employment}
              </span>
            )}
            {o.salaryMax || o.salaryMin ? (
              <span className={`${META} tabular-nums`}>
                <MetaIcon d="M3 7h18v10H3zM12 14a2 2 0 100-4 2 2 0 000 4z" />
                {`${o.currency ?? ""} ${(o.salaryMin ?? o.salaryMax)?.toLocaleString()}${o.salaryMax && o.salaryMin ? ` to ${o.salaryMax.toLocaleString()}` : ""}${o.salaryPeriod ? `/${o.salaryPeriod}` : ""}`.trim()}
              </span>
            ) : null}
            <span className={META}>
              <SourceLabel source={o.source} />
            </span>
            {o.url && (
              <a href={o.url} target="_blank" rel="noreferrer" className={`${META} text-signal-dark hover:underline`}>
                Open original post
                <MetaIcon d="M7 17L17 7M9 7h8v8" />
              </a>
            )}
          </div>
        </div>
        <StageSelect id={o.id} stage={o.stage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card index={1} title={isJob ? "Application" : "Pitch"}>
            <p className="-mt-2 mb-4 text-sm text-muted">
              {o.documents.length
                ? `${latest.length} draft${latest.length === 1 ? "" : "s"} ready below. Regenerating replaces them with fresh versions.`
                : isJob
                  ? "One click drafts everything you need to apply, tailored to this role."
                  : "One click drafts a pitch email and a proposal tailored to this company."}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {(isJob ? ["Tailored CV", "Cover letter", "Application email"] : ["Pitch email", "Proposal"]).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-3">
                  <MetaIcon d={latest.some((d) => DOC_LABEL[d.kind] === t) ? "M5 12.5l4.5 4.5L19 7.5" : "M12 5v14M5 12h14"} />
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={generateAction}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="what" value={isJob ? "application" : "pitch"} />
                <SubmitButton className={o.documents.length ? btnGhost : btnSignal} pending={isJob ? "Tailoring CV, letter and email… (1–3 min)" : "Writing pitch and proposal… (1–2 min)"} blocking={isJob ? { title: "Tailoring your CV, cover letter and email…", detail: "This usually takes 1 to 3 minutes. The app is locked until the drafts are ready." } : { title: "Writing your pitch and proposal…", detail: "This usually takes 1 to 2 minutes. The app is locked until the drafts are ready." }}>
                  <MetaIcon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
                  {o.documents.length ? "Regenerate drafts" : isJob ? "Generate CV, cover letter & email" : "Generate pitch & proposal"}
                </SubmitButton>
              </form>
              {o.stage === "SENT" && (
                <form action={generateAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="what" value="followup" />
                  <SubmitButton className={btnGhost} pending="Writing follow-up…" blocking={{ title: "Writing your follow-up…" }}>
                    Draft a follow-up
                  </SubmitButton>
                </form>
              )}
            </div>
            {isJob && (
              <p className="mt-4 flex items-start gap-2 rounded-md bg-paper px-3 py-2.5 text-xs leading-snug text-ink-3">
                <MetaIcon d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 8h.01M11 12h1v4h1" />
                <span>
                  Red Star Standard <b>will {mention ? "" : "not "}be mentioned</b> in this application
                  {mention ? " (contract, fractional or AI-lead role)." : " (traditional full-time role)."}
                </span>
              </p>
            )}
            {!isJob && !o.company?.research && (
              <p className="mt-4 flex items-start gap-2 rounded-md bg-amber-soft px-3 py-2.5 text-sm text-warn-ink">
                <MetaIcon d="M12 3l9 16H3zM12 10v4M12 17h.01" />
                <span>
                  Research the company first so the pitch is specific:{" "}
                  <Link href={`${base}/companies/${o.companyId}`} className="font-semibold underline">
                    open company
                  </Link>
                </span>
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
                    Open PDF
                  </a>
                ) : null
              }
            >
              {d.kind === "CV" ? (
                <div className="text-sm text-muted">
                  <p>Built from your master CV. Open the PDF to review it.</p>
                  {d.subject && <pre className="mt-2 whitespace-pre-wrap rounded-md bg-paper p-2 text-xs">What changed: {d.subject}</pre>}
                </div>
              ) : d.kind === "PROPOSAL" ? (
                <div className="space-y-2 text-sm">
                  {d.subject && <pre className="whitespace-pre-wrap rounded-md bg-signal-soft p-3 text-xs text-ink-3">{d.subject}</pre>}
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 text-xs">{d.content}</pre>
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
                      <SubmitButton className={btn} pending="Creating Gmail draft…" blocking={{ title: "Creating your Gmail draft…" }}>
                        {gmail ? "Save & create Gmail draft" : "Save"}
                      </SubmitButton>
                      {gmail && (
                        <button formAction={saveDocAction} className={btnGhost}>
                          Save only
                        </button>
                      )}
                      {d.gmailDraftId && <span className="text-xs text-success">Draft saved in Gmail</span>}
                      {!gmail && (
                        <Link href={`${base}/settings`} className="text-xs link">
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
              {d.kind === "COVER_LETTER" && <p className="mt-2 text-xs text-muted">Text edits here update the email copy only; regenerate to rebuild the PDF.</p>}
              <p className="mt-2 text-xs text-muted">
                {d.provider}, {d.createdAt.toLocaleString("en-GB")}
              </p>
            </Card>
          ))}

          {o.description && (
            <Card index={2} title={isJob ? "Job description" : "Notes"}>
              <JobDescription text={o.description} title={o.title} />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {fit?.lines && (
            <Card index={3} title="Why this score">
              <ScoreHeadline score={o.fitScore} />
              <Breakdown lines={fit.lines} />
              {fit.trust && (
                <div
                  className={`mt-4 rounded-md border px-3.5 py-3 text-sm ${
                    fit.trust.level === "verified" || fit.trust.level === "ok" ? "border-success/30 bg-success-soft" : fit.trust.level === "unclear" ? "border-amber-soft bg-amber-soft" : "border-error/30 bg-error/10"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {fit.trust.level === "verified" || fit.trust.level === "ok" ? <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5" /> : <path d="M12 3l9 16H3zM12 10v4M12 17h.01" />}
                    </svg>
                    <span className={fit.trust.level === "suspicious" ? "text-error" : fit.trust.level === "unclear" ? "text-warn-ink" : "text-success"}>
                      {{ verified: "Verified employer", ok: "Looks genuine", unclear: "Unclear post", suspicious: "Possible scam" }[fit.trust.level]}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-ink-3">
                    {fit.trust.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Always check the employer&apos;s own website or LinkedIn page, and never pay to apply.</p>
                </div>
              )}
              {fit.excluded && <p className="mt-3 rounded-md bg-error/10 px-3 py-2 text-sm text-error">Auto-archived: {fit.excludeReason}</p>}
            </Card>
          )}
          {o.company && (
            <Card index={4} title="Company">
              <div className="flex items-center justify-between gap-3">
                <Link href={`${base}/companies/${o.company.id}`} className="min-w-0 truncate text-base font-semibold text-ink hover:underline">
                  {o.company.name}
                </Link>
                <TrackBadge track={o.company.recommendation} both={o.company.recommendBoth} />
              </div>
              {(o.company.industry || o.company.location) && <p className="mt-0.5 text-xs text-muted">{[o.company.industry, o.company.location].filter(Boolean).join(" · ")}</p>}
              <div className="mt-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">About</div>
                {o.company.about ? (
                  <>
                    <p className="text-sm leading-relaxed text-ink-3">{o.company.about}</p>
                    {Array.isArray(o.company.aboutSources) && o.company.aboutSources.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        Sources:
                        {(o.company.aboutSources as { title: string; url: string }[]).slice(0, 4).map((s) => (
                          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="link max-w-[10rem] truncate">
                            {s.title}
                          </a>
                        ))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">No profile yet. Search the web for a short factual summary of this company.</p>
                )}
                {!readOnly && (
                  <form action={aboutCompanyAction} className="mt-2">
                    <input type="hidden" name="id" value={o.company.id} />
                    <input type="hidden" name="oppId" value={o.id} />
                    <SubmitButton className="text-xs font-semibold link" pending="Searching the web…" blocking={{ title: "Researching the company online…", detail: "Searching the web for facts about this company." }}>
                      {o.company.about ? `Refresh (last updated ${o.company.aboutAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short" })})` : "Research this company online"}
                    </SubmitButton>
                  </form>
                )}
              </div>
              {o.company.recommendReason && <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm leading-snug text-ink-3">{o.company.recommendReason}</p>}
              <Link href={`${base}/companies/${o.company.id}`} className={`${btnGhost} mt-3 w-full`}>
                Research or edit company
              </Link>
            </Card>
          )}
          {isJob && (
            <Card index={5} title="Details (correct if wrong)">
              <form action={updateOpportunityAction} className="space-y-4 text-sm">
                <input type="hidden" name="id" value={o.id} />
                <fieldset className="space-y-2 border-0 p-0">
                  <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Role</legend>
                  <label className="block text-xs text-muted">
                    Location
                    <input name="location" defaultValue={o.location ?? ""} placeholder="e.g. Nairobi" className={`${input} mt-1`} />
                  </label>
                  <label className="block text-xs text-muted">
                    Employment type
                    <input name="employment" defaultValue={o.employment ?? ""} placeholder="full-time / contract / part-time" className={`${input} mt-1`} />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="remote" defaultChecked={o.remote} /> Remote role
                  </label>
                </fieldset>
                <fieldset className="space-y-2 border-0 p-0">
                  <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Pay</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs text-muted">
                      Min
                      <input name="salaryMin" type="number" defaultValue={o.salaryMin ?? ""} className={`${input} mt-1`} />
                    </label>
                    <label className="block text-xs text-muted">
                      Max
                      <input name="salaryMax" type="number" defaultValue={o.salaryMax ?? ""} className={`${input} mt-1`} />
                    </label>
                    <label className="block text-xs text-muted">
                      Currency
                      <input name="currency" defaultValue={o.currency ?? ""} placeholder="KES / USD" className={`${input} mt-1`} />
                    </label>
                    <label className="block text-xs text-muted">
                      Period
                      <select name="salaryPeriod" defaultValue={o.salaryPeriod ?? ""} className={`${input} mt-1`}>
                        <option value="">Not stated</option>
                        <option value="month">per month</option>
                        <option value="year">per year</option>
                        <option value="hour">per hour</option>
                      </select>
                    </label>
                  </div>
                </fieldset>
                <label className="block text-xs font-medium uppercase tracking-wide text-muted">
                  Follow up on
                  <input name="followUpAt" type="date" defaultValue={o.followUpAt?.toISOString().slice(0, 10) ?? ""} className={`${input} mt-1 normal-case tracking-normal`} />
                </label>
                <SubmitButton className={`${btnGhost} w-full`}>Save and re-score</SubmitButton>
              </form>
            </Card>
          )}
          <Card index={6} title="Activity">
            {o.activities.length === 0 ? (
              <p className="text-sm text-muted">Nothing yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-rule pl-5 text-sm">
                {o.activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span aria-hidden className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-signal ring-4 ring-white" />
                    <div className="leading-snug text-ink">{a.message}</div>
                    <time dateTime={a.createdAt.toISOString()} className="text-xs text-muted">
                      {a.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <form action={deleteOpportunityAction} className="rounded-md border border-error/30 px-4 py-3">
            <input type="hidden" name="id" value={o.id} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted">Removes this job, its drafts and activity.</p>
              <SubmitButton className="shrink-0 rounded-md border border-error/40 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10" pending="Deleting…" confirm="Delete this opportunity? This cannot be undone.">
                Delete
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </fieldset>
  );
}
