import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BasicsForm, JobForm, PitchForm, ResumeForm } from "@/components/kyc-forms";
import { Chip, Flash } from "@/components/ui";
import { currentSession, isSuper, requireSpace } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { formDefaults, getProfile } from "@/lib/kyc";
import { isSpace, spaceAllowsTrack } from "@/lib/spaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile" };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

const href = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/** Per-track profile settings: the same forms as first-login onboarding, editable at any time. */
export default async function ProfilePage({ params, searchParams }: { params: Promise<{ space: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { space } = await params;
  if (!isSpace(space)) notFound();
  await requireSpace(space);
  const me = await currentSession();
  if (!me) redirect("/login");
  const sp = await searchParams;
  const row = await getProfile(me.user.id);
  const base = await loadConfig();
  const d = formDefaults(base, me.user, row);
  const here = `/client/${space}/profile`;
  const job = spaceAllowsTrack(space, "JOB");
  const pitch = spaceAllowsTrack(space, "PITCH");

  const b = d.basics;
  const links = [b.linkedin, b.github, b.portfolio].filter(Boolean).map((u) => ({ url: u as string, label: bare(u as string) }));

  // Completeness: each step links to the section that fixes it.
  const steps = [
    { id: "basics", label: "Contact details", done: !!(b.fullName && b.phone && b.location) },
    { id: "resume", label: "Resume", done: !!row?.resumeName },
    ...(job ? [{ id: "job", label: "Job targets", done: !!row?.jobPrefs && (d.job.titleKeys.length > 0 || d.job.customTitles.length > 0) }] : []),
    ...(pitch ? [{ id: "pitch", label: "Agency offer", done: !!row?.pitchPrefs && !!d.pitch.agencyName }] : []),
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />

      {/* Identity header */}
      <section className="rounded-md bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-signal-soft text-xl font-semibold text-signal-dark">
            {initials(b.fullName || me.user.email || "")}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="page-title truncate">{b.fullName || "Your profile"}</h1>
            <p className="mt-1 text-sm text-muted">{[b.location, me.user.email].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {job && <Chip tone="sky">Job track</Chip>}
              {pitch && <Chip tone="mint">Pitch track</Chip>}
              {b.noticePeriod && <Chip>Notice: {b.noticePeriod}</Chip>}
              {links.map((l) => (
                <a key={l.url} href={href(l.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-md bg-paper px-2 py-0.5 text-xs font-medium text-ink-3 hover:text-ink">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">Profile {pct}% complete</span>
              <span className="text-xs text-muted">
                {doneCount}/{steps.length}
              </span>
            </div>
            <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness" className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {steps.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={s.done ? "text-muted hover:text-ink" : "font-medium text-warn-ink hover:underline"}>
                    <span aria-hidden>{s.done ? "✓" : "○"}</span> {s.label}
                    <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-5 border-t border-rule pt-4 text-sm text-muted">What Opportuneer knows about you. Each track has its own targets; changes apply to new scans, scores and drafts straight away.</p>
      </section>

      {/* Sections: personal details side by side, track targets below at full width */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div id="basics" className="scroll-mt-20 lg:col-span-2">
          <BasicsForm defaults={d.basics} returnTo={here} />
        </div>
        <div id="resume" className="scroll-mt-20">
          <ResumeForm resume={row?.resumeName ? { name: row.resumeName, updatedAt: row.resumeUpdatedAt, chars: row.resumeText?.length ?? 0 } : null} returnTo={here} required={job} />
        </div>
      </div>
      {job && (
        <div id="job" className="scroll-mt-20">
          <JobForm defaults={d.job} returnTo={here} />
        </div>
      )}
      {pitch && (
        <div id="pitch" className="scroll-mt-20">
          <PitchForm defaults={d.pitch} returnTo={here} isOwner={isSuper(me.user)} />
        </div>
      )}
    </div>
  );
}
