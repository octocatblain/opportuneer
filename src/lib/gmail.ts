import fs from "node:fs/promises";
import path from "node:path";
import { getSetting, setSetting } from "@/lib/db";
import { cfg as appCfg } from "@/lib/config";
import { STORAGE_DIR } from "@/lib/pdf";

/** Drafts only: this scope can create drafts and send, but cannot read your inbox. We never call send. */
const SCOPES = ["https://www.googleapis.com/auth/gmail.compose", "openid", "email"];

type Tokens = { access_token: string; refresh_token?: string; expires_at: number; email?: string };

function cfg() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";
  if (!clientId || !clientSecret) throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  return { clientId, clientSecret, redirectUri };
}

export function gmailConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authUrl(state: string) {
  const { clientId, redirectUri } = cfg();
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    login_hint: appCfg().gmail.account,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${json.error_description || json.error || res.status}`);
  return json as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };
}

export async function exchangeCode(code: string) {
  const { clientId, clientSecret, redirectUri } = cfg();
  const t = await tokenRequest({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
  let email: string | undefined;
  if (t.id_token) {
    const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString());
    email = payload.email;
  }
  const tokens: Tokens = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000, email };
  await setSetting("gmail", tokens);
  return tokens;
}

export async function gmailAccount(): Promise<string | null> {
  const t = await getSetting<Tokens | null>("gmail", null);
  return t?.refresh_token ? (t.email ?? "connected") : null;
}

export async function disconnectGmail() {
  await setSetting("gmail", null);
}

async function accessToken(): Promise<string> {
  const t = await getSetting<Tokens | null>("gmail", null);
  if (!t?.refresh_token) throw new Error("Gmail is not connected. Open Settings → Connect Gmail.");
  if (t.expires_at - 60_000 > Date.now()) return t.access_token;
  const { clientId, clientSecret } = cfg();
  const r = await tokenRequest({ refresh_token: t.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" });
  await setSetting("gmail", { ...t, access_token: r.access_token, expires_at: Date.now() + r.expires_in * 1000 });
  return r.access_token;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

/** Creates a Gmail draft (never sends). Attachments are paths relative to /storage. */
export async function createDraft(opts: { to?: string | null; subject: string; body: string; attachments?: string[] }) {
  const boundary = `opp_${Date.now().toString(36)}`;
  const parts: string[] = [
    ...(opts.to ? [`To: ${opts.to}`] : []),
    `Subject: ${encodeHeader(opts.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(opts.body).replace(/.{76}/g, "$&\r\n"),
  ];
  for (const rel of opts.attachments ?? []) {
    const data = await fs.readFile(path.join(STORAGE_DIR, rel));
    const name = path.basename(rel);
    parts.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${name}"`,
      `Content-Disposition: attachment; filename="${name}"`,
      "Content-Transfer-Encoding: base64",
      "",
      b64(data).replace(/.{76}/g, "$&\r\n"),
    );
  }
  parts.push(`--${boundary}--`);
  const raw = Buffer.from(parts.join("\r\n")).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Gmail draft failed: ${json.error?.message || res.status}`);
  return json.id as string;
}
