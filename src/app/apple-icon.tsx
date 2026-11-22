import { ImageResponse } from "next/og";
import { INK, SIGNAL, SPARK_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as src/app/icon.svg and the header LogoMark (full-bleed; iOS rounds the corners itself).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: INK }}>
        <svg width="180" height="180" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="28" cy="36" r="14" fill="none" stroke={SIGNAL} strokeWidth="8" />
          <path d={SPARK_PATH} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
          <path d={SPARK_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    size,
  );
}
