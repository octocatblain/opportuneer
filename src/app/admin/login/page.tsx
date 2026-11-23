import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/auth-actions";
import { GoogleIcon } from "@/components/brand-icons";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/motion";
import { btn, Flash, input } from "@/components/ui";
import { loadConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin sign in" };

/** Sign-in for the administrator (superuser). Clients use /login. There is no sign-up here. */
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const { auth } = await loadConfig();
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);
  const next = sp.next ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <LogoMark className="mx-auto h-14 w-14" />
      <h1 className="text-center text-2xl font-semibold text-ink">Administrator sign in</h1>
      <p className="text-center text-sm text-muted">Manage accounts, invitations and settings. You can also open any client workspace from here.</p>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start?area=admin${next ? `&next=${encodeURIComponent(next)}` : ""}`} className="flex items-center justify-center gap-3 min-h-10 rounded-md border border-rule bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-2 active:bg-paper-3">
          <GoogleIcon size={20} />
          Continue with Google
        </a>
      )}
      {auth.allowPassword && (
        <form action={loginAction} className="space-y-3 rounded-md border border-rule bg-white p-5">
          <input type="hidden" name="area" value="admin" />
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
            Sign in as administrator
          </SubmitButton>
        </form>
      )}
      <p className="text-center text-xs text-muted">
        Not an administrator?{" "}
        <Link href="/login" className="link">
          Client sign in
        </Link>
      </p>
    </div>
  );
}
