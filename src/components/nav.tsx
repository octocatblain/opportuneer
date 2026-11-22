"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {items.map((n) => (
        <Link key={n.href} href={n.href} className={`relative rounded-md px-3 py-1.5 transition-colors ${active(n.href) ? "text-brand-700" : "text-slate-600 hover:text-ink"}`}>
          {active(n.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-0 rounded-md bg-brand-50" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className="relative">{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}
