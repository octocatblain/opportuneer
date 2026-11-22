"use client";

export default function ErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md py-16 text-center">
      <h1 className="page-title">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. Please try again.</p>
      <button type="button" onClick={reset} className="link mt-4 text-sm font-medium">
        Try again
      </button>
    </div>
  );
}
