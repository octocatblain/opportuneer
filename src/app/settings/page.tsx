import { disconnectGmailAction, resetConfigAction, saveConfigAction } from "@/app/actions";
import { changePasswordAction, logoutAction, revokeOtherSessionsAction, revokeSessionAction } from "@/app/auth-actions";
import { currentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { btn, btnGhost, Card, Flash } from "@/components/ui";
import { CONFIG_SECTIONS, loadConfig } from "@/lib/config";
import { aiStatus } from "@/lib/ai";
import { getSetting } from "@/lib/db";
import { gmailAccount, gmailConfigured } from "@/lib/gmail";
import { foundingOfferActive } from "@/lib/services";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const me = await currentSession();
  const sessions = me ? await db.session.findMany({ where: { userId: me.user.id }, orderBy: { lastSeenAt: "desc" } }) : [];
  const full = await loadConfig();
  const { company, packages, payFloors, profile, titleFamilies, industries, locations } = full;
  const KES_PER_USD = full.fx.kesPerUsd;
  const ai = aiStatus();
  const [gmail, scan, offer] = await Promise.all([gmailAccount(), getSetting<Scan>("lastScan", null), foundingOfferActive()]);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Gmail (drafts only)">
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
              <p>Google credentials found. Connect {profile.email} to start creating drafts.</p>
              <a href="/api/gmail/connect" className={btn}>
                Connect Gmail
              </a>
            </div>
          ) : (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Go to console.cloud.google.com and create a project called “Opportuneer”.</li>
              <li>APIs &amp; Services → Library → enable the <b>Gmail API</b>.</li>
              <li>OAuth consent screen → External, Testing mode → add {profile.email} as a test user.</li>
              <li>
                Credentials → Create OAuth client ID → Web application. Authorised redirect URI: <code className="rounded bg-slate-100 px-1">http://localhost:3000/api/auth/callback/google</code>
              </li>
              <li>
                Paste the Client ID and Secret into <code className="rounded bg-slate-100 px-1">.env</code> as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the app.
              </li>
            </ol>
          )}
        </Card>

        <Card title="AI providers">
          <ul className="space-y-1 text-sm">
            <li>Claude: {ai.claude ? `ready (${ai.claudeModel})` : "no ANTHROPIC_API_KEY"}</li>
            <li>OpenAI: {ai.openai ? `ready (${ai.openaiModel})` : "no OPENAI_API_KEY"}</li>
            <li>
              Order tried: <b>{ai.order.join(" → ")}</b>
              {ai.order[0] === "mock" && <span className="text-amber-700"> (add a key to .env to get real drafts)</span>}
            </li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">Order and models are stored in the database (section “ai” below). API keys stay in .env.</p>
        </Card>

        <Card title="Job search targets">
          <ul className="space-y-1 text-sm">
            <li>Titles: {titleFamilies.map((t) => t.label).join(" · ")}</li>
            <li>Industries: {industries.map((i) => i.label).join(" · ")}</li>
            <li>
              Pay floor: local ${payFloors.localMonthlyUsd.toLocaleString()}/mo (≈ KES {(payFloors.localMonthlyUsd * KES_PER_USD).toLocaleString()}), remote $
              {payFloors.remoteMonthlyUsd.toLocaleString()}/mo. Rate: KES {KES_PER_USD}/USD.
            </li>
            <li>Locations: Kenya ({locations.accepted.slice(0, 5).join(", ")}…), remote, abroad only with visa sponsorship. East Africa excluded.</li>
            <li>Notice period: {profile.noticePeriod}</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">Stored in the database; edit the sections below. src/config/profile.ts only supplies the first-run defaults.</p>
        </Card>

        <Card title="Red Star Standard offer">
          <ul className="space-y-1 text-sm">
            {packages.map((p) => (
              <li key={p.key}>
                {p.name}: {p.priceKes ? `KES ${p.priceKes.toLocaleString()}` : "price on request"}
                {p.monthlyKes && p.kind !== "retainer" ? ` + ${p.monthlyKes.toLocaleString()}/mo` : p.kind === "retainer" && p.priceKes ? "/mo" : ""} {p.qualifies ? "" : <span className="text-xs text-slate-400">(entry offer)</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Client floor: KES {company.clientFloorKes.toLocaleString()} (Strategy Sprint) or a retainer. Founding-client offer:{" "}
            <b>{offer ? "active" : "off (5 founding clients won)"}</b>.
          </p>
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
                  <tr className="text-slate-500">
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
            <p className="text-sm text-slate-500">No scan yet.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">Sources: BrighterMonday and MyJobMag (Kenya); Remote4Africa, Himalayas, Remotive, Jobicy and Remote OK (remote, kept only when the post is open to Africa or Kenya). Each job links back to its original post.</p>
        </Card>
      </div>

      <Card title="Edit configuration (stored in the database)">
        <p className="mb-3 text-xs text-slate-500">
          Every parameter the app uses lives in the database, one JSON section each. Changes apply within a few seconds. “Reset” restores the defaults from src/config/profile.ts / .env.
        </p>
        <div className="space-y-2">
          {CONFIG_SECTIONS.map((section) => (
            <details key={section} className="rounded border border-slate-200 p-2">
              <summary className="cursor-pointer text-sm font-medium">{section}</summary>
              <form action={saveConfigAction} className="mt-2 space-y-2">
                <input type="hidden" name="section" value={section} />
                <textarea name="json" defaultValue={JSON.stringify((full as Record<string, unknown>)[section], null, 2)} rows={14} spellCheck={false} className="w-full rounded border border-slate-300 p-2 font-mono text-xs" />
                <div className="flex gap-2">
                  <button className={btn}>Save</button>
                  <button formAction={resetConfigAction} className={btnGhost}>
                    Reset to defaults
                  </button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
