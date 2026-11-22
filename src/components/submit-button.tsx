"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending,
  className,
  confirm: confirmMessage,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  /** If set, the user must confirm via a browser dialog before the form submits. */
  confirm?: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className={className}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {isPending ? (pending ?? "Working…") : children}
    </button>
  );
}
