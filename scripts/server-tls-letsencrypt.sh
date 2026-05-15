#!/usr/bin/env bash
# server-tls-letsencrypt.sh
# Obtain a Let's Encrypt certificate for the 5 Freunde server and write its
# paths into server/.env so the Node process picks them up on next start.
#
# Usage:
#   sudo SERVER_HOST=your.host EMAIL=ops@your.host ./scripts/server-tls-letsencrypt.sh
#
# Required env:
#   SERVER_HOST   Public DNS name pointing at this machine (A/AAAA record).
#   EMAIL         Contact email registered with Let's Encrypt.
#
# Optional env:
#   MODE          'standalone' (default) | 'webroot'
#   WEBROOT       Path served at http://SERVER_HOST/ (required if MODE=webroot).
#   ENV_FILE      Path to dotenv file to update (default: ./server/.env).
#   STAGING       1 = use Let's Encrypt staging (no rate limits, untrusted cert).
#
# Requires: certbot, sudo, an open port 80 (standalone) or a running web server
# (webroot). Standalone mode binds :80 itself — stop any web server on :80 first.
set -euo pipefail

err() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "[letsencrypt] $*"; }

[[ -n "${SERVER_HOST:-}" ]] || err "SERVER_HOST is required"
[[ -n "${EMAIL:-}"       ]] || err "EMAIL is required"
command -v certbot >/dev/null 2>&1 || err "certbot not found in PATH (install: https://certbot.eff.org)"

MODE="${MODE:-standalone}"
ENV_FILE="${ENV_FILE:-$(dirname "$0")/../server/.env}"
STAGING_FLAG=""
[[ "${STAGING:-0}" == "1" ]] && STAGING_FLAG="--staging"

case "$MODE" in
    standalone)
        log "Running certbot in standalone mode (binds :80)…"
        sudo certbot certonly --standalone --non-interactive --agree-tos \
            -d "$SERVER_HOST" -m "$EMAIL" $STAGING_FLAG
        ;;
    webroot)
        [[ -n "${WEBROOT:-}" ]] || err "WEBROOT is required when MODE=webroot"
        log "Running certbot in webroot mode (path: $WEBROOT)…"
        sudo certbot certonly --webroot -w "$WEBROOT" --non-interactive --agree-tos \
            -d "$SERVER_HOST" -m "$EMAIL" $STAGING_FLAG
        ;;
    *)
        err "Unknown MODE '$MODE' (use 'standalone' or 'webroot')"
        ;;
esac

CERT_DIR="/etc/letsencrypt/live/$SERVER_HOST"
CERT_PATH="$CERT_DIR/fullchain.pem"
KEY_PATH="$CERT_DIR/privkey.pem"
sudo test -f "$CERT_PATH" || err "Cert not found at $CERT_PATH after issuance"
sudo test -f "$KEY_PATH"  || err "Key not found at $KEY_PATH after issuance"

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

# Idempotent env-file rewrite: drop any existing TLS_* lines, append the new
# values. Other keys (PORT, JWT_SECRET, …) are preserved.
TMP="$(mktemp)"
grep -vE '^(TLS_CERT_PATH|TLS_KEY_PATH|TLS_CA_PATH|SERVER_HOST)=' "$ENV_FILE" > "$TMP" || true
{
    cat "$TMP"
    echo "SERVER_HOST=$SERVER_HOST"
    echo "TLS_CERT_PATH=$CERT_PATH"
    echo "TLS_KEY_PATH=$KEY_PATH"
} > "$ENV_FILE"
rm -f "$TMP"

log "Wrote TLS_CERT_PATH / TLS_KEY_PATH into $ENV_FILE"
log "Done. Restart the server to pick up the new cert."
log "Tip: add a daily 'certbot renew' cron + run scripts/server-tls-renew.sh"
