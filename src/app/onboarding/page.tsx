import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BasicsForm, JobForm, PitchForm, ResumeForm } from "@/components/kyc-forms";
import { Flash, PageHeader } from "@/components/ui";
import { isSuper, requireUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { formDefaults, getProfile, missingSteps, type Step } from "@/lib/kyc";
import { homeFor } from "@/lib/spaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set up your profile" };

const TITLES: Record<Step, string> = { basics: "About you", resume: "Your resume", job: "Job search targets", pitch: "Your agency and offer" };
const BLURB: Record<Step, string> = { basics: "Name, contact and links for your CV", resume: "The CV every application is built from", job: "Titles, industries, pay and places", pitch: "Your services, prices and ideal client" };

/** First-login KYC: asks for each missing piece, one step at a time, then sends the account to its workspace. */
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const row = await getProfile(user.id);
  const todo = isSuper(user) ? [] : missingSteps(user.trackAccess, row);
  if (!todo.length) redirect(`${homeFor(user)}${sp.ok ? `?ok=${encodeURIComponent(sp.ok)}` : ""}`);

  const all: Step[] = ["basics", ...(user.trackAccess !== "PITCH" ? (["resume", "job"] as Step[]) : []), ...(user.trackAccess !== "JOB" ? (["pitch"] as Step[]) : [])];
  const step = todo[0];
  const base = await loadConfig();
  const d = formDefaults(base, user, row);
  const here = "/onboarding";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader
        eyebrow={`Step ${all.indexOf(step) + 1} of ${all.length}`}
        title={`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}: ${TITLES[step].toLowerCase()}`}
        sub="Tell Opportuneer what you are looking for. Everything here can be changed later under Profile."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
        <ol className="space-y-1 rounded-md bg-white p-3 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          {all.map((s, n) => {
            const done = !todo.includes(s);
            const current = s === step;
            return (
              <li key={s} aria-current={current ? "step" : undefined} className={`flex items-start gap-3 rounded-md px-3 py-2.5 ${current ? "bg-paper" : ""}`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-success-soft text-success" : current ? "bg-ink text-white" : "bg-paper text-muted"}`}>{done ? "✓" : n + 1}</span>
                <span className="leading-tight">
                  <span className={`block text-sm font-medium ${current ? "text-ink" : "text-ink-4"}`}>{TITLES[s]}</span>
                  <span className="block text-xs text-muted">{BLURB[s]}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="min-w-0">
          {step === "basics" && <BasicsForm defaults={d.basics} returnTo={here} saveLabel="Save and continue" />}
          {step === "resume" && <ResumeForm resume={row?.resumeName ? { name: row.resumeName, updatedAt: row.resumeUpdatedAt, chars: row.resumeText?.length ?? 0 } : null} returnTo={here} required />}
          {step === "job" && <JobForm defaults={d.job} returnTo={here} />}
          {step === "pitch" && <PitchForm defaults={d.pitch} returnTo={here} isOwner={false} />}
        </div>
      </div>
    </div>
  );
}
