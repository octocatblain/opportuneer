"use client";

import { useEffect } from "react";

/**
 * Right-hand slide-over panel with a translucent backdrop (replaces centred modals).
 * Width defaults to ~28rem; override via `widthClass`. Pass `onClose` to make it
 * dismissible (backdrop click, Escape, close button); omit it for a blocking sheet.
 */
export function SideSheet({
  open = true,
  title,
  onClose,
  widthClass = "max-w-md",
  children,
  label,
  zClass = "z-[100]",
}: {
  open?: boolean;
  title?: React.ReactNode;
  onClose?: () => void;
  widthClass?: string;
  children: React.ReactNode;
  label?: string;
  zClass?: string;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${zClass} flex justify-end`}>
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] motion-safe:animate-[sheet-fade_.2s_ease-out]" />
      <aside
        role="alertdialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === "string" ? title : undefined)}
        className={`relative flex h-full w-full ${widthClass} flex-col overflow-y-auto bg-white shadow-pop motion-safe:animate-[sheet-in_.25s_ease-out] sm:rounded-l-2xl`}
      >
        {(title || onClose) && (
          <header className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-ink-4 hover:bg-paper-2 active:bg-paper-3">
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </header>
        )}
        <div className="flex-1 px-6 pb-6 pt-2">{children}</div>
      </aside>
    </div>
  );
}
