import type { Metadata } from "next";
import { resetConfigAction, saveConfigAction } from "@/app/actions";
import { Brand } from "@/components/brand-icons";
import { btn, btnGhost, Card, Flash, PageHeader } from "@/components/ui";
import { requireSuper } from "@/lib/auth";
import { aiStatus } from "@/lib/ai";
import { CONFIG_SECTIONS, loadConfig } from "@/lib/config";
import { foundingOfferActive } from "@/lib/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin: configuration" };

export default async function AdminConfig({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const admin = await requireSuper();
  const sp = await searchParams;
  const full = await loadConfig();
  const { company, packages, payFloors, profile, titleFamilies, industries, locations } = full;
  const KES_PER_USD = full.fx.kesPerUsd;
  const ai = aiStatus();
  const offer = await foundingOfferActive(admin.id);

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} error={sp.error} />
      <PageHeader title="App configuration" sub="Platform settings (AI providers, limits, credits) apply to everyone. Search targets and the offer below are the owner account's defaults; regular users set their own during onboarding." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card index={2} title="AI providers (all users)">
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Brand name="Claude" />:{" "}
              {ai.claude
                ? `ready (${ai.claudeModel}${ai.claudePremiumModel ? `; ${ai.claudePremiumModel} for CVs, letters and pitches` : ""})`
                : "no ANTHROPIC_API_KEY"}
            </li>
            <li className="flex items-center gap-2">
              <Brand name="OpenAI" />: {ai.openai ? `ready (${ai.openaiModel})` : "no OPENAI_API_KEY"}</li>
            <li className="flex items-center gap-2">
              <Brand name="Gemini" />: {ai.gemini ? `ready (${ai.geminiModel})` : "no GEMINI_API_KEY"}</li>
            <li>
              Paid calls today (Claude + OpenAI): <b>{ai.paidCallsToday}</b> of {ai.paidCallLimit}
            </li>
            <li>
              Order tried: <b>{ai.order.join(", then ")}</b>
              {ai.order[0] === "mock" && <span className="text-warn-ink"> (add a key to .env to get real drafts)</span>}
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">Order and models are stored in the database (section “ai” below). API keys stay in .env.</p>
          {ai.gemini && (
            <p className="mt-2 text-xs text-warn-ink">
              Gemini&apos;s free tier may let Google use prompts (including your CV details) to improve its products. Keep it last in AI_PROVIDERS once you
              have a paid key, or remove it from the list.
            </p>
          )}
        </Card>

        <Card index={3} title="Job search targets (owner defaults)">
          <ul className="space-y-1 text-sm">
            <li>Titles: {titleFamilies.map((t) => t.label).join(", ")}</li>
            <li>Industries: {industries.map((i) => i.label).join(", ")}</li>
            <li>
              Pay floor: local ${payFloors.localMonthlyUsd.toLocaleString()}/mo (≈ KES {(payFloors.localMonthlyUsd * KES_PER_USD).toLocaleString()}), remote $
              {payFloors.remoteMonthlyUsd.toLocaleString()}/mo. Rate: KES {KES_PER_USD}/USD.
            </li>
            <li>Locations: Kenya ({locations.accepted.slice(0, 5).join(", ")}…), remote, abroad only with visa sponsorship. East Africa excluded.</li>
            <li>Notice period: {profile.noticePeriod}</li>
          </ul>
          <p className="mt-2 text-xs text-muted">Not shown to regular users: each account saves its own titles, industries, pay floors and locations in onboarding, which override these. Edit the owner values in the sections below; src/config/profile.ts only supplies first-run defaults.</p>
        </Card>

        <Card index={4} title="Red Star Standard offer (owner account only)">
          <ul className="space-y-1 text-sm">
            {packages.map((p) => (
              <li key={p.key}>
                {p.name}: {p.priceKes ? `KES ${p.priceKes.toLocaleString()}` : "price on request"}
                {p.monthlyKes && p.kind !== "retainer" ? ` + ${p.monthlyKes.toLocaleString()}/mo` : p.kind === "retainer" && p.priceKes ? "/mo" : ""} {p.qualifies ? "" : <span className="text-xs text-mist">(entry offer)</span>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Client floor: KES {company.clientFloorKes.toLocaleString()} (Strategy Sprint) or a retainer. Founding-client offer:{" "}
            <b>{offer ? "active" : "off (5 founding clients won)"}</b>.
          </p>
        </Card>

      </div>

      <Card title="Edit configuration (stored in the database)">
        <p className="mb-3 text-xs text-muted">
          Every parameter the app uses lives in the database, one JSON section each. Changes apply within a few seconds. “Reset” restores the defaults from src/config/profile.ts / .env.
        </p>
        <div className="space-y-2">
          {CONFIG_SECTIONS.map((section) => (
            <details key={section} className="rounded-md border border-rule p-3">
              <summary className="cursor-pointer text-sm font-medium">{section}</summary>
              <form action={saveConfigAction} className="mt-2 space-y-2">
                <input type="hidden" name="section" value={section} />
                <textarea name="json" defaultValue={JSON.stringify((full as Record<string, unknown>)[section], null, 2)} rows={14} spellCheck={false} className="w-full rounded-md border border-mist bg-white p-2 font-mono text-xs" />
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
