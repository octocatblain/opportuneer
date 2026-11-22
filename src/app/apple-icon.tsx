import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Same mark as src/app/icon.svg and the header LogoMark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#9f1239" }}>
        <svg width="110" height="110" viewBox="0 0 24 24">
          <path fill="#fff" d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.4 5.8 21.1l1.6-7L2 9.3l7.1-.7z" />
        </svg>
      </div>
    ),
    size,
  );
}
