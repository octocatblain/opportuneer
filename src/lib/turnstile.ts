/**
 * Cloudflare Turnstile (free CAPTCHA alternative). Set TURNSTILE_SITE_KEY (public) and TURNSTILE_SECRET_KEY in .env.
 * When the keys are absent the check is skipped, so local development works without them.
 */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || "";

export async function turnstileOk(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
