#!/usr/bin/env bash
# server-tls-renew.sh
# Hook intended for a daily cron / systemd timer. Runs `certbot renew` and
# restarts the 5 Freunde server (via systemd) if a renewal actually happened.
#
# Usage:
#   sudo ./scripts/server-tls-renew.sh
#
# Optional env:
#   SERVICE       systemd unit to restart on successful renewal
#                 (default: '5freunde-server.service'; set empty to skip).
#   POST_HOOK     Extra command to run after restart (e.g. health-check curl).
#
# Recommended cron entry (twice daily, jittered):
#   17 4,16 * * * /opt/5freunde/scripts/server-tls-renew.sh >> /var/log/5freunde-renew.log 2>&1
set -euo pipefail

err() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "[renew] $(date -Iseconds) $*"; }

command -v certbot >/dev/null 2>&1 || err "certbot not found in PATH"
SERVICE="${SERVICE:-5freunde-server.service}"

# certbot renew is idempotent — it exits 0 even when nothing was renewed.
# --deploy-hook only fires on actual renewals, so use it to trigger restart.
DEPLOY_HOOK=""
if [[ -n "$SERVICE" ]]; then
    DEPLOY_HOOK="--deploy-hook 'systemctl restart $SERVICE'"
fi

log "Running certbot renew…"
# shellcheck disable=SC2086  # we want word-splitting on DEPLOY_HOOK
eval certbot renew --non-interactive $DEPLOY_HOOK

if [[ -n "${POST_HOOK:-}" ]]; then
    log "Post-hook: $POST_HOOK"
    bash -c "$POST_HOOK" || log "Post-hook failed (non-fatal)"
fi

log "Done."
