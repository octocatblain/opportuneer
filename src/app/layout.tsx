import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter_Tight } from "next/font/google";
import { MotionProvider } from "@/components/motion";
import { getUser, isSuper } from "@/lib/auth";
import "./globals.css";
import { ScanOverlay } from "@/components/scan-overlay";
import { NavLinks } from "@/components/nav-links";
import { PublicNav } from "@/components/public-nav";
import { Footer } from "@/components/footer";
import { BackToTop } from "@/components/back-to-top";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Opportuneer", template: "%s · Opportuneer" },
  description: "Strategic job search and Red Star Standard client pipeline",
};

export const viewport: Viewport = { themeColor: "#0e1014" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  return (
    <html lang="en" className={`${interTight.variable} ${instrumentSerif.variable} ${anton.variable}`}>
      <body className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
        <header data-app-shell className="sticky top-0 z-40 px-4 pt-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            {user ? <NavLinks admin={isSuper(user)} /> : <PublicNav />}
          </div>
          <div className="brand-bar" />
        </header>
        <MotionProvider>
          <main data-app-shell className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8">
          {children}
        </main>
        {user && <ScanOverlay />}
        </MotionProvider>
        <Footer signedIn={Boolean(user)} admin={user ? isSuper(user) : false} />
        <BackToTop />
      </body>
    </html>
  );
}
