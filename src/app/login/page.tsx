import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/auth-actions";
import { GoogleIcon } from "@/components/brand-icons";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/motion";
import { btn, Flash, input } from "@/components/ui";
import { loadConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const { auth } = await loadConfig();
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);
  const next = sp.next ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <LogoMark className="mx-auto h-14 w-14" />
      <h1 className="text-center text-2xl font-semibold text-ink">
        Welcome back
      </h1>
      <p className="text-center text-sm text-muted">Sign in to your workspace. Administrators sign in here too.</p>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="flex items-center justify-center gap-3 min-h-10 rounded-md border border-rule bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-2 active:bg-paper-3">
          <GoogleIcon size={20} />
          Continue with Google
        </a>
      )}
      {auth.allowPassword && (
        <form action={loginAction} className="space-y-3 rounded-md border border-rule bg-white p-5">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Email</span>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-sm font-medium text-ink-3">Password</span>
            <input name="password" type="password" required autoComplete="current-password" className={input} />
          </label>
          <SubmitButton className={`${btn} w-full`} pending="Signing in…">
            Sign in with email
          </SubmitButton>
        </form>
      )}
      <p className="text-center text-sm text-muted">
        No account yet?{" "}
        <Link href="/waitlist" className="link">
          Join the waitlist
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
