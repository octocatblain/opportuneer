import { disconnectGmailAction } from "@/app/actions";
import { btn, btnGhost, Card, Flash } from "@/components/ui";
import { company, KES_PER_USD, packages, payFloors, profile, titleFamilies, industries, locations } from "@/config/profile";
import { aiStatus } from "@/lib/ai";
import { getSetting } from "@/lib/db";
import { gmailAccount, gmailConfigured } from "@/lib/gmail";
import { foundingOfferActive } from "@/lib/services";

export const dynamic = "force-dynamic";

type Scan = { at: string; counts: Record<string, { fetched: number; matched: number; added: number }>; errors: string[] } | null;

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
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
          <p className="mt-2 text-xs text-slate-500">Change the order with AI_PROVIDERS in .env, e.g. “openai,claude”.</p>
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
          <p className="mt-2 text-xs text-slate-500">Edit these in src/config/profile.ts.</p>
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
    </div>
  );
}
