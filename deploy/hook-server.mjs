// Deploy webhook receiver. Tiny, dependency-free, runs as the unprivileged app user behind Apache at /hooks/deploy.
// It only checks GitHub's signature and the event, then writes the commit hash to a request file. A root-owned
// systemd path unit notices the file and runs opportuneer-deploy, which re-checks the commit before using it.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";
const REPO = process.env.DEPLOY_REPO || "octocatblain/opportuneer";
const BRANCH = process.env.DEPLOY_BRANCH || "main";
const WORKFLOW = process.env.DEPLOY_WORKFLOW || "CI";
const REQUEST_FILE = process.env.REQUEST_FILE || "/var/lib/opportuneer-deploy/request";
const PORT = Number(process.env.HOOK_PORT || 9040);
if (SECRET.length < 32) {
  console.error("DEPLOY_WEBHOOK_SECRET must be at least 32 characters");
  process.exit(1);
}

const log = (...a) => console.log("[hook]", ...a);
const reply = (res, code, text) => {
  res.writeHead(code, { "content-type": "text/plain" });
  res.end(text + "\n");
};

http
  .createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/hooks/deploy") return reply(res, 404, "not found");
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) {
        reply(res, 413, "too large");
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      if (res.writableEnded) return;
      const body = Buffer.concat(chunks);
      const given = String(req.headers["x-hub-signature-256"] || "");
      const want = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
      const ok = given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
      if (!ok) {
        log("rejected: bad signature");
        return reply(res, 401, "bad signature");
      }

      const event = req.headers["x-github-event"];
      if (event === "ping") {
        log("ping");
        return reply(res, 200, "pong");
      }
      if (event !== "workflow_run") return reply(res, 200, `ignored event ${event}`);

      let p;
      try {
        p = JSON.parse(body.toString("utf8"));
      } catch {
        return reply(res, 400, "bad json");
      }
      const r = p.workflow_run || {};
      if (p.action !== "completed") return reply(res, 200, "ignored: not completed");
      if (p.repository?.full_name !== REPO) {
        log("rejected: repo", p.repository?.full_name);
        return reply(res, 403, "wrong repository");
      }
      if (r.name !== WORKFLOW) return reply(res, 200, `ignored workflow ${r.name}`);
      if (r.head_branch !== BRANCH || r.event !== "push") return reply(res, 200, "ignored: not a push to " + BRANCH);
      if (r.conclusion !== "success") {
        log("CI did not pass:", r.conclusion, r.head_sha);
        return reply(res, 200, "ignored: CI " + r.conclusion);
      }
      if (!/^[0-9a-f]{40}$/.test(r.head_sha || "")) return reply(res, 400, "bad sha");

      try {
        const tmp = REQUEST_FILE + ".tmp";
        fs.mkdirSync(path.dirname(REQUEST_FILE), { recursive: true });
        fs.writeFileSync(tmp, r.head_sha + "\n", { mode: 0o640 });
        fs.renameSync(tmp, REQUEST_FILE);
      } catch (e) {
        log("could not write request:", e.message);
        return reply(res, 500, "could not queue deploy");
      }
      log("deploy queued", r.head_sha);
      reply(res, 202, "deploying " + r.head_sha);
    });
  })
  .listen(PORT, "127.0.0.1", () => log(`listening on 127.0.0.1:${PORT} for ${REPO} ${BRANCH} / workflow "${WORKFLOW}"`));
