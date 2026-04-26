# 5 Freunde — Cloud Save Server

A lightweight Node.js server that stores and serves player save games so progress can be synced across devices over a local network (or the internet).

## How it works

The server exposes a small REST API. Each player registers once and receives a JWT auth token that the game stores locally and reattaches to every subsequent request. Save data is stored on disk as the same HMAC-signed blob the game already writes locally — the server never decodes it.

On game start the client compares the cloud save's timestamp against the last known sync point. If the cloud is newer it silently applies the cloud save. If both sides have changed since the last sync the player is shown a conflict dialog and can choose which version to keep.

**Data on disk**

```
data/
  users.db          ← SQLite database (user accounts)
  saves/
    1.save          ← encoded save blob for user with id 1
    1.save.meta     ← JSON with { savedAt: <unix ms> }
    2.save
    2.save.meta
    …
```

The `data/` directory is created automatically on first start and is excluded from version control via `.gitignore`.

## Setup

**Prerequisites:** Node.js 18 or newer.

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and set a strong `JWT_SECRET`:

```
PORT=3001
JWT_SECRET=some-long-random-string-here
```

Then start the server:

```bash
npm start
```

The server listens on the configured port (default `3001`). To verify it is running, open `http://<host>:3001/api/health` — it should return `{"status":"ok"}`.

## Running on a Raspberry Pi

```bash
# On the Pi, after cloning/copying the server directory:
cd server
npm install
cp .env.example .env
nano .env          # set JWT_SECRET

# Start manually
npm start

# Or install as a systemd service so it starts on boot:
sudo nano /etc/systemd/system/5freunde-save.service
```

Minimal systemd unit:

```ini
[Unit]
Description=5 Freunde Cloud Save Server
After=network.target

[Service]
WorkingDirectory=/home/pi/5-freunde/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable 5freunde-save
sudo systemctl start  5freunde-save
```

Find the Pi's IP with `hostname -I`. In the game's Options → Cloud Save, set the server URL to `http://<pi-ip>:3001`.

## API reference

All endpoints accept and return JSON. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/health` | — | Liveness check |
| `POST` | `/api/register` | — | Create account → `{ token, username }` |
| `POST` | `/api/login` | — | Authenticate → `{ token, username }` |
| `GET`  | `/api/save` | required | Download save → `{ blob, savedAt }` |
| `PUT`  | `/api/save` | required | Upload save (body: `{ blob }`) → `{ savedAt }` |

**Register / Login body**

```json
{ "username": "lucas", "password": "secret" }
```

Username rules: 3–32 characters, letters/numbers/`_`/`-` only, case-insensitive. Password minimum 6 characters. Tokens expire after 90 days.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | TCP port the server listens on |
| `JWT_SECRET` | *(insecure default)* | Secret used to sign auth tokens — **always change this** |
