# Improvement Backlog — 2026-05-10

Comprehensive idea list from full-codebase scan. 170 items grouped by category. Check off as completed. Highest-leverage picks tagged `★`.

---

## Code structure / architecture

- [x] 1. ★ Split `game.js` (7257 lines) into modules: `GameLoop.js`, `Spawner.js`, `Wave.js`, `Camera.js`, `EventBus.js`, `RunState.js`. Use ES modules + `<script type=module>` or move to a bundler. *(Phase A-E shipped 2026-05-12: Camera/Spawner/Wave/RunState/GameLoop all extracted as ES modules and imported from `game.js`. `EventBus.js` already existed. ~210 lines moved out (game.js 8379→8169). Window shims preserved for DLC back-compat. RunState is a thin factory for now — broader 540-global migration (#11) is the natural follow-up. Build green, 80/80 parity + 38 Vitest pass.)*
- [x] 2. ★ Adopt bundler + tree-shaking (esbuild or Vite). Replace ~60 `<script src>` tags in `game.html`. Gives minification, source maps, dev HMR. *(Phase 1: Vite 8 wired, dev server + production build working. 4 leaf files in ESM bundle; remaining files still classic + `defer` for compatibility. ESM migration of Managers/Entities/UI/game.js/DLCs is the multi-session follow-up.)*
- [x] 3. ★ TypeScript or JSDoc `@type`. Save data schema, hero stats, world object — all undocumented. Prevents recent-style `saveData[player.type].prestige` regressions. *(JSDoc path — new `types/schemas.js` centralises `SaveData` / `HeroStats` / `BaseHeroStats` / `GameConfig` / `WorldState` / `ArenaState` / `GameplayConstants` typedefs. `jsconfig.json` wires VSCode IntelliSense across Managers/Entities/UI + key root files (`allowJs:true`, `checkJs:false` — opt-in `// @ts-check` per file). `@type` references wired at the schema-defining sites: `Constants.js` (`BASE_HERO_STATS`, `GAMEPLAY`), `Config.js` (`defaultConfig`), `game.js` (`defaultSaveData`), `Player.js` (`getHeroStats`), `Arena.js` (camera/obstacles/biomeZones), `Managers/SaveManager.js` (full `@param`/`@returns` on the public + migration API). DLCs + server stubs intentionally out of scope.)*
- [x] 4. Kill `window.*` globals (~15 cross-cutting). *(5-session arc complete: GameContext singleton (S1) + UI saveData reader sweep 29 sites (S2) + registries API + base UI registry readers 8 sites (S3) + flip canvas/ctx/defaultSaveData (S4) + flip gameConfig/saveData (S5). Entity arrays (`enemies`/`projectiles`/`wave`/`arena`/`_world`) stayed delegated — coupled to #11 RunState carve. 53 DLC registry bare-reads also deferred — DLCs run server-side via require() and need stub-layer validation before any sweep.)*
- [ ] 5. ECS / component-based entities. `Player.js` constructor has 130+ fields mixing stats / runtime / DLC hooks / chaos / achievement bonuses. Split into Stats / Movement / Combat / Buffs / DLCState components.
- [ ] 6. Unify `Player`/`Enemy`/`Boss` under shared `Actor` base. Remove duplicated HP/position/collision/floating-text logic.
- [x] 7. Extract `BiomeRegistry` with enforced shape `{generate, update, draw, getEnemyType, music}`. *(Pass H step 1: `window.BiomeRegistry.register(id, impl)` validates required `generate()` + warns on missing recommended `update/draw/drawObstacle`. Base biomes migrated. Legacy `window.BIOME_LOGIC[id]=…` still supported for DLCs.)*
- [ ] 8. DLC manifest format (JSON) + auto-loader. Each DLC `index.js` repeats register-hero / register-biome / register-audio boilerplate.
- [x] 9. Reduce `index.js`/`Config.js` Electron-detection duplication. *(Pass H step 1: `Platform.js` exports `{ isElectron, fs, path, saveFilePath, configFilePath }`. Config.js + game.js refactored. SaveManager/CrashReporter/DLCManager still read bare globals but unblocked for follow-up.)*
- [x] 10. ★ Save schema versioning + migrations. No version field on `saveData`; every new DLC patches `defaultSaveData`. One bad save = silent broken state.
- [ ] 11. Replace 539 module-scope globals in `game.js` with explicit `RunState` object. Server simulation has to monkey-patch globals to reuse code.
- [x] 12. ★ Test suite (Jest/Vitest). Single `parityTest.js` exists. Cover damage calc, level-up, save migration, network input encoding, projectile physics, boss phase transitions. *(Vitest harness + 38 tests across 6 files: SaveManager migration, mulberry32, SpatialHash, Hermite interp, plausibility caps, rate limiter. Existing parityTest now passes 80/80 after typo + AirHero stub fix.)*
- [x] 13. ESLint custom rule banning `forEach + arr.splice(index)` index-skip pattern (regression class hit 11 hot loops in `game.js`). *(`eslint-plugin-5freunde/no-foreach-splice` — found 8 more instances on first run.)*
- [x] 14. ESLint + Prettier config. CI lint job. *(Flat config, warnings-only, 0 errors + 369 baseline warnings catalogued. CI runs lint + build + tests on every push/PR.)*
- [x] 15. Asset manifest + lazy load. *(Pass H step 1: tiered `Audio.preload` — `'auto'` for music + 12 hot-path SFX, `'metadata'` for boss/pickup/weather, `'none'` for voice/memory. Cold-boot audio bandwidth drops ~70 %.)*
- [x] 16. Constants for magic numbers: `meleeRadius = 80`, `_INTERP_DELAY_MS = 100`, `dashMaxCooldown = 180`, `viewHalfW = 1000`. *(Pass C step 1: `GAMEPLAY` block in Constants.js holds 13 named values + window shim. game.js / Player.js / SaveManager.js wired.)*
- [x] 17. Remove `JSON.parse(JSON.stringify(...))` deep clones. *(Pass H step 1: 7 sites swapped to `structuredClone` across Config.js (4), SaveManager.js (1), game.js (2). Player.js explicit fallback retained.)*
- [x] 18. Centralize damage pipeline. *(Pass C step 1: `applyDamage(target, dmg, opts)` helper covers invincibility / damageReduction / customOnDamage / recordPlayerDamage / SFX / floating text / combo reset / run-stat in one call. Wired at 5 cookie-cutter sites — acid-fog (×2), lava, explosive-mutator, exploder-elite. Hero-specific paths deferred.)*

## Performance

- [x] 19. ★ Spatial hash / quadtree for collisions. `enemies × projectiles × meleeAttacks × players` is O(n²) every frame; ~10k checks/frame at wave 30+. *(Phase 1 — SpatialHash infra + 3 AOE-radius scans. Phase 2 (P2) — full projectile-vs-enemy inversion: enemy-projectile → player(s) lifted out of inner loop; new `_projectileSpatialHash` queried per enemy; `_SPATIAL_HASH_MIN = 30` small-N bypass; `queryEnemiesNear` / `queryProjectilesNear` helpers; F1 overlay per-hash stats. Melee-vs-projectile reflect/telekinesis paths not yet using the projectile hash — open follow-up if profiling shows it.)*
- [x] 20. Object pools for `Projectile`, `Particle`, `FloatingText`, `MeleeSwipe`, `GoldDrop`. GC churn visible on long runs. *(Pass A: `Particle` + `FloatingText`. P3: `Projectile` (POOL_MAX 256) + `MeleeSwipe` (64) + `GoldDrop` (64) with strict reset — constructor fields reapplied incl. crit-radius re-derive, every known optional field cleared (shooterType/onHit/isWildfire/isCryo/_ghost/_id/_loveHeartArrow/_loveHeartBolt/outlineColor/ownerIsPlayer/dead). 85 Projectile spawns + 1 MeleeSwipe + 5 GoldDrop converted across base + 8 DLCs. Release-before-splice wired at 12 consumption sites (9 game.js + 3 DLC). 10 Vitest assertions cover reset correctness.)*
- [x] 21. Offscreen canvas for static layers. Bake arena obstacles + biome zones to `OffscreenCanvas`, blit once. *(P5: obstacles baked into `Arena._staticObstacleCanvas` at `generate()` time; per-frame `obstacles.forEach(obs => obs.draw(ctx))` (~25 ops × 8–15 obstacles) replaced with one `drawImage`. Fingerprint `${count}:${biomeType}:${w}x${h}` auto-rebakes when DLCs mutate the obstacles array (PoisonFlask spawn/consume). Server-side guarded via `typeof document === 'undefined'`. Biome zones intentionally not baked — `Date.now()`-driven alpha pulses + DLC animated decals would freeze.)*
- [x] 22. Cache gradients. Many enemies/bosses recreate `createRadialGradient` every draw. *(Pass A: helper + 3 projectile sites. P4: +15 sites — `HolyMask` / `GoldDrop` (tier-keyed) / `Player` transform-halo (hero-color-keyed) / `WindBosses` (turbine core + vortex body + eye glow, phase-keyed) / `WindEnemies` (core, burst-flag) / `ChaosEnemies` (body + eye) / `chaos/index.js` boss (body + eye, phase-keyed) / `GravityHero` (well core) / `SmokeHero` (smog aura) / `TimeHero` (shadow body) / `EarthHero` (obsidian aura). Total ~18 of ~169 sites. Long tail incremental — skipped: per-frame dynamic alpha (pulse/fade), non-origin gradients used for "lit-from-upper-left" sphere shading, biome scattered-position decorations (per-instance keys would blow LRU cap).)*
- [x] 23. `requestAnimationFrame` budget tracker. p99 frame-time HUD next to FPS. *(P1: F1 debug overlay already prints p50 + p99 from the 120-frame `_frameTimes` ring buffer added under #148. No new work — promoted to closed.)*
- [ ] 24. Web Worker for AI batches. 200+ enemy steering in worker via `SharedArrayBuffer`. *(P10 ships phase-timing in F1 overlay — `Enemies ph: p50 / p99`. Gate: pursue iff p99 ≥ 4ms at wave 30+. Otherwise the worker rewrite (SharedArrayBuffer sync, parity test risk, days of work) doesn't justify the win.)*
- [x] 25. Texture atlas for sprites. Replace per-frame `arc/fill/stroke` with `drawImage` from atlas. *(P7: per-color sprite cache for `Particle` (8×8 offscreen canvas, 3-radius disc, FIFO-bounded 64 entries). `Particle.draw` now `globalAlpha + drawImage` (2 ops) vs `save / globalAlpha / fillStyle / beginPath / arc / fill / restore` (7 ops). Enemy-glyph + pickup-icon atlas deferred — those draws are complex shape-by-shape, not trivially atlas-able.)*
- [x] 27. Cull off-camera particles + floating text completely (currently update off-camera). *(P1: per-frame `arena.camera` AABB margins; far-offscreen released to pool + spliced, on-screen draws normally, between-bands updates only. Saves both draw + update at high entity counts.)*
- [x] 28. Throttle non-essential per-frame work to 30 Hz (boss telegraph timers, weather alpha pulses, biome zone updates). *(P1: `enemy._zoneRefreshAt` caches per-enemy biomeSpeedMod for 4 frames. 200×10 = 2k zone-AABB checks/frame → ~500/frame. LAVA DoT cadence preserved by also refreshing on `frame % 60 === 0`. Per-frame 1-op decrements (telegraphTimer / `_weatherFlash`) intentionally left untouched — gate overhead matches the work.)*
- [x] 29. ★ Lazy-load DLC bundles. All 8 DLCs load at startup even if user only plays Fire. *(Phase 1: parallel `Promise.all`. Phase 9: dynamic `import()`. Phase 3 (P6): primitives for on-demand load — `availableDLCs[id].heroes` arrays + `getHeroOwnerDLC(heroType)` reverse map + `ensureDLCLoaded(id)` memoized idempotent loader (shared `_loadPromises`, failed loads cleared for retry); `init()` routes through the same memoization. Hero card `onmouseenter` prefetches owning DLC. Full lazy mode — skip eager init, render select from manifest, loading spinner on hero click — needs Achievements / Collection / Story menus hardened first; deferred follow-up.)*
- [ ] 30. WebGL/Pixi.js backend toggle. 5–10× perf at high entity counts. *(P10 ships phase-timing in F1 overlay — `Frame work: p50 / p99`. Gate: pursue iff `frameWork` p99 ≥ 8ms after subtracting `enemies` phase at wave 30+. Otherwise the WebGL rewrite (weeks-to-months scope) doesn't justify the win after P4 gradient cache + P5 obstacle bake + P7 particle sprite cache.)*
- [x] 31. Memoize `getHeroStats` per `(type, altarHash, metaHash)`. Currently runs every level-up + spawn. *(Map cache keyed by `(type, prestige:unlocked:level, JSON(metaUpgrades), achievements)`. Returns `structuredClone` of cached `base`. Auto-invalidates on any input mutation. `window.invalidateHeroStatsCache()` exposed for manual busts.)*
- [x] 32. Smarter snapshot diff: bitpack int16 position deltas to save bandwidth on internet links. *(P9: server emits `dx, dy` deltas after first-sight; keyframe every 30 snapshots = 1s prevents drift. ~7–9 KB saved per snapshot at wave 30+ before deflate. `_lastSentEnemyXY`/`_lastSentProjXY` server-side; `_lastSnapX/_lastSnapY` client-side. Player p1/p2 stay absolute (marginal). Not literal Int16 binary (would require full binary wire); JSON dx/dy gives most of the win with permessage-deflate already in place.)*
- [x] 33. WS `permessage-deflate` compression for snapshots if not already enabled. *(Shipped under #158 — `permessage-deflate` is the canonical equivalent of the Zstd plan; same effect, broader client support.)*
- [x] 34. Audio decoding off-main-thread. `Audio.preload='metadata'` for non-essential SFX. *(Pass A #15 did the tiered preload. P8 adds Web Audio fast path for the 12 hot SFX: shared `AudioContext` (same instance as #167 lowpass) + `_sfxBuffers` Map populated at boot via `fetch().then(arrayBuffer).then(decodeAudioData)` — fire-and-forget. `play()` tries `AudioBufferSourceNode + GainNode + start(0)` (~0.01ms/shot, 50× cheaper than `cloneNode`), falls back to cloneNode when buffer not ready or no AudioContext. AudioContext suspended until first user gesture; resume lazily on first shot. Per-track `volume` (with category multiplier already applied via `updateSettings`) feeds the GainNode.)*

## Visuals

- [ ] 35. ★ Modern post-processing stack (WebGL fragment shaders): bloom on projectiles, chromatic aberration on hit, vignette on low HP, color grade per biome — single full-screen pass.
- [ ] 36. 2D normal-map lighting. Cheap radial lights on Fire hero / boss explosions affecting nearby sprites.
- [ ] 37. Hero animations. Replace procedural-circle look with walk-cycle / attack frames.
- [x] 38. Camera shake taxonomy. *(Pass B: `SHAKE_PRESETS` + `shake(type)` helper consolidates per-event flavor. Perlin offsets deferred.)*
- [x] 39. Hit-stop / freeze-frames. 50 ms freeze on critical hits and boss kill. *(Pass A: `triggerHitStop(frames)` + `_isHitStopped` masterLoop skip already existed for crits; extended to boss-death init at all 4 production sites. 12-frame freeze on boss kill.)*
- [x] 40. Damage number animations: crit numbers arc + scale + color-shift. *(Pass B: `FloatingText` auto-detects crit via `'!'` suffix or `size >= 25`; crit floats arc, scale-pulse, flash white every 4 frames.)*
- [ ] 41. Death animations per enemy type: BOMBER fizzle, GHOST dissolve, SHIELDER shatter.
- [ ] 42. Animated arena edges / parallax background.
- [ ] 43. Biome-specific ambient particle systems: foliage, flowing water, drifting snow.
- [ ] 44. Day/night cycle inside long runs. Subtle color grade shift every 5 waves.
- [ ] 45. Trail renderer. Dash trails, projectile trails (esp. Lightning hero).
- [x] 46. Boss intro cinematics: camera pan + zoom + name banner + music swell. *(`e386a79`: camera pans to boss spawn position, slow-zoom + nameplate banner + music swell wired into all boss inits. Per-boss skip-after-first-encounter deferred — see [#190](#190-boss-intro-skip).)*
- [ ] 47. UI polish. Inconsistent style mix (CSS in `main.css` + canvas-drawn). CSS variables for color tokens.
- [ ] 48. Replace emoji icons in `Constants.js` (`POWERUP_TYPES`, `CHAOS_REWARDS`) with SVG/PNG. Emojis render differently on Windows/Linux/Steam Deck.
- [ ] 49. Animated title screen. Loop `developer_animated.mp4`/`title_animated.mp4` instead of static.
- [x] 50. ★ Colorblind modes (deuteranopia/protanopia palettes). Many mechanics rely on color.
- [x] 51. ★ Photo mode: pause + free camera + hide UI for screenshots. *(Pass C step 2: F2 toggle hides 14 HUD overlays + suppresses auto-camera + Arrow/WASD pan with Shift/Ctrl speed modifiers. World keeps running ("live photo" — true freeze-pause deferred until game.js update/draw separation lands.)*

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
- [x] 83. Re-connect on drop. 30 s grace window so wifi blip doesn't end run. *(Server sends `PARTNER_RECONNECTING { timeoutSec: 30 }` instead of immediate disconnect; grace timer cancelled on reconnect; client overlay counts down. Hard cleanup still at 90 s.)*
- [x] 84. WebRTC voice chat in lobby + in-game. *(`Managers/VoiceChatManager.js`: mic capture, `RTCPeerConnection`, remote audio, mute toggle. Signaling relayed via existing WS lobby (`WEBRTC_OFFER/ANSWER/ICE`). `NetworkManager._dispatch` wired to voice handlers. `VOICE_MUTE` relayed to partner.)*
- [x] 85. Friends list + invites. Extend SQLite users table with friendships. *(`friendships` table with `requester_id`, `addressee_id`, `status`. REST: `GET /api/friends`, `POST /api/friends/request`, `POST /api/friends/respond`, `DELETE /api/friends/:userId`. Mutual-request auto-accepts. `NetworkManager` helper methods exposed.)*
- [x] 86. Cross-progression cloud save conflict UI (last-write-wins is dangerous). *(Conflict modal now decodes both blobs client-side; shows side-by-side comparison: wave reached, heroes unlocked, total kills, meta upgrade points. `_extractSaveMeta` + `_metaLine` helpers added to `CloudSaveManager`.)*
- [x] 87. ★ Anti-cheat for leaderboard. `POST /api/leaderboard` accepts any wave/score from authenticated client. Add server-side validation: minimum time per wave, hero-specific damage caps, replay token signed by `GameSession`.
- [x] 88. ★ Rate limiting on register/login/leaderboard. `bcrypt.hash(password, 10)` is CPU-expensive — easy DoS vector.
- [x] 89. CSRF / origin check on WS upgrade. *(Pass A: `ALLOWED_WS_ORIGINS` env-driven allowlist; `verifyClient` rejects mismatched browser Origin, native clients with no Origin pass through. Same allowlist also gates Express CORS.)*
- [x] 90. ★ HTTPS / WSS by default. `Config.js` defaults to `http://localhost:3001`. Production should be `wss://`. *(Env-driven: TLS_CERT_PATH + TLS_KEY_PATH enables HTTPS/WSS automatically; plain HTTP fallback for local dev.)*
- [x] 91. Lag compensation / rollback. Current is delay-based interp (100 ms). Small rollback for hit confirmation reduces "I hit them but no damage" feel. *(Player-projectile vs enemy collision radius in `GameSession._updateProjectiles` expanded by `ROLLBACK_PX = 18` in co-op mode, covering ~2 server ticks of enemy movement at typical speeds.)*
- [ ] 92. Server-side stat tracking + meta unlocks. Move some meta progression server-side (counter to `save-editor.html` — flag online-mode runs).
- [ ] 93. Tournament / brackets system. Schedule events on server, automatic bracket generation.
- [ ] 94. Guild / clan system.
- [ ] 95. Server message of the day / patch notes pushed to client on connect.
- [x] 96. Server-side world events: "this weekend 2× XP", configurable from admin dashboard. *(`world_events` table; public `GET /api/events`; admin CRUD `GET/POST /api/admin/events` + `DELETE /api/admin/events/:id`; admin dashboard **Events** tab with create form + live/inactive list. `Managers/WorldEventsManager.js` polls every 5 min; `getXpMultiplier()` applied to kill XP in `game.js`.)*
- [x] 97. ★ Crash reporting (Sentry / GlitchTip). Use breadcrumbs from `console.log`/`window.onerror` already captured in `game.js:16-24`. *(Lightweight in-house pipeline: client `Managers/CrashReporter.js` → `POST /api/crash` → `data/crashes.jsonl`. Swap target URL later to plug into Sentry.)*
- [x] 98. Telemetry / analytics opt-in: wave-clear-rate per hero, drop-off curve, average run length. Guides balance. *(Lightweight in-house pipeline mirrors `CrashReporter`. `Managers/TelemetryManager.js` buffers + batches whitelisted events (`run_start` / `wave_completed` / `level_up` / `run_end`) over `POST /api/telemetry`, flushes every 30 s / at 20 events / on `pagehide` via `sendBeacon`. Three `gameConfig` keys gate it: `telemetryEnabled` (default OFF), `telemetryConsentSeen` (drives first-launch modal), `telemetryInstanceId` (random UUID, no account linkage). First-launch consent modal with Enable / Decline / Ask-later. Options row "Anonymous Analytics" auto-marks consent seen. Server adds `telemetry_events` SQLite table + `POST /api/telemetry` (60/10min IP rate-limit, 32 KB cap, rolling prune at 500k rows) + `GET /api/admin/telemetry/summary` + `…/raw`. Admin dashboard **Analytics** tab: per-hero run stats table, drop-off curve canvas (coloured polylines, 0–wave-50, 25% gridlines + legend), top upgrades + top death causes. 13 Vitest assertions cover opt-in gate, PII whitelist, batching, sendBeacon path, client rate limit.)*
- [ ] 99. Match history. Per-session summary; player can browse own run history.
- [ ] 100. Online co-op revive ping (Apex-style audio + visual ping).

## Extensions / new content

- [ ] 101. ★ Mod / scripting API. Expose `BIOME_LOGIC`/`HERO_LOGIC`/`ENEMY_LOGIC` registries officially with sandboxed user-loaded JS via dynamic `import()`. Steam Workshop equivalent.
- [x] 102. Map editor. Drag-drop biome zones, obstacles, spawn rules → exports JSON consumed by `Arena.generate`. *(`map-editor.html`: canvas editor with obstacle/zone/trap tools, grid snap, undo/redo, rubber-band drawing, property panel, teleporter auto-pair, export/copy JSON. `Arena.generateFromMap(mapData)` reconstructs obstacles + biomeZones + traps from the exported JSON.)*
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
- [x] 126. Ducking + side-chain compression so SFX cut through music. *(Pass D: `_musicGain` GainNode inserted between `_musicFilter` (lowpass) and `destination` on the existing Web Audio music bus. Pulse-duck (`_duckMusicPulse`, 50 ms attack / ~140 ms hold / 240 ms release, depth 0.5) fires on a curated trigger set — `wave_completed`, `achievement_unlocked`, `challenge_*`, `boss_makuta_*`, `boss_tank_phase2`, `boss_summoner_*`, `boss_rhino_charge`, `boss_stomp`, `death`, `twin_event`, `weather_thunder_crack`, `pickup_card`/`_mask`, any `level_up*` — wired via `_shouldDuckOnSfx` on the SFX branch of `play()`. Hold-duck (`_duckMusicHold`/`_releaseMusicDuck`, ref-counted, depth 0.7–0.8) replaces the old `HTMLAudio.volume` ducking inside `playVoice` + `playHeroExclamation`; legacy per-track volume dip retained as fallback when no `AudioContext`. `_routeActiveMusic()` extracted from `setPauseFilter` so every duck force-routes currently-playing music tracks through the graph first. Idempotent `_restored` flag in voice paths prevents double-decrement of the hold counter across `onended` / `onerror` / 6-second safety timeout. Self-restoring envelope guarantees the bus returns to unity even if voice load fails.)*
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
- [x] 146. ★ Headless test harness. Extend `test-arena.js` + bots into nightly CI: 100 simulated runs, assert no crashes, log perf. *(`scripts/nightly-headless.js` drives N `GameSession` runs with random bot inputs (per `test-arena.js` / `OnlineTestBot.js` input shape), auto-resolves level-ups, monkey-patches `Date.now` to a virtual clock so spawn pacing advances. Tracks tick p50/p95/p99 wall time, max enemies / projectiles / wave, throughput; writes `nightly-report.json`. `npm run test:headless`; `.github/workflows/nightly.yml` runs 100 × 1800 ticks at 04:17 UTC + workflow_dispatch with overridable RUNS/TICKS/SEED, uploads the report as a 30-day artifact. Local 100-run smoke: 1.5 s wall, ~100k ticks/sec, p99 ≈ 0.12 ms, 0 crashes.)*
- [ ] 147. Replay-driven regression tests. Record input traces, replay against new code, diff outputs.
- [x] 148. In-game debug overlay (F1): all entities, hitboxes, paths, AI state, collision quadrants. *(Pass A: F1 toggles overlay showing FPS / p50+p99 frame time / wave / player pos / entity counts / spatial-hash cell count / hit-stop frames. Hitbox/AI-state overlay deferred.)*
- [x] 149. Cheat console (`~`): `give gold 1000`, `set wave 50`, `spawn boss MAKUTA`. *(Pass B: tilde-toggled overlay with give/set/spawn/kill/killall/god/heal/clear/help verbs.)*
- [ ] 150. Visual save editor live-reload. `save-editor.html` exists — wire to running game via WS so changes apply without restart.
- [ ] 151. Asset pipeline. Source assets (Aseprite, Audacity sources) under `/assets-src` + Makefile / npm script that builds final wav/png.
- [ ] 152. Audio normalization pass. SFX volumes inconsistent — run through ffmpeg loudnorm.
- [x] 153. Dependency audit. `package-lock.json` 280k lines; `install` package in devDeps looks accidental. *(Dropped accidental `install` devDep during Path 1 npm install pass. Larger audit still pending.)*
- [x] 154. Docs / contributor guide. *(Pass C step 2: `CONTRIBUTING.md` covers setup / commands / PR checklist / commit convention / code conventions; `ARCHITECTURE.md` covers client/server split, build pipeline, module map, save shape, networking, CI.)*

## Networking polish

- [x] 155. Snapshot interp using cubic Hermite instead of linear → smoother during dash transitions.
- [x] 156. Variable tick rate based on entity count: 30 Hz default, drop to 20 if CPU pressure.
- [x] 157. MTU-aware fragmentation for large snapshots when boss + 200 enemies on screen.
- [x] 158. Zstd snapshot compression (browsers now support `CompressionStream`). *(Implemented via WebSocket `permessage-deflate` rather than Zstd — same effect, zero handshake, broader client support.)*

## Long-tail polish

- [x] 159. Pause menu rework: run stats, current upgrades, current cards. *(Pass B: 8-cell stat grid + last 24 upgrades + owned cards rendered on pause via `renderPauseMenu()`.)*
- [x] 160. ★ End-of-run breakdown screen (Slay the Spire style): damage by source, cards picked, key moments timeline.
- [x] 161. Hero balance dashboard in admin: per-hero win rate, average wave, pick rate. *(`GET /api/admin/hero-balance` queries `scores` table for per-hero run count, pick rate, win rate, avg wave, avg score. Admin dashboard **Balance** tab renders colour-coded win-rate table with pick-rate bars.)*
- [ ] 162. Player skill rating (online matchmaking).
- [ ] 163. Tutorial replay accessible from main menu.
- [ ] 164. Onboarding flow first launch: name pick, hero recommendation quiz.
- [x] 165. ★ In-game changelog. *(Pass A: Vite bundles CHANGELOG.md into dist/; on launch, if `gameConfig.lastSeenVersion !== APP_VERSION`, modal fetches + parses + renders newer `## [...]` sections. Closing stamps the version.)*
- [x] 166. Crash recovery. *(Pass B: `5FreundeRunActive` localStorage sentinel — set on every saveRunState, cleared on clean exit; boot offers to restore last run via `continueRun()` if sentinel + savedRun both present.)*
- [x] 167. Background music continues during pause with low-pass filter. *(Pass B: lazy Web Audio graph with `BiquadFilter(lowpass)`; ramps 22050 → 500 Hz on pause, back on resume.)*
- [x] 168. Better death feedback. *(Pass B: `recordPlayerDamage` stamps `player._lastDamageSource` at every damage site; game-over screen renders "Defeated by {label} — {dmg} dmg". 3-second replay deferred.)*
- [x] 169. Configurable HUD layout (HP bar, combo, minimap moveable). *(`Managers/HUDLayout.js`: `gameConfig.hudLayout = { <id>: {left, top} }` overrides applied as inline styles to `#combo-display`, `#minimap`, `#bottom-ui`, `#p2-hud`. Options → "Customize HUD" → EDIT enters drag mode. Mouse: drag with Shift-snap. Keyboard: Tab cycles, Space grabs, arrows nudge (Shift = 4×). Controller: D-pad/LB-RB cycle, A grabs, D-pad/stick nudges in move mode, B cancels, Start saves, Y resets. Toolbar + backdrop hoisted outside `#ui-layer` and `body.hud-edit-mode #ui-layer { z-index: 9000 }` so edit overlay paints above `#menu-overlay`. Combo extracted from `#hud-top-left` flex row so it no longer overlaps the minimap.)*
- [x] 170. Minimap. *(Pass C step 2: 180×135 DOM canvas top-right; arena bounds + camera viewport + obstacles + enemies/boss + objective + P1/P2 dots. Throttled to 15 Hz. Options toggle row added.)*

---

## Active follow-ups (added 2026-05-16)

Residual work surfaced by shipped items, plus new net items. Numbering continues from 170.

### Code structure / architecture
- [ ] 171. ESM migration completion (Managers/Entities/UI/game.js + DLCs). Vite is wired (#2 phase 1) but only 4 leaf files are true ESM; the remaining ~55 are still classic `<script defer>`. Finishing this removes the `window.*` shims kept for back-compat and unlocks real tree-shake.
- [ ] 172. Lazy DLC select screen. #29 phase 3 shipped on-demand `import()` primitives + hover-prefetch; full lazy mode (skip eager init, render select from manifest, spinner on first hero click) blocked on hardening Achievements / Collection / Story menus to read `availableDLCs` manifest instead of loaded data.
- [ ] 173. Game.js `update(dt)` / `draw(ctx)` separation. Currently `masterLoop` runs a mixed function. Splitting unblocks [#51 photo-mode freeze-pause](#176), [#5 ECS](#5-ecs), and removes the DOM-dependency from the server-side simulation bundle.
- [ ] 174. DLC global-usage stub layer. 53 DLC bare-reads of registry globals stayed in place during #4's flip because DLCs also run server-side via `require()`. Need a stub layer that validates DLC contracts before the sweep can finish.
- [ ] 175. DLC compatibility version stamps. Each DLC declares a `dlcVersion`; save data records the version under which each hero/biome was unlocked. Lets [#10 save migrations](#10) live per-DLC instead of in one monolithic table.

### Performance
- [ ] 176. Enemy + pickup texture atlas. #25 shipped per-color `Particle` sprite cache; the long tail is per-enemy-type and per-pickup-type. Replaces remaining `arc/fill/stroke` hot paths.
- [ ] 177. applyDamage pipeline coverage. #18 wired the helper at 5 cookie-cutter sites (acid-fog ×2, lava, explosive-mutator, exploder-elite). Hero-specific paths (FireHero burn ticks, LightningHero chain, telekinesis-bounced shots, boss-specific reductions) still inline the same boilerplate.
- [ ] 178. Gradient cache long-tail. #22 cached ~18 of ~169 sites. Per-frame dynamic-alpha pulses and non-origin sphere-shading were skipped intentionally — revisit if frame-time gates trip ([#24](#24), [#30](#30)).
- [ ] 179. Melee-vs-projectile reflect / telekinesis spatial hash. #19 phase 2 left these paths unchanged; gated on profiling showing the cost.

### Visuals
- [ ] 180. Photo mode true freeze-pause. #51 ships a "live photo" (world keeps running). Once [#173 update/draw split](#173) lands, freeze world state for proper screenshots.

### Server / multiplayer
- [x] 181. JWT_SECRET fail-secure on production boot. Admin hardening (715f03e) added a warning when the placeholder is in use; promote to `process.exit(1)` like `ADMIN_PASSWORD_HASH`. *(Shipped 2026-05-16: `server/server.js` lines 42-53 — in prod with the placeholder `JWT_SECRET`, prints `[security] FATAL: JWT_SECRET must be set in production` + `openssl rand -hex 32` hint and `process.exit(1)`. Dev/test fall through with a one-line warning so local workflows still work without a JWT_SECRET in every shell. Verified manually: prod no-secret → FATAL exit; prod with secret → boots clean; dev no-secret → warning, proceeds.)*
- [ ] 182. Admin login audit log. Record `{ts, ip, success, userAgent}` per `POST /api/admin/login`. Expose under admin dashboard Technical tab next to crash reports.
- [ ] 183. `_sessionScores` LRU migration. Hourly TTL sweep is fine at current load; sustained traffic needs an LRU cap to avoid pile-up between sweeps.
- [ ] 184. CrashReporter → Sentry / GlitchTip swap. In-house pipeline ([#97](#97)) works but lacks breadcrumb UI. Swap `CrashReporter._baseUrl` to a real DSN once a paid plan is provisioned. Keep in-house endpoint as offline-mode fallback.
- [ ] 185. Map workshop moderation. Workshop ([#102](#102)) lacks ratings (1-5★), report flag, hidden-flag column, admin takedown. Required before upload volume scales.
- [ ] 186. Daily-seed arena / drop wiring audit. [#61](#61) shipped `getSeededRng()` infrastructure + per-seed leaderboard. Each spawn / drop / mutator-roll site needs an audit + opt-in for true reproducible determinism.

### Audio
- (no new items — #123/#124/#125/#129/#130 still cover the open ground)

### Tooling / DevX
- [ ] 187. Hitbox + AI-state debug overlay. [#148](#148) phase 1 shipped perf overlay (FPS / frame time / entity counts / hash cell count). Phase 2: draw hitboxes, projectile paths, AI state labels, spatial-hash cells.
- [ ] 188. Lint warning baseline cleanup. [#14](#14) catalogued 369 baseline warnings, currently allowed so the build stays green. Auto-fixables first; manual-judgement leftovers get inline `eslint-disable` with a reason. Goal: new warnings stand out instead of getting lost.
- [x] 189. Fix outstanding `no-foreach-splice` violations. [#13](#13) found 8 instances on first run; convert each to reverse-index `for` loop or filter-rebuild. *(Closed 2026-05-16: all 8 instances have been fixed since the rule was wired up — `npx eslint .` reports 0 occurrences of the pattern. Verified by running the rule against a synthesized positive case to confirm it still fires (lint output: `5freunde/no-foreach-splice` warning on the bad pattern). Item is effectively done.)*
- [x] 190. `better-sqlite3` native-build dev pain. `npm install` in `server/` fails on the developer machine; the admin-auth tests had to use `--ignore-scripts`. Investigate prebuilt-binary fallback, or evaluate `node:sqlite` (Node 22+) to drop the native-build dep entirely. *(Shipped 2026-05-16: bumped `server/package.json` `better-sqlite3` from `^9.4.3` to `^12.10.0`. v9 only shipped prebuilts up to `node-v115`; on Node 24 (NAPI v137) the dep failed to load even after install. v12.10.0 ships official prebuilts for Node 20/22/23/24/25/26 so `npm install` no longer needs to compile from source — install completed in 3 s, smoke test (`new Database(':memory:')` + `prepare/run/all`) passes, full server boot verified (scores table migrations ran). API is backward-compatible for our usage. `node:sqlite` swap deferred — not needed.)*

### Long-tail polish
- [ ] 191. 3-second death replay. [#168](#168) shipped damage-source attribution on the game-over screen; the buffered-frames replay loop was deferred.
- [ ] 192. Boss intro skip. [#46](#46) shipped the cinematic; some replayers want a hold-ESC / hold-B skip after first encounter per save.
- [ ] 193. HUD layout presets. [#169](#169) ships per-config layouts. Add "Save preset" / "Load preset" + shareable string export so the community can swap layouts.

---

## Quick-win shortlist (refreshed 2026-05-16)

Top open items after the 2026-05-10 + 2026-05-15/16 passes shipped 60+ items.

1. [#171](#171) ESM migration completion — unlocks tree-shake + removes the `window.*` back-compat shim layer
2. [#173](#173) game.js update/draw split — blocker for [#5](#5-ecs), [#180](#180), and server simulation cleanup
3. [#11](#11) RunState extraction — unblocks server-reuse + ECS path; large but high-leverage
4. [#188](#188) lint baseline cleanup — make new warnings visible
5. [#185](#185) map workshop moderation — required before upload volume scales
6. [#181](#181) JWT_SECRET fail-secure — closes the last admin-auth gap from the 2026-05-16 hardening pass
7. [#54](#54) co-op hero synergies — biggest co-op perceived-quality bump
8. [#41](#41) per-enemy-type death animations — biggest visual polish win
9. [#35](#35) post-processing stack (bloom / chromatic aberration / vignette) — biggest single visual upgrade
10. [#5](#5) / [#6](#6) ECS + Actor base — biggest code-health unlock; pair with [#173](#173)

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

### 2026-05-16 — Revision pass after 65-commit sprint

Sprint between 2026-05-10 and 2026-05-16 closed **44 more items** (now ~96 of 170 done) across architecture, performance, content, accessibility, and multiplayer.

**Shipped since the last review:**

Code structure / arch:
- [#1](#1) game.js → 5-module split (Phase A-E) · [#3](#3) JSDoc schema typedefs + jsconfig · [#4](#4) GameContext singleton + 5-session window-globals migration · [#7](#7) BiomeRegistry shape enforcement · [#9](#9) Platform.js Electron carve · [#13](#13) ESLint `no-foreach-splice` rule · [#14](#14) flat ESLint config + CI lint job · [#15](#15) lazy audio preload · [#16](#16) GAMEPLAY constants block · [#17](#17) `structuredClone` swap · [#18](#18) `applyDamage` pipeline helper

Performance (P1-P9 pass arc):
- [#19](#19) phase 2 invert projectile×enemy · [#20](#20) Projectile + MeleeSwipe + GoldDrop pools · [#21](#21) static-obstacle offscreen bake · [#22](#22) 15-site gradient cache · [#25](#25) Particle sprite cache · [#27](#27) off-camera particle cull · [#28](#28) per-enemy biome-zone cache · [#29](#29) phase 3 on-demand DLC load primitives · [#31](#31) `getHeroStats` memoization · [#32](#32) snapshot dx/dy deltas · [#34](#34) Web Audio fast path for hot SFX

Visuals / polish:
- [#38](#38) shake taxonomy · [#39](#39) hit-stop on boss kill · [#40](#40) crit float animations · [#46](#46) boss intro cinematic · [#159](#159) pause-menu rework · [#166](#166) crash recovery · [#167](#167) music low-pass on pause · [#168](#168) death feedback line

Content / gameplay:
- Story Speedrun mode (per-hero PB, HUD timer, splits, leaderboard tab) · directional lean animation · trap visual modernization · thematic projectile visuals for Smoke/Mirror/Psycho · Mindscape EEG redesign · custom-map biome respect across all waves · Radiance of Ruin character pack DLC (full) · Reliquary biome scenery pass · Dream / Thorn biome expansions

Multiplayer / server:
- [#83](#83) reconnect grace window · [#84](#84) WebRTC voice chat · [#85](#85) friends + invites · [#86](#86) cloud-save conflict UI · [#91](#91) lag compensation · [#96](#96) world events · [#98](#98) telemetry pipeline · [#102](#102) map editor + Arena.generateFromMap + community workshop · [#126](#126) audio ducking / sidechain · [#161](#161) hero balance admin tab · admin-dashboard bcrypt + JWT hardening (715f03e)

Tooling:
- [#145](#145) Vite dev server HMR · [#146](#146) nightly headless harness · [#148](#148) F1 debug overlay · [#149](#149) cheat console · [#153](#153) drop accidental `install` devDep · [#154](#154) CONTRIBUTING + ARCHITECTURE docs

UI / settings:
- [#127](#127) per-channel audio sliders · [#128](#128) subtitles + ARIA · [#165](#165) in-game changelog modal · [#169](#169) drag-to-customize HUD layout (P1 + P2, mouse + keyboard + controller) · [#170](#170) minimap

**Revision changes this pass:**
- Flipped [#46](#46) to done with `e386a79` annotation.
- Added 23 follow-up items (171-193) capturing residual scope of [x] items: ESM completion, lazy-DLC select screen, update/draw split, DLC stub layer, DLC version stamps, enemy/pickup atlas, hero-specific applyDamage wiring, gradient long-tail, melee-vs-projectile hash, photo-mode freeze, JWT_SECRET fail-secure, admin audit log, sessionScores LRU, Sentry swap, workshop moderation, daily-seed audit, hitbox debug overlay, lint baseline, no-foreach-splice fixes, sqlite native-build dev pain, death replay, boss-intro skip, HUD presets.
- Refreshed quick-win shortlist; most of the 2026-05-10 list shipped.

**Cross-cutting blockers worth calling out:**
- [#11](#11) (539 globals → RunState) and [#173](#173) (update/draw split) together unblock [#5](#5-ecs) ECS, [#180](#180) photo-mode freeze, [#172](#172) full lazy DLC mode, and would simplify server-side simulation. These two are the highest-leverage open items not on the quick-win list because each is multi-session by itself.
- [#171](#171) ESM completion is the dual prerequisite for retiring the `window.*` back-compat shim layer that #4 had to keep in place.
