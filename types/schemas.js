// types/schemas.js — JSDoc @typedef definitions for cross-cutting data shapes (#3).
//
// Why a single file: every shape here is reached for from many call sites
// (SaveManager, Player, game.js, UI/*, DLCs). Centralising the @typedefs lets a
// caller reference `/** @type {import('./types/schemas.js').SaveData} */` from
// anywhere without re-declaring fields, and gives VSCode IntelliSense across
// the codebase.
//
// Runtime-free: this file exports nothing. It exists purely so that the JSDoc
// types resolve via `import('…/schemas.js').Name`. Safe to leave un-imported.
//
// Authoring rules:
//   • Keep shapes loose where the runtime is loose (Object/any maps).
//   • Mark optional fields with `?` (JSDoc uses `[name]` or `name?:` syntax).
//   • When a shape is intentionally partial (e.g. WorldState), document that
//     so callers don't read it as exhaustive.
//   • Update this file when a migration changes SaveData / when getHeroStats
//     gains/loses fields / when GameConfig grows new settings.

// ─── Hero identity ──────────────────────────────────────────────────────────

/**
 * Base + DLC-shipped + Evil-mode hero types. Kept as an open string so DLCs can
 * register additional heroes via HERO_LOGIC at runtime without editing this file.
 * @typedef {('fire'|'water'|'ice'|'plant'|'metal'|'black'|'earth'|'air'|'lightning'|'gravity'|'chaos'|'smoke'|'time'|'love'|'green_goblin'|'makuta'|string)} HeroType
 */

// ─── Save data (defaultSaveData / window.saveData) ──────────────────────────

/**
 * Per-hero progression slot. Lives at `saveData[heroType]`.
 *
 * @typedef {Object} HeroSaveSlot
 * @property {number}   level           XP level reached on this hero (bank).
 * @property {0|1}      unlocked        1 = playable, 0 = locked behind progression.
 * @property {number}   highScore       Highest wave reached.
 * @property {number}   prestige        Prestige tier (0+). Multiplies base stats in getHeroStats.
 * @property {number}   [maxWinPrestige]  Highest prestige tier the hero has *cleared* Story (-1 = none).
 * @property {boolean}  [storyCompleted]  Has Story Mode been finished at least once on this hero.
 * @property {number|null} [bestSpeedrunSec] Best speedrun split in seconds, null if no run logged.
 */

/**
 * Aggregate cross-hero counters used for achievements + leaderboard.
 *
 * @typedef {Object} GlobalSaveStats
 * @property {number}   totalKills
 * @property {number}   maxWave
 * @property {number}   totalGold
 * @property {number}   totalBosses
 * @property {number}   totalDamage
 * @property {number}   maxCombo
 * @property {number}   totalGames
 * @property {number}   totalDeaths
 * @property {number}   totalVoidGoldSpent
 * @property {string[]} unlockedAchievements  Achievement ids from `ACHIEVEMENTS[].id`.
 * @property {number}   daily_wins
 * @property {number}   weekly_wins
 * @property {number}   onlineGamesPlayed
 * @property {number}   onlineMaxWave
 */

/**
 * Void Shop / Meta-upgrade tiers. Each value is the number of tiers purchased
 * for that PERM_UPGRADES key. Applied multiplicatively in getHeroStats.
 *
 * @typedef {Object} MetaUpgrades
 * @property {number} health
 * @property {number} greed
 * @property {number} power
 * @property {number} swift
 * @property {number} defense
 * @property {number} wisdom
 */

