import { INK, SIGNAL, SPARK_PATH } from "@/lib/brand";

/** Inner artwork of the mark, shared by BrandMark, LogoMark and the apple icon. Draws the knockout stroke first, then the white fill (no paint-order reliance). */
export function MarkArt({ tile = true }: { tile?: boolean }) {
  return (
    <>
      {tile && <rect width="64" height="64" rx="16" fill={INK} />}
      <circle cx="28" cy="36" r="14" fill="none" stroke={SIGNAL} strokeWidth="8" />
      <path d={SPARK_PATH} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d={SPARK_PATH} fill="#ffffff" />
    </>
  );
}

/**
 * Opportuneer mark: an orange "O" ring (the opportunity) with a white spark breaking its edge
 * (the one worth chasing, and a nod to Red Star Standard). Same artwork as src/app/icon.svg.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false">
      <MarkArt />
    </svg>
  );
}
