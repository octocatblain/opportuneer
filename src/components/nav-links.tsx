"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";

const nav = [
  { href: "/", label: "Today" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/jobs", label: "Jobs" },
  { href: "/companies", label: "Companies" },
  { href: "/settings", label: "Settings" },
];

/** Floating pill navigation: dark brand pill, frosted link pill, and a signal "Add job" pill. */
export function NavLinks({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-lg shadow-ink/10">
        <BrandMark size={28} className="rounded-full" />
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-1 rounded-full border border-white/70 bg-white/70 p-1 text-sm shadow-lg shadow-ink/5 backdrop-blur-md">
        {(admin ? [...nav, { href: "/admin", label: "Admin" }] : nav).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              active(n.href) ? "bg-ink text-white" : "text-ink-4 hover:bg-canvas hover:text-ink"
            }`}
          >
            {n.label}
          </Link>
        ))}
        <Link
          href="/add"
          aria-current={active("/add") ? "page" : undefined}
          className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 font-semibold text-white transition-colors hover:bg-signal-dark"
        >
          <span aria-hidden>+</span> Add job
        </Link>
      </nav>
    </>
  );
}
