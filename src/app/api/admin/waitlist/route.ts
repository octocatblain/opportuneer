import { NextResponse } from "next/server";
import { getUser, isSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Spreadsheet apps run text starting with = + - @ as formulas, so neutralise those cells.
const cell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

/** Admin-only CSV export of the waitlist. */
export async function GET() {
  const user = await getUser();
  if (!user || !isSuper(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.waitlistEntry.findMany({ orderBy: { seq: "asc" } });
  const head = ["seq", "email", "name", "track", "role", "occupation", "industry", "country", "source", "phase", "cohort", "status", "marketing_ok", "joined_at"];
  const lines = [head.join(",")].concat(
    rows.map((r) =>
      [r.seq, r.email, r.name, r.trackInterest, r.roleType, r.occupation, r.industry, r.country, r.source, r.phase, r.cohort, r.status, r.consentMarketing, r.createdAt].map(cell).join(","),
    ),
  );
  return new NextResponse(lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="waitlist.csv"', "cache-control": "no-store" },
  });
}
