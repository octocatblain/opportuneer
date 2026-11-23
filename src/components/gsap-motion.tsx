"use client";

/**
 * GSAP motion for the whole platform.
 *
 *  - <SmoothScroll/>  (mounted once in the root layout): Lenis inertial scrolling driven by the GSAP ticker, plus a
 *    thin scroll-progress bar under the top edge.
 *  - <Motion>         wraps a section/page. Elements inside opt in with data attributes, no per-element code:
 *
 *      data-m="rise"    fades and slides up when scrolled into view (siblings stagger)
 *      data-m="fade"    fades in without moving (use when something measures the element's position)
 *      data-m="pop"     springs in with a slight turn (data-m-rot="-8" sets the start angle)
 *      data-m="left" / "right"   slides in from the side
 *      data-m="chars"   headline split into letters that rise one by one
 *      data-m="float"   gentle endless bob (plates, badges)
 *      data-m="spin"    slow endless sparkle spin and pulse
 *      data-m="count"   number counts up (data-m-count="92")
 *      data-m-hover     lifts and tilts slightly under the pointer
 *      data-m-parallax="40"   drifts against the scroll by that many pixels
 *
 * Everything is skipped when the visitor prefers reduced motion (the CSS that hides elements before they animate
 * is behind the same media query, see globals.css).
 */
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Lenis smooth scrolling for the whole page, plus the scroll-progress bar. */
export function SmoothScroll() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced()) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: true,
      // Dialogs and anything marked data-lenis-prevent keep their native scrolling.
      prevent: (node) => !!node.closest?.(".swal2-container, [data-lenis-prevent]"),
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const progress = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => bar.current && gsap.set(bar.current, { scaleX: self.progress }),
    });

    return () => {
      progress.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <div ref={bar} aria-hidden className="scroll-progress" />;
}

/** Split an element's text into word > letter spans (screen readers get the original text through aria-label). */
function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const chars: HTMLElement[] = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      el.append(" ");
      return;
    }
    const word = document.createElement("span");
    word.setAttribute("aria-hidden", "true");
    word.style.cssText = "display:inline-block;white-space:nowrap";
    for (const ch of part) {
      const c = document.createElement("span");
      c.textContent = ch;
      c.style.display = "inline-block";
      word.append(c);
      chars.push(c);
    }
    el.append(word);
  });
  return chars;
}

/** Elements of this root only: an element inside a nested <Motion> belongs to that one, so nothing is animated twice. */
const mine = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((e) => e.closest("[data-motion-root]") === root);
const all = (root: HTMLElement, kind: string) => mine(root, `[data-m="${kind}"]`);

/** Wrap a page or section; its data-m elements are animated (see the file header). */
export function Motion({ children, className }: { children: React.ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const off: (() => void)[] = [];
    const el = root.current;
    if (!el || reduced()) return;

    const ctx = gsap.context(() => {
      const enter = (targets: HTMLElement[], vars: gsap.TweenVars, from: gsap.TweenVars) => {
        if (!targets.length) return;
        gsap.set(targets, from);
        ScrollTrigger.batch(targets, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { ...vars, stagger: 0.09, overwrite: "auto" }),
        });
      };

      enter(all(el, "rise"), { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", clearProps: "transform" }, { opacity: 0, y: 36 });
      // fade: opacity only, no movement, for elements whose position other things measure (the loop arrows)
      enter(all(el, "fade"), { opacity: 1, duration: 0.8, ease: "power2.out" }, { opacity: 0 });
      enter(all(el, "left"), { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" }, { opacity: 0, x: -70 });
      enter(all(el, "right"), { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" }, { opacity: 0, x: 70 });

      // Pop: each element gets its own start angle, so use per-element tweens triggered individually.
      for (const p of all(el, "pop")) {
        const rot = Number(p.dataset.mRot ?? -12);
        gsap.fromTo(p, { opacity: 0, scale: 0.4, rotation: rot }, { opacity: 1, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(2)", scrollTrigger: { trigger: p, start: "top 92%", once: true }, delay: Number(p.dataset.mDelay ?? 0) });
      }

      // Headline letters
      for (const h of all(el, "chars")) {
        const chars = splitChars(h);
        gsap.set(h, { opacity: 1 });
        gsap.fromTo(chars, { opacity: 0, yPercent: 90, rotate: 6 }, { opacity: 1, yPercent: 0, rotate: 0, duration: 0.7, ease: "back.out(1.6)", stagger: 0.035, scrollTrigger: { trigger: h, start: "top 92%", once: true } });
      }

      // Count-ups
      for (const c of all(el, "count")) {
        const end = Number(c.dataset.mCount ?? c.textContent);
        if (!Number.isFinite(end)) continue;
        const o = { v: 0 };
        c.textContent = "0";
        gsap.to(o, { v: end, duration: 1.4, ease: "power2.out", onUpdate: () => (c.textContent = String(Math.round(o.v))), scrollTrigger: { trigger: c, start: "top 92%", once: true } });
      }

      // Doodles: strokes draw themselves in; dotted strokes fade in; data-m-float adds a gentle bob afterwards
      for (const d of all(el, "draw")) {
        gsap.set(d, { opacity: 1 });
        const paths = Array.from(d.querySelectorAll<SVGGeometryElement>("path"));
        const tl = gsap.timeline({ scrollTrigger: { trigger: d, start: "top 92%", once: true } });
        paths.forEach((path, i) => {
          if (path.getAttribute("stroke-dasharray")) {
            gsap.set(path, { opacity: 0 });
            tl.to(path, { opacity: 1, duration: 0.6 }, i * 0.25);
            return;
          }
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          tl.to(path, { strokeDashoffset: 0, duration: Math.min(1.4, 0.5 + len / 300), ease: "power2.inOut" }, i * 0.25);
        });
        if (d.dataset.mFloat !== undefined) gsap.to(d, { y: -10, rotation: 3, duration: gsap.utils.random(2, 3), ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1 });
      }

      // Endless decoration
      for (const f of all(el, "float")) gsap.to(f, { yPercent: -7, duration: gsap.utils.random(1.8, 2.8), ease: "sine.inOut", yoyo: true, repeat: -1, delay: gsap.utils.random(0, 1.5) });
      for (const s of all(el, "spin")) gsap.to(s, { rotation: 360, scale: 1.35, duration: gsap.utils.random(5, 8), ease: "none", repeat: -1, yoyo: false, delay: gsap.utils.random(0, 2) });

      // Parallax drift
      for (const p of mine(el, "[data-m-parallax]")) {
        const d = Number(p.dataset.mParallax) || 30;
        gsap.fromTo(p, { y: d }, { y: -d, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      }

      // Hover lift
      for (const h of mine(el, "[data-m-hover]")) {
        const up = () => gsap.to(h, { y: -6, scale: 1.025, rotation: Number(h.dataset.mHover) || 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        const down = () => gsap.to(h, { y: 0, scale: 1, rotation: 0, duration: 0.45, ease: "elastic.out(1, 0.6)", overwrite: "auto" });
        h.addEventListener("pointerenter", up);
        h.addEventListener("pointerleave", down);
        off.push(() => { h.removeEventListener("pointerenter", up); h.removeEventListener("pointerleave", down); });
      }
    }, el);

    // Images and fonts change the layout after mount; measure again once things settle.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      window.clearTimeout(t);
      off.forEach((f) => f());
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} data-motion-root className={className}>
      {children}
    </div>
  );
}
