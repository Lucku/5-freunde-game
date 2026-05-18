# 5 Freunde — Game Server

A Node.js server that backs the online features of *5 Freunde Elemental Arena* over a single connection:

1. **Cloud saves** — sync player progress across devices
2. **Online multiplayer** — server-authoritative 2-player co-op over LAN or the internet
3. **Global Lobby & Leaderboards** — persistent social hub, classic + speedrun + per-map leaderboards
4. **Community Map Workshop** — upload, browse, like, and play user-made maps with per-map leaderboards
5. **Voice chat (WebRTC)** — peer-to-peer voice for connected players, signalled through the server
6. **Friends** — friend requests, accepts, removals
7. **World events** — admin-scheduled XP-boost / drop-rate events surfaced to clients
8. **Opt-in telemetry** — anonymous analytics pipeline for hero balance, drop-off, deaths
9. **Crash reporting** — clients post crash reports to a server-side append-only log
10. **Admin Dashboard** — JWT-protected web UI for live monitoring of sessions, players, saves, balance, analytics, events, and technical health

One account is used for everything. The server runs well on a Raspberry Pi or any always-on machine.

---

## How it works

### Cloud saves

Each player registers once and receives a 90-day JWT the game stores locally. Save data is stored on disk as the same HMAC-signed blob the game already writes locally — the server never decodes it.

On game start the client compares the cloud save's timestamp against the last known sync point. If the cloud is newer it silently applies the cloud save. If both sides have changed since the last sync the player sees a conflict dialog and chooses which version to keep.

### Online multiplayer

The server runs a **server-authoritative simulation**. One player creates a lobby and shares the 6-character join code; the other enters it. After both pick a hero and press Ready, the host picks a game mode and starts the run. The server spins up a `GameSession` — a full 20 Hz game loop using the same real `Player` and `Enemy` classes as the client.

Both players send `INPUT` messages every frame and receive compact `SNAPSHOT` messages in return. Neither machine acts as host; neither player needs to forward ports — both connect outward to the server. Snapshots use lag compensation and position deltas (static entity fields are sent only on first appearance and merged client-side).

If a player disconnects mid-game the lobby stays alive for a **30-second grace window** (partner sees a `PARTNER_RECONNECTING` overlay) and a 90-second hard cleanup. Reconnects receive a `REJOINED` message and resume in place. After a normal `GAME_OVER` the lobby stays alive for 5 minutes so players can `RETURN_TO_LOBBY` for a rematch.

### Voice chat

Voice is peer-to-peer WebRTC. The server only forwards `WEBRTC_OFFER` / `WEBRTC_ANSWER` / `WEBRTC_ICE` signalling messages and `VOICE_MUTE` toggles between partners — audio itself never traverses the server.

### Global Lobby

Any logged-in player can enter the **Global Lobby** from the Online 2-Player screen. All connected players appear simultaneously in a shared museum map where they walk around, use emotes, and challenge each other. When two players accept a challenge the server creates a private lobby (already in `pre_game`) using their current heroes — no lobby code exchange needed.

### Leaderboards

Three leaderboards live on the server:

- **Classic** — every run completed in Online 2-Player mode is submitted to `/api/leaderboard`. Top 1000 scores stored (oldest pruned), top 10 shown by default. Supports a `?dailySeed=YYYYMMDD` / `YYYYWW` filter for daily/weekly challenges and a `?verified=1` filter for server-confirmed online runs.
- **Story Speedrun** — per-hero best times with splits at `/api/speedrun`. Top 500 per hero, plausibility-checked.
- **Community Map** — per-map leaderboards at `/api/maps/:id/leaderboard`. Top 500 per map.

All score submissions are plausibility-checked server-side. Runs that originate from a `GameSession` carry a short-lived **session token**; the server overrides client-claimed score/wave/time with its own authoritative state and marks the entry as `verified`.

### Community Maps

Players upload, browse, like, and play user-made maps. The server seeds three system-author example maps on first boot so the workshop is never empty. Limits: 20 maps per user, 64 KB per map payload, 500 scores per map.

### Crash reports

Clients can post crash reports to `/api/crash`. Reports are appended to `data/crashes.jsonl`, IP-pseudonymised, rate-limited per IP, and surfaced in the admin dashboard's Technical tab.

### Telemetry (#98)

