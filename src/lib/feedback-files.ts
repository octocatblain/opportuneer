import fs from "node:fs/promises";
import path from "node:path";
import { ATTACHMENT_TYPES, MAX_FILE_BYTES } from "@/lib/feedback-shared";

const ROOT = path.join(process.cwd(), "storage", "feedback");
export const feedbackDir = (feedbackId: string) => path.join(ROOT, feedbackId);

/** Does the start of the file look like the type its extension claims? Stops renamed executables and HTML. */
function looksRight(ext: string, b: Buffer): boolean {
  const at = (i: number, s: string) => b.subarray(i, i + s.length).toString("latin1") === s;
  switch (ext) {
    case ".png": return b[0] === 0x89 && at(1, "PNG");
    case ".jpg":
    case ".jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case ".gif": return at(0, "GIF8");
    case ".webp": return at(0, "RIFF") && at(8, "WEBP");
    case ".mp4":
    case ".mov": return at(4, "ftyp") || at(4, "moov") || at(4, "mdat") || at(4, "wide");
    case ".webm": return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    case ".pdf": return at(0, "%PDF-");
    case ".docx": return b[0] === 0x50 && b[1] === 0x4b;
    default: return false;
  }
}

/** Check one uploaded file. Returns an error message or the type details to store. */
export function checkAttachment(name: string, bytes: Buffer): { error: string } | { ext: string; mime: string } {
  const ext = path.extname(name).toLowerCase();
  const t = ATTACHMENT_TYPES[ext];
  if (!t) return { error: `"${name}" is not an allowed file type. Use an image, video (MP4, MOV, WebM), PDF or Word (.docx) file.` };
  if (!bytes.length) return { error: `"${name}" is empty.` };
  if (bytes.length > MAX_FILE_BYTES) return { error: `"${name}" is too large (25 MB maximum per file).` };
  if (!looksRight(ext, bytes)) return { error: `"${name}" doesn't look like a real ${ext.slice(1).toUpperCase()} file.` };
  return { ext, mime: t.mime };
}

export async function writeAttachment(feedbackId: string, attachmentId: string, ext: string, bytes: Buffer) {
  await fs.mkdir(feedbackDir(feedbackId), { recursive: true });
  const rel = path.posix.join("feedback", feedbackId, `${attachmentId}${ext}`);
  await fs.writeFile(path.join(process.cwd(), "storage", rel), bytes);
  return rel;
}

export async function removeFeedbackFiles(feedbackIds: string[]) {
  await Promise.all(feedbackIds.map((id) => fs.rm(feedbackDir(id), { recursive: true, force: true }).catch(() => {})));
}
