/** Spinning loading icon. Inherits colour from `currentColor`. */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className={`${className} motion-safe:animate-spin`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Translucent backdrop with a centred loading icon. Covers the nearest positioned
 * ancestor by default; pass `fullscreen` to cover the viewport.
 */
export function Loading({ label = "Loading", fullscreen = false }: { label?: string; fullscreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`${fullscreen ? "fixed" : "absolute"} inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[2px]`}
    >
      <Spinner className="h-9 w-9 text-signal" />
      <span className="text-sm font-medium text-ink-4">{label}</span>
    </div>
  );
}
