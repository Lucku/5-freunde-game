# Improvement Backlog — 2026-05-10

Comprehensive idea list from full-codebase scan. 170 items grouped by category. Check off as completed. Highest-leverage picks tagged `★`.

---

## Code structure / architecture

- [ ] 1. ★ Split `game.js` (7257 lines) into modules: `GameLoop.js`, `Spawner.js`, `Wave.js`, `Camera.js`, `EventBus.js`, `RunState.js`. Use ES modules + `<script type=module>` or move to a bundler.
- [x] 2. ★ Adopt bundler + tree-shaking (esbuild or Vite). Replace ~60 `<script src>` tags in `game.html`. Gives minification, source maps, dev HMR. *(Phase 1: Vite 8 wired, dev server + production build working. 4 leaf files in ESM bundle; remaining files still classic + `defer` for compatibility. ESM migration of Managers/Entities/UI/game.js/DLCs is the multi-session follow-up.)*
- [ ] 3. ★ TypeScript or JSDoc `@type`. Save data schema, hero stats, world object — all undocumented. Prevents recent-style `saveData[player.type].prestige` regressions.
- [ ] 4. Kill `window.*` globals (~15 cross-cutting: `canvas`, `ctx`, `wave`, `arena`, `enemies`, `projectiles`, `saveData`, `ENEMIES_PER_WAVE`, `BIOME_LOGIC`, `HERO_LOGIC`, `ENEMY_LOGIC`, `BIOME_OBSTACLE_DENSITY`, `_world`, `_defaultSaveData`, `gameConfig`). Replace with `GameContext` singleton or DI.
- [ ] 5. ECS / component-based entities. `Player.js` constructor has 130+ fields mixing stats / runtime / DLC hooks / chaos / achievement bonuses. Split into Stats / Movement / Combat / Buffs / DLCState components.
- [ ] 6. Unify `Player`/`Enemy`/`Boss` under shared `Actor` base. Remove duplicated HP/position/collision/floating-text logic.
- [ ] 7. Extract `BiomeRegistry` with enforced shape `{generate, update, draw, getEnemyType, music}`.
- [ ] 8. DLC manifest format (JSON) + auto-loader. Each DLC `index.js` repeats register-hero / register-biome / register-audio boilerplate.
- [ ] 9. Reduce `index.js`/`Config.js` Electron-detection duplication. Push into `Platform.js`.
- [x] 10. ★ Save schema versioning + migrations. No version field on `saveData`; every new DLC patches `defaultSaveData`. One bad save = silent broken state.
- [ ] 11. Replace 539 module-scope globals in `game.js` with explicit `RunState` object. Server simulation has to monkey-patch globals to reuse code.
- [x] 12. ★ Test suite (Jest/Vitest). Single `parityTest.js` exists. Cover damage calc, level-up, save migration, network input encoding, projectile physics, boss phase transitions. *(Vitest harness + 38 tests across 6 files: SaveManager migration, mulberry32, SpatialHash, Hermite interp, plausibility caps, rate limiter. Existing parityTest now passes 80/80 after typo + AirHero stub fix.)*
- [x] 13. ESLint custom rule banning `forEach + arr.splice(index)` index-skip pattern (regression class hit 11 hot loops in `game.js`). *(`eslint-plugin-5freunde/no-foreach-splice` — found 8 more instances on first run.)*
- [x] 14. ESLint + Prettier config. CI lint job. *(Flat config, warnings-only, 0 errors + 369 baseline warnings catalogued. CI runs lint + build + tests on every push/PR.)*
- [ ] 15. Asset manifest + lazy load. `AudioManager.js` instantiates 50+ `new Audio()` at startup. Lazy-init or `<link rel=preload>` + `Promise.all`.
- [ ] 16. Constants for magic numbers: `meleeRadius = 80`, `_INTERP_DELAY_MS = 100`, `dashMaxCooldown = 180`, `viewHalfW = 1000`.
- [ ] 17. Remove `JSON.parse(JSON.stringify(...))` deep clones. `getHeroStats` already on `structuredClone` — extend to save load, default config.
- [ ] 18. Centralize damage pipeline. One `applyDamage(target, dmg, source, opts)` would prevent "Spirit Tranquility never restored speed" class of bug.

## Performance

