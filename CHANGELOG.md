# Changelog

All notable changes to this project will be documented in this file, starting with version 1.0.0 and recent changes involved just before that release.

## [Unreleased]

## [1.0.3] — 2026-04-19

### Added
- Automatic update check on launch: fetches the latest GitHub release and shows a dialog if a newer version is available, with a direct download button

### Fixed
- Spirit Hero's charging sound loop no longer continues playing after pausing the game
- Boss defeated screen (story mode) is now controller-navigable on Windows Electron: gamepad detection now uses `isRealGamepad()` to skip USB receivers at index 0
- Boss defeated screen no longer persists over the story chapter screen after selecting Continue: canvas is cleared immediately on dismissal and the render loop early-exits when the screen is dismissed mid-frame

## [1.0.2] — 2026-04-19

### Added
- Electron file logging (`game.log`) is now toggled by a `LOGGING_ENABLED` constant in `index.js` (disabled by default)
- README now includes Windows build instructions; GitHub Actions workflow file renamed from `build-windows.yml` to `build.yml`

### Changed
- Standard boss enemies (Rhino, Speedster, Summoner, Nova, Hydra) now face the direction they are moving instead of spinning around their own axis
- DLC enabled-state is now stored in `dlcs.json` (Electron) / `localStorage` (web), mirroring the Config.js pattern; all DLCs are disabled by default on first run and must be explicitly enabled

### Fixed
- Entering any game mode with a controller connected no longer crashes: `PlayerController.js` now uses optional chaining (`?.pressed`) on all gamepad button accesses so gamepads with fewer than 10 buttons are handled safely
- Controller inputs in-game no longer go dead when a USB receiver occupies gamepad index 0: `HumanController` now uses `isRealGamepad()` to find the first real controller, consistent with menu navigation
- Completion menu no longer crashes (showing only the toggle and back button) on first run: `CompletionMenu.calculateProgress()` now uses optional chaining when reading `.prestige` for altar convergence nodes whose hero slots may not yet exist in `saveData`
- "Continue Run" no longer opens the shop when resuming a saved run on a wave that follows a shop wave (e.g. wave 5 after the wave-4 shop)

## [1.0.1] — 2026-04-17

### Added
- Story intro screen is now gamepad-compatible: pressing A skips it, matching the press-start screen behaviour
- Skip hint on story intro screen updated to mention A button
- Bug report overlay closes with gamepad B button (tracks `BUGREPORT` UI state)
- Manual closes with gamepad B button (fixed broken `closeTutorial` reference → `Manual.close()`)
- Evil Mode button and all other main-menu button types now show the yellow gamepad-focus ring when selected (added `.selected` overrides for `menu-mode-btn`, `menu-lib-btn`, `menu-challenge-btn`, `menu-continue-btn`, `menu-sys-btn`)
- Symphony of Sickness DLC: added Collector Cards for Toxic Crawler, Speedster, and Shadow Clone enemy types (`injectCards`)

### Fixed
- Story Mode button now shows yellow controller-selection outline when navigated to with a gamepad (was hidden by `border: none !important`)
- Windows installer now uses the correct app icon (`images/icons/win/icon.ico`) instead of the default Electron icon; icon path is now platform-aware in `forge.config.js`
- Installed app on Windows now correctly shows `5 Freunde: Elemental Arena` as product name instead of `5-freunde-arena`
- USB receivers and other non-controller HID devices are no longer mistaken for gamepads; `isRealGamepad()` filter (≥10 buttons, ≥2 axes) is applied in menu navigation, co-op assignment, and the `gamepadconnected` event handler
- Lightning Hero: `specialMaxCooldown` corrected from 15000 to 900 frames (was effectively a 4-minute cooldown instead of 15 seconds)
- Time Hero: `rangeCooldown` and `meleeCooldown` now respect `cooldownMultiplier` on assignment (cooldown reduction upgrades had no effect)
- Time Hero: CPU/co-op AI no longer returns `null`; now uses standard target-following behaviour
- Symphony of Sickness DLC: beat loop `setInterval` now clears any previous interval before creating a new one, preventing stacked ticks on reload
- Air Hero, Poison Hero, Sound Hero: special-icon DOM access is now guarded by `!player.isCPU`, preventing errors in CPU/co-op contexts

## [1.0.0] — 2026-04-17

### Added
- Completion menu: "Hide Completed" toggle button filters out 100% categories and sub-categories; controller-compatible
- Version number displayed subtly in the bottom-right of the main menu footer; single source of truth is `APP_VERSION` in `Constants.js`
- Boss-win audio exclamation plays for the winning hero when defeating an opponent in versus mode (all four KO code paths: AI-opponent projectile, AI-opponent melee, 2P projectile, 2P melee)
- GitHub Actions workflow
- Level-up sounds
- Bug report form
- SFX for all weather effects
- Themed obstacles per biome
- Earth hero impact sound
- Controller vibration and screen shake effects
- Evil Mode with villain exclamations and memory shards
- All hero exclamations (boss moments, wins, failures, level-up, found)
- Pickup SFX for all items
- Improved menu design
- Story-relevant achievement gating
- AI Companion mode
- Chaos Shuffle mode
- Weekly Challenge mode
- 2-Player Co-op and Versus modes
- DLCs: Rise of the Rock, Waker of Winds, Tournament of Thunder, Symphony of Sickness, Faith of Fortune, Champions of Chaos, Echos of Eternity
- Maze of Time (Echos of Eternity story dungeon)
- Skill Tree, Void Shop, Chaos Shop, Altar, Museum, Collection, Achievements, Statistics screens
- Daily Challenge mode
- Save import/export

### Changed
- Manual: expanded Game Modes section with entries for Versus Mode, Co-op Mode, Chaos Shuffle Mode, and Evil Mode

### Fixed
- Completion menu BACK button now appears directly below the content instead of being pushed to the bottom of the screen
- Completion menu now scrolls as a whole page (no inner scrollbar) and expanded categories scroll into view automatically
- Version number and copyright text no longer overlap in the main menu footer
