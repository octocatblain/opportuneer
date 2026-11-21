import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cfg, loadConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  await loadConfig();
  const origin = req.nextUrl.origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !cfg().auth.allowGoogle) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Google sign-in is not available.")}`, origin));
  const state = randomBytes(16).toString("hex");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state,
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
  const opts = { httpOnly: true, sameSite: "lax" as const, maxAge: 600, path: "/api/auth/google", secure: process.env.NODE_ENV === "production" };
  res.cookies.set("g_state", state, opts);
  res.cookies.set("g_next", next, opts);
  return res;
}
