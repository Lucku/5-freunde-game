# 5 Freunde — Game Server

A lightweight Node.js server that provides three features over a single connection:

1. **Cloud saves** — sync player progress across devices
2. **Online multiplayer** — 2-player co-op over LAN or the internet
3. **Global Lobby & Leaderboard** — persistent social hub and server-side high-score table

One account is used for all three. The server runs well on a Raspberry Pi or any always-on machine on your network.

---

## How it works

### Cloud saves

Each player registers once and receives a JWT auth token the game stores locally. Save data is stored on disk as the same HMAC-signed blob the game already writes locally — the server never decodes it.

On game start the client compares the cloud save's timestamp against the last known sync point. If the cloud is newer it silently applies the cloud save. If both sides have changed since the last sync the player is shown a conflict dialog and can choose which version to keep.

### Online multiplayer

The server acts as a **relay** between two players using WebSocket. One player creates a lobby and shares the 6-character join code; the other player enters it. After both players pick a hero and press Ready, the game starts.

The **host** runs the full game simulation and sends compact state snapshots (~20 fps) to the guest. The **guest** sends their inputs back to the host. Neither player needs to forward ports — both connect outward to the server. The server relays all messages without interpreting game state.

If a player disconnects mid-game, the lobby stays alive for 90 seconds to allow reconnect. After that the remaining player is returned to the menu.

### Global Lobby

Any logged-in player can enter the **Global Lobby** from the Online 2-Player screen. All connected players appear simultaneously in a shared museum map where they can walk around, use emotes, and challenge each other to a match. When two players accept a challenge the server automatically creates a private lobby using their current heroes and starts the game immediately — no lobby code exchange needed.

### Leaderboard

Every run completed in Online 2-Player mode is automatically submitted to the server. The top scores (up to 1000 stored, top 10 shown) are visible on the leaderboard billboard inside the Global Lobby. Scores are ranked by points and include the player's username, hero, mode, wave reached, outcome, and run time.

**Lobby lifecycle**

```
waiting → hero_select → in_game → finished
```

- `waiting`: host created lobby, no guest yet
- `hero_select`: guest joined, both choose heroes and confirm ready
- `in_game`: game is running, all messages relayed
- `finished`: game ended normally or by disconnect timeout

---

## Data on disk

```
data/
  users.db          ← SQLite database (user accounts + leaderboard scores)
  saves/
    1.save          ← encoded save blob for user id 1
    1.save.meta     ← JSON with { savedAt: <unix ms> }
    2.save
    2.save.meta
    …
```

The `data/` directory is created automatically on first start and is excluded from version control via `.gitignore`.

---

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

Start the server:

```bash
npm start
```

To verify it is running, open `http://<host>:3001/api/health` — it should return `{"status":"ok"}`.

---

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
sudo nano /etc/systemd/system/5freunde-server.service
```

Minimal systemd unit:

```ini
[Unit]
Description=5 Freunde Game Server
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
sudo systemctl enable 5freunde-server
sudo systemctl start  5freunde-server
```

Find the Pi's IP with `hostname -I`. In the game, go to **Options → Server & Account → CHANGE** and enter the Pi's IP address. Port 3001 is used automatically.

---

## In-game setup

1. **Options → Server & Account → CHANGE** — enter your server's hostname or IP
2. Click **TEST CONNECTION** to verify the server is reachable
3. Click **SAVE**
4. Back in **Server & Account**, click **LOGIN** (or **CREATE ACCOUNT** for first-time setup)
5. Cloud saves are now active (toggle **Cloud Sync** in Options if needed)
6. For online play, use the **🌐 Online 2-Player** button on the main menu

---

## API reference

All endpoints accept and return JSON. Protected endpoints require `Authorization: Bearer <token>`.

### REST

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/health` | — | Liveness check → `{"status":"ok"}` |
| `POST` | `/api/register` | — | Create account → `{ token, username }` |
| `POST` | `/api/login` | — | Authenticate → `{ token, username }` |
| `GET`  | `/api/save` | required | Download save → `{ blob, savedAt }` |
| `PUT`  | `/api/save` | required | Upload save (body: `{ blob }`) → `{ savedAt }` |
| `POST` | `/api/leaderboard` | required | Submit a run score (body below) → `{ ok: true }` |
| `GET`  | `/api/leaderboard` | — | Fetch top scores → `{ entries: [...] }` — optional `?limit=N` (max 50, default 10) |

