# Windows Electron Build — Critical Bug Fixes (2026-05-28)

User-reported bugs after Windows Electron playtest. Logs reviewed; root causes located.

## Bug 1 — Music breaks after first level-up or boss appearance

**Root cause:** `Managers/AudioManager.js` `_ensureMusicFilter()` (lines 303-326). The filter/gain creation block only runs when `_audioCtx` is null. But `_ensureAudioCtx()` (called by SFX prewarm via `_loadSFXBuffer`) populates `_audioCtx` early — without creating `_musicFilter` or `_musicGain`. On first level-up, `_duckMusicPulse` → `_routeActiveMusic` → `_ensureMusicFilter` skips filter creation, then `source.connect(this._musicFilter)` runs with `_musicFilter = null` and throws. The MediaElementSource has already detached the track from the default destination, so music goes silent permanently.

- [ ] Fix `_ensureMusicFilter` to create `_musicFilter` + `_musicGain` whenever they are missing, independent of `_audioCtx` state.

## Bug 2 — Edit HUD not navigable with controller

**Root cause:** `Managers/HUDLayout.js` `_pollGamepad()` line 294 picks the first `connected` gamepad without filtering phantom USB receivers / non-controller HID devices. Real controllers may sit at higher indices. `handleGamepadMenu()` in `game.js` already uses `window.isRealGamepad()` to skip these. HUD edit reads the phantom pad (no buttons pressed) and ignores the real one, so focus never moves.

- [ ] Replace the `if (p && p.connected) { gp = p; break; }` loop with the `window.isRealGamepad(p)` filter, mirroring `game.js:676-678`.

## Bug 3 — Global Lobby canvas blank (shows main menu background)

**Root cause:** `Museum.js` lines 2416 + 2423 reference `MenuBackground` inside guarded calls `if (typeof MenuBackground !== 'undefined') MenuBackground.stop();`. `MenuBackground` was migrated out of `window` shim (UI/MenuBackground.js header note "window shim retired"), and Museum.js never imports it. `typeof MenuBackground` evaluates to `"undefined"` → guard fails → `MenuBackground.stop()` never runs → `#menu-bg-canvas` (z-index 19) stays visible covering the `gameCanvas` (default z-index 0). Same defect affects `openMuseum()`.

- [ ] Add `import { MenuBackground } from './UI/MenuBackground.js';` at top of Museum.js.
- [ ] Drop the `typeof` guards on lines 2416 and 2423 — call `MenuBackground.stop()` directly.

## Bug 4 — Global stats / unlocks not persisting

**Status:** unconfirmed from code inspection. Logs show "Game Saved Successfully" + CONFIRM_OVERWRITE on next launch, indicating save_data.json persists between sessions. Mutation sites (`unlockAchievement`, `gameOver`, kill tracking at game.js:4483-4486) all call `saveGame()`. `SaveManager.loadGame` deep-merges `global` correctly. `window.saveData` getter routes through `GameContext._saveDataBacking` — mutations like `saveData.global.totalKills++` operate on the live object.

**Hypothesis:** the user may have been running a slightly stale dist build (recent c5ed68b "route Node require through globalThis" fix + 4dbd842 "copy DLC images/audio into dist" both touched the packaging path). After rebuilding with the Bug 1-3 fixes, re-test save persistence.

- [ ] After 1-3 land + repackage installer, ask user to retest. If still broken, add temporary diagnostic: log `saveData.global.unlockedAchievements.length` before each `fs.writeFileSync` and the same value at end of `loadGame`.

## Changelog + version

- [ ] Add `### Fixed` entries under `## [Unreleased]` in `CHANGELOG.md` for each landed fix.

## Review

Landed 2026-05-28:

- **Bug 1 — Music** — [Managers/AudioManager.js:303-330](Managers/AudioManager.js#L303-L330) `_ensureMusicFilter()` now creates `_musicFilter` + `_musicGain` whenever they are missing, not only on first `_audioCtx` creation. Eliminates the `source.connect(null)` throw triggered by SFX prewarm having pre-warmed `_audioCtx` before the first music-bus duck pulse.
- **Bug 2 — HUD edit controller** — [Managers/HUDLayout.js:294](Managers/HUDLayout.js#L294) `_pollGamepad()` now filters through `window.isRealGamepad()` (with fallback to the previous `.connected` check), matching `handleGamepadMenu()` in game.js. Phantom XInput slots at index 0 no longer swallow the poll.
- **Bug 3 — Global Lobby canvas** — [Museum.js:5](Museum.js#L5) imports `MenuBackground` explicitly. The `typeof MenuBackground !== 'undefined'` guards on `openMuseum()` and `openGlobalLobby()` were dropped; both now call `MenuBackground.stop()` directly so `#menu-bg-canvas` is properly hidden when entering either scene.
- **CHANGELOG** — `### Fixed` entries added under `## [Unreleased]` with full root-cause writeups.
- **Lint** — 98 warnings unchanged from baseline (pre-existing cap break, not introduced by these edits).

Bug 4 deferred — waiting on user retest with the repackaged installer carrying fixes 1-3.

---

# Museum / Lobby frozen arena overlay (2026-05-29)

**Symptom:** after starting *and quitting* any run, opening the museum or global online lobby shows a frozen frame of the last arena. Fresh launch (no run yet) → museum/lobby render fine.

**Root cause (distinct from Bug 3 above):** the WebGL post-processing overlay `<canvas id="postFxCanvas">` ([core/postProcess.js:137-139](../core/postProcess.js#L137-L139)) sits at `z-index:2` over `gameCanvas` and only updates/hides itself inside `renderPostFX()`, which is called solely from `_runGameplayFrame()` ([game.js:6638](../game.js#L6638)). Museum + lobby early-return in `masterFrame` *before* that call, so after a run the overlay stayed `display:block` holding the last gameplay texture and covered the scene drawn to `gameCanvas` underneath. At the main menu the stale overlay is masked by `#menu-bg-canvas` (z-index 19) — which is exactly why Bug 3's fix (hiding `#menu-bg-canvas` on scene entry) *unmasked* this one. Same class as the boss-defeat freeze (CHANGELOG 2026-05-17).

- [x] Export `hidePostFX()` from `core/postProcess.js` (wraps `_hideOverlay()`).
- [x] Call `hidePostFX()` in the museum + lobby early-return branches in `masterFrame` ([game.js:6657-6658](../game.js#L6657-L6658)). Big-gamble left untouched (mid-run, current texture, not user-reported).
- [x] CHANGELOG `### Fixed` entry added.

**Verify:** `npm run lint` clean (0 errors); `npx vitest run` → 351 passed. Behavioural check (DOM/WebGL) deferred to playtest: start run → quit → open museum and lobby → expect the scene, not a frozen arena.

> Pause/level-up/shop/story intentionally keep `gameRunning` true, so they do *not* hit the museum/lobby branches and the arena + postFX stay visible behind those overlays as before.