Opt-in, anonymous analytics. Whitelisted events only (`run_start`, `wave_completed`, `level_up`, `run_end`) — no PII, no account linkage. `instanceId` is a client-generated UUID. Rate-limited per IP, capped at 500k rows with rolling prune. Admin endpoints expose a per-hero summary (drop-off curve, top upgrades, top death sources, win rate) and raw rows.

### Friends

Symmetric `friendships` table with pending / accepted statuses. Friends can be requested by username, accepted, rejected, or removed. If user A requests B and B already requested A, the request is auto-accepted.

### World events

Admin-scheduled events (XP boost, drop-rate boost, etc.) stored in the `world_events` table. Clients poll `/api/events` for the currently-active set and surface them in-game. Admins manage events through the dashboard.

**Lobby lifecycle**

```
waiting → hero_select → pre_game → in_game → finished → (RETURN_TO_LOBBY → hero_select)
```

- `waiting`: host created lobby, no guest yet
- `hero_select`: guest joined; both choose heroes and confirm ready
- `pre_game`: both confirmed; host picks game mode before starting
- `in_game`: `GameSession` running; both clients send inputs and receive snapshots
- `finished`: game ended normally or by disconnect timeout — 5-minute window for rematch

---

## Data on disk

```
data/
  users.db          ← SQLite database (accounts, scores, speedruns, friends, maps,
                      map scores, map likes, world events, telemetry, admin login audit)
  crashes.jsonl     ← append-only crash report log (last 200 surfaced in dashboard)
  saves/
    1.save          ← encoded save blob for user id 1
    1.save.meta     ← JSON with { savedAt: <unix ms> }
    2.save
    2.save.meta
    …
```

`data/` is created automatically on first start and is excluded from version control via `.gitignore`.

---

## Setup

**Prerequisites:** Node.js 18 or newer.

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and set the required values:

```env
SERVER_HOST=your.host.example.com
PORT=3001
ALLOWED_WS_ORIGINS=https://your.host.example.com

# Optional TLS — leave unset for plain http + ws (dev only)
TLS_CERT_PATH=
TLS_KEY_PATH=
TLS_CA_PATH=

# Secrets — both required in production
JWT_SECRET=some-long-random-string-here
ADMIN_PASSWORD_HASH=$2b$10$...
```

Generate the admin hash with the helper script:

```bash
node scripts/admin-hash.js <password>
# copy the printed bcrypt hash into ADMIN_PASSWORD_HASH
```

In development (`NODE_ENV !== production`) you may omit `ADMIN_PASSWORD_HASH`; the server mints an ephemeral random password on boot and prints it to the console. Production refuses to boot without a hash. The legacy plain `ADMIN_PASSWORD` is no longer supported and is ignored with a loud warning.

Start the server:

```bash
npm start
# or, with the env-loading wrapper:
./scripts/server-start.sh
```

Verify it is running: open `http://<host>:3001/api/health` — it should return `{"status":"ok"}`.

### TLS (HTTPS + WSS)

Set `TLS_CERT_PATH` and `TLS_KEY_PATH` (PEM files; `TLS_CA_PATH` optional for an intermediate chain) and the server auto-upgrades to HTTPS + WSS. End-to-end setup recipes for Let's Encrypt and self-signed certs live in [`scripts/server-setup.md`](../scripts/server-setup.md). Two convenience scripts:

- `scripts/server-tls-letsencrypt.sh` — issue + renew via certbot, writes paths into `server/.env`
- `scripts/server-tls-selfsigned.sh` — local / LAN cert with SAN entries

For a reverse-proxy setup (Caddy / nginx / Cloudflare), leave the TLS vars empty and let the proxy terminate. The server reads `X-Forwarded-For` (`trust proxy: 1`) for accurate IP-based rate limiting.

### Origin allowlist

`ALLOWED_WS_ORIGINS` is a comma-separated list of accepted browser origins (no trailing slash). Used for both CORS (HTTP) and CSRF defense (WebSocket upgrades). Empty list = wildcard, dev only. Native clients without an `Origin` header always pass through; the JWT is the authn proof.

---

## Running on a Raspberry Pi

