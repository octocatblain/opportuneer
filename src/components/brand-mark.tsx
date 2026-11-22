import { INK, SIGNAL, SPARK_PATH } from "@/lib/brand";

/**
 * Inner artwork of the mark, shared by BrandMark, LogoMark and the apple icon.
 * With `tile` (default) it is the white spark on the dark tile. Without it the mark has no background:
 * the spark turns ink and a mask cuts the gap out of the ring, so it works on any surface.
 */
export function MarkArt({ tile = true, maskId = "mark-cut" }: { tile?: boolean; maskId?: string }) {
  if (!tile) {
    return (
      <>
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect width="64" height="64" fill="#fff" />
            <path d={SPARK_PATH} fill="#000" stroke="#000" strokeWidth="6" strokeLinejoin="round" />
          </mask>
        </defs>
        <circle cx="28" cy="36" r="14" fill="none" stroke={SIGNAL} strokeWidth="8" mask={`url(#${maskId})`} />
        <path d={SPARK_PATH} fill={INK} />
      </>
    );
  }
  return (
    <>
      <rect width="64" height="64" rx="16" fill={INK} />
      <circle cx="28" cy="36" r="14" fill="none" stroke={SIGNAL} strokeWidth="8" />
      <path d={SPARK_PATH} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d={SPARK_PATH} fill="#ffffff" />
    </>
  );
}

/**
 * "Opportuneer" wordmark. `tone="dark"` (default) is for dark backgrounds: the double "e" is stylised, the
 * second (white) e sits over the first (signal orange), nudged right so only the first e's left quarter shows.
 * `tone="light"` is the same wordmark in ink for light backgrounds.
 */
export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const fg = tone === "light" ? "text-ink" : "text-white";
  return (
    <span className={className} aria-label="Opportuneer">
      <span aria-hidden>
        Opportun
        <span className={fg} style={{ position: "relative", zIndex: 1, WebkitTextStroke: tone === "light" ? "0.14em #fff" : "0.14em var(--color-ink)", paintOrder: "stroke fill" }}>
          e
        </span>
        <span className={fg} style={{ marginLeft: "-0.14em" }}>
          e
        </span>
        <span className={fg}>r</span>
      </span>
    </span>
  );
}

/**
 * Opportuneer mark: an orange "O" ring (the opportunity) with a spark breaking its edge
 * (the one worth chasing, and a nod to Red Star Standard). Same artwork as src/app/icon.svg.
 * Pass `tile={false}` for the background-free version used on light surfaces.
 */
export function BrandMark({ size = 28, className, tile = true }: { size?: number; className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden focusable="false">
      <MarkArt tile={tile} />
    </svg>
  );
}
