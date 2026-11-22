import { ImageResponse } from "next/og";
import { BRAND_COLOR, STAR_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as src/app/icon.svg and the header LogoMark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLOR }}>
        <svg width="110" height="110" viewBox="0 0 24 24">
          <path fill="#fff" d={STAR_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
