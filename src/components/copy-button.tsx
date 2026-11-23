"use client";

import { useState } from "react";

/** Copies `value` to the clipboard and briefly confirms. */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: the text is still selectable in the box */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