**Submit score body**

```json
{
  "hero": "fire",
  "mode": "standard",
  "wave": 12,
  "score": 48200,
  "outcome": "victory",
  "timeSec": 743
}
```

**Leaderboard entry shape**

```json
{
  "username": "lucas",
  "hero": "fire",
  "mode": "standard",
  "wave": 12,
  "score": 48200,
  "outcome": "victory",
  "timeSec": 743,
  "submittedAt": 1714300000000
}
```

The server keeps at most 1000 scores total (oldest beyond that are pruned after each submission).

**Register / Login body**

```json
{ "username": "lucas", "password": "secret" }
```

Username rules: 3–32 characters, letters/numbers/`_`/`-` only, case-insensitive. Password minimum 6 characters. Tokens expire after 90 days.

### WebSocket

Connect to `ws://<host>:3001/ws?token=<jwt>`. All messages are JSON.

**Client → Server — private match**

| `type` | Payload | Description |
|--------|---------|-------------|
| `CREATE_LOBBY` | `{ hero }` | Create a new lobby, become host |
| `JOIN_LOBBY` | `{ code, hero }` | Join an existing lobby by 6-char code |
| `HERO_SELECT` | `{ hero }` | Update selected hero in lobby |
| `HERO_CONFIRM` | — | Mark yourself ready |
| `RELAY` | `{ payload }` | Relay arbitrary payload to partner |
| `GAME_OVER` | — | Signal game ended normally |
| `LEAVE_LOBBY` | — | Leave the current lobby |
| `PING` | — | Keepalive |

**Client → Server — global lobby**

| `type` | Payload | Description |
|--------|---------|-------------|
| `JOIN_GLOBAL_LOBBY` | `{ hero }` | Enter the shared museum lobby |
| `LEAVE_GLOBAL_LOBBY` | — | Leave the shared museum lobby |
| `PLAYER_MOVE` | `{ x, y, angle, hero }` | Broadcast current position and hero |
| `GLOBAL_EMOTE` | `{ emoteType }` | Broadcast emote to all lobby players |
| `GAME_INVITE` | `{ targetUserId }` | Challenge a nearby player |
| `GAME_INVITE_RESPONSE` | `{ inviteId, accept }` | Accept or decline a challenge |

**Server → Client — private match**

| `type` | Description |
|--------|-------------|
| `CONNECTED` | Auth successful, connection ready |
| `LOBBY_CREATED` | Lobby created → `{ code, hostHero }` |
| `LOBBY_JOINED` | Joined partner's lobby → `{ code, hostUsername, hostHero }` |
| `GUEST_JOINED` | Partner joined your lobby → `{ guestUsername, guestHero }` |
| `HERO_UPDATE` | Partner changed hero → `{ side, hero }` |
| `HERO_CONFIRMED` | Partner confirmed ready → `{ side }` |
| `GAME_START` | Both confirmed (or challenge accepted) → `{ hostHero, guestHero, hostUsername, guestUsername }` |
| `RELAY` | Forwarded payload from partner → `{ payload }` |
| `PARTNER_DISCONNECTED` | Partner lost connection |
| `PARTNER_RECONNECTED` | Partner reconnected |
| `GAME_OVER` | Game ended (sent when other player signals GAME_OVER) |
| `ERROR` | Error message → `{ error }` |

**Server → Client — global lobby**

| `type` | Description |
|--------|-------------|
| `GLOBAL_LOBBY_STATE` | Full snapshot on join → `{ players: [{ userId, username, x, y, angle, hero }] }` |
| `GLOBAL_PLAYER_JOINED` | New player entered → `{ userId, username, x, y, angle, hero }` |
| `GLOBAL_PLAYER_LEFT` | Player left or disconnected → `{ userId }` |
| `GLOBAL_PLAYER_UPDATE` | Position/hero update → `{ userId, x, y, angle, hero }` |
| `GLOBAL_EMOTE` | Emote broadcast → `{ userId, emoteType }` |
| `GAME_INVITE_INCOMING` | Incoming challenge → `{ fromUserId, fromUsername, inviteId }` |
| `GAME_INVITE_DECLINED` | Challenge was declined → `{ inviteId }` |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | TCP port the server listens on |
| `JWT_SECRET` | *(insecure default)* | Secret used to sign auth tokens — **always change this** |
