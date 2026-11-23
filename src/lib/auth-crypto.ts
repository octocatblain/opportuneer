// Pure helpers (no Next.js imports) so scripts such as prisma/seed.ts can use them too.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// ---------- invite links ----------
/** An invite link works once and for this many days. */
export const INVITE_DAYS = 7;
/** SHA-256 hex digest. Session cookies and invite secrets are stored only as this hash. */
export const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
/** A new random invite secret (256 bits). Only its hash is stored; the link carrying it is shown once. */
export const newInviteToken = () => randomBytes(32).toString("base64url");

// ---------- passwords ----------
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the work, so an unknown email can't be told apart by timing.
  const [, saltHex, keyHex] = (stored ?? `scrypt$${"00".repeat(16)}$${"00".repeat(64)}`).split("$");
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return Boolean(stored) && timingSafeEqual(actual, expected);
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 200) return "Password is too long.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Include letters and at least one number.";
  return null;
}

