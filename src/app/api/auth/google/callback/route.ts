import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { cfg, loadConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { normalizeEmail, registerMember, startSession } from "@/lib/auth";
import { landingFor } from "@/lib/spaces";

export async function GET(req: NextRequest) {
  await loadConfig();
  const url = req.nextUrl;
  const jar = await cookies();
  const expected = jar.get("g_state")?.value;
  const next = jar.get("g_next")?.value ?? "/";
  const inviteToken = jar.get("g_invite")?.value;
  jar.set("g_invite", "", { path: "/api/auth/google", maxAge: 0 });
  const admin = jar.get("g_area")?.value === "admin";
  jar.set("g_area", "", { path: "/api/auth/google", maxAge: 0 });
  jar.set("g_state", "", { path: "/api/auth/google", maxAge: 0 });
  jar.set("g_next", "", { path: "/api/auth/google", maxAge: 0 });

  const bounce = (msg: string) => NextResponse.redirect(new URL(`${admin ? "/admin/login" : "/login"}?error=${encodeURIComponent(msg)}`, url.origin));
  if (url.searchParams.get("error")) return bounce(`Google: ${url.searchParams.get("error")}`);
  if (!cfg().auth.allowGoogle) return bounce("Google sign-in is turned off.");
  if (!expected || expected !== url.searchParams.get("state")) return bounce("Sign-in expired or was tampered with. Try again.");

  // Exchange the code server-to-server; the id_token then comes straight from Google over TLS.
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") ?? "",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const t = (await res.json()) as { id_token?: string; error_description?: string };
  if (!res.ok || !t.id_token) return bounce(`Google sign-in failed: ${t.error_description ?? res.status}`);
  const claims = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString("utf8")) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    aud?: string;
  };
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID || !claims.email || !claims.email_verified) return bounce("Google did not return a verified email.");

  const email = normalizeEmail(claims.email);
  let user = (await db.user.findUnique({ where: { googleId: claims.sub } })) ?? (await db.user.findUnique({ where: { email } }));
  if (!user && admin) return bounce("That Google account is not an administrator.");
  if (!user) {
    const made = await registerMember({ token: inviteToken, name: claims.name ?? null, googleId: claims.sub, googleEmail: email });
    if ("error" in made) return bounce(made.error);
    user = made.user;
  } else if (!user.googleId) {
    user = await db.user.update({ where: { id: user.id }, data: { googleId: claims.sub, name: user.name ?? claims.name ?? null } });
  }
  if (admin && user.role !== "SUPERUSER") return bounce("That Google account is not an administrator.");
  if (!admin && user.role === "SUPERUSER") return bounce("Administrators sign in at /admin/login.");
  await startSession(user.id, "google");
  const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
  return NextResponse.redirect(new URL(landingFor(user, safe), url.origin));
}
