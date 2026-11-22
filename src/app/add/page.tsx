import type { Metadata } from "next";
import { importJobAction } from "@/app/actions";
import { Brand } from "@/components/brand-icons";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, Card, Flash, input, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add job" };

export default async function AddJob({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Flash error={sp.error} />
      <PageHeader
        title="Add a job"
      />
      <p className="-mt-4 text-sm text-muted">
        For LinkedIn, BrighterMonday, Fuzu or a company careers page: paste the full job text (LinkedIn blocks automated reading, so pasting is the safe way).
        For other public pages you can paste just the URL. The AI pulls out the title, company, pay and location, then scores the job.
      </p>
      <p className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        Works with posts from:
        <Brand name="LinkedIn" />
        <Brand name="BrighterMonday" />
        <Brand name="Fuzu" />
        <Brand name="MyJobMag" />
      </p>
      <Card>
        <form action={importJobAction} className="space-y-4">
          <label className="block text-sm font-medium">
            Job URL (optional)
            <input name="url" type="url" placeholder="https://…" className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Job text
            <textarea name="text" rows={14} placeholder="Paste the whole job posting here…" className={`${input} mt-1 text-sm`} />
          </label>
          <SubmitButton className={btnSignal} pending="Reading the job…">
            Add and score
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
