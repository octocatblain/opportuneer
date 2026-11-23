import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canView, getUser } from "@/lib/auth";
import { getProfile } from "@/lib/kyc";
import { STORAGE_DIR } from "@/lib/pdf";

/** Download your own uploaded resume (the superuser may pass ?user=<id>). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  const target = new URL(req.url).searchParams.get("user") ?? user.id;
  if (!canView(user, target)) return new NextResponse("Not found", { status: 404 });
  const row = await getProfile(target);
  if (!row?.resumePath || !row.resumeName) return new NextResponse("Not found", { status: 404 });
  const root = path.resolve(STORAGE_DIR, "resumes", target);
  const file = path.resolve(STORAGE_DIR, row.resumePath);
  if (!file.startsWith(root + path.sep)) return new NextResponse("Not found", { status: 404 });
  try {
    return new NextResponse(await fs.readFile(file), {
      headers: { "Content-Type": row.resumeMime || "application/octet-stream", "Content-Disposition": `attachment; filename="${row.resumeName.replace(/[^\w.\- ]/g, "_")}"`, "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
