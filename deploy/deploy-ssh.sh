#!/bin/sh
# Forced command for the GitHub Actions deploy key (authorized_keys on the server). Installed root-owned at
# /usr/local/sbin/opportuneer-deploy-ssh. The key can do nothing except ask for one commit hash to be deployed;
# opportuneer-deploy re-checks that the commit is on main and not older than what is live.
sha=$SSH_ORIGINAL_COMMAND
if ! printf '%s' "$sha" | grep -qE '^[0-9a-f]{40}$'; then
  echo "expected a 40-character commit hash" >&2
  exit 2
fi
exec /usr/local/sbin/opportuneer-deploy "$sha"
