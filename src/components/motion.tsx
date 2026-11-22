"use client";

import { animate, MotionConfig, motion, useInView, useMotionValue, useReducedMotion, useTransform, type Variants } from "motion/react";
import { useEffect, useRef } from "react";
import { MarkArt } from "@/components/brand-mark";

const ease = [0.22, 1, 0.36, 1] as const;

/** Wraps the app so every animation honours the OS "reduce motion" setting. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fade/slide a whole page in. Used from template.tsx so it replays on every navigation. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

/** Children wrapped in <StaggerItem> animate in one after another. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/** Reveal a block when it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, ease, delay }}>
      {children}
    </motion.div>
  );
}

/** Subtle lift on hover and press for cards and rows. */
export function Lift({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} transition={{ duration: 0.2, ease }}>
      {children}
    </motion.div>
  );
}

/** Number that counts up from 0 when it appears. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(mv, value, { duration: 0.9, ease });
    return () => controls.stop();
  }, [inView, value, mv, reduce]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

/** Brand mark (same artwork as src/app/icon.svg). Spins in once. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 64 64" className={className} aria-hidden="true" initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: "spring", stiffness: 180, damping: 14 }}>
      <MarkArt />
    </motion.svg>
  );
}
