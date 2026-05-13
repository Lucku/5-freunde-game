# Story Speedrun Mode — Implementation Plan

Source: [improvements-2026-05-10.md](improvements-2026-05-10.md) #72 ("Speedrun mode: timer + section splits + ghost"). Ghost replay is **out of scope** for v1 — covered by improvements #78 (Replay system) later.

## Design summary (locked with user, 2026-05-13)

| Question | Decision |
|----------|----------|
| Section splits | Every 10 cleared waves (arc boundaries: 10, 20, 30, …) + final win-wave |
| Best time scope | Per hero — `saveData[hero].bestSpeedrunSec` |
| Story content skipped | Modal + audio only. All gameplay effects (forced enemies, boss spawns, companion joins, hero swaps, objective waves) still apply |
| Leaderboard storage | New `speedrun_scores` table, new endpoints |

## Unlock model

Speedrun unlocks **per hero**, surfaced as a "Story Speedrun" button below "Story Mode" on the main menu when the selected hero is eligible.

Unlock rules:
- **Base game** (fire/water/ice/plant/metal): story is shared (`hero: "ALL"` chapters). Winning base story with any one of the five unlocks Speedrun for **all five**.
- **DLC heroes**: per-hero unlock keyed off the existing `dlcStoryMap` victory wiring at [game.js:4574-4582](game.js#L4574-L4582).
- **Shared-completion DLCs** (already mirrored in code at [game.js:4529-4560](game.js#L4529-L4560)):
  - Champions of Chaos: gravity ↔ void (both unlock when either wins)
  - Faith of Fortune: spirit ↔ chance (both unlock when either wins)
- **Disciples of Deception** (`noStoryMode: true`): never eligible — no story to speedrun.

## Architecture notes

- **Refactor needed**: `closeStory()` at [game.js:3458](game.js#L3458) currently bundles modal-dismiss + post-modal logic (THE_END victory, hero-swap, shop/advance). Extract post-modal body into `_finishStoryEvent(event)`. Both the normal modal path and the speedrun fast-path call `_finishStoryEvent`. Avoids duplication.
- **Timer source**: `currentRunStats.startTime` already exists in [RunState.js:24](RunState.js#L24). Reuse. Add `splits: []` field to `createRunStats()`.
- **THE_END is universal**: each DLC story ends with a `type: "THE_END"` chapter at varying waves (base = 101, rock = 51, thunder = 51, …). The existing victory wiring at [game.js:3470](game.js#L3470) already drives `gameOver(true)` on THE_END — no per-DLC casing needed.
- **Solo-only enforcement**: gate at three layers — button visibility (Phase D), `checkNewGame('SPEEDRUN')` reject branch (Phase B5), and final defense at `startGame()` entry (Phase B4).

## Plan

### Phase A — Data + unlock detection

- [ ] **A1.** Add `bestSpeedrunSec: null` to per-hero save shape. Update `defaultSaveData` at [game.js:153](game.js#L153) and migration at [Managers/SaveManager.js:336](Managers/SaveManager.js#L336). Read with `?? null` so existing saves migrate silently.
- [ ] **A2.** Add `storyCompleted: false` per hero. Set inside `gameOver(true)` story-completion branch at [game.js:4569-4584](game.js#L4569-L4584):
  - Base hero victory (fire/water/ice/plant/metal): flip `storyCompleted = true` on **all five** base heroes.
  - DLC hero victory: flip `storyCompleted` for `player.type`. For Chaos and Fortune DLCs, also flip partner (gravity↔void, spirit↔chance) — mirror the prestige sharing already at [game.js:4529-4560](game.js#L4529-L4560).
- [ ] **A3.** Helper `isSpeedrunUnlocked(heroType)` in [UI/MainMenu.js](UI/MainMenu.js): returns `saveData?.[heroType]?.storyCompleted === true`. Single source — never inline in HTML.
- [ ] **A4.** Cloud sync — `CloudSaveManager` merges whole `saveData`; new fields ride along free. Smoke-test once Phase F lands.

### Phase B — Game-mode plumbing

- [ ] **B1.** Add `isSpeedrunMode = false` next to other mode flags at [game.js:163-168](game.js#L163-L168). Mirror to `window.isSpeedrunMode`.
- [ ] **B2.** Add `splits: []` to `createRunStats()` in [RunState.js:21](RunState.js#L21). Cleared by `resetRunStats`.
- [ ] **B3.** New `startSpeedrunGame()` near `startStoryGame()` at [game.js:1405](game.js#L1405). Sets `isSpeedrunMode = true`, `saveData.story.enabled = true`, then `startGame('SPEEDRUN')`.
- [ ] **B4.** Handle `'SPEEDRUN'` in `startGame()` at [game.js:4126](game.js#L4126) — treat as NORMAL story plus the speedrun flag. Force `isCoopMode = false` and bail if `isOnlineMode` (defense in depth).
- [ ] **B5.** Wire `checkNewGame('SPEEDRUN')` at [game.js:2019](game.js#L2019) and confirm-overwrite branch [game.js:2035](game.js#L2035): reject if `isCoopMode || isOnlineMode`, else route to `startSpeedrunGame()`.
- [ ] **B6.** Reset `isSpeedrunMode = false` in `gameOver()` body at [game.js:4440](game.js#L4440), alongside other mode resets.

### Phase C — Skip story screens + audio (preserve mechanics)

- [ ] **C1.** Refactor [game.js:3458-3499](game.js#L3458-L3499): extract everything after `display = 'none'` + audio-stop into `_finishStoryEvent(event)`. `closeStory()` becomes a thin "dismiss UI then call _finishStoryEvent(currentStoryEvent)".
- [ ] **C2.** Find every `openStory(` caller. Most flow through `StoryManager.getEventForWave()` consumers. Add the fast-path branch immediately before the `openStory(event)` call:
  ```js
  if (isSpeedrunMode && !event.fromTutorial) {
      currentStoryEvent = event;
      if (!event.fromTutorial && !saveData.story.unlockedChapters.includes(event.id)) {
          saveData.story.unlockedChapters.push(event.id);
          saveGame();
      }
      _finishStoryEvent(event);
      return;
  }
  openStory(event);
  ```
- [ ] **C3.** Walk the speedrun fast-path with each event type and confirm side effects fire:
  - `BOSS_FIGHT` → boss spawn happens via wave generator post-advance. Confirm.
  - `COMPANION_JOIN` → AI companion spawn. Confirm.
  - `WAVE_OVERRIDE` → `event.data` (spawnRateMod, forcedEnemyType, layout, trap). Confirm consumed by wave generator after `advanceWave()`.
  - `OBJECTIVE_WAVE` → `event.data.objective`. Confirm.
  - Hero-locked chapters → swap at [game.js:3475-3486](game.js#L3475-L3486) runs inside `_finishStoryEvent`, automatic.
  - `THE_END` → `_finishStoryEvent` calls `gameOver(true)`. Speedrun submission handled in Phase F.
- [ ] **C4.** Tutorial story screens (`event.fromTutorial === true`) and intro (`wave === 0`) must keep the modal — speedrun never runs during tutorial.
- [ ] **C5.** Online-co-op story-sync handlers (`_onlineLocalContinuedStory`, `_onlineLocalStoryContinue` referenced near [game.js:3346](game.js#L3346) and [game.js:3426](game.js#L3426)) are unreachable in speedrun (solo-only enforced). No changes needed but verify they aren't entered.

### Phase D — UI button + main-menu integration

- [ ] **D1.** New button in [game.html:675-676](game.html#L675-L676): `<button id="btn-speedrun-mode" class="btn menu-primary-btn" style="display:none;" onclick="checkNewGame('SPEEDRUN')">▶ Story Speedrun</button>`. Style as a secondary primary (slightly smaller / different accent than Story Mode).
- [ ] **D2.** Extend `MainMenuUI.updateStoryButton()` at [UI/MainMenu.js:138](UI/MainMenu.js#L138):
  - Show speedrun button iff `isSpeedrunUnlocked(selectedHeroType) && !window.isCoopMode && !window.isOnlineMode`.
  - Hide for DLCs with `noStoryMode: true` (Disciples).
  - Hide if matching DLC `routesToStandard` is true.
  - Update label with PB when present: `▶ Story Speedrun (PB 12:34.5)`.
- [ ] **D3.** Hero card high-score line at [UI/MainMenu.js:88](UI/MainMenu.js#L88): when `data.bestSpeedrunSec`, append `<div class="hero-stats">Speedrun PB: 12:34.5</div>`. Format `mm:ss.t`.
- [ ] **D4.** Co-op/online toggles already re-render hero select on state change; speedrun button visibility tracks automatically via `updateStoryButton()` tail call in `renderHeroSelect()`.

### Phase E — Timer + splits HUD

- [ ] **E1.** New DOM `<div id="speedrun-hud">` in game canvas overlay area (top-left or bottom-left away from other HUD). CSS: monospace, 22-24px, white with text-shadow. `display: none` by default.
- [ ] **E2.** Show on `startSpeedrunGame()`; hide in `gameOver()` cleanup. Update text each frame inside `GameLoop` tick — `mm:ss.t` from `Date.now() - currentRunStats.startTime`. Cheap single DOM write per frame, mode-gated.
- [ ] **E3.** On wave-clear (find `wave++` / `advanceWave()` exit), if `isSpeedrunMode && wave > 0 && wave % 10 === 0`: push `{wave, timeSec}` to `currentRunStats.splits`. Display delta line `+xx.x` under timer for 2 seconds (fade-out).
- [ ] **E4.** On THE_END inside `_finishStoryEvent`: push final split if final wave isn't a multiple of 10 (base 101, rock 51, etc.) so the splits array always ends with the win-wave row.

### Phase F — End-of-run persistence + submission

- [ ] **F1.** In `gameOver(true)` victory branch, branch on `isSpeedrunMode`:
  - Compute `finalTimeSec = Math.floor((Date.now() - startTime) / 1000)`.
  - If `bestSpeedrunSec == null || finalTimeSec < bestSpeedrunSec`: update `saveData[player.type].bestSpeedrunSec` (and Chaos/Fortune partner, for parity with prestige sharing).
  - Submit to `/api/speedrun` if signed in and online: `{hero, timeSec, finalWave: wave, splits, sessionToken}`. Failure is silent (toast at most).
- [ ] **F2.** Victory screen — add `<section id="speedrun-summary">` showing total time + split table (rows: wave / cumulative / delta). Render only when run that just ended had `isSpeedrunMode`.

### Phase G — Server: speedrun_scores table + endpoints

- [ ] **G1.** Migration block in [server/server.js](server/server.js) after the existing `scores` migration (~[server/server.js:60](server/server.js#L60)):
  ```sql
  CREATE TABLE IF NOT EXISTS speedrun_scores (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      username     TEXT NOT NULL,
      hero         TEXT NOT NULL,
      time_sec     INTEGER NOT NULL,
      final_wave   INTEGER NOT NULL,
      splits_json  TEXT,
      submitted_at INTEGER NOT NULL,
      verified     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_speedrun_hero_time ON speedrun_scores(hero, time_sec);
  ```
- [ ] **G2.** New helper `speedrunPlausibilityReject(hero, timeSec, finalWave, splits)` in [server/anticheat.js](server/anticheat.js):
  - `timeSec > 0`, `finalWave >= 50`, hero in known set
  - Minimum 4 seconds per wave: `timeSec >= finalWave * 4` (twice as permissive as standard's 8s/wave because speedruns *should* be fast)
  - Splits monotonic ascending; final split `timeSec` ≤ submitted `timeSec`
- [ ] **G3.** `POST /api/speedrun` — `requireAuth`, rate-limit (capacity 5, refill 5/hour). Verify `sessionToken` if present. Insert row, prune to top-1000 by lowest `time_sec`.
- [ ] **G4.** `GET /api/speedrun?hero=fire&limit=10[&verified=1]` — ORDER BY time_sec ASC, default limit 10, max 50.
- [ ] **G5.** Tests in [tests/](tests/): mirror existing leaderboard tests — plausibility unit tests + endpoint integration tests.

### Phase H — Client: leaderboard UI

- [ ] **H1.** Extend Museum leaderboard at [Museum.js:87](Museum.js#L87) with a tab toggle: `[ Standard ] [ Speedrun ]`. Cleaner than a new screen — fetch + render plumbing already exists.
- [ ] **H2.** Add `_fetchSpeedrunLeaderboard(hero)` parallel to `_fetchLeaderboard`. Row schema: rank | username | time (`mm:ss.t`) | final wave | hero icon.
- [ ] **H3.** Highlight the signed-in user's own row when present in the response.
- [ ] **H4.** Hero filter dropdown — default to currently-selected hero on entry; `(All heroes)` option for global view.

### Phase I — Verification

- [ ] **I1.** Win base story as fire; confirm `saveData.fire.storyCompleted` AND `saveData.water/ice/plant/metal.storyCompleted` all true after.
- [ ] **I2.** Speedrun button appears below Story Mode for any base hero (only after I1).
- [ ] **I3.** Speedrun run: no story modal at any wave; bosses spawn at 5/30/40/50/75/100; companion joins at 12/32/52/72; hero swaps respected on hero-locked chapters; victory at wave 100.
- [ ] **I4.** Timer increments each frame; split logged every 10 waves; HUD renders; speedrun-summary panel appears on win.
- [ ] **I5.** Best time persists across reload; cloud sync round-trips `bestSpeedrunSec`.
- [ ] **I6.** Signed-in: `POST /api/speedrun` succeeds; `GET /api/speedrun?hero=fire` returns the row; Museum tab renders it.
- [ ] **I7.** Speedrun button hidden + `checkNewGame` rejected in co-op AND in online lobbies.
- [ ] **I8.** Repeat I1-I4 for one DLC hero (Earth — story ends wave 51).
- [ ] **I9.** Repeat I1-I2 for Champions of Chaos (gravity victory → void also flips, and vice versa).
- [ ] **I10.** Tutorial story chapter (wave 0) still shows modal — confirm speedrun does not affect tutorial path.
- [ ] **I11.** Anticheat: craft a `timeSec=10, finalWave=100` POST and confirm 400.
- [ ] **I12.** Performance: timer DOM write per frame doesn't measurably affect FPS in dev tools.

## Out of scope (logged for later)

- **Ghost replay** ([improvements #78](improvements-2026-05-10.md)) — independent feature; reuse splits + RNG seed when Replay lands.
- Per-arc challenge medals (gold/silver/bronze thresholds) — polish, post-v1.
- Hard Mode prestige-tier separation in speedrun leaderboard — needs schema slicing, user explicitly deferred.
- Per-section best times (PB per individual segment, not just final) — interesting but adds DB columns, defer until v2.

## Review

(Fill in after implementation.)
