"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ATTACHMENT_ACCEPT, ATTACHMENT_TYPES, FEEDBACK_KINDS, fmtBytes, MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES } from "@/lib/feedback-shared";

const field = "w-full rounded-md border border-mist bg-white px-3 py-2 text-sm";

/**
 * The feedback form, used in the top-bar side sheet and in Settings: pick a type, write the message, optionally rate it,
 * attach screenshots / recordings / documents, and say how to reach you. Sent to /api/feedback (not a server action) so large files work.
 */
export function FeedbackForm({ page, name, email, onSent, compact = false }: { page: string; name: string; email: string; onSent?: () => void; compact?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("general");
  const [rating, setRating] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [contact, setContact] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError("");
    const next = [...files];
    for (const f of Array.from(list)) {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!ATTACHMENT_TYPES[ext]) return setError(`"${f.name}" is not an allowed type. Use an image, video (MP4, MOV, WebM), PDF or Word (.docx) file.`);
      if (f.size > MAX_FILE_BYTES) return setError(`"${f.name}" is too large (${fmtBytes(MAX_FILE_BYTES)} maximum per file).`);
      next.push(f);
    }
    if (next.length > MAX_FILES) return setError(`Attach at most ${MAX_FILES} files.`);
    if (next.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return setError(`The files are too large together (${fmtBytes(MAX_TOTAL_BYTES)} maximum).`);
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.delete("files");
      files.forEach((f) => fd.append("files", f));
      fd.set("kind", kind);
      fd.set("rating", rating ? String(rating) : "");
      fd.set("allowContact", contact ? "on" : "");
      const res = await fetch("/api/feedback", { method: "POST", body: fd });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !j?.ok) return setError(j?.error ?? "Could not send your feedback. Please try again.");
      setSent(true);
      formRef.current?.reset();
      setFiles([]);
      setRating(0);
      setKind("general");
      router.refresh();
      onSent?.();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <div className="space-y-3 text-sm" role="status">
        <p className="rounded-md bg-success-soft px-3 py-3 text-success">Thanks, your feedback was sent.{contact ? " We may get back to you using the contact details you gave." : ""}</p>
        <button type="button" onClick={() => setSent(false)} className="link text-sm font-medium">
          Send another
        </button>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4 text-sm" aria-label="Send feedback">
      <input type="hidden" name="page" value={page} />

      <fieldset>
        <legend className="mb-1.5 font-medium text-ink-3">What kind of feedback is it?</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((k) => (
            <label key={k.value} className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${kind === k.value ? "border-ink bg-ink text-white" : "border-mist bg-white text-ink-3 hover:bg-paper"}`}>
              <input type="radio" name="kind-choice" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block font-medium text-ink-3">{kind === "bug" ? "What went wrong? What did you expect?" : "Your message"}</span>
        <textarea name="message" required minLength={3} maxLength={4000} rows={compact ? 4 : 6} placeholder="Please don't paste passwords." className={field} />
      </label>

      <fieldset>
        <legend className="mb-1.5 font-medium text-ink-3">How is Opportuneer working for you? <span className="font-normal text-muted">(optional)</span></legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} out of 5`} onClick={() => setRating(rating === n ? 0 : n)} className={`h-8 w-8 rounded-md text-lg leading-none ${n <= rating ? "bg-warn-soft text-warn-ink" : "bg-paper text-mist hover:bg-paper-2"}`}>
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-1.5 font-medium text-ink-3">
          Attachments <span className="font-normal text-muted">(optional)</span>
        </div>
        <input ref={fileRef} type="file" name="files" multiple accept={ATTACHMENT_ACCEPT} onChange={(e) => addFiles(e.target.files)} className="sr-only" id="fb-files" />
        <label htmlFor="fb-files" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-mist bg-white px-3 py-2 text-xs font-medium text-ink-3 hover:bg-paper">
          + Add screenshots, a screen recording, PDF or Word file
        </label>
        <p className="mt-1 text-xs text-muted">Up to {MAX_FILES} files, {fmtBytes(MAX_FILE_BYTES)} each. Images, MP4/MOV/WebM video, PDF, .docx.</p>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-paper px-2 py-1 text-xs">
                <span className="truncate">{f.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-muted">
                  {fmtBytes(f.size)}
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-error hover:underline">
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset className="space-y-2 rounded-md border border-rule p-3">
        <legend className="px-1 font-medium text-ink-3">How can we get back to you?</legend>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} className="mt-0.5" />
          <span>You may contact me about this feedback</span>
        </label>
        {contact && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted">Name</span>
              <input name="contactName" defaultValue={name} maxLength={120} autoComplete="name" className={field} />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Email</span>
              <input name="contactEmail" type="email" defaultValue={email} maxLength={200} autoComplete="email" className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted">Phone or WhatsApp (optional)</span>
              <input name="contactPhone" type="tel" maxLength={40} autoComplete="tel" placeholder="+254…" className={field} />
            </label>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {busy ? (files.length ? "Uploading…" : "Sending…") : "Send feedback"}
      </button>
    </form>
  );
}
