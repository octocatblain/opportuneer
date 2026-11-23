import { NextResponse, type NextRequest } from "next/server";
import { getUser, isSuper } from "@/lib/auth";
import { inviteCohort, isCohort } from "@/lib/invites";
import { logEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// Spreadsheet apps run text starting with = + - @ as formulas, so neutralise those cells.
const cell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * Admin only. Invites every WAITING pilot entry in one cohort and returns the invitation links once, as a CSV download.
 * POST only: the session cookie is SameSite=Lax, so another site cannot trigger it.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || !isSuper(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (req.headers.get("origin") && new URL(req.headers.get("origin")!).origin !== req.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cohort = String((await req.formData()).get("cohort") ?? "");
  if (!isCohort(cohort)) return NextResponse.json({ error: "cohort must be A or B" }, { status: 400 });

  const { issued, skipped } = await inviteCohort(cohort, user.id, req.nextUrl.origin);
  void logEvent("cohort_invited", user.id, { cohort, count: issued.length });

  const lines = [["email", "name", "cohort", "invite_link", "expires_at", "note"].join(",")]
    .concat(issued.map((i) => [i.email, i.name, i.cohort, i.url, i.expiresAt, ""].map(cell).join(",")))
    .concat(skipped.map((s) => [s.email, "", cohort, "", "", `skipped: ${s.reason}`].map(cell).join(",")));
  return new NextResponse(lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="cohort-${cohort}-invites.csv"`, "cache-control": "no-store" },
  });
}
