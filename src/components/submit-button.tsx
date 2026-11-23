"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { confirmAlert } from "@/components/alerts";
import { Spinner } from "@/components/loading-overlay";
import { SideSheet } from "@/components/side-sheet";

export type Blocking = { title: string; detail?: string };

/**
 * Right-hand sheet shown while a long task runs. It has no close button, and the rest of the page is made `inert`
 * (no clicks, no keyboard focus) so nothing else can be started until the task finishes.
 */
function BlockingSheet({ title, detail }: Blocking) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-app-shell]");
    els.forEach((el) => (el.inert = true));
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      els.forEach((el) => (el.inert = false));
      clearInterval(t);
      window.removeEventListener("beforeunload", warn);
    };
  }, []);
  const elapsed = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
  return createPortal(
    <SideSheet label={title} widthClass="max-w-md" zClass="z-[110]">
      <div aria-live="polite" className="flex h-full flex-col">
        <div className="flex items-center gap-3 pt-4">
          <Spinner className="h-6 w-6 text-signal" />
          <span className="text-sm font-semibold text-ink-4">Working</span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold leading-tight text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-4">{detail ?? "The app is locked until this finishes."} Please keep this tab open.</p>
        <div className="mt-8 flex items-end justify-between border border-rule p-4">
          <span className="text-sm text-ink-4">Elapsed</span>
          <span className="text-5xl font-semibold leading-none tabular-nums text-ink">{elapsed}</span>
        </div>
      </div>
    </SideSheet>,
    document.body,
  );
}

export function SubmitButton({
  children,
  pending,
  className,
  confirm: confirmMessage,
  disabled,
  blocking,
}: {
  disabled?: boolean;
  children: React.ReactNode;
  pending?: string;
  className?: string;
  /** If set, the user must confirm in an alert before the form submits. */
  confirm?: string;
  /** For slow tasks: while pending, lock the whole app behind a right-hand sheet. */
  blocking?: Blocking;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={isPending || disabled}
        className={className}
        onClick={(e) => {
          if (!confirmMessage) return;
          const btn = e.currentTarget;
          const form = btn.form;
          if (btn.dataset.confirmed) {
            delete btn.dataset.confirmed;
            return;
          }
          e.preventDefault();
          void confirmAlert(confirmMessage).then((yes) => {
            if (!yes || !form) return;
            btn.dataset.confirmed = "1";
            form.requestSubmit(btn);
          });
        }}
      >
        {isPending ? (pending ?? "Working…") : children}
      </button>
      {isPending && blocking && <BlockingSheet {...blocking} />}
    </>
  );
}
