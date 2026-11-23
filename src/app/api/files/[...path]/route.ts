import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canView, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STORAGE_DIR } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  const { path: parts } = await params;
  // Files live under storage/<opportunityId>/...: only the owner (or the superuser) may open them.
  // Resolve the path FIRST and take the opportunity id from where it really lands, so "<mine>/../<theirs>/x" can't borrow my id.
  const root = path.resolve(STORAGE_DIR);
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep)) return new NextResponse("Not found", { status: 404 });
  const oppId = file.slice(root.length + 1).split(path.sep)[0];
  const opp = await db.opportunity.findUnique({ where: { id: oppId }, select: { userId: true } });
  if (!opp || !canView(user, opp.userId)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(data, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${path.basename(file)}"` },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
