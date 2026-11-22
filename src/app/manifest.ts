import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Opportuneer",
    short_name: "Opportuneer",
    description: "Strategic job search and Red Star Standard client pipeline",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1f4",
    theme_color: "#0e1014",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
