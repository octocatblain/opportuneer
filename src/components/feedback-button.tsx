"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { submitFeedbackAction } from "@/app/feedback-actions";
import { SubmitButton } from "@/components/submit-button";
import { SideSheet } from "@/components/side-sheet";

/** "Feedback" button in the top bar on every signed-in page. Opens a right-hand sidebar form; the page you were on is sent with it. */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Send feedback"
        title="Feedback"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-4 hover:bg-paper-2 active:bg-paper-3"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>
      <SideSheet open={open} onClose={() => setOpen(false)} title="Send feedback">
        <form action={submitFeedbackAction} className="space-y-3 text-sm" aria-label="Send feedback">
          <input type="hidden" name="page" value={path} />
          <select name="kind" defaultValue="general" aria-label="Type" className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm">
            <option value="general">General feedback</option>
            <option value="bug">Something is broken</option>
            <option value="idea">Idea</option>
          </select>
          <textarea
            name="message"
            required
            minLength={3}
            maxLength={4000}
            rows={8}
            autoFocus
            placeholder="What should be better? Please don't paste passwords."
            className="w-full rounded-md border border-mist bg-white px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <SubmitButton className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white" pending="Sending…">
              Send
            </SubmitButton>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted underline">
              Cancel
            </button>
          </div>
        </form>
      </SideSheet>
    </div>
  );
}
