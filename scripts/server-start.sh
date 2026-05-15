#!/usr/bin/env bash
# server-start.sh
# Start the 5 Freunde server with environment loaded from server/.env.
# Useful when launching outside systemd (e.g. tmux, manual SSH session) or
# when overriding individual env vars for a one-off run.
#
# Usage:
#   ./scripts/server-start.sh
#   PORT=8443 ./scripts/server-start.sh         # override one var inline
#   ENV_FILE=/etc/5freunde/env ./scripts/server-start.sh
#
# The Node server itself also loads `.env` via dotenv — this wrapper is just
# for the convenience of resolving paths, validating TLS files, and printing
# the resolved URL before exec'ing node.
set -euo pipefail

err() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "[start] $*"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/server/.env}"

if [[ -f "$ENV_FILE" ]]; then
    log "Loading $ENV_FILE"
    set -a
    # shellcheck source=/dev/null
    . "$ENV_FILE"
    set +a
else
    log "No env file at $ENV_FILE (using process env only)"
fi

PORT="${PORT:-3001}"
SERVER_HOST="${SERVER_HOST:-localhost}"

PROTO="http"
if [[ -n "${TLS_CERT_PATH:-}" && -n "${TLS_KEY_PATH:-}" ]]; then
    [[ -r "$TLS_CERT_PATH" ]] || err "TLS_CERT_PATH not readable: $TLS_CERT_PATH"
    [[ -r "$TLS_KEY_PATH"  ]] || err "TLS_KEY_PATH not readable: $TLS_KEY_PATH"
    PROTO="https"
fi

log "Resolved URL: $PROTO://$SERVER_HOST:$PORT  (WS: ${PROTO/http/ws}://$SERVER_HOST:$PORT/ws)"
cd "$REPO_ROOT"
exec node server/server.js
