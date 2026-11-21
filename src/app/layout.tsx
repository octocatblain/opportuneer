import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Serif, Inter_Tight } from "next/font/google";
import "./globals.css";
import { ScanOverlay } from "@/components/scan-overlay";
import { NavLinks } from "@/components/nav-links";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });

export const metadata: Metadata = {
  title: "Opportuneer",
  description: "Strategic job search and Red Star Standard client pipeline",
};

export const viewport: Viewport = { themeColor: "#0e1014" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${instrumentSerif.variable} ${anton.variable}`}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <header data-app-shell className="sticky top-0 z-40 px-4 pt-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <NavLinks />
          </div>
        </header>
        <main data-app-shell className="mx-auto max-w-7xl px-4 pb-16 pt-8">
          {children}
        </main>
        <ScanOverlay />
      </body>
    </html>
  );
}
