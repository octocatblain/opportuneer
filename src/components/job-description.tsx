import { parseDescription } from "@/lib/describe";

/** A job description (or notes) laid out for reading: key facts up top, headed sections, short paragraphs, bullet lists. */
export function JobDescription({ text, title }: { text: string; title?: string | null }) {
  const blocks = parseDescription(text, title);
  return (
    <div className="max-w-[72ch] space-y-4 text-[15px] leading-7 text-ink-3">
      {blocks.map((b, i) => {
        if (b.type === "facts")
          return (
            <dl key={i} className="grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2">
              {b.items.map(([k, v]) => (
                <div key={k} className="bg-paper px-4 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          );
        if (b.type === "heading")
          return (
            <h3 key={i} className="!mt-7 border-b border-rule pb-1.5 text-base font-semibold text-ink">
              {b.text}
            </h3>
          );
        if (b.type === "list")
          return (
            <ul key={i} className="space-y-2 pl-1">
              {b.items.map((it, j) => (
                <li key={j} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-signal">
                  {it}
                </li>
              ))}
            </ul>
          );
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
