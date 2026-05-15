#!/usr/bin/env bash
# server-tls-selfsigned.sh
# Generate a self-signed TLS cert (with SAN) for local / LAN development and
# write its paths into server/.env so the Node process picks them up.
#
# Usage:
#   SERVER_HOST=localhost ./scripts/server-tls-selfsigned.sh
#   SERVER_HOST=game.lan SAN_IP=192.168.1.42 ./scripts/server-tls-selfsigned.sh
#
# Required env:
#   SERVER_HOST   DNS name to embed in the cert (CN + SAN).
#
# Optional env:
#   SAN_IP        Comma-separated extra IPs to embed as SAN entries.
#   DAYS          Validity in days (default: 365).
#   OUT_DIR       Where to put cert + key (default: ./server/certs).
#   ENV_FILE      dotenv file to update (default: ./server/.env).
#   KEY_BITS      RSA key size (default: 2048).
#
# Self-signed certs are NOT trusted by browsers by default. For Chrome/Firefox
# install via `mkcert -install` then run `mkcert $SERVER_HOST` instead, or
# add the produced cert to your OS trust store. Native game clients (Electron,
# Steam) can be configured to skip cert validation in dev — but never in prod.
set -euo pipefail

err() { echo "ERROR: $*" >&2; exit 1; }
log() { echo "[selfsigned] $*"; }

[[ -n "${SERVER_HOST:-}" ]] || err "SERVER_HOST is required"
command -v openssl >/dev/null 2>&1 || err "openssl not found in PATH"

DAYS="${DAYS:-365}"
KEY_BITS="${KEY_BITS:-2048}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${OUT_DIR:-$SCRIPT_DIR/../server/certs}"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../server/.env}"
mkdir -p "$OUT_DIR"

KEY_PATH="$OUT_DIR/$SERVER_HOST.key"
CERT_PATH="$OUT_DIR/$SERVER_HOST.crt"
CONFIG="$(mktemp)"
trap 'rm -f "$CONFIG"' EXIT

# Build OpenSSL config with SAN entries (DNS + optional IPs)
{
    cat <<EOF
[req]
distinguished_name = dn
req_extensions     = req_ext
prompt             = no

[dn]
CN = $SERVER_HOST

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $SERVER_HOST
EOF
    # localhost convenience
    if [[ "$SERVER_HOST" != "localhost" ]]; then
        echo "DNS.2 = localhost"
        echo "IP.1 = 127.0.0.1"
    else
        echo "IP.1 = 127.0.0.1"
    fi
    if [[ -n "${SAN_IP:-}" ]]; then
        IDX=2
        IFS=',' read -ra IPS <<<"$SAN_IP"
        for ip in "${IPS[@]}"; do
            echo "IP.$IDX = $ip"
            IDX=$((IDX+1))
        done
    fi
} > "$CONFIG"

log "Generating $KEY_BITS-bit RSA key + self-signed cert (valid $DAYS days)…"
openssl req -x509 -nodes -newkey "rsa:$KEY_BITS" -days "$DAYS" \
    -keyout "$KEY_PATH" -out "$CERT_PATH" \
    -config "$CONFIG" -extensions req_ext >/dev/null 2>&1

chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"

TMP="$(mktemp)"
grep -vE '^(TLS_CERT_PATH|TLS_KEY_PATH|TLS_CA_PATH|SERVER_HOST)=' "$ENV_FILE" > "$TMP" || true
{
    cat "$TMP"
    echo "SERVER_HOST=$SERVER_HOST"
    echo "TLS_CERT_PATH=$CERT_PATH"
    echo "TLS_KEY_PATH=$KEY_PATH"
} > "$ENV_FILE"
rm -f "$TMP"

log "Cert: $CERT_PATH"
log "Key : $KEY_PATH"
log "Wrote paths into $ENV_FILE"
log "Done. Restart the server to pick up the new cert."
