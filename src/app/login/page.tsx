import Link from "next/link";
import { loginAction } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Flash, input } from "@/components/ui";
import { loadConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const { auth } = await loadConfig();
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);
  const next = sp.next ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="block rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-slate-50">
          Continue with Google
        </a>
      )}
      {auth.allowPassword && (
        <form action={loginAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Email</span>
            <input name="email" type="email" required autoComplete="email" className={input} />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Password</span>
            <input name="password" type="password" required autoComplete="current-password" className={input} />
          </label>
          <SubmitButton className={`${btn} w-full`} pending="Signing in…">
            Sign in with email
          </SubmitButton>
        </form>
      )}
      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-rose-700 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
