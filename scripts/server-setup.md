# 5 Freunde — Server Setup with TLS

End-to-end recipe for getting the server up with HTTPS + WSS. Every URL,
domain, and path is driven by env vars — no source edits required.

## 0. Variables you will set

All scripts read these from the environment (or from `server/.env` after the
TLS scripts have written it there). See `server/.env.example` for the full
template.

| Var                 | Purpose                                                |
|---------------------|--------------------------------------------------------|
| `SERVER_HOST`       | Public DNS name. Used for cert CN, SAN, origin allowlist. |
| `PORT`              | Listen port (443 for native TLS, 3001 behind proxy).   |
| `ALLOWED_WS_ORIGINS`| CSRF allowlist for WS upgrades. CSV of `https://host`. |
| `TLS_CERT_PATH`     | Path to PEM cert (auto-set by TLS scripts).            |
| `TLS_KEY_PATH`      | Path to PEM key (auto-set by TLS scripts).             |
| `TLS_CA_PATH`       | Optional intermediate chain bundle.                    |
| `JWT_SECRET`        | Token signing secret. Rotate to invalidate sessions.   |
| `ADMIN_PASSWORD`    | Admin dashboard password.                              |

`server/server.js` calls `require('dotenv').config()` on startup, so anything
in `server/.env` is loaded automatically.

## 1. Pick a TLS source

### Public host (production) → Let's Encrypt

```bash
sudo SERVER_HOST=your.host.example.com \
     EMAIL=ops@your.host.example.com \
     ./scripts/server-tls-letsencrypt.sh
```

Standalone mode binds port 80 itself — stop any web server on :80 first, or
use `MODE=webroot WEBROOT=/var/www/html` to write challenge files into an
existing web root.

The script writes `TLS_CERT_PATH` and `TLS_KEY_PATH` (under
`/etc/letsencrypt/live/$SERVER_HOST/`) into `server/.env`.

### Local / LAN (development) → self-signed

```bash
SERVER_HOST=localhost ./scripts/server-tls-selfsigned.sh
# or for a LAN host:
SERVER_HOST=game.lan SAN_IP=192.168.1.42 ./scripts/server-tls-selfsigned.sh
```

Produces `server/certs/$SERVER_HOST.{crt,key}` with SAN entries for the
hostname and 127.0.0.1, and writes the paths into `server/.env`. Browsers
will warn on first use — install the cert into your OS trust store or use
`mkcert` for a locally-trusted cert.

## 2. Fill in the remaining env values

Edit `server/.env` (created by the TLS script above):

```env
SERVER_HOST=your.host.example.com
PORT=443
ALLOWED_WS_ORIGINS=https://your.host.example.com
TLS_CERT_PATH=/etc/letsencrypt/live/your.host.example.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/your.host.example.com/privkey.pem
JWT_SECRET=<long-random>
ADMIN_PASSWORD=<strong>
```

Generate a strong `JWT_SECRET` with `openssl rand -base64 48`.

## 3. Start the server

### One-shot

```bash
./scripts/server-start.sh
```

Loads `server/.env`, sanity-checks the TLS files, prints the resolved URL,
then exec's `node server/server.js`. Set `ENV_FILE=…` to point at a different
dotenv path; set any var inline to override (e.g. `PORT=8443 …/server-start.sh`).

### Long-running (systemd)

```bash
sudo cp scripts/server-systemd.service.example /etc/systemd/system/5freunde-server.service
# edit User, WorkingDirectory, EnvironmentFile in the unit
sudo systemctl daemon-reload
sudo systemctl enable --now 5freunde-server.service
```

The example unit hardens the process (`ProtectSystem=strict`, dropped
capabilities) and binds the data directory as the only writable path.

## 4. Auto-renew (Let's Encrypt only)

`certbot.timer` (installed alongside certbot on most distros) runs the
renewal check twice daily. To restart the Node service on actual renewal
events, install our wrapper as a cron entry:

```cron
17 4,16 * * * /opt/5freunde/scripts/server-tls-renew.sh >> /var/log/5freunde-renew.log 2>&1
```

The wrapper passes `--deploy-hook 'systemctl restart 5freunde-server.service'`
to certbot, so the Node service only restarts when a cert actually rolled
over. Set `SERVICE=` to an empty string to skip the restart, or `POST_HOOK=…`
to run a health-check afterward.

## 5. Point the client at the new URL

`NetworkManager.connect(serverUrl, token)` auto-promotes `https://…` to
`wss://…`, so just pass the HTTPS URL. Search for any hardcoded `ws://` or
`http://` literals to update:

```bash
grep -RIn "ws://\|http://" test-arena.js Managers/ UI/
```

Browser pages served from `https://` MUST connect via `wss://`. Mixed
`https`-page + `ws://`-socket is blocked.

## 6. Verify

```bash
curl -vk https://$SERVER_HOST:$PORT/health
openssl s_client -connect $SERVER_HOST:$PORT -servername $SERVER_HOST </dev/null
# WS handshake (install websocat first):
websocat -k "wss://$SERVER_HOST:$PORT/ws?token=TEST"
```

Watch the server log for:

```
[TLS] HTTPS + WSS enabled
5 Freunde server running on port 443 (HTTPS + WebSocket over TLS)
```

## 7. (Recommended) Reverse-proxy alternative

Caddy auto-issues Let's Encrypt certs with zero scripting. Run Node on plain
HTTP (leave `TLS_CERT_PATH`/`TLS_KEY_PATH` empty), then:

```caddyfile
your.host.example.com {
    reverse_proxy localhost:3001
}
```

Caddy forwards both REST and WebSocket upgrades automatically and renews
certs in the background. `ALLOWED_WS_ORIGINS` must still match the browser's
origin (`https://your.host.example.com`).
