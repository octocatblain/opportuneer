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
    <div role="alertdialog" aria-modal="true" aria-live="polite" aria-label="Scan in progress" className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/70 backdrop-blur-md">
      <div className="relative mx-4 w-full max-w-md">
        <div aria-hidden className="absolute inset-x-6 -top-3 h-10 rounded-[28px] bg-ink-3" />
        <div aria-hidden className="absolute inset-x-3 -top-1.5 h-10 rounded-[28px] bg-ink-2" />
        <div className="relative rounded-[28px] bg-ink p-8 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <span aria-hidden className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-signal" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Scan in progress</span>
          </div>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight">
            Scanning the <span className="serif-accent">job boards</span>…
          </h2>
          <p className="mt-2 text-sm text-white/60">The app is locked until the scan finishes. New jobs will appear automatically.</p>
          <div className="mt-6 flex items-end justify-between">
            <span className="text-xs uppercase tracking-[0.14em] text-white/40">Elapsed</span>
            <span className="font-display text-5xl leading-none tabular-nums">{elapsed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
