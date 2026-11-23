import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSuper, requireUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { authUrl } from "@/lib/gmail";
import { rateLimited } from "@/lib/rate-limit";

export async function GET() {
  const me = await requireUser();
  if (rateLimited(`gmail-connect:${me.id}`, 10, 15 * 60 * 1000)) return new NextResponse("Too many attempts. Try again in a few minutes.", { status: 429 });
  await loadConfig();
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("gmail_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  // Clients are pre-filled with their own email, not the owner's configured Gmail account.
  return NextResponse.redirect(authUrl(state, isSuper(me) ? undefined : me.email));
}