- [x] 19. ★ Spatial hash / quadtree for collisions. `enemies × projectiles × meleeAttacks × players` is O(n²) every frame; ~10k checks/frame at wave 30+. *(Phase 1: SpatialHash infra + 3 AOE-radius scans migrated; full projectile-vs-enemy inversion deferred.)*
- [x] 20. Object pools for `Projectile`, `Particle`, `FloatingText`, `MeleeSwipe`, `GoldDrop`. GC churn visible on long runs. *(Pass A: `Particle` + `FloatingText` pools landed with acquire/release API; every call site across base + DLCs converted; masterLoop releases dead instances before splice. `Projectile`/`MeleeSwipe`/`GoldDrop` deferred — non-trivial reset state.)*
- [ ] 21. Offscreen canvas for static layers. Bake arena obstacles + biome zones to `OffscreenCanvas`, blit once.
- [x] 22. Cache gradients. Many enemies/bosses recreate `createRadialGradient` every draw. *(Pass A: `Utils.cachedRadial(ctx, key, r0, r1, stops)` helper + 3 hot projectile sites converted. ~107 remaining sites are incremental — helper is in place for opportunistic conversion.)*
- [ ] 23. `requestAnimationFrame` budget tracker. p99 frame-time HUD next to FPS.
- [ ] 24. Web Worker for AI batches. 200+ enemy steering in worker via `SharedArrayBuffer`.
- [ ] 25. Texture atlas for sprites. Replace per-frame `arc/fill/stroke` with `drawImage` from atlas.
- [ ] 26. Particle batching. Sort by color/size; batch fills.
- [ ] 27. Cull off-camera particles + floating text completely (currently update off-camera).
- [ ] 28. Throttle non-essential per-frame work to 30 Hz (boss telegraph timers, weather alpha pulses, biome zone updates).
- [x] 29. ★ Lazy-load DLC bundles. All 8 DLCs load at startup even if user only plays Fire. *(Phase 1: parallel `Promise.all`. Phase 9: DLCManager.loadScript switched from `<script>` injection to native dynamic `import()`. Each DLC file is now fetched on-demand via the module loader — modern browsers can prefetch/cache by URL, and Vite/Rolldown can code-split bundles per DLC if/when we mark them. Full lazy "load on first hero pick" wiring is the natural follow-up.)*
- [ ] 30. WebGL/Pixi.js backend toggle. 5–10× perf at high entity counts.
- [x] 31. Memoize `getHeroStats` per `(type, altarHash, metaHash)`. Currently runs every level-up + spawn. *(Map cache keyed by `(type, prestige:unlocked:level, JSON(metaUpgrades), achievements)`. Returns `structuredClone` of cached `base`. Auto-invalidates on any input mutation. `window.invalidateHeroStatsCache()` exposed for manual busts.)*
- [ ] 32. Smarter snapshot diff: bitpack int16 position deltas to save bandwidth on internet links.
- [ ] 33. WS `permessage-deflate` compression for snapshots if not already enabled.
- [ ] 34. Audio decoding off-main-thread. `Audio.preload='metadata'` for non-essential SFX.

## Visuals

- [ ] 35. ★ Modern post-processing stack (WebGL fragment shaders): bloom on projectiles, chromatic aberration on hit, vignette on low HP, color grade per biome — single full-screen pass.
- [ ] 36. 2D normal-map lighting. Cheap radial lights on Fire hero / boss explosions affecting nearby sprites.
- [ ] 37. Hero animations. Replace procedural-circle look with walk-cycle / attack frames.
- [ ] 38. Camera shake taxonomy. Different shake types per event (heavy boss stomp vs small hit) using Perlin-noise offsets.
- [x] 39. Hit-stop / freeze-frames. 50 ms freeze on critical hits and boss kill. *(Pass A: `triggerHitStop(frames)` + `_isHitStopped` masterLoop skip already existed for crits; extended to boss-death init at all 4 production sites. 12-frame freeze on boss kill.)*
- [ ] 40. Damage number animations: crit numbers arc + scale + color-shift.
- [ ] 41. Death animations per enemy type: BOMBER fizzle, GHOST dissolve, SHIELDER shatter.
- [ ] 42. Animated arena edges / parallax background.
- [ ] 43. Biome-specific ambient particle systems: foliage, flowing water, drifting snow.
- [ ] 44. Day/night cycle inside long runs. Subtle color grade shift every 5 waves.
- [ ] 45. Trail renderer. Dash trails, projectile trails (esp. Lightning hero).
- [ ] 46. Boss intro cinematics: camera pan + zoom + name banner + music swell.
- [ ] 47. UI polish. Inconsistent style mix (CSS in `main.css` + canvas-drawn). CSS variables for color tokens.
- [ ] 48. Replace emoji icons in `Constants.js` (`POWERUP_TYPES`, `CHAOS_REWARDS`) with SVG/PNG. Emojis render differently on Windows/Linux/Steam Deck.
- [ ] 49. Animated title screen. Loop `developer_animated.mp4`/`title_animated.mp4` instead of static.
- [x] 50. ★ Colorblind modes (deuteranopia/protanopia palettes). Many mechanics rely on color.
- [ ] 51. ★ Photo mode: pause + free camera + hide UI for screenshots.

