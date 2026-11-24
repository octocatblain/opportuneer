/**
 * Public launch switch. While the product is invite-only, /login stays live but is not linked from any
 * public page (nav, footer, landing); invitees get the link in their invitation instead.
 * Set SHOW_SIGN_IN=1 in the environment (and restart) at public launch to show the Sign in buttons.
 */
export function showSignIn(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.SHOW_SIGN_IN ?? "").trim().toLowerCase());
}
