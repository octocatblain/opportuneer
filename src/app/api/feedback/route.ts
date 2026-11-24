import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { db } from "@/lib/db";
import { rateLimited } from "@/lib/rate-limit";
import { checkAttachment, removeFeedbackFiles, writeAttachment } from "@/lib/feedback-files";
import { isFeedbackKind, MAX_FILES, MAX_TOTAL_BYTES } from "@/lib/feedback-shared";

/** Per person, per rolling 24 hours: at most this many messages and this many bytes of attachments. */
const MAX_PER_DAY = 25;
const MAX_DAILY_BYTES = 150 * 1024 * 1024;

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/** Any signed-in user: send feedback, optionally with contact details and attachments (images, video, PDF, Word). */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return bad("Not signed in", 401);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_TOTAL_BYTES + 1024 * 1024) return bad("That is too much to upload at once (50 MB maximum in total).", 413);
  if (await rateLimited(`feedback:${user.id}`, 10, 60 * 60 * 1000)) return bad("That's a lot of feedback in an hour. Please try again later.", 429);
  if (await rateLimited(`feedback-day:${user.id}`, MAX_PER_DAY, 24 * 60 * 60 * 1000)) return bad("You have reached today's feedback limit. Please try again tomorrow.", 429);
  // Daily upload budget per person, counted from what is actually stored, so the disk cannot be filled one request at a time.
  const sent = await db.feedbackAttachment.aggregate({ _sum: { size: true }, where: { feedback: { userId: user.id }, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  if ((sent._sum.size ?? 0) + Number(req.headers.get("content-length") ?? 0) > MAX_DAILY_BYTES) return bad("You have reached today's upload limit. Please try again tomorrow, or send the message without large files.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Could not read the upload. Try again with smaller files.");
  }
  const message = clean(form.get("message"), 4000);
  if (message.length < 3) return bad("Write a few words of feedback first.");
  const kindRaw = clean(form.get("kind"), 20);
  const kind = isFeedbackKind(kindRaw) ? kindRaw : "general";
  const r = Math.floor(Number(clean(form.get("rating"), 2)));
  const rating = r >= 1 && r <= 5 ? r : null;

  const allowContact = form.get("allowContact") === "on" || form.get("allowContact") === "true";
  const contactEmail = clean(form.get("contactEmail"), 200).toLowerCase();
  if (allowContact && contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return bad("That contact email doesn't look right.");

  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > MAX_FILES) return bad(`Attach at most ${MAX_FILES} files.`);
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return bad("The files are too large together (50 MB maximum in total).");
  // Validate every file before anything is saved.
  const checked: { name: string; bytes: Buffer; ext: string; mime: string }[] = [];
  for (const f of files) {
    const name = f.name.replace(/[\\/]/g, "_").slice(0, 150) || "file";
    const bytes = Buffer.from(await f.arrayBuffer());
    const c = checkAttachment(name, bytes);
    if ("error" in c) return bad(c.error);
    checked.push({ name, bytes, ext: c.ext, mime: c.mime });
  }

  const fb = await db.feedback.create({
    data: {
      userId: user.id,
      kind,
      rating,
      message,
      page: clean(form.get("page"), 200) || null,
      allowContact,
      contactName: allowContact ? clean(form.get("contactName"), 120) || null : null,
      contactEmail: allowContact ? contactEmail || user.email : null,
      contactPhone: allowContact ? clean(form.get("contactPhone"), 40) || null : null,
    },
    select: { id: true },
  });
  try {
    for (const c of checked) {
      const id = randomBytes(12).toString("hex");
      const rel = await writeAttachment(fb.id, id, c.ext, c.bytes);
      await db.feedbackAttachment.create({ data: { id, feedbackId: fb.id, name: c.name, mime: c.mime, size: c.bytes.length, path: rel } });
    }
  } catch {
    await db.feedback.delete({ where: { id: fb.id } }).catch(() => {});
    await removeFeedbackFiles([fb.id]);
    return bad("Could not save your attachments. Please try again.", 500);
  }
  void logEvent("feedback_sent", user.id, { kind, files: checked.length });
  return NextResponse.json({ ok: true });
}
