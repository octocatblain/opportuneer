/** Shown inside the app frame while a page loads, so the sidebar and top bar stay put. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-8 w-56 rounded bg-paper-2" />
      <div className="h-4 w-80 max-w-full rounded bg-paper-2" />
      <div className="grid gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-36 rounded-lg bg-paper-2" />
        <div className="h-36 rounded-lg bg-paper-2" />
        <div className="h-36 rounded-lg bg-paper-2" />
      </div>
      <div className="h-64 rounded-lg bg-paper-2" />
    </div>
  );
}