/**
 * Top-level save schema. Versioned via `version` (see SaveManager.SCHEMA_VERSION
 * + MIGRATIONS). Per-hero slots live as direct properties keyed by HeroType.
 *
 * @typedef {Object} SaveData
 * @property {number}            version          Schema version (see SaveManager.MIGRATIONS).
 * @property {GlobalSaveStats}   global
 * @property {Object<string, HeroSaveSlot>} [_perHero]  Doc-only stub — actual per-hero slots
 *                                                      live as direct keys (`fire`, `water`, …).
 * @property {HeroSaveSlot}      [fire]
 * @property {HeroSaveSlot}      [water]
 * @property {HeroSaveSlot}      [ice]
 * @property {HeroSaveSlot}      [plant]
 * @property {HeroSaveSlot}      [metal]
 * @property {HeroSaveSlot}      [black]
 * @property {HeroSaveSlot}      [earth]
 * @property {HeroSaveSlot}      [air]
 * @property {HeroSaveSlot}      [lightning]
 * @property {HeroSaveSlot}      [gravity]
 * @property {HeroSaveSlot}      [chaos]
 * @property {HeroSaveSlot}      [smoke]
 * @property {HeroSaveSlot}      [time]
 * @property {HeroSaveSlot}      [love]
 * @property {string[]}          collection       Owned collector-card ids (COLLECTOR_CARDS keys).
 * @property {MetaUpgrades}      metaUpgrades
 * @property {Object<string, number>} stats       Free-form per-stat counters consumed by tracked-stat achievements.
 * @property {{lastCompleted: string|null}} daily
 * @property {{lastCompleted: string|null}} weekly
 * @property {{unlockedChapters: string[], enabled: boolean}} story
 * @property {Object<string, *>} memories         MemoryShard / MemoryStories state keyed by chapter id.
 * @property {{active: string[]}} altar
 * @property {{shards: number, unlocked: string[], active: string[]}} chaos
 * @property {Object|null}       savedRun         Mid-run snapshot (#166). Null when no run is paused.
 * @property {{seen: boolean, completed: boolean}} [tutorial]
 */

// ─── Hero stats (return of window.getHeroStats) ─────────────────────────────

/**
 * Per-stat audit trail attached to HeroStats. Each field tracks the sum of
 * contributions from the skill tree vs achievements so the breakdown UI can
 * show "+12% damage = +8% (skills) + +4% (achievements)".
 *
 * @typedef {Object} StatBreakdownEntry
 * @property {number} tree
 * @property {number} ach
 */

/**
 * @typedef {Object} StatBreakdown
 * @property {StatBreakdownEntry} damage
 * @property {StatBreakdownEntry} health
 * @property {StatBreakdownEntry} speed
 * @property {StatBreakdownEntry} cooldown
 * @property {StatBreakdownEntry} defense
 * @property {StatBreakdownEntry} projectiles
 * @property {StatBreakdownEntry} luck
 * @property {StatBreakdownEntry} explodeChance
 */

/**
 * Raw per-hero stats from `BASE_HERO_STATS[heroType]` in Constants.js. This is
 * the input to getHeroStats — getHeroStats clones it then applies meta upgrades,
 * prestige, skill nodes, and achievement bonuses.
 *
 * @typedef {Object} BaseHeroStats
 * @property {string} color                  Hex string used everywhere from HUD to particles.
 * @property {number} hp
 * @property {number} speed
 * @property {number} rangeDmg
 * @property {number} meleeDmg
 * @property {number} rangeCd
 * @property {number} meleeCd
 * @property {number} projectileSpeed
 * @property {number} projectileSize
 * @property {number} knockback
 * @property {string} [icon]                 Optional emoji used on hero-select / HUD.
 */

/**
 * Fully-derived hero stats — output of `window.getHeroStats(heroType)`. Extends
 * BaseHeroStats with all gameplay modifiers + breakdown audit trail. Returned
 * value is a fresh clone on every call (#31).
 *
 * @typedef {BaseHeroStats & {
 *   ultModifiers:      { damage: number, speed: number },
 *   breakdown:         StatBreakdown,
 *   pierce:            number,
 *   blastRadiusMult:   number,
 *   knockbackMult:     number,
 *   defense:           number,
 *   extraProjectiles:  number,
 *   meleeRadiusMult:   number,
 *   explodeChance:     number,
 *   goldMultiplier:    number,
 *   xpMultiplier:      number,
 *   momentumCap:       number,
 *   ramDmgMult:        number,
 *   momentumDecayMult: number,
 * }} HeroStats
 */

