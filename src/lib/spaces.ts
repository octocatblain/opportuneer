import type { Role, Track, TrackAccess } from "@prisma/client";

/**
 * The app has two areas:
 *  - /admin: the superuser's console (accounts, invitations, config, analytics).
 *  - /client/<space>: the workspace clients use. One space per kind of account:
 *      jobs     -> job-search track only
 *      pitches  -> agency-pitch track only
 *      duo      -> both tracks
 * The superuser can enter every space (that is how they "switch role") and always keeps /admin.
 */
export const SPACES = ["jobs", "pitches", "duo"] as const;
export type Space = (typeof SPACES)[number];

export const SPACE_LABEL: Record<Space, string> = { jobs: "Jobs", pitches: "Pitches", duo: "Duo (jobs + pitches)" };
export const SPACE_COOKIE = "opp_space";

export const isSpace = (s: string | undefined | null): s is Space => SPACES.includes(s as Space);

export const spaceForAccess = (a: TrackAccess): Space => (a === "JOB" ? "jobs" : a === "PITCH" ? "pitches" : "duo");
export const accessForSpace = (s: Space): TrackAccess => (s === "jobs" ? "JOB" : s === "pitches" ? "PITCH" : "BOTH");
export const spaceAllowsTrack = (s: Space, t: Track) => s === "duo" || (s === "jobs" ? t === "JOB" : t === "PITCH");

export const clientBase = (s: Space) => `/client/${s}`;

/** Where a signed-in account lands: admins on /admin, clients in their own space. */
export const homeFor = (u: { role: Role; trackAccess: TrackAccess }) => (u.role === "SUPERUSER" ? "/admin" : clientBase(spaceForAccess(u.trackAccess)));

/** May this account enter this space? Superusers may enter all of them. */
export const canEnterSpace = (u: { role: Role; trackAccess: TrackAccess }, s: Space) => u.role === "SUPERUSER" || spaceForAccess(u.trackAccess) === s;

/**
 * Where to send someone right after signing in: the page they asked for if their account may open it,
 * otherwise their own home.
 */
export function landingFor(u: { role: Role; trackAccess: TrackAccess }, next: string): string {
  const home = homeFor(u);
  const isAdmin = u.role === "SUPERUSER";
  if (next === "/" || next === "") return home;
  if (next === "/admin" || next.startsWith("/admin/")) return isAdmin ? next : home;
  const m = /^\/client\/([^/?#]+)/.exec(next);
  if (m) return isSpace(m[1]) && canEnterSpace(u, m[1]) ? next : home;
  return home;
}
