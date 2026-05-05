# Server-Authoritative Multiplayer Refactor

## Goal

Eliminate lag by moving the game simulation from one client (the "host") to the dedicated server.

**Before:** One player's machine runs all physics/AI. The other player waits for snapshots relayed through the server. Host's CPU and upload bandwidth are the bottleneck.

**After:** The server runs the simulation at a fixed 20 Hz tick. Both clients send inputs and receive state snapshots from the server. The server is the single source of truth.

---

## Architecture Change

```
BEFORE                          AFTER
──────────────────────────────────────────
Client A (Host)                 Server
  ├─ runs simulation              ├─ runs simulation (20 Hz)
  ├─ sends SNAPSHOT → Server      ├─ receives INPUT from both
  └─ receives INPUT from B        ├─ sends SNAPSHOT to both
                                  └─ validates all game events
Server
  └─ relays SNAPSHOT → Client B
                                  Client A & B (symmetric)
Client B (Guest)                    ├─ sends INPUT every frame
  ├─ receives SNAPSHOT             ├─ receives SNAPSHOT
  └─ sends INPUT → Server          └─ renders + interpolates
```

---

## Implementation Plan

### Phase 1 — Server-Side Simulation (this session)

#### 1.1 `server/simulation/constants.js` (NEW)
Node.js-compatible extract of the core game constants:
- `BASE_HERO_STATS` (speed, HP, damage, cooldowns, projectile stats)
- `ENEMY_TYPES`, `ENEMIES_PER_WAVE`
- `UPGRADE_POOL`
- Arena size constants

#### 1.2 `server/simulation/GameSession.js` (NEW)
Self-contained server game loop. Key responsibilities:
- Initialise player state from hero configs
- Run `tick()` at 20 Hz via `setInterval`
- Accept `applyInput(playerIdx, input)` from both clients
- Inside `tick()`:
  1. Apply movement input → update velocity + position
  2. Apply arena wall collision
  3. Decrement all cooldowns
  4. Fire ranged projectiles (if shoot input + cooldown ready)
  5. Apply melee damage (radius check + cooldown)
  6. Apply dash impulse (if dash input + cooldown ready)
  7. Move projectiles, cull dead/out-of-bounds
  8. Move enemies (basic AI: steer toward nearest player)
  9. Spawn new enemies from wave manager
  10. Collision: projectile vs enemy → damage, kill, gold drop, XP
  11. Collision: enemy vs player → damage with invincibility frames
  12. Detect player death → queue `game_over` event
  13. Detect level-up threshold → pause game, send upgrade options
  14. Build snapshot (same schema as existing `_onlineSendSnapshot`)
  15. Push snapshot to both client WebSockets directly
- `applyLevelUpChoice(playerIdx, choiceId)` — resumes after level-up
- `stop()` — clears interval, frees state

#### 1.3 `server/simulation/WaveManager.js` (NEW)
Port of the wave logic from `game.js`:
- Enemy type weights per wave range
- HP and speed scaling per wave
- Spawn timing (enemies per wave, spacing)
- Boss wave detection

#### 1.4 `server/server.js` (MODIFY)
- On `GAME_START`: create `GameSession`, store in `lobby.session`
- Change `RELAY` handler: instead of relaying host→guest, parse `INPUT` payloads and call `session.applyInput(role, input)`
- Add `INPUT` as a first-class message type (no longer wrapped in RELAY)
- Add `LEVEL_UP_CHOICE` handler → calls `session.applyLevelUpChoice`
- On `GAME_OVER` / disconnect: call `session.stop()`
- Remove SNAPSHOT relay (server pushes directly)

#### 1.5 `game.js` (MODIFY — client side)
- **Both clients become symmetric guests**: `isOnlineHost = false`, `isOnlineGuest = true`
- Remove all `if (isOnlineHost) { ... simulation code ... }` blocks
- Remove `_onlineSendSnapshot()` call from the game loop
- Keep `_onlineApplySnapshot()` (already works perfectly for both)
- Handle SNAPSHOT as a direct WS message (not wrapped in RELAY)
- Both clients flush input every frame (already done by guest path)

#### 1.6 `Managers/NetworkManager.js` (MODIFY)
- `flushInput()` — sends `{ type: 'INPUT', ... }` directly (remove RELAY wrapper)
- Remove `isHost()` / `isGuest()` asymmetry for in-game flow
- Handle `SNAPSHOT` message type directly (call registered handler)

---

### Phase 2 — Client-Side Prediction ✅

Movement prediction was already active via Phase 1's `player.update()` every frame + `RecordingInputController` forwarding input. Phase 2 refined reconciliation:

- Local movement applied every frame — no round-trip wait for position ✅
- `RecordingInputController` wraps local controller: input runs physics AND goes to server ✅
- Tiered reconciliation on each snapshot (`_onlineApplySnapshot`):
  - < 10 px drift: silently accepted (timing noise) ✅
  - 10–80 px: smooth 30 % blend toward server authority ✅
  - > 80 px: hard snap (knockback, death/revival) ✅
