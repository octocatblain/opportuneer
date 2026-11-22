import type { Metadata } from "next";
import { disconnectGmailAction } from "@/app/actions";
import { changeEmailAction, deleteOwnAccountAction, updateProfileAction } from "@/app/profile-actions";
import { changePasswordAction, logoutAction, revokeOtherSessionsAction, revokeSessionAction } from "@/app/auth-actions";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand-icons";
import { currentSession, isSuper, requireSpace } from "@/lib/auth";
import { isSpace } from "@/lib/spaces";
import { db } from "@/lib/db";
import { btn, btnGhost, Card, Flash, input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { submitFeedbackAction } from "@/app/feedback-actions";
import { creditBalance } from "@/lib/credits";
import { loadConfig } from "@/lib/config";
import { getSetting } from "@/lib/db";
import { gmailAccount, gmailConfigured } from "@/lib/gmail";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export const metadata: Metadata = { title: "Settings" };

export default async function Settings({ params, searchParams }: { params: Promise<{ space: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { space } = await params;
  if (!isSpace(space)) notFound();
  await requireSpace(space);
  const sp = await searchParams;
  const me = await currentSession();
  if (!me) redirect("/login");
  const sessions = await db.session.findMany({ where: { userId: me.user.id }, orderBy: { lastSeenAt: "desc" } });
  const full = await loadConfig();
  const credits = isSuper(me.user) ? null : await creditBalance(me.user.id);
  const [gmail, scan] = await Promise.all([gmailAccount(me.user.id), getSetting<Scan>(`lastScan:${me.user.id}`, null)]);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Settings</h1>
        {isSuper(me.user) && (
          <Link href="/admin" className={btnGhost}>
            Admin area
          </Link>
        )}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Usage and feedback">
          <p className="text-sm">
            {credits === null ? "Owner account: no credit limits." : <>Credits left: <b>{credits}</b>. Tracks: <b>{me.user.trackAccess.toLowerCase()}</b>.</>}
          </p>
          <form action={submitFeedbackAction} className="mt-3 space-y-2">
            <select name="kind" className={input} aria-label="Type" defaultValue="general">
              <option value="general">General feedback</option>
              <option value="bug">Something is broken</option>
              <option value="idea">Idea</option>
            </select>
            <textarea name="message" required minLength={3} maxLength={4000} rows={3} placeholder="What should be better?" className={input} />
            <SubmitButton className={btn} pending="Sending…">
              Send feedback
            </SubmitButton>
          </form>
        </Card>
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
              <li>In APIs &amp; Services, open Library and enable the <b>Gmail API</b>.</li>
              <li>On the OAuth consent screen choose External and Testing mode, then add your Gmail address as a test user.</li>
              <li>
                Under Credentials, create an OAuth client ID of type Web application. Authorised redirect URI: <code className="rounded-md bg-paper px-1.5">http://localhost:3000/api/auth/callback/google</code>
              </li>
              <li>
                Paste the Client ID and Secret into <code className="rounded-md bg-paper px-1.5">.env</code> as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the app.
              </li>
            </ol>
          )}
        </Card>

        <Card title="Profile">
          <form action={updateProfileAction} className="space-y-2 text-sm">
            <label className="block text-xs font-medium text-ink-3" htmlFor="profile-name">
              Display name
            </label>
            <input id="profile-name" name="name" defaultValue={me.user.name ?? ""} maxLength={80} autoComplete="name" className={input} />
            <SubmitButton className={btn} pending="Saving…">
              Save name
            </SubmitButton>
          </form>
          <form action={changeEmailAction} className="mt-4 space-y-2 border-t border-rule pt-3 text-sm">
            <label className="block text-xs font-medium text-ink-3" htmlFor="profile-email">
              Sign-in email
            </label>
            <input id="profile-email" name="email" type="email" required defaultValue={me.user.email} autoComplete="email" className={input} />
            {me.user.passwordHash && <input name="password" type="password" required placeholder="Current password to confirm" autoComplete="current-password" className={input} />}
            <SubmitButton className={btn} pending="Saving…">
              Change email
            </SubmitButton>
          </form>
        </Card>

        <Card title="Your data">
          <p className="text-sm text-ink-3">Download everything stored about you: profile, companies, opportunities, generated documents, credits and feedback, as one JSON file.</p>
          <a href="/api/account/export" className={`${btnGhost} mt-3`}>
            Download my data
          </a>
          {!isSuper(me.user) && (
            <form action={deleteOwnAccountAction} className="mt-4 space-y-2 border-t border-rule pt-3 text-sm">
              <p className="font-medium text-error">Delete account</p>
              <p className="text-xs text-muted">This permanently removes your account, companies, opportunities and documents. It cannot be undone.</p>
              <input name="confirm" required placeholder={`Type ${me.user.email} to confirm`} autoComplete="off" className={input} aria-label="Type your email to confirm" />
              {me.user.passwordHash && <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className={input} />}
              <SubmitButton className={btnGhost} pending="Deleting…">
                Delete my account
              </SubmitButton>
            </form>
          )}
        </Card>

        <Card title="Account & sessions">
          <p className="text-sm">
            Signed in as <b>{me?.user.email}</b>
            {me?.user.googleId ? " (Google linked)" : ""}. Sessions last {full.auth.sessionDays} days and renew while you use the app.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-rule p-3">
                <span className="space-y-0.5">
                  <span className="block">
                    <b>{s.id === me?.sessionId ? "This device" : "Other device"}</b>, {s.method}
                  </span>
                  <span className="block text-muted">
                    {(s.userAgent ?? "unknown browser").slice(0, 70)}, {s.ip ?? "?"}
                  </span>
                  <span className="block text-muted">
                    Last active {s.lastSeenAt.toLocaleString("en-GB")}, expires {s.expiresAt.toLocaleDateString("en-GB")}
                  </span>
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
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={revokeOtherSessionsAction}>
              <button className={btnGhost}>Sign out other devices</button>
            </form>
            <form action={logoutAction}>
              <button className={btnGhost}>Sign out</button>
            </form>
          </div>
          <form action={changePasswordAction} className="mt-4 space-y-2 border-t border-rule pt-3 text-sm">
            <p className="text-sm font-medium text-ink-3">{me?.user.passwordHash ? "Change password" : "Set a password (so you can also sign in with email)"}</p>
            {me?.user.passwordHash && <input name="current" type="password" placeholder="Current password" required autoComplete="current-password" className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-sm" />}
            <input name="next" type="password" placeholder="New password (10+ chars, letters and a number)" required minLength={10} autoComplete="new-password" className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-sm" />
            <button className={btn}>Save password</button>
          </form>
        </Card>

        <Card title="Last scan">
          {scan ? (
            <div className="text-sm">
              <p>{new Date(scan.at).toLocaleString("en-GB")}</p>
              <table className="mt-2 w-full text-left text-xs">
                <thead>
                  <tr className="text-left text-muted">
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
              {scan.errors.length > 0 && <p className="mt-2 text-xs text-error">{scan.errors.join(", ")}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted">No scan yet.</p>
          )}
          <p className="mt-2 text-xs text-muted">Sources: BrighterMonday and MyJobMag (Kenya); Remote4Africa, Himalayas, Remotive, Jobicy and Remote OK (remote, kept only when the post is open to Africa or Kenya). Each job links back to its original post.</p>
        </Card>
      </div>

    </div>
  );
}
