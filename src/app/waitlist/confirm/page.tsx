import type { Metadata } from "next";
import Link from "next/link";
import { confirmWaitlistAction } from "@/app/waitlist-actions";
import { SubmitButton } from "@/components/submit-button";
import { btnSignal } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your place", robots: { index: false } };

/**
 * Landing page for the emailed confirmation link. Nothing happens on page load, only when the button is pressed:
 * email security scanners and link previewers open links automatically and must not be able to claim a place.
 */
export default async function ConfirmWaitlist({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-lg space-y-5 pt-24 text-center">
      <h1 className="page-title" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
        Confirm your place
      </h1>
      {token ? (
        <form action={confirmWaitlistAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <p className="text-base leading-relaxed text-muted">Press the button to confirm your email address and reserve your place on the Opportuneer waitlist.</p>
          <SubmitButton className={`${btnSignal} mx-auto`} pending="Confirming…">
            Confirm my place
          </SubmitButton>
        </form>
      ) : (
        <p className="text-base leading-relaxed text-muted">This link is incomplete. Open the link from your email again, or join the waitlist again.</p>
      )}
      <Link href="/waitlist" className="link text-sm font-medium">
        Back to the waitlist
      </Link>
    </div>
  );
}
