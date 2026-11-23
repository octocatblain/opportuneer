import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { MotionProvider } from "@/components/motion";
import { getUser, isSuper } from "@/lib/auth";
import { onboardingSteps } from "@/lib/kyc";
import { spaceForAccess } from "@/lib/spaces";
import "./globals.css";
import { ScanOverlay } from "@/components/scan-overlay";
import { AppShell } from "@/components/nav-links";
import { PublicNav } from "@/components/public-nav";
import { Footer } from "@/components/footer";
import { SmoothScroll } from "@/components/gsap-motion";
import { BackToTop } from "@/components/back-to-top";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Opportuneer", template: "%s · Opportuneer" },
  description: "Strategic job search and Red Star Standard client pipeline",
};

export const viewport: Viewport = { themeColor: "#0e1014" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const locked = user ? (await onboardingSteps(user)).length > 0 : false;
  return (
    <html lang="en" className={interTight.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        {user ? (
          <MotionProvider>
            <AppShell admin={isSuper(user)} ownSpace={spaceForAccess(user.trackAccess)} name={user.name ?? ""} email={user.email} locked={locked}>
              {children}
            </AppShell>
            <ScanOverlay />
          </MotionProvider>
        ) : (
          <div className="flex min-h-screen flex-col">
            <header data-app-shell className="sticky top-0 z-40 border-b border-rule bg-white">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
                <PublicNav />
              </div>
            </header>
            <MotionProvider>
              <main data-app-shell className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8">
                {children}
              </main>
            </MotionProvider>
            <Footer signedIn={false} />
          </div>
        )}
        <SmoothScroll />
        <BackToTop />
      </body>
    </html>
  );
}
