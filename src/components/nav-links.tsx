"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { btnSignal } from "@/components/ui";

const nav: { href: string; label: string; track?: "JOB" | "PITCH" }[] = [
  { href: "/", label: "Today" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/jobs", label: "Jobs", track: "JOB" },
  { href: "/companies", label: "Companies", track: "PITCH" },
  { href: "/settings", label: "Settings" },
];

/** Top bar: the brand block, tabs with the current one marked, and the one primary action. */
export function NavLinks({ admin = false, access = "BOTH" }: { admin?: boolean; access?: "JOB" | "PITCH" | "BOTH" }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-ink py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white transition-colors hover:bg-ink-3 active:bg-ink-2">
        <BrandMark size={28} className="rounded-md" />
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
        {(admin ? [...nav, { href: "/admin", label: "Admin" }] : nav).filter((n) => !n.track || access === "BOTH" || access === n.track).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={`relative flex h-12 items-center rounded-md px-3 font-medium transition-colors ${
              active(n.href)
                ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-signal"
                : "text-muted hover:bg-paper hover:text-ink active:bg-paper-2"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {access !== "PITCH" && <Link href="/add" aria-current={active("/add") ? "page" : undefined} className={btnSignal}>
        Add job
      </Link>}
    </>
  );
}