```bash
# On the Pi, after cloning/copying the server directory:
cd server
npm install
cp .env.example .env
nano .env          # set JWT_SECRET, ADMIN_PASSWORD_HASH, ALLOWED_WS_ORIGINS

# Start manually
npm start

# Or install as a systemd service so it starts on boot:
sudo cp ../scripts/server-systemd.service.example /etc/systemd/system/5freunde-server.service
sudo nano /etc/systemd/system/5freunde-server.service   # set User, WorkingDirectory, EnvironmentFile
sudo systemctl daemon-reload
sudo systemctl enable --now 5freunde-server.service
```

The example unit hardens the process (`ProtectSystem=strict`, dropped capabilities) and binds the data directory as the only writable path.

Find the Pi's IP with `hostname -I`. In the game, go to **Options → Server & Account → CHANGE** and enter the Pi's IP (or hostname). Port 3001 is used automatically.

---

## In-game setup

1. **Options → Server & Account → CHANGE** — enter your server's hostname or IP
2. Click **TEST CONNECTION** to verify the server is reachable
3. Click **SAVE**
4. Back in **Server & Account**, click **LOGIN** (or **CREATE ACCOUNT** for first-time setup)
5. Cloud saves are now active (toggle **Cloud Sync** in Options if needed)
6. For online play, use the **🌐 Online 2-Player** button on the main menu

---

## Admin Dashboard

Open `http://<host>:3001/admin` in a browser. Enter the password set in `ADMIN_PASSWORD_HASH` (or the ephemeral dev password printed on boot). The dashboard exchanges it for an 8-hour `kind:'admin'` JWT and uses that for all subsequent requests.

Login attempts are rate-limited (5 / 15 min per IP) and every attempt — success, bad password, no password, verify error, rate-limit hit — is logged to `admin_login_attempts` and surfaced in the Technical tab.

The dashboard auto-refreshes every 5 seconds and has eight tabs:

| Tab | What it shows |
|-----|---------------|
| **Overview** | Online player count, active session count, total users, total runs; hero usage bar chart; outcome and mode breakdowns |
| **Sessions** | Active sessions with live HP bars, wave/score/enemy count, duration; completed sessions (last 100, cleared on restart) with expandable detail view (run stats: kills, damage, missiles, gold) |
| **Players** | Who is online right now (museum vs in-game); full registered-player list with join date and save/online status |
| **Leaderboard** | Top 20 all-time scores with hero, mode, wave, outcome, duration |
| **Cloud Saves** | Per-player save status, last-saved timestamp, file size |
| **Balance** | Per-hero pick rate, win rate, average wave, average score |
| **Analytics** | Opt-in telemetry summary: total runs, per-hero stats, drop-off curve, top upgrades, top death sources |
| **Events** | Scheduled world events (XP boost etc.) with create / delete controls |
| **Technical** | Recent crash reports (last 200); admin login audit (newest first, success/failure filter, 24h summary) |

Active sessions and the global lobby live in memory; everything else is persisted in `users.db` or `crashes.jsonl`. The dashboard is read-mostly — only `/api/admin/events` and `/api/admin/login` write.

---

## API reference

All endpoints accept and return JSON. Player endpoints take `Authorization: Bearer <player JWT>`. Admin endpoints take `Authorization: Bearer <admin JWT>` (obtained via `/api/admin/login`).

