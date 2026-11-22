import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { LogoMark, MotionProvider } from "@/components/motion";
import { Nav } from "@/components/nav";
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
      <body className="min-h-screen bg-slate-50 text-ink antialiased">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <LogoMark className="h-5 w-5 text-brand-700" />
              <span>
                <span className="text-brand-700">Oppor</span>tuneer
              </span>
            </Link>
            {user && <Nav items={nav} />}
            {user && (
              <form action={logoutAction} className="ml-auto flex items-center gap-3 text-sm text-slate-600">
                <span>{user.name || user.email}</span>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 transition-colors hover:border-brand-200 hover:bg-brand-50">Sign out</button>
              </form>
            )}
          </div>
          <div className="brand-bar" />
        </header>
        <MotionProvider>
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </MotionProvider>
      </body>
    </html>
  );
}
