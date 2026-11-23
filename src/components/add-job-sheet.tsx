"use client";

import { importJobAction } from "@/app/actions";
import { Brand } from "@/components/brand-icons";
import { SideSheet } from "@/components/side-sheet";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal, input } from "@/components/ui";

/** "Add a job" form in a right-hand sidebar instead of its own page. Submitting scores the job and opens it. */
export function AddJobSheet({ open, onClose, error }: { open: boolean; onClose: () => void; error?: string | null }) {
  return (
    <SideSheet open={open} onClose={onClose} title="Add a job" widthClass="max-w-xl">
      <div className="space-y-4 text-sm">
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <p className="text-muted">
          For LinkedIn, BrighterMonday, Fuzu or a company careers page: paste the full job text (LinkedIn blocks automated reading, so pasting is the safe way).
          For other public pages you can paste just the URL. The AI pulls out the title, company, pay and location, then scores the job.
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
          Works with posts from:
          <Brand name="LinkedIn" />
          <Brand name="BrighterMonday" />
          <Brand name="Fuzu" />
          <Brand name="MyJobMag" />
        </p>
        <form action={importJobAction} className="space-y-4">
          <label className="block font-medium">
            Job URL (optional)
            <input name="url" type="url" placeholder="https://…" className={`${input} mt-1`} />
          </label>
          <label className="block font-medium">
            Job text
            <textarea name="text" rows={14} autoFocus placeholder="Paste the whole job posting here…" className={`${input} mt-1 text-sm`} />
          </label>
          <SubmitButton className={btnSignal} pending="Reading the job…" blocking={{ title: "Reading and scoring the job…", detail: "The AI is pulling out the title, company, pay and location." }}>
            Add and score
          </SubmitButton>
        </form>
      </div>
    </SideSheet>
  );
}