### REST — public / player

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/api/health` | — | Liveness check → `{"status":"ok"}` |
| `POST` | `/api/register` | — | Create account → `{ token, username }` (rate-limited 5/hr) |
| `POST` | `/api/login` | — | Authenticate → `{ token, username }` (rate-limited 10/min) |
| `GET`  | `/api/save` | Player | Download save → `{ blob, savedAt }` |
| `PUT`  | `/api/save` | Player | Upload save (body: `{ blob }`) → `{ savedAt }` |
| `POST` | `/api/leaderboard` | Player | Submit a classic run score (rate-limited ~10/hr) → `{ ok, verified }` |
| `GET`  | `/api/leaderboard` | — | Fetch top scores. Query: `limit` (≤50, default 10), `verified=1`, `dailySeed=YYYYMMDD` |
| `POST` | `/api/speedrun` | Player | Submit a Story Speedrun (rate-limited 5/hr) → `{ ok, verified }` |
| `GET`  | `/api/speedrun` | — | Per-hero best times. Query: `hero`, `limit` (≤50, default 10) |
| `POST` | `/api/maps` | Player | Upload a custom map (max 20/user, 64 KB) → `{ ok, id }` |
| `GET`  | `/api/maps` | — / Player | List maps. Query: `sort=newest\|popular`, `limit`, `offset`, `mine=1` (auth required) |
| `GET`  | `/api/maps/:id` | — | Fetch one map (also bumps `playCount`) |
| `DELETE` | `/api/maps/:id` | Player (owner) | Delete own map + its scores / likes |
| `POST` | `/api/maps/:id/like` | Player | Toggle like → `{ liked, likeCount }` |
| `GET`  | `/api/maps/:id/leaderboard` | — | Per-map top scores |
| `POST` | `/api/maps/:id/score` | Player | Submit score for a community map (rate-limited 30/hr) |
| `POST` | `/api/crash` | — | Append a crash report (rate-limited 20/10min, 32 KB max) |
| `POST` | `/api/telemetry` | — | Submit anonymous analytics batch (rate-limited 60/10min, 32 KB max) |
| `GET`  | `/api/events` | — | Currently-active world events → `{ events }` |
| `GET`  | `/api/friends` | Player | `{ friends, incoming, outgoing }` |
| `POST` | `/api/friends/request` | Player | Send / auto-accept reciprocal friend request (rate-limited 20/hr) |
| `POST` | `/api/friends/respond` | Player | Accept or reject incoming request |
| `DELETE` | `/api/friends/:userId` | Player | Remove a friendship |

### REST — admin

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Exchange admin password for an 8h JWT (rate-limited 5/15min). All attempts audited |
| `GET`  | `/admin` | Admin dashboard HTML (password entered in browser) |
| `GET`  | `/api/admin/sessions` | Active + completed sessions |
| `GET`  | `/api/admin/online` | Players in museum and in-game |
| `GET`  | `/api/admin/players` | All registered users |
| `GET`  | `/api/admin/stats` | Aggregated stats (leaderboard, hero/mode/outcome distribution) |
| `GET`  | `/api/admin/saves` | Cloud save status per player |
| `GET`  | `/api/admin/hero-balance` | Per-hero pick rate, win rate, avg wave / score |
| `GET`  | `/api/admin/crashes` | Last 200 crash reports (newest first) |
| `GET`  | `/api/admin/login-attempts` | Admin login audit. Query: `limit` (≤500), `success=true\|false`. Includes 24h summary |
| `GET`  | `/api/admin/telemetry/summary` | Per-hero runs, drop-off curve, top upgrades, top death sources |
| `GET`  | `/api/admin/telemetry/raw` | Raw telemetry rows. Query: `event`, `limit` (≤500) |
| `GET`  | `/api/admin/events` | All world events (newest first, last 50) |
| `POST` | `/api/admin/events` | Create a world event |
| `DELETE` | `/api/admin/events/:id` | Delete a world event |

**Submit classic score body**

```json
{
  "hero": "fire",
  "mode": "standard",
  "wave": 12,
  "score": 48200,
  "outcome": "victory",
  "timeSec": 743,
  "sessionToken": "<jwt issued at GAME_START — optional, marks entry as verified>",
  "dailySeed": 20260518
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
  "submittedAt": 1714300000000,
  "verified": 1,
  "dailySeed": 20260518
}
```

Server keeps at most 1000 classic scores total (oldest beyond that are pruned after each submission), 500 per hero for speedruns, 500 per map for community-map scores.

**Submit speedrun body**

```json
{
  "hero": "fire",
  "timeSec": 1843,
  "finalWave": 30,
  "splits": [{ "wave": 5, "t": 240 }, { "wave": 10, "t": 580 }],
  "sessionToken": "<optional>"
}
```

**Submit telemetry body**

```json
{
  "instanceId": "uuid-v4",
  "appVersion": "0.42.0",
  "events": [
    { "event": "run_start", "hero": "fire", "mode": "standard", "biome": "ruins", "ts": 1714300000000 },
    { "event": "wave_completed", "wave": 7, "timeSec": 412 },
    { "event": "level_up", "upgradePicked": "ember_burst" },
    { "event": "run_end", "wave": 12, "timeSec": 743, "outcome": "death", "deathSource": "brute_charge" }
  ]
}
```

**Register / Login body**

```json
{ "username": "lucas", "password": "secret" }
```

Username rules: 3–32 characters, letters/numbers/`_`/`-` only, case-insensitive. Password minimum 6 characters. Player tokens expire after 90 days; admin tokens after 8 hours.

### WebSocket

Connect to `ws://<host>:3001/ws?token=<jwt>` (or `wss://…` when TLS is on). All messages are JSON. Compression is `permessage-deflate` with a 256-byte threshold (skips tiny PING/INPUT frames).