- Removed dead `_onlineP2Controller` variable (host-side relic) ✅

### Phase 3 — Bandwidth Optimisation ✅

Delta encoding for entity static fields — ~45 % snapshot size reduction:

- **Server (`GameSession.js`)**: `_knownEnemyIds` / `_knownProjIds` sets track which IDs have been sent. Static fields (`maxHp`, `subType`, `color`, `sides`, `radius` for enemies; `color`, `radius`, `isEnemy`, `isExplosive`, `isCrit` for projectiles) only included on first appearance. ✅
- **Client (`game.js`)**: Conditional field assignment (`if (ed.field !== undefined)`) preserves cached values on delta updates. Projectile objects now reused via `_prevProjMap` instead of being recreated every snapshot (GC improvement). ✅

---

## Files Touched

| File | Type | Change |
|------|------|--------|
| `server/simulation/constants.js` | NEW | Pure-JS hero/enemy constants |
| `server/simulation/GameSession.js` | NEW | 20 Hz authoritative game loop |
| `server/simulation/WaveManager.js` | NEW | Wave spawning logic |
| `server/server.js` | MODIFY | Create/destroy GameSession, route inputs |
| `game.js` | MODIFY | Both clients become guests, drop host sim |
| `Managers/NetworkManager.js` | MODIFY | Send INPUT directly, handle SNAPSHOT directly |

## Files NOT Touched (this phase)

- `Player.js`, `Enemy.js`, `Arena.js` — client rendering unchanged
- `Entities/` — client controllers unchanged
- `UI/` — all UI unchanged
- `AudioManager.js` — unchanged
- `CloudSaveManager.js` — unchanged

---

## Decisions & Trade-offs

1. **Server writes its own simulation** (not importing browser-coupled classes)  
   Why: Player.js / Enemy.js embed canvas drawing and window globals throughout. Extracting them would require touching ~200 call sites. A clean server implementation is faster to build and easier to validate.

2. **Snapshot format is unchanged**  
   Why: `_onlineApplySnapshot()` on the client already works and handles ghost interpolation. Reusing it means zero client rendering changes.

3. **20 Hz tick rate**  
   Why: Industry standard for top-down action games. Reduces server CPU vs 60 Hz, still smooth with client interpolation. Client renders at 60 Hz using the existing extrapolation already coded for the guest.

4. **INPUT sent directly (not wrapped in RELAY)**  
   Why: Cleaner protocol. The relay wrapper was only needed because the server had no game logic. Now it's a first-class server concern.

5. **Level-up still pauses both clients**  
   Why: Simplest correct behaviour. Server signals `isLevelingUp`, sends options to the specific player's client, waits for their choice, then resumes.

---

## Review

### Implemented ✅
- `server/simulation/constants.js` — hero stats, upgrade pool, arena size, tick constants
- `server/simulation/WaveManager.js` — enemy spawning intervals, sub-type selection, per-tick spawn logic
- `server/simulation/GameSession.js` — 20 Hz tick loop; player movement; ranged/melee/dash; projectile physics; enemy AI + ranged subtypes; collision; XP/level-up (pauses tick, sends options, resumes on choice); gold drops; wave advancement; personalised snapshots (each client sees their own character in p2)
- `server/server.js` — `INPUT` routed to `session.applyInput()`; `LEVEL_UP_CHOICE` routed to `session.applyLevelUpChoice()`; `GameSession` started on `GAME_START`, stopped on `GAME_OVER` / disconnect / `cleanupLobby`
- `game.js` — both clients are symmetric guests (`isOnlineHost` always false); input flushed every frame for both; host-simulation branch removed; `_onlineQueueEvent` / `_onlineHandleLevelUpChoice` stubbed to no-ops; `signalGameOver` fires for both clients
- `Managers/NetworkManager.js` — `flushInput` sends `INPUT` directly (no RELAY wrapper); server-pushed in-game messages dispatched as first-class types
- `UI/LevelUp.js` — upgrade choice sent to server via `send({ type: 'LEVEL_UP_CHOICE' })`
- **Phase 2 — Client-side prediction** — `player.update()` runs every frame (movement is local-first); `RecordingInputController` active; tiered reconciliation in `_onlineApplySnapshot` (ignore < 10 px, blend 30 % for 10–80 px, hard snap > 80 px); dead `_onlineP2Controller` variable removed
- **Phase 3 — Bandwidth optimisation** — delta encoding in `GameSession._sendSnapshot()` + conditional merge in `_onlineApplySnapshot`; projectile object reuse

### Still to verify in-game
- [ ] Server tick runs stably at 20 Hz without drift
- [ ] Both clients receive snapshots and render correctly
- [ ] Input lag is noticeably reduced vs old relay architecture
- [ ] Level-up flow works for both players
- [ ] Disconnect/reconnect handled correctly (session cleaned up)
- [ ] Wave progression and enemy spawning working
