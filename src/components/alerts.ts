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

/** Small toast in the upper-right corner. */
export function toast(kind: "success" | "error", message: string) {
  return Swal.fire({
    ...base,
    toast: true,
    position: "top-end",
    icon: kind,
    title: message,
    showConfirmButton: false,
    showCloseButton: true,
    timer: kind === "error" ? 8000 : 4000,
    timerProgressBar: true,
    didOpen: (el) => {
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
