import type { Metadata } from "next";
import Link from "next/link";
import { deleteFeedbackAction, markAllFeedbackReadAction, saveFeedbackNoteAction, setFeedbackStatusAction } from "@/app/feedback-actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, PageHeader, input } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";
import { ATTACHMENT_TYPES, FEEDBACK_KINDS, fmtBytes, kindShort } from "@/lib/feedback-shared";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: feedback" };

type SP = { status?: string; kind?: string; q?: string };
const STATUSES = ["NEW", "READ", "RESOLVED"] as const;
const STATUS_LABEL: Record<string, string> = { NEW: "New", READ: "Read", RESOLVED: "Resolved" };
const KINDS = FEEDBACK_KINDS.map((k) => k.value);

export default async function AdminFeedback({ searchParams }: { searchParams: Promise<SP> }) {
  await requireSuper();
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const kind = KINDS.find((k) => k === sp.kind);
  const q = (sp.q ?? "").trim().slice(0, 100);

  const where: Prisma.FeedbackWhereInput = {
    ...(status ? { status } : {}),
    ...(kind ? { kind } : {}),
    ...(q ? { OR: [{ message: { contains: q, mode: "insensitive" } }, { adminNote: { contains: q, mode: "insensitive" } }, { contactEmail: { contains: q, mode: "insensitive" } }, { contactName: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }, { user: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [items, grouped, rating] = await Promise.all([
    db.feedback.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true, name: true } }, attachments: { orderBy: { createdAt: "asc" } } } }),
    db.feedback.groupBy({ by: ["status"], _count: true }),
    db.feedback.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
  ]);
  const count = (s: string) => grouped.find((g) => g.status === s)?._count ?? 0;
  const total = grouped.reduce((n, g) => n + g._count, 0);
  const avg = rating._avg.rating ? rating._avg.rating.toFixed(1) : null;

  const href = (o: SP) => {
    const p = new URLSearchParams();
    const m = { status, kind, q: q || undefined, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    return `/admin/feedback${p.size ? `?${p}` : ""}`;
  };
  const back = href({});
  const pill = (on: boolean) => `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${on ? "bg-ink text-white" : "bg-paper text-ink-3 hover:bg-paper-2"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        sub={`${total} message(s), ${count("NEW")} new${avg ? `, average rating ${avg}/5 from ${rating._count.rating}` : ""}.`}
        actions={
          <>
            {count("NEW") > 0 && (
              <form action={markAllFeedbackReadAction}>
                <input type="hidden" name="back" value={back} />
                <SubmitButton className="link text-sm font-medium" pending="Marking…">
                  Mark all as read
                </SubmitButton>
              </form>
            )}
            <Link href="/admin" className="link text-sm font-medium">
              Back to admin
            </Link>
          </>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ status: undefined })} className={pill(!status)}>
            All ({total})
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} className={pill(status === s)}>
              {STATUS_LABEL[s]} ({count(s)})
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
          <Link href={href({ kind: undefined })} className={pill(!kind)}>
            Any type
          </Link>
          {KINDS.map((k) => (
            <Link key={k} href={href({ kind: k })} className={pill(kind === k)}>
              {k}
            </Link>
          ))}
        </div>
        <form action="/admin/feedback" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {kind && <input type="hidden" name="kind" value={kind} />}
          <input name="q" defaultValue={q} placeholder="Search message, note, name or email…" aria-label="Search feedback" className={`${input} max-w-md`} />
          <button type="submit" className="rounded-md bg-paper px-4 text-sm font-medium text-ink-3 hover:bg-paper-2">
            Search
          </button>
          {(q || status || kind) && (
            <Link href="/admin/feedback" className="link self-center text-sm">
              Clear
            </Link>
          )}
        </form>
      </div>

      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{total === 0 ? "No feedback yet." : "Nothing matches these filters."}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {items.map((f) => {
              const who = f.contactName || f.user.name || f.user.email;
              const replyTo = f.allowContact ? f.contactEmail || f.user.email : null;
              const subject = `Re: your Opportuneer feedback`;
              const mail = replyTo ? `mailto:${replyTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Hi ${who.split(" ")[0] ?? "there"},\n\nThanks for your feedback:\n> ${f.message.split("\n").join("\n> ")}\n\n`)}` : null;
              const phone = f.allowContact ? f.contactPhone : null;
              const media = f.attachments.filter((a) => ATTACHMENT_TYPES[a.name.slice(a.name.lastIndexOf(".")).toLowerCase()]?.group !== "document");
              const docs = f.attachments.filter((a) => !media.includes(a));
              return (
                <li key={f.id} className={`space-y-2 py-4 ${f.status === "NEW" ? "border-l-2 border-signal pl-3" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-ink">{who}</span>
                    <span>{f.createdAt.toLocaleString("en-GB")}</span>
                    <Chip tone={f.kind === "bug" ? "cream" : f.kind === "idea" ? "sky" : f.kind === "praise" ? "mint" : f.kind === "question" ? "signal" : "light"}>{kindShort(f.kind)}</Chip>
                    {f.rating && <Chip tone="mint">{f.rating}/5</Chip>}
                    <Chip tone={f.status === "NEW" ? "signal" : f.status === "RESOLVED" ? "mint" : "light"}>{STATUS_LABEL[f.status] ?? f.status}</Chip>
                    {f.page && <span title="Page it was sent from">from {f.page}</span>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{f.message}</p>

                  <p className="text-xs text-muted">
                    {f.allowContact ? (
                      <>
                        Contact: {replyTo}
                        {phone && <> · {phone}</>}
                        {replyTo !== f.user.email && <> · account {f.user.email}</>}
                      </>
                    ) : (
                      <>Asked not to be contacted · account {f.user.email}</>
                    )}
                  </p>

                  {media.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {media.map((a) =>
                        a.mime.startsWith("video/") ? (
                          <video key={a.id} controls preload="metadata" src={`/api/feedback/files/${a.id}`} className="max-h-60 max-w-full rounded-md border border-rule" aria-label={a.name} />
                        ) : (
                          <a key={a.id} href={`/api/feedback/files/${a.id}`} target="_blank" rel="noreferrer" title={`${a.name} (${fmtBytes(a.size)})`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/feedback/files/${a.id}`} alt={a.name} loading="lazy" className="max-h-40 max-w-xs rounded-md border border-rule object-cover" />
                          </a>
                        ),
                      )}
                    </div>
                  )}
                  {docs.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-xs">
                      {docs.map((a) => (
                        <li key={a.id}>
                          <a href={`/api/feedback/files/${a.id}`} className="link inline-flex items-center gap-1 rounded-md bg-paper px-2 py-1">
                            {a.name} <span className="text-muted">({fmtBytes(a.size)})</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium">
                    {STATUSES.filter((s) => s !== f.status).map((s) => (
                      <form key={s} action={setFeedbackStatusAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="status" value={s} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton className="link" pending="Saving…">
                          {s === "NEW" ? "Mark as new" : s === "READ" ? "Mark as read" : "Mark resolved"}
                        </SubmitButton>
                      </form>
                    ))}
                    {mail && (
                      <a href={mail} className="link">
                        Reply by email
                      </a>
                    )}
                    {phone && (
                      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="link">
                        Call
                      </a>
                    )}
                    <form action={deleteFeedbackAction} className="ml-auto">
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="back" value={back} />
                      <SubmitButton className="link" pending="Deleting…" confirm="Delete this feedback?">
                        Delete
                      </SubmitButton>
                    </form>
                  </div>

                  <details className="text-xs" open={!!f.adminNote}>
                    <summary className="cursor-pointer text-muted">{f.adminNote ? "Private note" : "Add private note"}</summary>
                    <form action={saveFeedbackNoteAction} className="mt-2 flex items-start gap-2">
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="back" value={back} />
                      <textarea name="note" rows={2} maxLength={2000} defaultValue={f.adminNote ?? ""} placeholder="Only you can see this" aria-label="Private note" className={input} />
                      <SubmitButton className="link shrink-0 font-medium" pending="Saving…">
                        Save
                      </SubmitButton>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
