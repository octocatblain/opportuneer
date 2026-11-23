/**
 * Secrets check.   npm run check:secrets
 * Fails (exit 1) if a secret is tracked by git, sits in git history, or the ignore rules would let one in.
 * Warns about secrets that are fine in .env but should not stay there forever.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const git = (...args: string[]) => spawnSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const problems: string[] = [];
const warnings: string[] = [];

if (git("rev-parse", "--git-dir").status !== 0) {
  console.log("Not a git repository: nothing is tracked, so nothing can leak through git. (Still keep .env out of zips and screenshots.)");
  process.exit(0);
}

// Shapes of real keys (placeholders such as YOUR_PASSWORD or empty values don't match).
const PATTERNS: [string, string][] = [
  ["Anthropic key", "sk-ant-[A-Za-z0-9_-]{20,}"],
  ["OpenAI key", "sk-(proj-)?[A-Za-z0-9_-]{32,}"],
  ["Google API key", "AIza[0-9A-Za-z_-]{35}"],
  ["Google OAuth secret", "GOCSPX-[0-9A-Za-z_-]{20,}"],
  ["Private key", "-----BEGIN [A-Z ]*PRIVATE KEY-----"],
  ["Database URL with a password", "postgres(ql)?://[^:@/[:space:]]+:[^@/[:space:]]{3,}@"],
];

const tracked = git("ls-files").stdout.split("\n").filter(Boolean);
for (const f of tracked) {
  if (/(^|\/)\.env($|\.)/.test(f) && !f.endsWith(".env.example")) problems.push(`${f} is tracked by git`);
  if (/client_secret.*\.json$/i.test(f)) problems.push(`${f} is tracked by git`);
}

const revs = git("rev-list", "--all").stdout.split("\n").filter(Boolean);
for (const [label, re] of PATTERNS) {
  const inTree = git("grep", "-InE", re, "--", ".");
  if (inTree.status === 128) problems.push(`secret scan could not run (${label}): ${inTree.stderr.trim()}`);
  // The documented placeholder in .env.example is fine.
  for (const l of inTree.stdout.split("\n").filter((x) => x && !x.includes("YOUR_PASSWORD"))) problems.push(`${label} found in tracked file ${l.split(":").slice(0, 2).join(":")}`);
  if (revs.length) {
    const inHistory = git("grep", "-InE", re, ...revs.slice(0, 500));
    const files = [...new Set(inHistory.stdout.split("\n").filter((x) => x && !x.includes("YOUR_PASSWORD")).map((l) => l.replace(/^[0-9a-f]{40}:/, "").split(":")[0]))];
    for (const f of files) problems.push(`${label} found in git history (${f}); rotate that key, then rewrite history`);
  }
}

const ignore = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
for (const rule of [".env*", "client_secret*.json", "/storage/"]) if (!ignore.split(/\r?\n/).includes(rule)) problems.push(`.gitignore is missing "${rule}"`);

if (fs.existsSync(".env")) {
  const env = fs.readFileSync(".env", "utf8");
  if (/^SUPERUSER_PASSWORD=\S+/m.test(env)) warnings.push("SUPERUSER_PASSWORD is still in .env: change the password in Settings, then delete that line.");
}
const stray = fs.readdirSync(".").filter((f) => /client_secret.*\.json$/i.test(f));
if (stray.length) warnings.push(`${stray.join(", ")} sits in the repo folder (git-ignored). Move it to ~/.secrets/ and keep it out of zips and screenshots.`);

for (const w of warnings) console.warn(`warning: ${w}`);
if (problems.length) {
  for (const p of problems) console.error(`FAIL: ${p}`);
  process.exit(1);
}
console.log(`OK: no secrets in ${tracked.length} tracked files or ${revs.length} commits; .env and client secrets are ignored.`);
