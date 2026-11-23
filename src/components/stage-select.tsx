"use client";

import { useRef } from "react";
import { setStageAction } from "@/app/actions";
import { STAGE_LABEL, STAGES } from "@/components/ui";

const DOT: Record<string, string> = {
  FOUND: "bg-mist",
  SHORTLISTED: "bg-sky-500",
  DRAFTED: "bg-amber-500",
  SENT: "bg-signal",
  REPLIED: "bg-violet-500",
  INTERVIEW: "bg-violet-600",
  WON: "bg-success",
  LOST: "bg-error",
  ARCHIVED: "bg-mist",
};

/** Stage picker that saves the moment you choose (no separate "Update" button). */
export function StageSelect({ id, stage }: { id: string; stage: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setStageAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="stage-select" className="text-xs font-medium uppercase tracking-wide text-muted">
        Stage
      </label>
      <div className="relative">
        <span aria-hidden className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${DOT[stage] ?? "bg-mist"}`} />
        <select
          id="stage-select"
          name="stage"
          defaultValue={stage}
          onChange={() => form.current?.requestSubmit()}
          className="min-h-10 min-w-48 appearance-none rounded-md border border-rule bg-white py-2 pl-8 pr-9 text-sm font-semibold text-ink transition-colors hover:border-ink-3 disabled:opacity-60"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </form>
  );
}
