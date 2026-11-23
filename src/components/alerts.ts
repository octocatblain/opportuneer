import Swal from "sweetalert2";

const base = {
  buttonsStyling: false,
  customClass: {
    popup: "!rounded-md !bg-white !text-ink !shadow-pop",
    title: "!text-sm !font-medium !text-ink",
    htmlContainer: "!text-sm !text-muted",
    confirmButton: "rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white",
    cancelButton: "ml-2 rounded-md border border-rule bg-white px-4 py-2 text-sm font-semibold text-ink",
    timerProgressBar: "!bg-signal",
  },
} as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const GLYPH = {
  success: { bg: "#16a34a", glow: "rgba(34,197,94,.55)", path: "M5 12.5l4.5 4.5L19 7.5" },
  error: { bg: "#dc2626", glow: "rgba(239,68,68,.55)", path: "M12 7v6M12 17h.01" },
} as const;

/** Notification-style toast in the upper-right corner: glassmorphic card (translucent, blurred, tinted by outcome, with a light edge), app row (icon, name, "now"), then the message. */
export function toast(kind: "success" | "error", message: string) {
  const g = GLYPH[kind];
  const html =
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.65)">` +
    `<span style="display:grid;place-items:center;width:20px;height:20px;border-radius:6px;background:${g.bg}">` +
    `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${g.path}"/></svg></span>` +
    `<span>Opportuneer</span><span style="margin-left:auto;margin-right:22px;text-transform:none;letter-spacing:0">now</span></div>` +
    `<div style="font-size:14px;line-height:1.4;color:#fff;text-align:left;word-break:break-word;max-height:9rem;overflow-y:auto;text-shadow:0 1px 2px rgba(15,23,42,.35)">${esc(message)}</div>`;
  return Swal.fire({
    toast: true,
    buttonsStyling: false,
    position: "top-end",
    html,
    showConfirmButton: false,
    showCloseButton: true,
    timer: kind === "error" ? 8000 : 4000,
    customClass: {
      popup: "!block !w-[22rem] !max-w-[calc(100vw-1.5rem)] !rounded-2xl !p-3.5 !overflow-hidden",
      htmlContainer: "!m-0 !p-0",
      closeButton: "!absolute !right-2 !top-2 !h-6 !w-6 !rounded-full !bg-white/20 !text-sm !text-white hover:!bg-white/30",
    },
    didOpen: (el) => {
      // Glass: a dark translucent base for legible white text, a soft highlight sheen, and a glow in the outcome colour,
      // all blurred over whatever is behind. Set inline because the toast element is created by SweetAlert.
      el.style.background = `radial-gradient(120% 160% at 0% 0%, ${g.glow} 0%, transparent 55%), linear-gradient(135deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,.05) 55%), rgba(15,23,42,.52)`;
      el.style.backdropFilter = "blur(22px) saturate(180%)";
      el.style.setProperty("-webkit-backdrop-filter", "blur(22px) saturate(180%)");
      el.style.border = "1px solid rgba(255,255,255,.38)";
      el.style.boxShadow = "0 14px 40px rgba(15,23,42,.30), inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(255,255,255,.1)";
      el.addEventListener("mouseenter", Swal.stopTimer);
      el.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

/** Confirmation dialog (replaces window.confirm). Resolves true when confirmed. */
export async function confirmAlert(message: string) {
  const r = await Swal.fire({
    ...base,
    icon: "warning",
    title: message,
    showCancelButton: true,
    confirmButtonText: "Yes, continue",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    position: "top-end",
    backdrop: false,
  });
  return r.isConfirmed;
}
