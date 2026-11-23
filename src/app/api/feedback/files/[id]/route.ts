import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canView, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ATTACHMENT_TYPES } from "@/lib/feedback-shared";

/** Open a feedback attachment: only the person who sent it and the administrator. Images and video show inline; documents download. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  const { id } = await params;
  const a = await db.feedbackAttachment.findUnique({ where: { id }, include: { feedback: { select: { userId: true } } } });
  if (!a || !canView(user, a.feedback.userId)) return new NextResponse("Not found", { status: 404 });
  const root = path.resolve(process.cwd(), "storage", "feedback");
  const file = path.resolve(process.cwd(), "storage", a.path);
  if (!file.startsWith(root + path.sep)) return new NextResponse("Not found", { status: 404 });
  const type = ATTACHMENT_TYPES[path.extname(file).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const inline = type.group !== "document";
    return new NextResponse(await fs.readFile(file), {
      headers: {
        "Content-Type": type.mime,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${a.name.replace(/[^\w.\- ]/g, "_")}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'; media-src 'self'; img-src 'self'",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
