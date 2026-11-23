import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BasicsForm, JobForm, PitchForm, ResumeForm } from "@/components/kyc-forms";
import { Flash, PageHeader } from "@/components/ui";
import { currentSession, isSuper, requireSpace } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { formDefaults, getProfile } from "@/lib/kyc";
import { isSpace, spaceAllowsTrack } from "@/lib/spaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile" };

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

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="Profile" sub="What Opportuneer knows about you. Each track has its own targets; changes apply to new scans, scores and drafts straight away." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <BasicsForm defaults={d.basics} returnTo={here} />
        <ResumeForm resume={row?.resumeName ? { name: row.resumeName, updatedAt: row.resumeUpdatedAt, chars: row.resumeText?.length ?? 0 } : null} returnTo={here} required={job} />
        {job && <JobForm defaults={d.job} returnTo={here} />}
        {pitch && <PitchForm defaults={d.pitch} returnTo={here} isOwner={isSuper(me.user)} />}
      </div>
    </div>
  );
}
