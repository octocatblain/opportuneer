import type { Metadata } from "next";
import { importJobAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Card, Flash, input } from "@/components/ui";

export const metadata: Metadata = { title: "Add job" };

export default async function AddJob({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Flash error={sp.error} />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Add a job</h1>
      <p className="text-sm text-slate-600">
        For LinkedIn, BrighterMonday, Fuzu or a company careers page: paste the full job text (LinkedIn blocks automated reading, so pasting is the safe way).
        For other public pages you can paste just the URL. The AI pulls out the title, company, pay and location, then scores the job.
      </p>
      <Card>
        <form action={importJobAction} className="space-y-3">
          <label className="block text-sm font-medium">
            Job URL (optional)
            <input name="url" type="url" placeholder="https://…" className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Job text
            <textarea name="text" rows={14} placeholder="Paste the whole job posting here…" className={`${input} mt-1 font-mono text-xs`} />
          </label>
          <SubmitButton className={btn} pending="Reading the job…">
            Add and score
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
