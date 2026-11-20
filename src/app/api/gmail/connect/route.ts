import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authUrl } from "@/lib/gmail";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("gmail_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(authUrl(state));
}
