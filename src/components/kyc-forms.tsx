import { removeResumeAction, saveBasicsAction, saveJobPrefsAction, savePitchPrefsAction, uploadResumeAction } from "@/app/kyc-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, btnGhost, Card, input } from "@/components/ui";
import type { Basics, JobPrefs, PitchPrefs } from "@/lib/kyc";
import { PRESET_FAMILIES, PRESET_INDUSTRIES, RESUME_ACCEPT } from "@/lib/kyc";

/**
 * The KYC forms, shared by first-login onboarding (/onboarding) and the per-track Profile page.
 * Each form saves its own section and returns to `returnTo` (a same-site path).
 */

const label = "block text-xs font-medium text-ink-3";
const hint = "text-xs text-muted";
const val = (n: number) => (Number.isFinite(n) ? String(n) : "");

function Field({ id, name, text, defaultValue, type = "text", required, placeholder, help, inline }: { id: string; name: string; text: string; defaultValue?: string; type?: string; required?: boolean; placeholder?: string; help?: string; inline?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={label}>
        {text}
        {required && <span className="text-error"> *</span>}
        {inline && help && <span className="font-normal text-muted"> · {help}</span>}
      </label>
      <input id={id} name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} className={input} />
      {!inline && help && <p className={hint}>{help}</p>}
    </div>
  );
}

function Checks({ name, items, selected }: { name: string; items: { key: string; label: string }[]; selected: string[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <label key={i.key} className="flex items-start gap-2 text-sm">
          <input type="checkbox" name={name} value={i.key} defaultChecked={selected.includes(i.key)} className="mt-1" />
          <span>{i.label}</span>
        </label>
      ))}
    </div>
  );
}

