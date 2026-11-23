// Shared by the feedback form (browser) and the upload route (server): no Node imports here.

export const FEEDBACK_KINDS = [
  { value: "bug", label: "Something is broken", short: "Bug" },
  { value: "idea", label: "Idea or feature request", short: "Idea" },
  { value: "question", label: "Question", short: "Question" },
  { value: "praise", label: "Something I like", short: "Praise" },
  { value: "general", label: "General feedback", short: "General" },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["value"];
export const isFeedbackKind = (k: string): k is FeedbackKind => FEEDBACK_KINDS.some((x) => x.value === k);
export const kindShort = (k: string) => FEEDBACK_KINDS.find((x) => x.value === k)?.short ?? k;

/** Allowed attachments. The type is decided from the extension (and checked against the file's first bytes), never from what the browser claims. */
export const ATTACHMENT_TYPES: Record<string, { mime: string; group: "image" | "video" | "document" }> = {
  ".png": { mime: "image/png", group: "image" },
  ".jpg": { mime: "image/jpeg", group: "image" },
  ".jpeg": { mime: "image/jpeg", group: "image" },
  ".gif": { mime: "image/gif", group: "image" },
  ".webp": { mime: "image/webp", group: "image" },
  ".mp4": { mime: "video/mp4", group: "video" },
  ".mov": { mime: "video/quicktime", group: "video" },
  ".webm": { mime: "video/webm", group: "video" },
  ".pdf": { mime: "application/pdf", group: "document" },
  ".docx": { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", group: "document" },
};
export const ATTACHMENT_ACCEPT = Object.keys(ATTACHMENT_TYPES).join(",");
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