// ─── Game config (gameConfig / localStorage:5FreundeConfig) ─────────────────

/**
 * Keyboard rebindings. Each action maps to a list of accepted lowercase
 * `event.key` strings. Multiple bindings per action allowed (#131).
 *
 * @typedef {Object} KeyBindings
 * @property {string[]} moveUp
 * @property {string[]} moveDown
 * @property {string[]} moveLeft
 * @property {string[]} moveRight
 * @property {string[]} shoot
 * @property {string[]} melee
 * @property {string[]} dash
 * @property {string[]} special
 * @property {string[]} pause
 */

/**
 * XInput button-index rebindings. Indices 0..15 cover the canonical layout
 * (see Config.js comment block above `gamepadBindings`).
 *
 * @typedef {Object} GamepadBindings
 * @property {number[]} shoot
 * @property {number[]} melee
 * @property {number[]} dash
 * @property {number[]} special
 * @property {number[]} pause
 */

/**
 * @typedef {('off'|'deuteranopia'|'protanopia'|'tritanopia')} ColorblindMode
 */

/**
 * @typedef {('off'|'leftHand'|'rightHand')} OneHandedScheme
 */

/**
 * Per-HUD-element pixel overrides (#169). Empty `{}` means CSS defaults.
 * Keys are HUDLayout.js element ids ('combo-display', 'minimap', 'bottom-ui',
 * 'p2-hud', …); values are absolute pixel offsets.
 *
 * @typedef {Object<string, { left: number, top: number }>} HUDLayoutOverrides
 */

/**
 * @typedef {Object} GameConfigAccount
 * @property {string|null} token
 * @property {string|null} username
 */

/**
 * @typedef {Object} GameConfigCloudSave
 * @property {number}      lastSyncAt
 * @property {string|null} lastSyncHash
 */

/**
 * User-facing settings persisted to disk (Electron) and localStorage (web).
 * The shape mirrors `defaultConfig` in Config.js — keep them in sync.
 *
 * @typedef {Object} GameConfig
 * @property {boolean} musicEnabled
 * @property {number}  musicVolume        0..1
 * @property {boolean} sfxEnabled
 * @property {number}  sfxVolume          0..1
 * @property {number}  voiceVolume        0..1
 * @property {number}  uiVolume           0..1
 * @property {boolean} damageNumbers
 * @property {boolean} screenShake
 * @property {boolean} controllerVibration
 * @property {boolean} particles
 * @property {boolean} autoAim
 * @property {boolean} showFPS
 * @property {boolean} showIntroScreens
 * @property {boolean} subtitlesEnabled
 * @property {boolean} reducedMotion
 * @property {ColorblindMode} colorblindMode
 * @property {boolean} highContrast
 * @property {number}  fontScale          0.8 | 1.0 | 1.25 | 1.5
 * @property {boolean} screenReaderHints
 * @property {boolean} holdToFireToggle
 * @property {number}  aimAssist          0..1
 * @property {OneHandedScheme} oneHandedScheme
 * @property {boolean} pauseOnFocusLoss
 * @property {boolean} pauseOnGamepadDisconnect
 * @property {KeyBindings}     keyBindings
 * @property {GamepadBindings} gamepadBindings
 * @property {boolean} crashReportsEnabled
 * @property {boolean} telemetryEnabled
 * @property {boolean} telemetryConsentSeen
 * @property {string|null} telemetryInstanceId
 * @property {string|null} lastSeenVersion
 * @property {boolean} minimapEnabled
 * @property {HUDLayoutOverrides} hudLayout
 * @property {string[]} dismissedDialogues
 * @property {string}  serverUrl
 * @property {GameConfigAccount}   account
 * @property {boolean} cloudSaveEnabled
 * @property {GameConfigCloudSave} cloudSave
 */

// ─── Arena / camera / world ─────────────────────────────────────────────────

/**
 * Camera AABB used everywhere from culling (#27) to minimap (#170) to
 * coordinate transforms (`worldToScreen`).
 *
 * @typedef {Object} ArenaCamera
 * @property {number} x      World-space top-left x.
 * @property {number} y      World-space top-left y.
 * @property {number} width  Viewport width in world units.
 * @property {number} height Viewport height in world units.
 */