**Client → Server — private match**

| `type` | Payload | Description |
|--------|---------|-------------|
| `CREATE_LOBBY` | `{ hero }` | Create a new lobby, become host |
| `JOIN_LOBBY` | `{ code, hero }` | Join an existing lobby by 6-char code |
| `HERO_SELECT` | `{ hero }` | Update selected hero during `hero_select` / `pre_game` |
| `HERO_CONFIRM` | — | Mark yourself ready; transitions to `pre_game` when both confirmed |
| `MODE_SELECT` | `{ mode }` | Host sets game mode during `pre_game` |
| `START_ONLINE_GAME` | `{ mode }` | Host starts the `GameSession`; transitions to `in_game` |
| `INPUT` | `{ x, y, aimAngle, shoot, melee, dash, special }` | Per-frame input (sent every frame during `in_game`) |
| `LEVEL_UP_CHOICE` | `{ choice }` | Player picks an upgrade after levelling up |
| `RELAY` | `{ payload }` | Relay arbitrary payload to partner (pre_game only) |
| `STORY_CONTINUE` | — | Sync story dialog skip / continue with partner |
| `MAZE_NODE_SELECTED` | `{ nodeId, storyEvent }` | Host relays Maze-of-Time node pick to guest |
| `WEBRTC_OFFER` / `WEBRTC_ANSWER` / `WEBRTC_ICE` | `{ data }` | WebRTC voice-chat signalling |
| `VOICE_MUTE` | `{ muted }` | Partner mute state |
| `GAME_OVER` | — | Signal game ended normally |
| `RETURN_TO_LOBBY` | — | Rematch — return both clients to `hero_select` |
| `LEAVE_LOBBY` | — | Leave the current lobby |
| `PING` | `{ t }` | Keepalive → server echoes `PONG` |

**Client → Server — global lobby**

| `type` | Payload | Description |
|--------|---------|-------------|
| `JOIN_GLOBAL_LOBBY` | `{ hero }` | Enter the shared museum lobby (session takeover evicts stale connection) |
| `LEAVE_GLOBAL_LOBBY` | — | Leave the shared museum lobby |
| `PLAYER_MOVE` | `{ x, y, angle, hero }` | Broadcast current position and hero |
| `GLOBAL_EMOTE` | `{ emoteType }` | Broadcast emote to all lobby players |
| `GAME_INVITE` | `{ targetUserId }` | Challenge a nearby player |
| `GAME_INVITE_RESPONSE` | `{ inviteId, accept }` | Accept or decline a challenge |

**Server → Client — private match**

| `type` | Description |
|--------|-------------|
| `CONNECTED` | Auth successful → `{ username }` |
| `LOBBY_CREATED` | Lobby created → `{ code }` |
| `LOBBY_JOINED` | Joined partner's lobby → `{ code, hostUsername, hostHero }` |
| `GUEST_JOINED` | Partner joined your lobby → `{ guestUsername, guestHero }` |
| `HERO_UPDATE` | Partner changed hero → `{ player: 'host'|'guest', hero }` |
| `HERO_CONFIRMED` | Partner confirmed ready → `{ player: 'host'|'guest' }` |
| `PRE_GAME` | Both confirmed ready → `{ lobbyCode, hostHero, guestHero, hostUsername, guestUsername }` |
| `MODE_UPDATE` | Host changed game mode (sent to guest) → `{ mode }` |
| `GAME_START` | Session starting → `{ hostHero, guestHero, hostUsername, guestUsername, mode, sessionToken }` |
| `SNAPSHOT` | 20 Hz game state — see schema below |
| `LEVEL_UP` | Player levelled up → `{ role: 'host'|'guest', choices: [...] }` |
| `PARTNER_LEVELING` | Other player is choosing an upgrade → `{ role }` |
| `LEVEL_UP_DONE` | Partner finished choosing upgrade |
| `STORY_CONTINUE` | Partner advanced story dialog |
| `MAZE_NODE_SELECTED` | Host picked a Maze-of-Time node → `{ nodeId, storyEvent }` |
| `WEBRTC_OFFER` / `WEBRTC_ANSWER` / `WEBRTC_ICE` | Forwarded voice-chat signalling → `{ from, data }` |
| `VOICE_MUTE` | Partner mute state changed → `{ muted, from }` |
| `REJOINED` | Reconnected to in-progress game → `{ code, role }` |
| `RELAY` | Forwarded payload from partner (pre_game only) → `{ from, payload }` |
| `PARTNER_RECONNECTING` | Partner lost connection — 30 s grace window → `{ timeoutSec }` |
| `PARTNER_DISCONNECTED` | Grace expired or partner left for good |
| `PARTNER_RECONNECTED` | Partner reconnected within the grace window |
| `GAME_OVER` | Game ended |
| `RETURN_TO_LOBBY` | Both clients return to `hero_select` for a rematch |
| `PONG` | Keepalive response → `{ t }` |
| `ERROR` | Error message → `{ message }` |

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

