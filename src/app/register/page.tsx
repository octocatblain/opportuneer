import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/auth-actions";
import { GoogleIcon } from "@/components/brand-icons";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/motion";
import { btn, Flash, input } from "@/components/ui";
import { redirect } from "next/navigation";
import { inviteForToken, SIGNUP_CLOSED } from "@/lib/auth";
import { loadConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string; invite?: string }> }) {
  const sp = await searchParams;
  // The page only exists for a valid invitation link.
  const invite = await inviteForToken(sp.invite);
  if (!invite) redirect(`/login?error=${encodeURIComponent(SIGNUP_CLOSED)}`);
  const token = sp.invite ?? "";
  const { auth } = await loadConfig();
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <LogoMark className="mx-auto h-14 w-14" />
      <h1 className="text-center text-2xl font-semibold text-ink">
        Join by invitation
      </h1>
      <p className="text-center text-sm text-muted">
        Invitation for <b className="text-ink">{invite!.email}</b>
      </p>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start?invite=${encodeURIComponent(token)}`} className="flex items-center justify-center gap-3 min-h-10 rounded-md border border-rule bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-2 active:bg-paper-3">
          <GoogleIcon size={20} />
          Sign up with Google
        </a>
      )}
      {auth.allowPassword && (
        <form action={registerAction} className="space-y-3 rounded-md border border-rule bg-white p-5">
          <input type="hidden" name="invite" value={token} />
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Name</span>
            <input name="name" autoComplete="name" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Email</span>
            <input value={invite!.email} readOnly aria-readonly className={`${input} bg-paper text-muted`} />
          </label>
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Password (10+ characters, letters and a number)</span>
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Confirm password</span>
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} />
          </label>
          <SubmitButton className={`${btn} w-full`} pending="Creating…">
            Create account
          </SubmitButton>
        </form>
      )}
      <p className="text-center text-xs text-muted">
        By creating an account you accept how we handle your data, set out in the{" "}
        <Link href="/privacy" className="link">
          privacy note
        </Link>
        . You can download or delete everything from Settings.
      </p>
      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-muted">
        <Link href="/" className="link">
          Back to home
        </Link>
      </p>
    </div>
  );
}
