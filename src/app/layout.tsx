import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { getUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opportuneer",
  description: "Strategic job search and Red Star Standard client pipeline",
};

const nav = [
  { href: "/", label: "Today" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/jobs", label: "Jobs" },
  { href: "/companies", label: "Companies" },
  { href: "/add", label: "Add job" },
  { href: "/settings", label: "Settings" },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-rose-700">Oppor</span>tuneer
            </Link>
            {user && (
              <nav className="flex flex-wrap gap-1 text-sm">
                {nav.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                    {n.label}
                  </Link>
                ))}
              </nav>
            )}
            {user && (
              <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm text-slate-600">
                <span>{user.name || user.email}</span>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
