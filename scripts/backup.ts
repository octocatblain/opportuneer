/**
 * Database + generated-files backup.   npm run backup
 *
 * Writes opportuneer-<timestamp>.dump (pg_dump custom format) and storage-<timestamp>.tgz (generated CVs/PDFs) into
 * BACKUP_DIR (default ~/backups/opportuneer, outside the repo), checks the dump can be read back, and keeps the newest
 * BACKUP_KEEP sets (default 14). The backups contain users' data: keep the folder private and off shared drives.
 *
 * Restore:  pg_restore --clean --if-exists --no-owner -d <database url> <file>.dump     (see README "Backups")
 * Schedule: see the Task Scheduler command in README.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run through npm run backup so .env is loaded).");
const u = new URL(url);
const dir = process.env.BACKUP_DIR || path.join(os.homedir(), "backups", "opportuneer");
const keep = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
fs.mkdirSync(dir, { recursive: true });

function pgTool(name: string) {
  const exe = process.platform === "win32" ? `${name}.exe` : name;
  if (process.env.PG_BIN) return path.join(process.env.PG_BIN, exe);
  const root = "C:\\Program Files\\PostgreSQL";
  if (process.platform === "win32" && fs.existsSync(root)) {
    const v = fs.readdirSync(root).filter((d) => /^\d+$/.test(d)).sort((a, b) => Number(b) - Number(a))[0];
    if (v && fs.existsSync(path.join(root, v, "bin", exe))) return path.join(root, v, "bin", exe);
  }
  return exe; // on PATH
}

const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { env: { ...process.env, PGPASSWORD: decodeURIComponent(u.password) }, encoding: "utf8" });
  if (r.error || r.status !== 0) throw new Error(`${path.basename(cmd)} failed: ${r.error?.message ?? r.stderr}`);
  return r.stdout;
};

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const dump = path.join(dir, `opportuneer-${stamp}.dump`);
const conn = ["-h", u.hostname, "-p", u.port || "5432", "-U", decodeURIComponent(u.username)];

run(pgTool("pg_dump"), [...conn, "-Fc", "--no-owner", "-f", dump, u.pathname.slice(1)]);
const toc = run(pgTool("pg_restore"), ["--list", dump]);
if (!/TABLE DATA .* "?User"?/i.test(toc) && !/TABLE DATA public "User"/.test(toc)) throw new Error("Backup was written but does not contain the User table; keep the previous backups and investigate.");
console.log(`database  ${dump} (${(fs.statSync(dump).size / 1024).toFixed(0)} KB)`);

const storage = path.resolve("storage");
if (fs.existsSync(storage) && fs.readdirSync(storage).length) {
  const tgz = path.join(dir, `storage-${stamp}.tgz`);
  const r = spawnSync("tar", ["-czf", tgz, "-C", storage, "."], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`tar failed: ${r.stderr}`);
  console.log(`files     ${tgz} (${(fs.statSync(tgz).size / 1024).toFixed(0)} KB)`);
}

// Keep the newest `keep` sets of each kind.
for (const prefix of ["opportuneer-", "storage-"]) {
  const old = fs.readdirSync(dir).filter((f) => f.startsWith(prefix)).sort().reverse().slice(keep);
  for (const f of old) fs.rmSync(path.join(dir, f));
  if (old.length) console.log(`removed ${old.length} old ${prefix}* file(s)`);
}
