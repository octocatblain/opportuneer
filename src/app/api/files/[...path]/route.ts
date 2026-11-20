import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { STORAGE_DIR } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const file = path.resolve(STORAGE_DIR, ...parts);
  if (!file.startsWith(path.resolve(STORAGE_DIR) + path.sep)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(data, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${path.basename(file)}"` },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
