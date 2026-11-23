/**
 * Shown inside the app frame while a page loads, so the sidebar and top bar stay put.
 * It fades in after a short delay: fast navigations never flash it, slow ones get a calm skeleton (no blur, no spinner overlay).
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-[60vh] animate-[sheet-fade_.2s_ease-out_.15s_both] space-y-4 motion-safe:[&>*]:animate-pulse">
      <div className="h-8 w-56 rounded bg-paper-2" />
      <div className="h-4 w-80 max-w-full rounded bg-paper-2" />
      <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 rounded-md bg-paper-2" />
        <div className="h-36 rounded-md bg-paper-2" />
        <div className="h-36 rounded-md bg-paper-2" />
      </div>
      <div className="h-64 rounded-md bg-paper-2" />
    </div>
  );
}
