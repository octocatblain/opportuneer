import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/auth-actions";
import { GoogleIcon } from "@/components/brand-icons";
import { SubmitButton } from "@/components/submit-button";
import { LogoMark } from "@/components/motion";
import { btn, Flash, input } from "@/components/ui";
import { loadConfig } from "@/lib/config";
import { seatFree } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const { auth } = await loadConfig();
  const open = await seatFree();
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);
  const next = sp.next ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <LogoMark className="mx-auto h-14 w-14" />
      <h1 className="text-center text-3xl font-semibold tracking-tight text-ink">
        Join by <em className="serif-accent">invitation</em>
      </h1>
      <p className="text-sm text-slate-600">
        {open ? "Opportuneer has one seat for an invited user. Use the email address the owner invited." : "The invited-user seat is already taken, so new accounts cannot be created."}
      </p>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="flex items-center justify-center gap-3 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-ink">
          <GoogleIcon size={20} />
          Sign up with Google
        </a>
      )}
      {auth.allowPassword && (
        <form action={registerAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input name="name" autoComplete="name" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Password (10+ characters, letters and a number)</span>
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Confirm password</span>
            <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} />
          </label>
          <SubmitButton className={`${btn} w-full`} pending="Creating…">
            Create account
          </SubmitButton>
        </form>
      )}
      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="link">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-ink-4">
        <Link href="/" className="link">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
