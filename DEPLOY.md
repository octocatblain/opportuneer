# Deploying Opportuneer

Live at **https://opportuneer.redstarstandard.co.ke** on the Red Star server (AlmaLinux 9, Apache, systemd).

```
git push main ─▶ GitHub Actions "CI" (typecheck, lint, build, tests on a throwaway Postgres)
                   │ green
                   ▼
   GitHub webhook "workflow_run" (HMAC-signed) ─▶ https://opportuneer.redstarstandard.co.ke/hooks/deploy
                   │ Apache ─▶ opportuneer-hook (127.0.0.1:9040, unprivileged)
                   │ checks signature, repo, branch, workflow name and result, then writes the commit hash to a file
                   ▼
   opportuneer-deploy.path (root) sees the file ─▶ /usr/local/sbin/opportuneer-deploy --request
        fetch ─▶ unpack the commit into releases/<sha> ─▶ npm ci (only if the lockfile changed) ─▶ next build
        ─▶ prisma migrate deploy ─▶ flip `current` ─▶ restart ─▶ /login must answer 200, else roll back
```

A red CI run never deploys, an older run finishing late never replaces a newer release, and pull requests only run the tests.
The server pulls over public HTTPS, so GitHub holds no key to the server, and the web app never gets root.

## Server layout

| | |
|---|---|
| Host | `62.171.188.211`, domain `opportuneer.redstarstandard.co.ke` |
| TLS | Let's Encrypt certificate (`certbot`, webroot `/var/www/html`), renewed by `certbot-renew.timer`; a deploy hook reloads Apache |
| Apache | `/usr/local/apache/conf.d/opportuneer.redstarstandard.co.ke.conf` (copy: `deploy/apache-opportuneer.conf`): http → https, HSTS, proxies `/` to `127.0.0.1:3040` and `/hooks/deploy` to `127.0.0.1:9040` |
| App | systemd `opportuneer`, user `opportuneer`, Node 24 at `/opt/node-redstar/bin/node`, `next start` on `127.0.0.1:3040` |
| Releases | `/var/www/opportuneer/releases/<sha>` (newest 3 kept), `current` → live release, `repo.git` (mirror) |
| Shared | `/var/www/opportuneer/shared/.env` (mode 600) and `shared/storage` (generated PDFs, uploads) survive every deploy |
| Database | PostgreSQL 16 on `127.0.0.1:5433`, database and role `opportuneer` |
| PDFs | Chromium at `/usr/bin/chromium-browser` (`CHROME_PATH`) |
| Daily scan | `opportuneer-scan.timer`, 08:00 Nairobi (the on-start scan is off: `SKIP_STARTUP_SCAN=1`) |
| Backups | `opportuneer-backup.timer`, 02:30 Nairobi, to `/var/backups/opportuneer` (14 kept) |
| Deploy log | `/var/log/opportuneer-deploy.log`, `journalctl -u opportuneer-deploy`, `journalctl -u opportuneer-hook` |

## Everyday commands (as root)

```bash
systemctl status opportuneer                 # is it up?
journalctl -u opportuneer -f                 # app log
opportuneer-deploy                           # deploy the tip of main by hand
opportuneer-deploy --force <old-commit>      # roll back to an older commit on main
systemctl list-timers 'opportuneer-*'        # scan and backup schedule
```

## One-time setup (already done on the live server)

1. `deploy/deploy.sh` → `/usr/local/sbin/opportuneer-deploy` and `deploy/hook-server.mjs` → `/usr/local/lib/opportuneer/`
   (root-owned copies: root never runs code from a folder the app user can write to). **If those two files change in the repo, copy them again.**
2. `deploy/*.service|*.path|*.timer` → `/etc/systemd/system/`, then `systemctl daemon-reload` (same rule if they change).
3. `/etc/opportuneer/hook.env` (mode 600): `DEPLOY_WEBHOOK_SECRET`, `DEPLOY_REPO=octocatblain/opportuneer`, `DEPLOY_BRANCH=main`, `DEPLOY_WORKFLOW=CI`.
4. GitHub → repo → Settings → Webhooks → Add webhook: payload URL `https://opportuneer.redstarstandard.co.ke/hooks/deploy`,
   content type `application/json`, secret = `DEPLOY_WEBHOOK_SECRET`, event **Workflow runs** only. A ping shows `200 pong`.
5. Google Cloud Console → your OAuth client → add the redirect URI `https://opportuneer.redstarstandard.co.ke/api/auth/callback/google`.

## Troubleshooting

- **A push did not deploy**: GitHub → Actions (did *CI* pass?), then Settings → Webhooks → Recent Deliveries (expect `202`; `401` means the secret differs from `hook.env`), then `tail /var/log/opportuneer-deploy.log`.
- **Deploy said BUILD FAILED**: nothing changed, the old release is still live; the log has the compiler output.
- **Deploy rolled back**: the new release did not answer `/login` in 90 s; the app log is printed above the rollback line.
- **PDFs fail**: check `CHROME_PATH` in `shared/.env` and `journalctl -u opportuneer`.
