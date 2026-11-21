import Link from "next/link";
import { registerAction } from "@/app/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { btn, Flash, input } from "@/components/ui";
import { loadConfig } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const { auth } = await loadConfig();
  const first = (await db.user.count()) === 0;
  const google = auth.allowGoogle && Boolean(process.env.GOOGLE_CLIENT_ID);
  const next = sp.next ?? "";

  return (
    <div className="mx-auto max-w-sm space-y-4 pt-10">
      <h1 className="text-2xl font-bold">Create an account</h1>
      <p className="text-sm text-slate-600">
        {first ? "No accounts yet: the first one you create becomes the owner." : "Only emails on the allowed list (Settings → auth) can register."}
      </p>
      <Flash error={sp.error} />
      {google && (
        <a href={`/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="block rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-slate-50">
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
        <Link href="/login" className="text-rose-700 underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