**Snapshot schema** (sent server → both clients at 20 Hz)

```json
{
  "type": "SNAPSHOT",
  "t": 1714300000000,
  "wave": 3,
  "score": 12400,
  "bossActive": false,
  "isLevelingUp": false,
  "enemies":     [{ "_id": 1, "x": 400, "y": 300, "vx": 0, "vy": 0, "hp": 80, "maxHp": 100, "subType": "BRUTE", "color": "#8b4513" }],
  "projectiles": [{ "_id": 5, "x": 200, "y": 250, "vx": 8, "vy": 0, "color": "#ff4040", "radius": 5, "isEnemy": false }],
  "p1": { "x": 1480, "y": 1520, "hp": 55, "maxHp": 60, "level": 2, "xp": 130, "maxXp": 200, "gold": 3, "aimAngle": 1.2, "isDead": false },
  "p2": { "x": 1540, "y": 1480, "hp": 60, "maxHp": 60, "level": 2, "xp": 130, "maxXp": 200, "gold": 3, "aimAngle": -0.5, "isDead": false },
  "events": [{ "type": "enemy_death", "x": 380, "y": 290, "color": "#8b4513" }]
}
```

Static fields (`maxHp`, `subType`, `color`, `sides`, `radius`) are sent only on first appearance per entity and merged client-side — subsequent snapshots carry only dynamic fields. Position values are delta-encoded against the previous snapshot for bandwidth.

---

## Anti-cheat

- **Plausibility check** — every classic-score submission without a session token is checked against a wave/score/time budget; speedruns are checked against a per-hero floor and split monotonicity. Rejections are logged with the user and reason.
- **Session tokens** — `GameSession` issues a per-user `kind:'gs'` JWT at `GAME_START`. Submissions that include this token are clamped down to the server-known authoritative `wave` / `score` / `timeSec` and marked `verified=1`. Token TTL is 2 hours (covers a long run + post-game submission). Stale entries are swept hourly.
- **Rate limits** — token-bucket per IP on register / login / leaderboard / speedrun / map upload / map score / friend request / crash / telemetry / admin login.
- **Schema** — `verified` and `daily_seed` columns on `scores` and `speedrun_scores`. Stored bcrypt hashes for passwords (cost 10).

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | TCP port the server listens on |
| `SERVER_HOST` | — | Public hostname (used by setup scripts for cert CN, origin allowlist) |
| `ALLOWED_WS_ORIGINS` | *(empty = wildcard)* | Comma-separated CSRF allowlist for browser WS upgrades + HTTP CORS |
| `TLS_CERT_PATH` | — | PEM cert path. Set together with `TLS_KEY_PATH` to enable HTTPS + WSS |
| `TLS_KEY_PATH` | — | PEM key path |
| `TLS_CA_PATH` | — | Optional intermediate-chain bundle |
| `JWT_SECRET` | *(insecure placeholder; refused in prod)* | Secret used to sign player + admin + session JWTs — **always change this** |
| `ADMIN_PASSWORD_HASH` | *(refused in prod; ephemeral random in dev)* | bcrypt hash of the admin dashboard password. Generate with `node scripts/admin-hash.js <password>` |
| `NODE_ENV` | `development` | `production` triggers fail-secure boot if `JWT_SECRET` or `ADMIN_PASSWORD_HASH` are missing |
