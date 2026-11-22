import type { Metadata } from "next";
import Link from "next/link";
import { deleteFeedbackAction } from "@/app/feedback-actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, Chip, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: feedback" };

export default async function AdminFeedback() {
  await requireSuper();
  const items = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { email: true, name: true } } } });
  const rated = items.filter((i) => i.rating);
  const avg = rated.length ? (rated.reduce((n, i) => n + (i.rating ?? 0), 0) / rated.length).toFixed(1) : null;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        sub={`${items.length} message(s)${avg ? `, average rating ${avg}/5` : ""}.`}
        actions={
          <Link href="/admin" className="link text-sm font-medium">
            Back to admin
          </Link>
        }
      />
      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-muted">No feedback yet.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {items.map((f) => (
              <li key={f.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-medium text-ink">{f.user.name ?? f.user.email}</span>
                  <span>{f.createdAt.toLocaleString("en-GB")}</span>
                  <Chip tone={f.kind === "bug" ? "cream" : f.kind === "idea" ? "sky" : "light"}>{f.kind}</Chip>
                  {f.rating && <Chip tone="mint">{f.rating}/5</Chip>}
                  <form action={deleteFeedbackAction} className="ml-auto">
                    <input type="hidden" name="id" value={f.id} />
                    <SubmitButton className="link text-xs font-medium" pending="Deleting…" confirm="Delete this feedback?">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
                <p className="whitespace-pre-wrap text-sm">{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
