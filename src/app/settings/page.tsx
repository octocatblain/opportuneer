import type { Metadata } from "next";
import { disconnectGmailAction } from "@/app/actions";
import { changePasswordAction, logoutAction, revokeOtherSessionsAction, revokeSessionAction } from "@/app/auth-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand-icons";
import { currentSession, isSuper } from "@/lib/auth";
import { db } from "@/lib/db";
import { btn, btnGhost, Card, Flash } from "@/components/ui";
import { loadConfig } from "@/lib/config";
import { getSetting } from "@/lib/db";
import { gmailAccount, gmailConfigured } from "@/lib/gmail";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export const metadata: Metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const me = await currentSession();
  if (!me) redirect("/login");
  const sessions = await db.session.findMany({ where: { userId: me.user.id }, orderBy: { lastSeenAt: "desc" } });
  const full = await loadConfig();
  const [gmail, scan] = await Promise.all([gmailAccount(me.user.id), getSetting<Scan>(`lastScan:${me.user.id}`, null)]);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title tracking-tight text-ink">Settings</h1>
        {isSuper(me.user) && (
          <Link href="/admin" className={btnGhost}>
            Admin area →
          </Link>
        )}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card index={1} title={<Brand name="Gmail" label="Gmail (drafts only)" size={20} />}>
          {gmail ? (
            <div className="space-y-3 text-sm">
              <p>
                Connected as <b>{gmail}</b>. Opportuneer creates drafts in this account; you always send them yourself.
              </p>
              <form action={disconnectGmailAction}>
                <button className={btnGhost}>Disconnect</button>
              </form>
            </div>
          ) : gmailConfigured() ? (
            <div className="space-y-3 text-sm">
              <p>Google credentials found. Connect your Gmail account to start creating drafts.</p>
              <a href="/api/gmail/connect" className={btn}>
                Connect Gmail
              </a>
            </div>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Go to console.cloud.google.com and create a project called “Opportuneer”.</li>
              <li>APIs &amp; Services → Library → enable the <b>Gmail API</b>.</li>
              <li>OAuth consent screen → External, Testing mode → add your Gmail address as a test user.</li>
              <li>
                Credentials → Create OAuth client ID → Web application. Authorised redirect URI: <code className="rounded-md bg-canvas px-1.5">http://localhost:3000/api/auth/callback/google</code>
              </li>
              <li>
                Paste the Client ID and Secret into <code className="rounded-md bg-canvas px-1.5">.env</code> as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the app.
              </li>
            </ol>
          )}
        </Card>

        <Card title="Account & sessions">
          <p className="text-sm">
            Signed in as <b>{me?.user.email}</b>
            {me?.user.googleId ? " (Google linked)" : ""}. Sessions last {full.auth.sessionDays} days and renew while you use the app.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded border border-slate-200 p-2">
                <span>
                  <b>{s.id === me?.sessionId ? "This device" : "Other device"}</b> · {s.method}
                  <br />
                  {(s.userAgent ?? "unknown browser").slice(0, 70)} · {s.ip ?? "?"}
                  <br />
                  Last active {s.lastSeenAt.toLocaleString("en-GB")} · expires {s.expiresAt.toLocaleDateString("en-GB")}
                </span>
                {s.id !== me?.sessionId && (
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className={btnGhost}>Revoke</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <form action={revokeOtherSessionsAction}>
              <button className={btnGhost}>Sign out other devices</button>
            </form>
            <form action={logoutAction}>
              <button className={btnGhost}>Sign out</button>
            </form>
          </div>
          <form action={changePasswordAction} className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
            <p className="text-xs font-medium text-slate-600">{me?.user.passwordHash ? "Change password" : "Set a password (so you can also sign in with email)"}</p>
            {me?.user.passwordHash && <input name="current" type="password" placeholder="Current password" required autoComplete="current-password" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />}
            <input name="next" type="password" placeholder="New password (10+ chars, letters and a number)" required minLength={10} autoComplete="new-password" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <button className={btn}>Save password</button>
          </form>
        </Card>

        <Card title="Last scan">
          {scan ? (
            <div className="text-sm">
              <p>{new Date(scan.at).toLocaleString("en-GB")}</p>
              <table className="mt-2 w-full text-left text-xs">
                <thead>
                  <tr className="text-ink-4">
                    <th>Source</th>
                    <th>Fetched</th>
                    <th>Matching titles</th>
                    <th>New</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(scan.counts).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v.fetched}</td>
                      <td>{v.matched}</td>
                      <td>{v.added}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scan.errors.length > 0 && <p className="mt-2 text-xs text-red-700">{scan.errors.join(" · ")}</p>}
            </div>
          ) : (
            <p className="text-sm text-ink-4">No scan yet.</p>
          )}
          <p className="mt-2 text-xs text-ink-4">Sources: BrighterMonday and MyJobMag (Kenya); Remote4Africa, Himalayas, Remotive, Jobicy and Remote OK (remote, kept only when the post is open to Africa or Kenya). Each job links back to its original post.</p>
        </Card>
      </div>

    </div>
  );
}
