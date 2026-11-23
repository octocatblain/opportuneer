"use client";

import { FeedbackButton } from "@/components/feedback-button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/auth-actions";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { btnSignal, input } from "@/components/ui";
import { clientBase, isSpace, SPACES, SPACE_LABEL, spaceAllowsTrack, type Space } from "@/lib/spaces";

const ICONS: Record<string, string> = {
  today: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  pipeline: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z",
  jobs: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  companies: "M4 21V5l8-2v18M12 9l8 2v10M8 9h1M8 13h1M8 17h1M16 15h1M16 18h1",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  accounts: "M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8",
  waitlist: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  credits: "M12 3v18M16.5 7.5c-.6-1-1.8-1.5-4.5-1.5-2.5 0-4 1-4 2.8 0 4.2 9 1.8 9 6.2 0 1.8-1.5 3-4.5 3-2.7 0-4-.8-4.8-2",
  feedback: "M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z",
  analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  config: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  add: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  out: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

type Item = { href: string; label: string; icon: string; exact?: boolean };

/**
 * The signed-in app frame: a flat full-height sidebar (brand, role switcher for the superuser, section links, the
 * account card), a top bar with search, and the page content. Admin and client areas share the frame
 * but show their own links.
 */
export function AppShell({ children, admin = false, ownSpace = "duo", name, email, locked = false }: { children: ReactNode; admin?: boolean; ownSpace?: Space; name: string; email: string; locked?: boolean }) {
  const path = usePathname();
  // Highlight the clicked item at once; the page itself follows when the server responds.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [path]);
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const seg = path.split("/")[2];
  const space: Space = path.startsWith("/client/") && isSpace(seg) ? seg : ownSpace;
  const base = clientBase(space);
  const showJobs = spaceAllowsTrack(space, "JOB");
  const showPitches = spaceAllowsTrack(space, "PITCH");
  const adminMode = admin && inAdmin;

  const clientItems: Item[] = [
    { href: base, label: "Dashboard", icon: "today", exact: true },
    { href: `${base}/pipeline`, label: "Pipeline", icon: "pipeline" },
    ...(showJobs ? [{ href: `${base}/jobs`, label: "Jobs", icon: "jobs" }] : []),
    ...(showPitches ? [{ href: `${base}/companies`, label: "Companies", icon: "companies" }] : []),
    { href: `${base}/profile`, label: "Profile", icon: "profile" },
    { href: `${base}/settings`, label: "Settings", icon: "settings" },
  ];
  const adminItems: Item[] = [
    { href: "/admin", label: "Accounts", icon: "accounts", exact: true },
    { href: "/admin/waitlist", label: "Waitlist", icon: "waitlist" },
    { href: "/admin/credits", label: "Credits", icon: "credits" },
    { href: "/admin/feedback", label: "Feedback", icon: "feedback" },
    { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
    { href: "/admin/config", label: "Configuration", icon: "config" },
  ];
  // Until first-login setup is finished the account has no menu: only the onboarding page is open.
  const items = locked ? [] : adminMode ? adminItems : clientItems;
  const on = (i: Item) => (pending ? i.href === pending : i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));
  const initials =
    (name || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const roles = [{ href: "/admin", label: "Admin", on: inAdmin }, ...SPACES.map((s) => ({ href: clientBase(s), label: s === "duo" ? "Duo" : SPACE_LABEL[s], on: !inAdmin && space === s }))];

  return (
    <div className="flex min-h-screen">
      <aside data-app-shell className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-rule bg-white p-4 lg:flex">
        <Link href={locked ? "/onboarding" : adminMode ? "/admin" : base} className="mb-5 inline-flex items-center gap-2 self-start py-1.5 text-sm font-semibold text-ink">
          <BrandMark size={32} tile={false} />
          <Wordmark tone="light" />
        </Link>

        {admin && (
          <div className="mb-5">
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-mist">Switch role</div>
            <div role="group" aria-label="Switch role" className="grid grid-cols-2 gap-1 rounded-md bg-paper p-1 text-xs">
              {roles.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  aria-current={r.on ? "page" : undefined}
                  className={`rounded px-2 py-2 text-center font-medium transition-colors ${r.on ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink"}`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {locked && <p className="rounded-md bg-paper px-3 py-3 text-sm text-muted">Finish setting up your profile to unlock the dashboard, jobs, pipeline and settings.</p>}
        <nav aria-label="Main" className="flex flex-col gap-1 text-sm">
          {items.map((i) => (
            <Link
              key={i.href}
              onClick={() => setPending(i.href)}
              href={i.href}
              aria-current={on(i) ? "page" : undefined}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 font-medium transition-colors ${
                on(i) ? "bg-paper text-ink before:absolute before:-left-4 before:top-2 before:h-6 before:w-1 before:bg-ink" : "text-ink-4 hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon name={i.icon} />
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          {!locked && !adminMode && showJobs && (
            <Link href={`${base}/add`} className={`${btnSignal} w-full`}>
              <Icon name="add" className="h-4 w-4" /> Add job
            </Link>
          )}
          <div className="flex items-center gap-3 border-t border-rule pt-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-signal-dark text-sm font-semibold text-white">{initials}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{name || email}</div>
              <div className="truncate text-xs text-muted">{admin ? "Administrator" : SPACE_LABEL[ownSpace]}</div>
            </div>
            <form action={logoutAction}>
              <input type="hidden" name="area" value={admin ? "admin" : "client"} />
              <button type="submit" title="Sign out" aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded text-muted hover:bg-paper hover:text-ink">
                <Icon name="out" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header data-app-shell className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-rule bg-white px-4 py-3 lg:px-8">
          {/* Small screens: brand and the same links as the sidebar, scrollable. */}
          <Link href={locked ? "/onboarding" : adminMode ? "/admin" : base} className="inline-flex items-center gap-2 py-1.5 text-sm font-semibold text-ink lg:hidden">
            <BrandMark size={26} tile={false} />
            <Wordmark tone="light" />
          </Link>
          {locked ? (
            <div className="hidden flex-1 px-2 text-sm text-muted sm:block">Account setup</div>
          ) : showJobs && !adminMode ? (
            <form action={`${base}/jobs`} role="search" className="relative hidden min-w-0 max-w-md flex-1 sm:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input name="q" placeholder="Search jobs by title or company" aria-label="Search jobs" className={`${input} !border-transparent !bg-paper pl-9`} />
            </form>
          ) : (
            <div className="hidden flex-1 px-2 text-sm text-muted sm:block">{adminMode ? "Administrator console" : `${SPACE_LABEL[space]} workspace`}</div>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <FeedbackButton />
            <ThemeToggle />
            {admin && <span className="hidden rounded-md bg-amber-soft px-2.5 py-1 text-xs font-medium text-warn-ink md:inline">{inAdmin ? "Viewing as Admin" : `Viewing as ${SPACE_LABEL[space].split(" ")[0]}`}</span>}
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-sm font-medium">{name || email}</span>
              <span className="block text-xs text-muted">{email}</span>
            </span>
          </div>
          <nav aria-label="Sections" className={`w-full gap-1 overflow-x-auto text-sm lg:hidden ${locked ? "hidden" : "flex"}`}>
            {items.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setPending(i.href)} aria-current={on(i) ? "page" : undefined} className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${on(i) ? "bg-ink text-white" : "text-muted"}`}>
                {i.label}
              </Link>
            ))}
            {admin && (
              <Link href={inAdmin ? base : "/admin"} className="whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-signal-dark">
                {inAdmin ? "Open workspace" : "Admin"}
              </Link>
            )}
          </nav>
        </header>
        <main data-app-shell className="w-full flex-1 px-4 pb-10 pt-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
