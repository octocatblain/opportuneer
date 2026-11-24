# Deploying Opportuneer

Live at **https://opportuneer.redstarstandard.co.ke** on the Red Star server (AlmaLinux 9, Apache, systemd).

```
git push main ─▶ GitHub Actions "CI": typecheck, lint, build, tests on a throwaway Postgres
                   │ green (pull requests stop here)
                   ▼
   job "deploy": ssh with a restricted key ─▶ forced command /usr/local/sbin/opportuneer-deploy-ssh <commit>
        ─▶ opportuneer-deploy: fetch ─▶ unpack releases/<sha> ─▶ npm ci (only if the lockfile changed) ─▶ next build (3 tries)
        ─▶ prisma migrate deploy ─▶ flip `current` ─▶ restart ─▶ /login must answer 200, else roll back
```

A red CI run never deploys, an older commit never replaces a newer release, and the run page shows the whole deploy log.
The SSH key in GitHub can do exactly one thing: ask the server to deploy a commit hash. The server pulls the code itself over public HTTPS,
and the web app never gets root. (An earlier design used a GitHub webhook; it is switched off. `deploy/hook-server.mjs` and the `opportuneer-hook` / `opportuneer-deploy.path` units are kept only in case you want it back.)

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
| Deploy log | the *deploy* job in GitHub Actions, and `/var/log/opportuneer-deploy.log` on the server |

## Everyday commands (as root)

```bash
systemctl status opportuneer                 # is it up?
journalctl -u opportuneer -f                 # app log
opportuneer-deploy                           # deploy the tip of main by hand
opportuneer-deploy --force <old-commit>      # roll back to an older commit on main
systemctl list-timers 'opportuneer-*'        # scan and backup schedule
```

## One-time setup (already done on the live server)

1. `deploy/deploy.sh` → `/usr/local/sbin/opportuneer-deploy` and `deploy/deploy-ssh.sh` → `/usr/local/sbin/opportuneer-deploy-ssh`
   (root-owned copies: root never runs code from a folder the app user can write to). **If those files change in the repo, copy them again.**
2. `deploy/opportuneer.service` and the scan/backup `.service|.timer` files → `/etc/systemd/system/`, then `systemctl daemon-reload` (same rule).
3. A dedicated key pair: the public half is in `/root/.ssh/authorized_keys` as
   `command="/usr/local/sbin/opportuneer-deploy-ssh",restrict ssh-ed25519 AAAA… github-actions-opportuneer-deploy`;
   the private half is the repository secret **DEPLOY_SSH_KEY** (GitHub → Settings → Secrets and variables → Actions).
4. Google Cloud Console → your OAuth client → add the redirect URI `https://opportuneer.redstarstandard.co.ke/api/auth/callback/google`.

To rotate the key: `ssh-keygen -t ed25519 -N "" -f key`, replace the line in `authorized_keys`, update the secret.

## Troubleshooting

- **A push did not deploy**: GitHub → Actions → the run → the *deploy* job (its log is the server deploy log). "Add the DEPLOY_SSH_KEY secret" means the secret is missing; "Permission denied" means it does not match `authorized_keys`.
- **Deploy said BUILD FAILED**: nothing changed, the old release is still live; the log has the compiler output.
- **Deploy rolled back**: the new release did not answer `/login` in 90 s; the app log is printed above the rollback line.
- **PDFs fail**: check `CHROME_PATH` in `shared/.env` and `journalctl -u opportuneer`.
