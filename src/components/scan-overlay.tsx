"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SideSheet } from "@/components/side-sheet";
import { Spinner } from "@/components/loading-overlay";

const POLL_MS = 2000;

/**
 * Full-screen blocking overlay shown while a job scan is running (started from
 * the app, on server startup, or by the scheduled task). Blocks clicks and,
 * via `inert`, keyboard focus on the rest of the page.
 */
export function ScanOverlay() {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const wasRunning = useRef(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const r = await fetch("/api/scan/status", { cache: "no-store" });
        const s = (await r.json()) as { running: boolean; startedAt: string | null };
        if (!alive) return;
        setStartedAt(s.running ? s.startedAt : null);
        if (wasRunning.current && !s.running) router.refresh(); // show the new jobs
        wasRunning.current = s.running;
      } catch {
        // server restarting or offline; try again next tick
      }
      if (alive) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    // Show the overlay immediately when a "Scan" form is submitted, before the first poll answers.
    const onSubmit = (e: SubmitEvent) => {
      if ((e.target as HTMLElement | null)?.closest("[data-scan-form]")) setStartedAt(new Date().toISOString());
    };
    document.addEventListener("submit", onSubmit, true);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [router]);

  const running = startedAt !== null;

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-app-shell]");
    els.forEach((el) => (el.inert = running));
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!running) return null;
  const secs = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
  const elapsed = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;

  return (
    <SideSheet label="Scan in progress" widthClass="max-w-lg">
      <div aria-live="polite" className="flex h-full flex-col">
        <div className="flex items-center gap-3 pt-4">
          <Spinner className="h-6 w-6 text-signal" />
          <span className="text-sm font-semibold text-ink-4">Scan in progress</span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold leading-tight text-ink">Scanning the job boards…</h2>
        <p className="mt-2 text-sm text-ink-4">The app is locked until the scan finishes. New jobs will appear automatically.</p>
        <div className="mt-8 flex items-end justify-between rounded-lg border border-rule p-4">
          <span className="text-sm text-ink-4">Elapsed</span>
          <span className="text-5xl font-semibold leading-none tabular-nums text-ink">{elapsed}</span>
        </div>
      </div>
    </SideSheet>
  );
}
