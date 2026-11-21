/**
 * Opportuneer mark: an orange "O" ring (the opportunity) with a white spark breaking its edge
 * (the one worth chasing, and a nod to Red Star Standard). Same artwork as src/app/icon.svg.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false">
      <rect width="64" height="64" rx="16" fill="#0e1014" />
      <circle cx="28" cy="36" r="14" fill="none" stroke="#ef4b23" strokeWidth="8" />
      <path
        d="M46 6 Q46 18 58 18 Q46 18 46 30 Q46 18 34 18 Q46 18 46 6 Z"
        fill="#ffffff"
        stroke="#0e1014"
        strokeWidth="3"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}