/**
 * Arena obstacle. Subset of fields the rest of the codebase reads from. Map
 * editor (#102) populates the same shape from `mapData.obstacles[]`.
 *
 * @typedef {Object} ArenaObstacle
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} [color]
 * @property {string} [type]      Optional logical kind (PoisonFlask DLC etc.)
 * @property {boolean} [depleted] Set when a biome zone is consumed.
 */

/**
 * Biome zone — coloured region with gameplay side-effects (lava, ice, healing…).
 * Read by Player movement (speedMod) and biome update hooks.
 *
 * @typedef {Object} BiomeZone
 * @property {number} x
 * @property {number} y
 * @property {number} radius
 * @property {string} kind           Biome zone id (LAVA, ICE, HEAL, ACID …)
 * @property {number} [speedMod]
 * @property {number} [dmgPerTick]
 * @property {boolean} [depleted]
 */

/**
 * Arena instance shape (constructed in `Arena.js`). Listed here for IntelliSense
 * on `window.gameContext.arena`; the canonical owner is the class itself.
 *
 * @typedef {Object} ArenaState
 * @property {number} width
 * @property {number} height
 * @property {ArenaCamera}     camera
 * @property {ArenaObstacle[]} obstacles
 * @property {BiomeZone[]}     biomeZones
 */

/**
 * `window._world` legacy bag — the catch-all run-state object used by older
 * paths. New code should prefer the typed accessors on GameContext. Listed here
 * so call sites stop pretending the shape is unknown.
 *
 * NOTE: this is intentionally a partial — the real RunState carve is #11.
 *
 * @typedef {Object} WorldState
 * @property {number}          [wave]
 * @property {number}          [frame]
 * @property {number}          [score]
 * @property {ArenaState}      [arena]
 * @property {Object[]}        [enemies]
 * @property {Object[]}        [projectiles]
 * @property {Object[]}        [particles]
 * @property {Object[]}        [floatingTexts]
 * @property {Object[]}        [meleeAttacks]
 * @property {Object|null}     [player]
 * @property {Object|null}     [player2]
 * @property {Object|null}     [currentWeather]
 * @property {Object|null}     [currentWeather2]
 * @property {boolean}         [bossActive]
 * @property {boolean}         [gamePaused]
 * @property {boolean}         [isLevelingUp]
 * @property {boolean}         [isShopping]
 */

// ─── Tuning constants (GAMEPLAY block in Constants.js) ──────────────────────

/**
 * Compile-time tuning numbers. Exported from Constants.js as `GAMEPLAY` and
 * mirrored to `window.GAMEPLAY` for classic-script callers.
 *
 * @typedef {Object} GameplayConstants
 * @property {number} MAX_PARTICLES
 * @property {number} MAX_FLOATING_TEXTS
 * @property {number} DEFAULT_MELEE_RADIUS
 * @property {number} DEFAULT_DASH_COOLDOWN
 * @property {number} SERVER_VIEW_HALF_W
 * @property {number} SERVER_VIEW_HALF_H
 * @property {number} INTERP_DELAY_MS
 * @property {number} HITSTOP_HIT
 * @property {number} HITSTOP_CRIT_MELEE
 * @property {number} HITSTOP_CRIT_SHOT
 * @property {number} HITSTOP_BOSS_KILL
 * @property {number} BOSS_INTRO_FRAMES
 * @property {number} BOSS_DEATH_FRAMES
 * @property {number} COMBO_TIMEOUT_FRAMES
 * @property {number} SAVE_BACKUP_SLOTS
 * @property {number} PAUSE_UPGRADE_CHIPS
 * @property {number} PAUSE_CARD_CHIPS
 */

// Re-export the empty surface so `import('./types/schemas.js')` resolves cleanly
// in environments that strict-check ESM specifiers. The `export {}` is enough
// to mark this as a module; no runtime values escape.
export {};
