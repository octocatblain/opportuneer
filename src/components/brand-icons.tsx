import type { ReactNode } from "react";

/**
 * Small brand icons for the services the app talks to. Google, Gmail, LinkedIn, Claude and Gemini are
 * drawn as SVG marks. Brands without a mark here (OpenAI, the job boards) get a neutral monogram tile
 * so nothing is misdrawn. Trademarks belong to their owners; they only identify the service.
 */
type P = { size?: number; className?: string };

export function GoogleIcon({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function GmailIcon({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#4285F4" d="M2 7.2V18a1 1 0 001 1h3v-8.8z" />
      <path fill="#34A853" d="M22 7.2V18a1 1 0 01-1 1h-3v-8.8z" />
      <path fill="#FBBC04" d="M18 5.4V10.2l4-3V6.2c0-1.7-1.9-2.6-3.2-1.7z" />
      <path fill="#EA4335" d="M6 10.2V5.4L12 10l6-4.6v4.8L12 14.8z" />
      <path fill="#C5221F" d="M2 6.2v1l4 3V5.4L5.2 4.5C3.9 3.6 2 4.5 2 6.2z" />
    </svg>
  );
}

export function LinkedInIcon({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#0A66C2" />
      <circle cx="7.1" cy="7.3" r="1.5" fill="#fff" />
      <rect x="5.8" y="9.8" width="2.6" height="8" fill="#fff" />
      <path fill="#fff" d="M10.4 9.8h2.5v1.1c.4-.7 1.3-1.3 2.6-1.3 2.6 0 3.1 1.7 3.1 3.9v4.3h-2.6v-3.8c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.9h-2.6z" />
    </svg>
  );
}

export function GeminiIcon({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="gem-g" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset=".55" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path fill="url(#gem-g)" d="M12 1.5c.7 5.9 4.6 9.8 10.5 10.5-5.9.7-9.8 4.6-10.5 10.5C11.3 16.6 7.4 12.7 1.5 12 7.4 11.3 11.3 7.4 12 1.5z" />
    </svg>
  );
}

export function ClaudeIcon({ size = 18, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <g stroke="#D97757" strokeWidth="2.4" strokeLinecap="round">
        {[0, 45, 90, 135].map((a) => (
          <line key={a} x1="12" y1="3" x2="12" y2="21" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
    </svg>
  );
}

/** Neutral monogram tile for brands without a drawn mark. */
export function Monogram({ label, size = 18, className, bg = "#0e1014" }: P & { label: string; bg?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-[5px] font-semibold leading-none text-white ${className ?? ""}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.5) }}
    >
      {label}
    </span>
  );
}

const BRANDS: Record<string, (s: number) => ReactNode> = {
  google: (s) => <GoogleIcon size={s} />,
  gmail: (s) => <GmailIcon size={s} />,
  linkedin: (s) => <LinkedInIcon size={s} />,
  gemini: (s) => <GeminiIcon size={s} />,
  claude: (s) => <ClaudeIcon size={s} />,
  openai: (s) => <Monogram label="O" size={s} bg="#0e1014" />,
  brightermonday: (s) => <Monogram label="B" size={s} bg="#1d4ed8" />,
  myjobmag: (s) => <Monogram label="M" size={s} bg="#0f766e" />,
  fuzu: (s) => <Monogram label="F" size={s} bg="#7c3aed" />,
  remotive: (s) => <Monogram label="R" size={s} bg="#ef4b23" />,
  remote4africa: (s) => <Monogram label="R4" size={s} bg="#15803d" />,
  himalayas: (s) => <Monogram label="H" size={s} bg="#0369a1" />,
  jobicy: (s) => <Monogram label="J" size={s} bg="#be185d" />,
  remoteok: (s) => <Monogram label="OK" size={s} bg="#b45309" />,
};

export const brandKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Icon + name, e.g. <Brand name="Gmail" />. Unknown names get a monogram. */
export function Brand({ name, label, size = 18, className }: { name: string; label?: string; size?: number; className?: string }) {
  const icon = (BRANDS[brandKey(name)] ?? ((s: number) => <Monogram label={name.slice(0, 1).toUpperCase()} size={s} />))(size);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      {icon}
      <span>{label ?? name}</span>
    </span>
  );
}

/** Job source with its icon when we know the brand ("linkedin-paste" → LinkedIn), plain text otherwise. */
export function SourceLabel({ source, size = 14 }: { source: string; size?: number }) {
  const key = brandKey(source).replace(/paste$/, "");
  if (!(key in BRANDS)) return <span>{source}</span>;
  return <Brand name={key} label={source} size={size} />;
}