export function BasicsForm({ defaults, returnTo, saveLabel = "Save details" }: { defaults: Basics; returnTo: string; saveLabel?: string }) {
  return (
    <Card title="About you">
      {/* Container queries: 1 column when narrow, 2 in a medium card, 4 across when the card is wide */}
      <form action={saveBasicsAction} className="@container space-y-6 text-sm">
        <input type="hidden" name="returnTo" value={returnTo} />
        <fieldset className="space-y-3">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Contact and availability</legend>
          <div className="grid gap-x-4 gap-y-4 @lg:grid-cols-2 @3xl:grid-cols-4">
            <Field id="b-name" name="fullName" text="Full name" defaultValue={defaults.fullName} required />
            <Field id="b-phone" name="phone" text="Phone" defaultValue={defaults.phone} required placeholder="+254 7xx xxx xxx" />
            <Field id="b-loc" name="location" text="Based in" defaultValue={defaults.location} required placeholder="Nairobi, Kenya" />
            <Field id="b-notice" name="noticePeriod" text="Notice period" defaultValue={defaults.noticePeriod} placeholder="1 month" help="for cover letters" inline />
          </div>
        </fieldset>
        <fieldset className="space-y-3 border-t border-rule pt-5">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Online presence (optional)</legend>
          <div className="grid gap-x-4 gap-y-4 @lg:grid-cols-3">
            <Field id="b-li" name="linkedin" text="LinkedIn" defaultValue={defaults.linkedin} placeholder="linkedin.com/in/you" />
            <Field id="b-gh" name="github" text="GitHub" defaultValue={defaults.github} placeholder="github.com/you" />
            <Field id="b-pf" name="portfolio" text="Portfolio / website" defaultValue={defaults.portfolio} placeholder="yoursite.com" />
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <p className={hint}>
            <span className="text-error">*</span> required. Used on your CVs and cover letters.
          </p>
          <SubmitButton className={btn} pending="Saving…">
            {saveLabel}
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function ResumeForm({ resume, returnTo, required }: { resume: { name: string | null; updatedAt: Date | null; chars: number } | null; returnTo: string; required?: boolean }) {
  return (
    <Card title="Resume">
      {resume?.name ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-rule p-3 text-sm">
          <span>
            <b>{resume.name}</b>
            <span className="block text-xs text-muted">
              {resume.chars.toLocaleString()} characters read{resume.updatedAt ? `, uploaded ${resume.updatedAt.toLocaleDateString("en-GB")}` : ""}
            </span>
          </span>
          <span className="flex gap-2">
            <a href="/api/profile/resume" className={btnGhost}>
              Download
            </a>
            <form action={removeResumeAction}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className={btnGhost}>Remove</button>
            </form>
          </span>
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">{required ? "Required: " : ""}your CV is what every tailored application is built from.</p>
      )}
      <form action={uploadResumeAction} className="space-y-2 text-sm">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label htmlFor="resume-file" className={label}>
          {resume?.name ? "Replace resume" : "Upload resume"} (PDF, Word .docx, text, Markdown or HTML; 4 MB max)
        </label>
        <input id="resume-file" name="resume" type="file" accept={RESUME_ACCEPT} required className={input} />
        <SubmitButton className={btn} pending="Reading your resume…" blocking={{ title: "Reading your resume…" }}>
          Upload
        </SubmitButton>
      </form>
    </Card>
  );
}

export function JobForm({ defaults, returnTo, fx }: { defaults: JobPrefs; returnTo: string; fx: number }) {
  return (
    <Card title="Job search targets">
      <form action={saveJobPrefsAction} className="space-y-5 text-sm">
        <input type="hidden" name="returnTo" value={returnTo} />
        <fieldset className="space-y-2">
          <legend className={label}>
            Job titles you want <span className="text-error">*</span>
          </legend>
          <Checks name="titleKeys" items={PRESET_FAMILIES.map((f) => ({ key: f.key, label: f.label }))} selected={defaults.titleKeys} />
          <label htmlFor="j-titles" className={label}>
            Other titles (one per line)
          </label>
          <textarea id="j-titles" name="customTitles" rows={3} defaultValue={defaults.customTitles.join("\n")} placeholder={"Data Analyst\nProduct Manager"} className={input} />
          <p className={hint}>Job boards are searched for these, and only matching jobs are kept and scored.</p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={label}>Industries you prefer</legend>
          <Checks name="industryKeys" items={PRESET_INDUSTRIES.map((i) => ({ key: i.key, label: i.label }))} selected={defaults.industryKeys} />
          <label htmlFor="j-ind" className={label}>
            Other industries (one per line, optionally “Name: keyword, keyword”)
          </label>
          <textarea id="j-ind" name="customIndustries" rows={2} defaultValue={defaults.customIndustries.join("\n")} placeholder="Energy: solar, utilities, power" className={input} />
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="j-local" name="localMonthlyUsd" text="Pay floor, local roles (USD / month)" type="number" required defaultValue={val(defaults.localMonthlyUsd)} help={`≈ KES ${Number.isFinite(defaults.localMonthlyUsd) ? (defaults.localMonthlyUsd * fx).toLocaleString() : "…"} at KES ${fx}/USD`} />
          <Field id="j-remote" name="remoteMonthlyUsd" text="Pay floor, remote roles (USD / month)" type="number" required defaultValue={val(defaults.remoteMonthlyUsd)} />
        </div>

        <div className="space-y-1">
          <label htmlFor="j-loc" className={label}>
            Locations you would work in <span className="text-error">*</span>
          </label>
          <textarea id="j-loc" name="acceptedLocations" required rows={2} defaultValue={defaults.acceptedLocations.join(", ")} className={input} />
          <p className={hint}>Comma separated: cities, countries. Remote roles are always considered.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="j-ex" className={label}>
            Regions to exclude
          </label>
          <textarea id="j-ex" name="excludedRegions" rows={2} defaultValue={defaults.excludedRegions.join(", ")} className={input} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="abroadNeedsSponsorship" defaultChecked={defaults.abroadNeedsSponsorship} />
          Abroad only with visa sponsorship or relocation
        </label>
        <SubmitButton className={btn} pending="Saving…">
          Save job targets
        </SubmitButton>
      </form>
    </Card>
  );
}

export function PitchForm({ defaults, returnTo, isOwner }: { defaults: PitchPrefs; returnTo: string; isOwner: boolean }) {
  return (
    <Card title="Your agency and offer (pitch track)">
      <form action={savePitchPrefsAction} className="space-y-5 text-sm">
        <input type="hidden" name="returnTo" value={returnTo} />
        <p className={hint}>
          {isOwner ? "This is the owner profile (Red Star Standard). Other accounts set up their own agency here; they never see this one." : "Pitches and proposals are written for the business you describe here, using your own services and prices."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="p-name" name="agencyName" text="Agency / business name" required defaultValue={defaults.agencyName} />
          <Field id="p-site" name="website" text="Website" defaultValue={defaults.website} placeholder="youragency.co.ke" />
        </div>
        <Field id="p-tag" name="tagline" text="One-line description" defaultValue={defaults.tagline} placeholder="AI consulting and software for SMEs" />
        <div className="space-y-1">
          <label htmlFor="p-pk" className={label}>
            Priced packages (one per line)
          </label>
          <textarea id="p-pk" name="packages" rows={6} defaultValue={defaults.packages.join("\n")} placeholder={"Starter Package | 15000 | | 1 week | One working automation plus team training\nSupport retainer | 0 | 5000 | monthly | Hosting, updates, small improvements"} className={`${input} font-mono text-xs`} />
          <p className={hint}>Format: Name | price in KES | monthly fee in KES (optional) | duration | short summary.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="p-sv" className={label}>
            Other services you sell (comma or line separated)
          </label>
          <textarea id="p-sv" name="services" rows={3} defaultValue={defaults.services.join(", ")} className={input} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="p-floor" name="clientFloorKes" text="Smallest budget worth pitching (KES)" type="number" required defaultValue={val(defaults.clientFloorKes)} help="Prospects that clearly cannot afford this are scored down." />
          <Field id="p-fmax" name="foundingMax" text="Founding clients to offer the discount to" type="number" defaultValue={String(defaults.foundingMax)} help="0 = no founding offer." />
        </div>
        <Field id="p-found" name="foundingText" text="Founding-client offer (optional)" defaultValue={defaults.foundingText} placeholder="30% off the first project in exchange for a testimonial" />
        <div className="space-y-1">
          <label htmlFor="p-terms" className={label}>
            Payment terms (one per line)
          </label>
          <textarea id="p-terms" name="terms" rows={3} defaultValue={defaults.terms.join("\n")} className={input} />
        </div>
        <fieldset className="space-y-2">
          <legend className={label}>Industries you target</legend>
          <Checks name="industryKeys" items={PRESET_INDUSTRIES.map((i) => ({ key: i.key, label: i.label }))} selected={defaults.industryKeys} />
          <label htmlFor="p-ind" className={label}>
            Other industries (one per line, optionally “Name: keyword, keyword”)
          </label>
          <textarea id="p-ind" name="customIndustries" rows={2} defaultValue={defaults.customIndustries.join("\n")} className={input} />
        </fieldset>
        <SubmitButton className={btn} pending="Saving…">
          Save agency profile
        </SubmitButton>
      </form>
    </Card>
  );
}
