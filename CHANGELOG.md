# Changelog

All notable changes to this project will be documented in this file, starting with version 1.0.0 and recent changes involved just before that release.

## [Unreleased]

### Added
- **Cloud Save system**: New server component (`server/`) provides REST API-backed cloud save storage running on any Node.js host (e.g. Raspberry Pi). Players can register/login from the Options menu → Cloud Save section, then enable Cloud Sync to automatically upload saves after every save and download on game start. Conflict detection compares local and cloud saves; a modal lets the player choose which version to keep when both differ since the last sync.

### Changed
- **Museum — door widths**: Doors between top rooms (Fire, Water, Ice) and the gallery corridor are now 200 px (Fire/Ice) and 300 px (Water), centred within each room, replacing the previous 100 px / 600 px extremes.
- **Museum — Metal Room decorations**: Replaced floor-level gears with a compact clockwork cluster mounted on the north wall; removed the south-wall pipe; added four metal shields on the side walls and a crossed-sword rack on the south wall.

### Added
- **Museum — Forbidden Archive (basement)**: A hidden basement section below the Creature Wing accessible via a staircase. Entry is sealed until the player finds and activates three hidden switches scattered across the museum (fire room, ice room, gallery). Once all switches are activated the locked gate opens permanently. The Makuta and Green Goblin memory shards are housed exclusively here instead of the main gallery.

## [1.1.0] - 2026-04-25

### Added
- **Info dialogue system**: Generic queued info dialogue that appears on main menu launch; controller-compatible (navigate with stick/D-pad, A to activate, B to close); dismissable via "Don't show this again" checkbox persisted in config; plays menu music seamlessly; new dialogues can be registered via `infoDialogueManager.register()`
- **"Expansions Available" info dialogue**: First-launch popup pointing players to the Expansions section; can be permanently dismissed
- **Sound Hero — GRAND FINALE ultimate**: PERFORMER form now triggers a full musical assault: shots become a 5-way (7-way on-beat) sonic fan at 2.5×–3.5× damage; every beat auto-fires an 8-way omnidirectional note burst; orbiting musical notes deal close-range AoE damage every 30 frames; lasts 10 seconds
- **Gravity Hero — DARK STAR ultimate**: Gravity Hero now has the DARK STAR form: activation jolts all enemies inward; gravity pull range triples with 5× force; enemies within 80px take 15 DPS × damageMultiplier; spinning purple accretion disk ellipses render around the player; deactivates on damage (standard rule)
- **Poison Hero — PANDEMIC PROTOCOL ultimate**: PLAGUEBRINGER form now activates a true pandemic: all living enemies are instantly infected to 100 poison stacks on activation; turbo stack field applies +10 stacks/10 frames in radius 400; poison DoT ticks 3× faster (every 10 frames); plague explosions chain on poison kills; player leeches 5% of all poison DoT dealt; lasts 15 seconds
- **Air Hero — STORM INCARNATE ultimate**: ZEPHYR form fires all 4 compass attack styles simultaneously (scatter shotgun, sniper lance, rapid blades, vortex orb) per shot; hurricane ring damage boosted 7.5× (15 × damageMultiplier); activation triggers a 5-point wind burst; lasts 10 seconds
- **Lightning Hero — ABSOLUTE DISCHARGE ultimate**: FLASH form activates with an 8-way super lightning omni-burst; static charge generates 3× faster; every time charge fills to 100% an 8-way super omni-burst auto-fires; speed boost to 1.6× while active; lasts 10 seconds
- **Chance Hero — ALL IN ultimate**: JACKPOT form forces all dice to be explosive (always `allMatch`); explosive hits have a 25% chance to chain-bounce to the nearest enemy for 75% damage; slot machine auto-fires every second with a guaranteed JACKPOT outcome; 4 lucky symbols orbit the player; lasts 10 seconds
- **Spirit Hero — DIVINE RADIANCE ultimate**: Level-10 ENLIGHTENED form fully heals the player and fills Inner Peace; purification aura boosted to 40 × damageMultiplier every 10 frames at radius 250 (vs. 20 × mult / 15 frames / radius 150 from special); each aura pulse heals 0.5 HP; shots become Sacred Beams (pierce 10, 3× damage, 2× speed); Inner Peace drains at 0.2/frame for longer duration
- **Void Hero — SYSTEM COLLAPSE ultimate**: ENTROPY form instantly marks all living enemies as glitched; emits expanding corruption wave rings every 2 seconds (40 × damageMultiplier to all enemies within 300px); System Corruption AoE boosted to every 8 frames with 20% instant-delete for non-boss enemies below 50% HP; on form end, all remaining glitched enemies detonate for 200 × damageMultiplier; lasts 10 seconds
- **Poison visual on enemies**: Enemies with active poison stacks now show a green body tint, a glowing pulsing toxic ring, and rising bubble drips — all scaling with stack intensity (0–100) so lightly and heavily poisoned enemies are clearly distinguishable
- **Hit flash on enemies**: Enemies briefly flash white when hit (6-frame fade), giving instant visual confirmation on every shot and melee strike
- **Enemy death burst**: Regular enemies emit a small directional 8-particle burst in their own color on death
- **Hit stop**: Significant hits (melee: 2 frames, crit projectile: 3 frames, melee crit: 4 frames) freeze enemy and projectile movement for classic fighting-game impact feel
- **Combo milestone animation**: Reaching combo x10, x25, x50 or x100 triggers a scale-bounce and color pop on the combo counter
- **Low health heartbeat**: The health bar now persistently pulses at <25% HP (slow) and <10% HP (fast panic-rate); canvas vignette also activates earlier (25% vs 20%) with pulse speed scaling down with HP

### Fixed
- Weather effects now always reset at the start of each new wave instead of persisting into the next wave
- Gravity Hero no longer plays the shoot sound or fires a projectile while in DARK STAR ultimate form
- Memory shard pickups now display the correct color for every hero type (all DLC heroes — earth, lightning, gravity, void, spirit, chance, time, love, air — were previously defaulting to white)
- Time and Love heroes now render in their correct colors in the Museum (player avatar and entity sprites)
- Void Hero special icon now correctly shows 👻 (was showing default icon because the override applied after the first setup call)
- Void Hero ENTROPY ultimate now correctly marks all enemies as glitched and runs its 10-second form; the `chooseUpgrade` path was bypassing `HERO_LOGIC.applyUpgrade`, so the timer and glitch-marking logic never executed
- Void Hero biome obstacles now render with the cyan fractured-reality style instead of default stone (FracturedBiome was creating obstacles without a `biomeType`)
- Hero exclamations are now clearly audible over music — volume raised to 1.0 and background music ducks to 10% while a line plays, then restores
- DLC Expansions menu no longer plays the battle theme — `'DLC'` added to the menu state list in AudioManager

### Changed
- Developer logo intro screen now plays an animated video (`developer_animated.mp4`) instead of a static image
- Title background in the press-start screen now plays a looping animated video (`title_animated.mp4`) instead of a static image

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
