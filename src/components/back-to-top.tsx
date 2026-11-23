"use client";

import { useEffect, useState } from "react";

/** Floating "back to top" button; appears after scrolling down a screen. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className={`fixed bottom-6 right-6 z-30 inline-flex h-11 w-11 items-center justify-center rounded-md border border-rule bg-white text-lg text-ink transition-[opacity,transform,background-color] hover:bg-paper-2 active:bg-paper-3 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <span aria-hidden>↑</span>
    </button>
  );
}