## Gameplay mechanics

- [ ] 52. Extend Museum (`Museum.js`, 2305 lines) into real hub world: NPCs, side content, lore terminals.
- [ ] 53. Procedural relics / artifact system (Hades boons style). Picks up between waves modify behavior.
- [ ] 54. ★ Co-op hero synergies: Fire+Ice = steam, Water+Lightning = chain shock, Plant+Earth = root entangle.
- [ ] 55. Hero subclasses / specs. Each hero gets 2-3 alternate paths chosen at level 5.
- [ ] 56. Skill rebinding. Swap special with another unlocked one.
- [ ] 57. Active dodge with i-frames independent from dash.
- [ ] 58. Parry mechanic. Frame-perfect block on melee enemies for huge counter damage.
- [ ] 59. Boss weak points / phase puzzles. Telegraphed "shoot the glowing core during slam".
- [ ] 60. Endless mode with leaderboard past wave 100.
- [x] 61. ★ Daily seed mode. Fixed RNG → all players share arena, mutators, drops. Compete on leaderboard. *(mutator RNG → mulberry32, per-seed leaderboards via `dailySeed` column, `getSeededRng()` global for opt-in. Arena/drop wiring left as a follow-up audit.)*
- [ ] 62. Asynchronous co-op (ghost replays). Record runs, fight alongside ghost (Dark Souls).
- [ ] 63. Pet / minion system. Extend `Companion.js` with multiple pets, evolutions, equippable.
- [ ] 64. Pickup mechanics overhaul: magnet radius upgrade, pickup bursts ("collect 50 gold in 5s" → bonus).
- [ ] 65. Build crafting between waves. Blacksmith hub: combine 2 cards → 1 stronger.
- [ ] 66. Inventory limit + active swap. Force tradeoffs vs strictly additive upgrades.
- [ ] 67. Cursed pickups (skull icon: huge buff but spawns elite next wave).
- [ ] 68. Negative status floor: bleed/burn/freeze/shock symmetric both ways.
- [ ] 69. Player-triggerable environmental hazards: barrels, stalactites, magnet pillars.
- [ ] 70. Destructible terrain.
- [ ] 71. Boss rush mode.
- [ ] 72. Speedrun mode: timer + section splits + ghost.
- [ ] 73. Hardcore / permadeath leaderboard. Lose all meta on death.
- [ ] 74. Co-op revive resource. Revive tokens earned per wave clear.
- [ ] 75. Versus expansions: best-of-3, draft phase (ban a hero), rotating mutators.
- [ ] 76. Tutorial branching. `Tutorial.js` is 1377 lines, single path. Add hero-specific mini-tutorials.
- [ ] 77. ★ Achievement-driven cosmetics: skins, weapon trails, particle colors.
- [ ] 78. Replay system. Record input + RNG seed → playback.

## Server / multiplayer

