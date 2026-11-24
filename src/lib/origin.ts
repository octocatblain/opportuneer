import type { NextRequest } from "next/server";

/**
 * The public origin the visitor used (https://opportuneer.redstarstandard.co.ke).
 * Behind the Apache proxy, req.nextUrl.origin is the internal listen address (https://localhost:3040),
 * which Google rejects as a redirect_uri. APP_URL wins when set; otherwise the proxy's forwarded headers.
 */
export function publicOrigin(req: NextRequest): string {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return req.nextUrl.origin;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
