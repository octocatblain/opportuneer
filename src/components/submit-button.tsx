"use client";

import { useFormStatus } from "react-dom";
import { confirmAlert } from "@/components/alerts";

export function SubmitButton({
  children,
  pending,
  className,
  confirm: confirmMessage,
  disabled,
}: {
  disabled?: boolean;
  children: React.ReactNode;
  pending?: string;
  className?: string;
  /** If set, the user must confirm in an alert before the form submits. */
  confirm?: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className={className}
      onClick={(e) => {
        if (!confirmMessage) return;
        const btn = e.currentTarget;
        const form = btn.form;
        if (btn.dataset.confirmed) {
          delete btn.dataset.confirmed;
          return;
        }
        e.preventDefault();
        void confirmAlert(confirmMessage).then((yes) => {
          if (!yes || !form) return;
          btn.dataset.confirmed = "1";
          form.requestSubmit(btn);
        });
      }}
    >
      {isPending ? (pending ?? "Working…") : children}
    </button>
  );
}