- [ ] 79. Lobby browser / matchmaking. Public listings filtered by hero/mode/region.
- [ ] 80. Region-based servers. Multi-region with lowest-latency selection (Cloudflare Workers / Fly.io).
- [ ] 81. ★ 3-4 player co-op. Server already authoritative — extend `players[2]` to `players[N]`.
- [ ] 82. Spectator mode. Watch live match (admin dashboard infra exists).
- [ ] 83. Re-connect on drop. 30 s grace window so wifi blip doesn't end run.
- [ ] 84. WebRTC voice chat in lobby + in-game.
- [ ] 85. Friends list + invites. Extend SQLite users table with friendships.
- [ ] 86. Cross-progression cloud save conflict UI (last-write-wins is dangerous).
- [x] 87. ★ Anti-cheat for leaderboard. `POST /api/leaderboard` accepts any wave/score from authenticated client. Add server-side validation: minimum time per wave, hero-specific damage caps, replay token signed by `GameSession`.
- [x] 88. ★ Rate limiting on register/login/leaderboard. `bcrypt.hash(password, 10)` is CPU-expensive — easy DoS vector.
- [x] 89. CSRF / origin check on WS upgrade. *(Pass A: `ALLOWED_WS_ORIGINS` env-driven allowlist; `verifyClient` rejects mismatched browser Origin, native clients with no Origin pass through. Same allowlist also gates Express CORS.)*
- [x] 90. ★ HTTPS / WSS by default. `Config.js` defaults to `http://localhost:3001`. Production should be `wss://`. *(Env-driven: TLS_CERT_PATH + TLS_KEY_PATH enables HTTPS/WSS automatically; plain HTTP fallback for local dev.)*
- [ ] 91. Lag compensation / rollback. Current is delay-based interp (100 ms). Small rollback for hit confirmation reduces "I hit them but no damage" feel.
- [ ] 92. Server-side stat tracking + meta unlocks. Move some meta progression server-side (counter to `save-editor.html` — flag online-mode runs).
- [ ] 93. Tournament / brackets system. Schedule events on server, automatic bracket generation.
- [ ] 94. Guild / clan system.
- [ ] 95. Server message of the day / patch notes pushed to client on connect.
- [ ] 96. Server-side world events: "this weekend 2× XP", configurable from admin dashboard.
- [x] 97. ★ Crash reporting (Sentry / GlitchTip). Use breadcrumbs from `console.log`/`window.onerror` already captured in `game.js:16-24`. *(Lightweight in-house pipeline: client `Managers/CrashReporter.js` → `POST /api/crash` → `data/crashes.jsonl`. Swap target URL later to plug into Sentry.)*
- [ ] 98. Telemetry / analytics opt-in: wave-clear-rate per hero, drop-off curve, average run length. Guides balance.
- [ ] 99. Match history. Per-session summary; player can browse own run history.
- [ ] 100. Online co-op revive ping (Apex-style audio + visual ping).

## Extensions / new content

- [ ] 101. ★ Mod / scripting API. Expose `BIOME_LOGIC`/`HERO_LOGIC`/`ENEMY_LOGIC` registries officially with sandboxed user-loaded JS via dynamic `import()`. Steam Workshop equivalent.
- [ ] 102. Map editor. Drag-drop biome zones, obstacles, spawn rules → exports JSON consumed by `Arena.generate`.
- [ ] 103. Roguelike modifier deck builder pre-run.
- [ ] 104. Photo / hero gallery: pose heroes against backdrops, share.
- [ ] 105. Lore codex. Expand `MemoryShard.js` / `MemoryStories.js` with art + audio per entry.
- [ ] 106. Daily quest system: small objectives ("kill 3 elites with Ice", "complete a wave in <30 s").
- [ ] 107. Battle pass / season system. Free track + cosmetic-only paid track.
- [ ] 108. Weather + biome hybrid events ("acid storm in poison biome doubles DOT").
- [ ] 109. Dungeons / branching paths. Extend Maze of Time concept (EoE DLC) into base game.
- [ ] 110. Bestiary auto-fill on first kill: enemy stats, weaknesses, lore.
- [ ] 111. Hero relationship system (co-op): bond level → mutual buffs.
- [ ] 112. Twitch/Discord integration. Chat votes which mutator triggers next wave.
- [ ] 113. NG+ with permanent enemy mutators per loop.
- [ ] 114. Boss training mode: pick a boss, infinite retries.
- [ ] 115. Crafting trees. Materials drop from specific enemy types → relics/consumables.
- [ ] 116. Pet breeding. Combine companions for new abilities.
- [ ] 117. Music customization: player imports own .wav/mp3 for battle music.
- [ ] 118. ★ Localization (i18n). Currently English + occasional German. Add EN/DE/FR/ES.
- [ ] 119. ★ Steam SDK integration. Achievements, cloud saves, rich presence, Workshop, Remote Play Together (already build for Steam Deck).
- [ ] 120. Mobile port path. Touch controls UI, virtual joystick. Canvas already responsive — main blockers are gamepad-first menus.
- [ ] 121. Couch co-op screen split (currently shared camera).
- [ ] 122. "Daily duel" PvP: same seed, race to wave 20, lowest time wins.

## Audio

