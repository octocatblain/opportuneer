"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
    <div role="alertdialog" aria-modal="true" aria-live="polite" aria-label="Scan in progress" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
        <h2 className="text-lg font-semibold">Scanning job boards…</h2>
        <p className="mt-1 text-sm text-slate-600">The app is locked until the scan finishes. New jobs will appear automatically.</p>
        <p className="mt-3 text-xs tabular-nums text-slate-500">Elapsed {elapsed}</p>
      </div>
    </div>
  );
}
