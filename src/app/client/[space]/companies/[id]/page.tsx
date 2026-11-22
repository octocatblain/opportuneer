import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { researchCompanyAction, startPitchAction, updateCompanyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Breakdown, btn, btnGhost, Card, Flash, input, OppRow, ReadOnlyNotice, ScorePill, TrackBadge } from "@/components/ui";
import { canView, getUser, requireSpace } from "@/lib/auth";
import { clientBase, isSpace, spaceAllowsTrack } from "@/lib/spaces";
import { loadConfig } from "@/lib/config";
import { db } from "@/lib/db";
import type { ScoreLine } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ space: string; id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getUser();
  const c = viewer ? await db.company.findUnique({ where: { id }, select: { name: true, userId: true } }) : null;
  return { title: c && viewer && canView(viewer, c.userId) ? c.name : "Not found" };
}

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ space: string; id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { space, id } = await params;
  if (!isSpace(space)) notFound();
  const viewer = await requireSpace(space);
  const base = clientBase(space);
  const { industries } = await loadConfig();
  const sp = await searchParams;
  const c = await db.company.findUnique({
    where: { id },
    include: { user: { select: { email: true } }, opportunities: { orderBy: { createdAt: "desc" }, include: { company: { select: { name: true } } } } },
  });
  if (!c || !canView(viewer, c.userId)) notFound();
  const readOnly = c.userId !== viewer.id;
  const sb = c.scoreBreakdown as { lines: ScoreLine[]; canAffordFloor: boolean } | null;

  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-4 border-0 p-0">
      {readOnly && <ReadOnlyNotice owner={c.user.email} />}
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title">{c.name}</h1>
        <ScorePill score={c.score} />
        <TrackBadge track={c.recommendation} both={c.recommendBoth} />
        {c.website && (
          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" className="text-sm link">
            {c.website}
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card index={1} title="Recommendation">
            <p className="text-sm">{c.recommendReason ?? "Add details or research the company to get a recommendation."}</p>
            {sb && !sb.canAffordFloor && <p className="mt-2 text-sm text-warn-ink">Below your client floor: no sign they can afford a KES 60,000 Strategy Sprint or a retainer.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {spaceAllowsTrack(space, "PITCH") && <form action={startPitchAction}>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className={btn}>Start a Red Star Standard pitch</SubmitButton>
              </form>}
            </div>
          </Card>

          <Card index={2} title="Research">
            {c.research ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.research}</p> : <p className="text-sm text-muted">Not researched yet.</p>}
            <form action={researchCompanyAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <textarea name="extra" rows={3} placeholder="Optional: paste extra material (LinkedIn company page text, news article, annual report extract)…" className={input} />
              <SubmitButton className={btnGhost} pending="Reading their website and researching…">
                {c.research ? "Re-run research" : "Research this company"}
              </SubmitButton>
              <p className="text-xs text-muted">Reads their home, about and contact pages, plus your notes, then fills in the signals below.</p>
            </form>
          </Card>

          {sb && (
            <Card index={3} title="Score breakdown">
              <Breakdown lines={sb.lines} />
            </Card>
          )}

          <Card index={4} title="Opportunities">
            {c.opportunities.length === 0 ? <p className="text-sm text-muted">None yet.</p> : c.opportunities.map((o) => <OppRow key={o.id} o={o} base={base} />)}
          </Card>
        </div>

        <Card index={5} title="Signals (edit to correct)">
          <form action={updateCompanyAction} className="space-y-2 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <Field label="Website" name="website" value={c.website} />
            <label className="block">
              <span className="text-xs font-medium text-muted">Industry</span>
              <select name="industry" defaultValue={c.industry ?? ""} className={input}>
                <option value="">Other / unknown</option>
                {industries.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Location" name="location" value={c.location} />
            <Field label="Staff (estimate)" name="employees" value={c.employees?.toString()} type="number" />
            <Field label="Revenue / budget signal" name="revenueNote" value={c.revenueNote} />
            <label className="block">
              <span className="text-xs font-medium text-muted">AI maturity</span>
              <select name="aiMaturity" defaultValue={c.aiMaturity?.toString() ?? ""} className={input}>
                <option value="">Unknown</option>
                <option value="1">1: paper / Excel, no tech team</option>
                <option value="2">2: basic systems, no automation</option>
                <option value="3">3: some software, small IT team</option>
                <option value="4">4: in-house dev team</option>
                <option value="5">5: data / AI team</option>
              </select>
            </label>
            <Area label="Growth signals (one per line)" name="growthSignals" value={c.growthSignals} />
            <Area label="Recurring needs (one per line)" name="recurringNeeds" value={c.recurringNeeds} />
            <Field label="Contact name" name="contactName" value={c.contactName} />
            <Field label="Contact role" name="contactRole" value={c.contactRole} />
            <Field label="Contact email" name="contactEmail" value={c.contactEmail} type="email" />
            <Area label="Notes" name="notes" value={c.notes} />
            <SubmitButton className={btn}>Save and re-score</SubmitButton>
          </form>
          <Link href={`${base}/companies`} className="mt-3 block text-sm link">
            All companies
          </Link>
        </Card>
      </div>
    </fieldset>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value?: string | null; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} className={input} />
    </label>
  );
}

function Area({ label, name, value }: { label: string; name: string; value?: string | null }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <textarea name={name} rows={3} defaultValue={value ?? ""} className={input} />
    </label>
  );
}
