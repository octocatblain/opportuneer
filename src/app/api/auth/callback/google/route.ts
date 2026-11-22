import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { exchangeCode } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const url = req.nextUrl;
  const jar = await cookies();
  const expected = jar.get("gmail_oauth_state")?.value;
  jar.delete("gmail_oauth_state");
  const back = new URL("/settings", url.origin);
  if (url.searchParams.get("error")) {
    back.searchParams.set("error", `Google: ${url.searchParams.get("error")}`);
    return NextResponse.redirect(back);
  }
  if (!expected || expected !== url.searchParams.get("state")) {
    back.searchParams.set("error", "Gmail connection expired or was tampered with. Try again.");
    return NextResponse.redirect(back);
  }
  try {
    const t = await exchangeCode(user.id, url.searchParams.get("code") ?? "");
    if (!t.refresh_token) back.searchParams.set("error", "Google did not return a refresh token. Remove Opportuneer at myaccount.google.com/permissions and connect again.");
    else back.searchParams.set("ok", `Gmail connected${t.email ? ` as ${t.email}` : ""}`);
  } catch (e) {
    back.searchParams.set("error", (e as Error).message);
  }
  return NextResponse.redirect(back);
}
