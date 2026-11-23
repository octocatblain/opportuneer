"use client";

import { useEffect } from "react";
import { toast } from "@/components/alerts";

/** Shows the ?ok= / ?error= message as a toast, then strips it from the URL so a refresh doesn't repeat it. */
export function FlashToast({ ok, error }: { ok?: string; error?: string }) {
  useEffect(() => {
    if (!ok && !error) return;
    toast(error ? "error" : "success", (error ?? ok) as string);
    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url);
  }, [ok, error]);
  return null;
}