- [ ] 123. ★ Adaptive music. Layered stems mixed live by tension level (enemies on screen, HP%, boss phase).
- [ ] 124. Voice line bank rotation per hero. Diversify per situation: low HP, high combo, elite encounter, partner-revive.
- [ ] 125. Spatial audio. `Web Audio API` `PannerNode` for off-screen enemies.
- [ ] 126. Ducking + side-chain compression so SFX cut through music.
- [x] 127. Audio settings per-channel: music / SFX / voice / UI sliders. *(Pass A: 4 sliders cycle 0/25/50/75/100%, `AudioManager` applies category multipliers per-track + on per-shot voice plays.)*
- [x] 128. Subtitles + closed-caption events. *(Pass A: audit confirmed all `playHeroExclamation` sites route through `_showSubtitle` already; extended to also push to ARIA live region for screen-reader users.)*
- [ ] 129. Boss leitmotifs. Each boss has signature instrument that recurs.
- [ ] 130. Death-screen replay audio. Last 5 s of input audio loops on respawn.

## Accessibility

- [x] 131. Remappable keys. `InputManager.js` — confirm full remap supported, expose UI in Options.
- [x] 132. Hold-to-fire toggle for hand-strain reduction.
- [x] 133. Aim assist slider (not just on/off).
- [x] 134. ★ Reduced-motion mode. Disable shake, flash, weather overlays.
- [x] 135. High-contrast UI mode.
- [x] 136. Font size scaling for damage numbers, HUD text.
- [x] 137. Screen reader hints for menus (ARIA on canvas-overlay UI elements).
- [x] 138. One-handed control schemes.
- [x] 139. Pause-on-tab-switch / pause-on-disconnect-controller.

## Save / cloud / data

- [x] 140. ★ Save file backups. *(Pass A: 5-slot ring buffer auto-rotated before every save write; "Restore Backup" menu lists each slot with timestamp + size and restores via HMAC-verified swap.)*
- [ ] 141. Save export to JSON-Schema for support diffs.
- [ ] 142. Per-hero independent run-saves. Multiple paused runs simultaneously.
- [ ] 143. Account merging UI. Combine local + cloud progress without conflicts.
- [ ] 144. Secure cloud save encryption. `server.js` writes `data/saves/` plaintext. Encrypt at rest with per-account key.

## Tooling / DevX

- [x] 145. ★ Hot reload. esbuild + watch mode + Electron `BrowserWindow.reload()`. Saves hours per session. *(Vite dev server gives full-page reload on JS/HTML save + CSS HMR for `main.css` for free. Electron `index.js` handles `VITE_DEV=1` to attach to dev server, or `HOT_RELOAD=1` to watch built `dist/`.)*
- [ ] 146. Headless test harness. Extend `test-arena.js` + bots into nightly CI: 100 simulated runs, assert no crashes, log perf.
- [ ] 147. Replay-driven regression tests. Record input traces, replay against new code, diff outputs.
- [x] 148. In-game debug overlay (F1): all entities, hitboxes, paths, AI state, collision quadrants. *(Pass A: F1 toggles overlay showing FPS / p50+p99 frame time / wave / player pos / entity counts / spatial-hash cell count / hit-stop frames. Hitbox/AI-state overlay deferred.)*
- [ ] 149. Cheat console (`~`): `give gold 1000`, `set wave 50`, `spawn boss MAKUTA`.
- [ ] 150. Visual save editor live-reload. `save-editor.html` exists — wire to running game via WS so changes apply without restart.
- [ ] 151. Asset pipeline. Source assets (Aseprite, Audacity sources) under `/assets-src` + Makefile / npm script that builds final wav/png.
- [ ] 152. Audio normalization pass. SFX volumes inconsistent — run through ffmpeg loudnorm.
- [x] 153. Dependency audit. `package-lock.json` 280k lines; `install` package in devDeps looks accidental. *(Dropped accidental `install` devDep during Path 1 npm install pass. Larger audit still pending.)*
- [ ] 154. Docs / contributor guide. README minimal. Add CONTRIBUTING.md + ARCHITECTURE.md.

## Networking polish

- [x] 155. Snapshot interp using cubic Hermite instead of linear → smoother during dash transitions.
- [x] 156. Variable tick rate based on entity count: 30 Hz default, drop to 20 if CPU pressure.
- [x] 157. MTU-aware fragmentation for large snapshots when boss + 200 enemies on screen.
- [x] 158. Zstd snapshot compression (browsers now support `CompressionStream`). *(Implemented via WebSocket `permessage-deflate` rather than Zstd — same effect, zero handshake, broader client support.)*

## Long-tail polish

