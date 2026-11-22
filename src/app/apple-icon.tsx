import { ImageResponse } from "next/og";
import { MarkArt } from "@/components/brand-mark";
import { INK } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as src/app/icon.svg and the header LogoMark (full-bleed; iOS rounds the corners itself).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: INK }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <MarkArt tile={false} />
        </svg>
      </div>
    ),
    size,
  );
}
