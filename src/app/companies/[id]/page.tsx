import Link from "next/link";
import { notFound } from "next/navigation";
import { researchCompanyAction, startPitchAction, updateCompanyAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Breakdown, btn, btnGhost, Card, Flash, input, OppRow, ScorePill, TrackBadge } from "@/components/ui";
import { industries } from "@/config/profile";
import { db } from "@/lib/db";
import type { ScoreLine } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await db.company.findUnique({
    where: { id },
    include: { opportunities: { orderBy: { createdAt: "desc" }, include: { company: { select: { name: true } } } } },
  });
  if (!c) notFound();
  const sb = c.scoreBreakdown as { lines: ScoreLine[]; canAffordFloor: boolean } | null;

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <ScorePill score={c.score} />
        <TrackBadge track={c.recommendation} both={c.recommendBoth} />
        {c.website && (
          <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" className="text-sm text-sky-700 hover:underline">
            {c.website}
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Recommendation">
            <p className="text-sm">{c.recommendReason ?? "Add details or research the company to get a recommendation."}</p>
            {sb && !sb.canAffordFloor && <p className="mt-2 text-sm text-amber-700">Below your client floor: no sign they can afford a KES 60,000 Strategy Sprint or a retainer.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={startPitchAction}>
                <input type="hidden" name="id" value={c.id} />
                <SubmitButton className={btn}>Start a Red Star Standard pitch</SubmitButton>
              </form>
            </div>
          </Card>

          <Card title="Research">
            {c.research ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.research}</p> : <p className="text-sm text-slate-500">Not researched yet.</p>}
            <form action={researchCompanyAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <textarea name="extra" rows={3} placeholder="Optional: paste extra material (LinkedIn company page text, news article, annual report extract)…" className={input} />
              <SubmitButton className={btnGhost} pending="Reading their website and researching…">
                {c.research ? "Re-run research" : "Research this company"}
              </SubmitButton>
              <p className="text-xs text-slate-500">Reads their home, about and contact pages, plus your notes, then fills in the signals below.</p>
            </form>
          </Card>

          {sb && (
            <Card title="Score breakdown">
              <Breakdown lines={sb.lines} />
            </Card>
          )}

          <Card title="Opportunities">
            {c.opportunities.length === 0 ? <p className="text-sm text-slate-500">None yet.</p> : c.opportunities.map((o) => <OppRow key={o.id} o={o} />)}
          </Card>
        </div>

        <Card title="Signals (edit to correct)">
          <form action={updateCompanyAction} className="space-y-2 text-sm">
            <input type="hidden" name="id" value={c.id} />
            <Field label="Website" name="website" value={c.website} />
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Industry</span>
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
              <span className="text-xs font-medium text-slate-600">AI maturity</span>
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
          <Link href="/companies" className="mt-3 block text-sm text-sky-700 hover:underline">
            ← All companies
          </Link>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value?: string | null; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input name={name} type={type} defaultValue={value ?? ""} className={input} />
    </label>
  );
}

function Area({ label, name, value }: { label: string; name: string; value?: string | null }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <textarea name={name} rows={3} defaultValue={value ?? ""} className={input} />
    </label>
  );
}
