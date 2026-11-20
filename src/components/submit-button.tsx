"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pending, className }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" disabled={isPending} className={className}>
      {isPending ? (pending ?? "Working…") : children}
    </button>
  );
}