- [ ] 159. Pause menu rework: run stats, current upgrades, current cards.
- [x] 160. ★ End-of-run breakdown screen (Slay the Spire style): damage by source, cards picked, key moments timeline.
- [ ] 161. Hero balance dashboard in admin: per-hero win rate, average wave, pick rate.
- [ ] 162. Player skill rating (online matchmaking).
- [ ] 163. Tutorial replay accessible from main menu.
- [ ] 164. Onboarding flow first launch: name pick, hero recommendation quiz.
- [x] 165. ★ In-game changelog. *(Pass A: Vite bundles CHANGELOG.md into dist/; on launch, if `gameConfig.lastSeenVersion !== APP_VERSION`, modal fetches + parses + renders newer `## [...]` sections. Closing stamps the version.)*
- [ ] 166. Crash recovery. On unexpected exit, offer to restore last autosave run.
- [ ] 167. Background music continues during pause with low-pass filter.
- [ ] 168. Better death feedback. "You were killed by SHOOTER (200 damage)" with replay of last 3 seconds.
- [ ] 169. Configurable HUD layout (HP bar, combo, minimap moveable).
- [ ] 170. Minimap. Especially helpful for larger arenas / co-op.

---

## Quick-win shortlist (pick first)

1. #19 spatial hash for collisions — biggest perf win
2. #29 lazy-load DLC bundles — fastest startup win
3. #145 hot reload — biggest DevX win
4. #87/#88/#90 anti-cheat + rate limit + WSS — biggest security gap
5. #50 colorblind modes + #134 reduced-motion — biggest accessibility wins
6. #61 daily seed mode — biggest community-engagement win
7. #2 bundler — unlocks #1, #3, #29
8. #10 save schema versioning — prevents future regression class
9. #97 crash reporting — reveals what real players hit
10. #160 end-of-run breakdown screen — biggest perceived-quality bump

---

## Review

### 2026-05-10 — Quick-wins + Networking polish pass

**Shipped (14 items):**

Quick-wins from shortlist:
- #10 Save schema versioning + migrations (`SaveManager.SCHEMA_VERSION` + `MIGRATIONS[]`, pre-migration backup, version stamped on every write)
- #19 Spatial hash (infra in `Managers/SpatialHash.js`; 3 hot AOE-radius scans migrated)
- #29 Parallel DLC load (`Promise.all` over enabled DLCs)
- #50 Colorblind modes (SVG daltonization filter, 3 modes, Options toggle)
- #61 Daily seed mode (mulberry32 PRNG, per-seed leaderboard column, opt-in seeded RNG global)
- #87 Leaderboard anti-cheat (server-signed session tokens, score clamping, plausibility caps, `verified` column)
- #88 Rate limiting (per-IP token buckets on register/login/leaderboard/crash)
- #90 WSS/HTTPS (env-driven `TLS_CERT_PATH` + `TLS_KEY_PATH`)
- #97 Crash reporting (`Managers/CrashReporter.js` + `POST /api/crash` + admin viewer)
- #134 Reduced-motion mode (camera shake, weather, low-HP pulse gated)
- #160 End-of-run breakdown screen (damage by source, upgrades picked timeline, key moments)

Networking polish (all 4):
- #155 Cubic Hermite snapshot interpolation (Catmull-Rom tangents from neighbors)
- #156 Variable tick rate (30→20 Hz under load, hysteresis, dynamic `TICK_FRAMES`)
- #157 MTU-aware snapshot chunking (auto-split + client reassembly by seq)
- #158 Snapshot compression (WebSocket `permessage-deflate` instead of Zstd — same effect)

**Deferred (out of scope for this pass — each warrants its own plan):**
- #2 Bundler (esbuild/Vite). Touches every `<script src>` in `game.html`, build process, Electron packaging. Unlocks #1, #3, true #29.
- #145 Hot reload. Depends on #2.
- Full nested projectile-vs-enemy spatial hash inversion. #19 Phase 2 — risk-bounded next iteration.
- Daily-seed Arena/drop generation wiring — infrastructure is in place (`getSeededRng()`); each spawn site needs an audit + opt-in.

**Notes for the next pass:**
- The SpatialHash is built unconditionally each frame even when entity count is small; tune cell size and add a small-N bypass if the overhead shows on a profile.
- `_sessionScores` map sweep is hourly; for sustained traffic, switch to LRU instead of TTL.
- Crash reporting uses an in-house endpoint, not Sentry. Swap `CrashReporter._baseUrl` to point at a Sentry-compatible DSN if/when a paid account is provisioned.
- TLS support is server-only; the desktop Electron app's local server still runs plain HTTP. That's fine since traffic doesn't cross the network there.
