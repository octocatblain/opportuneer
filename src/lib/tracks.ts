import type { Track, TrackAccess } from "@prisma/client";

/** May an account with this access setting use this track? BOTH allows JOB and PITCH. */
export const allowsTrack = (access: TrackAccess, track: Track) => access === "BOTH" || access === track;

/** Waitlist interest -> account access (the waitlist calls the job-seeker track SEEKER). */
export const accessFromWaitlist = (interest: "SEEKER" | "PITCH" | "BOTH"): TrackAccess => (interest === "SEEKER" ? "JOB" : interest);
