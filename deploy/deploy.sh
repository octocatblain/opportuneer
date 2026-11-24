#!/usr/bin/env bash
# Opportuneer deploy. Runs as root, installed at /usr/local/sbin/opportuneer-deploy (a root-owned COPY of this file:
# root must never execute code from a folder the app user can write to).
#
#   opportuneer-deploy                   deploy the tip of origin/main
#   opportuneer-deploy <commit>          deploy that commit (must be on main and not older than what is live)
#   opportuneer-deploy --force <commit>  deploy any commit on main, including an older one (manual rollback)
#   opportuneer-deploy --request         deploy the commit written to the request file by the webhook (used by systemd)
#
# Layout:  /var/www/opportuneer/{repo.git, releases/<sha>, current -> releases/<sha>, shared/{.env,storage}}
# Each release is built next to the running one. The symlink flips only after the build and migrations succeed,
# the service restarts, and /login answers. If it does not answer, the previous release is put back.
set -Eeuo pipefail

BASE=/var/www/opportuneer
REPO_URL=${DEPLOY_REPO_URL:-https://github.com/octocatblain/opportuneer.git}
BRANCH=main
APP_USER=opportuneer
SERVICE=opportuneer
PORT=3040
NODE_DIR=/opt/node-redstar/bin
REQ_DIR=/var/lib/opportuneer-deploy
REQ_FILE=$REQ_DIR/request
KEEP=3
LOG=/var/log/opportuneer-deploy.log

export HOME=/root GIT_TERMINAL_PROMPT=0
exec > >(tee -a "$LOG") 2>&1
log() { echo "[$(date '+%F %T')] $*"; }

exec 9>/run/opportuneer-deploy.lock
flock -w 1800 9 || { log "another deploy is still running after 30 min, giving up"; exit 1; }

FORCE=0
MODE=tip
TARGET=""
case "${1:-}" in
  --request) MODE=request ;;
  --force) FORCE=1; TARGET="${2:-}"; MODE=commit ;;
  "") ;;
  *) TARGET="$1"; MODE=commit ;;
esac

as_app() { runuser -u "$APP_USER" -- env "PATH=$NODE_DIR:/usr/bin:/bin" "HOME=/var/lib/$APP_USER" NEXT_TELEMETRY_DISABLED=1 "$@"; }
live_sha() { if [ -L "$BASE/current" ]; then basename "$(readlink -f "$BASE/current")"; fi; }
read_request() {
  if [ -f "$REQ_FILE" ] && [ ! -L "$REQ_FILE" ]; then
    head -c 40 "$REQ_FILE" | tr -d '[:space:]' | grep -E '^[0-9a-f]{40}$' || true
  fi
}

deploy_one() {
  local want="$1"
  local git="git --git-dir=$BASE/repo.git"
  if [ ! -d "$BASE/repo.git" ]; then git clone --mirror -q "$REPO_URL" "$BASE/repo.git"; fi
  $git fetch -q --prune origin "+refs/heads/$BRANCH:refs/heads/$BRANCH"
  local tip sha live
  tip=$($git rev-parse "refs/heads/$BRANCH")
  live=$(live_sha)
  sha=${want:-$tip}
  [[ $sha =~ ^[0-9a-f]{40}$ ]] || { log "refusing '$sha': not a full commit hash"; return 1; }
  $git cat-file -e "$sha^{commit}" 2>/dev/null || { log "commit $sha is unknown to origin"; return 1; }
  $git merge-base --is-ancestor "$sha" "refs/heads/$BRANCH" || { log "refusing $sha: not on $BRANCH"; return 1; }
  if [ "$sha" = "$live" ]; then log "$sha is already live"; return 0; fi
  if [ "$FORCE" = 0 ] && [ -n "$live" ] && $git cat-file -e "$live^{commit}" 2>/dev/null && $git merge-base --is-ancestor "$sha" "$live"; then
    log "skipping $sha: older than the live release $live"; return 0
  fi

  local rel=$BASE/releases/$sha
  log "=== deploying $sha (live: ${live:-none}) ==="
  rm -rf "$rel"; mkdir -p "$rel"
  $git archive "$sha" | tar -x -C "$rel"
  ln -s "$BASE/shared/.env" "$rel/.env"
  ln -s "$BASE/shared/storage" "$rel/storage"
  chown -R "$APP_USER:$APP_USER" "$rel"

  if [ -n "$live" ] && [ -d "$BASE/current/node_modules" ] && cmp -s "$BASE/current/package-lock.json" "$rel/package-lock.json"; then
    log "lockfile unchanged: copying node_modules"
    cp -a "$BASE/current/node_modules" "$rel/node_modules"
    chown -R "$APP_USER:$APP_USER" "$rel/node_modules"
    (cd "$rel" && as_app npx prisma generate >/dev/null)
  else
    log "npm ci"
    (cd "$rel" && as_app nice -n 10 npm ci --no-audit --no-fund) || { log "NPM CI FAILED, nothing changed"; rm -rf "$rel"; return 1; }
  fi

  # next/font downloads Google Fonts during the build; that fetch fails now and then, so try up to 3 times
  local attempt built=0
  for attempt in 1 2 3; do
    log "next build (attempt $attempt)"
    if (cd "$rel" && as_app env NODE_ENV=production NODE_OPTIONS=--max-old-space-size=2048 nice -n 10 npx next build); then built=1; break; fi
    sleep 10
  done
  if [ "$built" != 1 ]; then log "BUILD FAILED after 3 attempts, nothing changed"; rm -rf "$rel"; return 1; fi
  log "prisma migrate deploy"
  (cd "$rel" && as_app npx prisma migrate deploy) || { log "MIGRATION FAILED, nothing switched"; rm -rf "$rel"; return 1; }

  ln -sfn "$rel" "$BASE/current.tmp" && mv -T "$BASE/current.tmp" "$BASE/current"
  systemctl restart "$SERVICE"
  local ok=0 i
  for i in $(seq 1 45); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/login")" = 200 ]; then ok=1; break; fi
    sleep 2
  done
  if [ "$ok" = 1 ]; then
    log "healthy: $sha is live"
  else
    log "NEW RELEASE DID NOT ANSWER /login: rolling back"
    journalctl -u "$SERVICE" -n 25 --no-pager || true
    if [ -n "$live" ] && [ -d "$BASE/releases/$live" ]; then
      ln -sfn "$BASE/releases/$live" "$BASE/current.tmp" && mv -T "$BASE/current.tmp" "$BASE/current"
      systemctl restart "$SERVICE"
      log "rolled back to $live"
    fi
    rm -rf "$rel"
    return 1
  fi

  # keep the newest few releases (never the live one)
  local old
  ls -1t "$BASE/releases" | tail -n +$((KEEP + 1)) | while read -r old; do
    if [ "$old" != "$(live_sha)" ]; then rm -rf "${BASE:?}/releases/$old"; fi
  done
  return 0
}

case $MODE in
  request)
    # A push can land while a deploy runs: after each deploy look at the request file again.
    last=""
    while :; do
      want=$(read_request)
      if [ -z "$want" ] || [ "$want" = "$last" ]; then break; fi
      last=$want
      deploy_one "$want" || exit 1
    done ;;
  *) deploy_one "$TARGET" ;;
esac
