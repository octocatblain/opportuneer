import type { NextConfig } from "next";

// Content-Security-Policy. Next.js adds small inline scripts for hydration, so script-src needs 'unsafe-inline' (a per-request
// nonce would force every page to render dynamically). Everything else is locked to this site; the only outside origin is
// Cloudflare Turnstile on the waitlist form. 'unsafe-eval' is development-only (React's debugging tools).
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com${dev ? " ws:" : ""}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: csp }] }];
  },
  // The automated tests build into their own folder so they never disturb a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["puppeteer-core", "@prisma/client"],
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Feedback attachments (screen recordings) go through /api/feedback, which the middleware sees first: let it pass up to 60 MB intact.
    middlewareClientMaxBodySize: "60mb",
    // Keep visited pages in the client router cache so moving between sidebar items (and back) is instant;
    // server actions and redirects still refresh it.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
