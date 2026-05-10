# Codebase Audit + Fix Plan (2026-05-10)

Goal: scan whole codebase for bugs, inconsistencies, perf concerns; fix everything found.

## Strategy

Six parallel auditors ran. ~324 findings produced. Focus pass:

1. **CRIT bugs** — concrete logic errors, ReferenceErrors, wrong API use, gameplay-breaking.
2. **HIGH bugs** — confirmed bugs with clear fixes.
3. **MED/LOW** — cheap, obviously-correct (typos, dead code, missing guards).
4. Skip: large refactors (draw-in-update separation, DLC base-class extraction, snapshot per-client perspective, setTimeout→frame migration, audio lazy-load, spatial-hash collision, SaveManager UTF-8) — out of scope for one pass.

## CRIT bugs to fix

### Core
- [x] Player.js — altar cooldown reductions nested inside `else if (this.type === 'chance')`, never apply
- [x] Companion.js — `performSynergy()` draws beam in `update()` phase
- [x] Companion.js — bare `enemies` global without typeof guard
- [x] game.js — missing braces on hit-stop guard (`enemy.draw()` runs even on hit-stop)
- [x] game.js — `forEach+splice` index-skip across hot arrays
- [x] Boss.js:25 — `saveData[player.type].prestige` no guard for DLC heroes

### DLC
- [x] dlc/echos_of_eternity/TimeBosses.js — spawnProj wrong arg order
- [x] dlc/faith_of_fortune/ChanceHero.js — `e` vs `enemy` ReferenceError
- [x] dlc/faith_of_fortune/ChanceHero.js — divide-by-multiply timeout (BAD outcome, DIAMOND outcome)
- [x] dlc/faith_of_fortune/ChanceHero.js — Windfall `*= 1.5` every frame
- [x] dlc/faith_of_fortune/index.js — `enemies = []` reassignment
- [x] dlc/waker_of_winds/AirHero.js — permanent Storm buff every frame, ungated

### Networking
- [x] server/simulation/GameSession.js — multi-level XP only grants one level
- [x] server/simulation/GameSession.js — pending shoot/melee latch never cleared on level-up resume
- [x] server/server.js — `send()` no try/catch on closed ws

### Managers / UI
- [x] Managers/StoryManager.js — mutates shared STORY_EVENTS entry across runs
- [x] UI/SkillTree.js — RNG seed `type.length` collides for same-length hero names

## HIGH bugs

- [x] Enemy.js — `getBiomeEnemyType(wave)` reads global wave not _wave
- [x] Enemy.js — spawn safe-loop unreachable branch
- [x] Enemy.js — AURA_HEAL `e.maxHp || e.hp * 2` heals beyond cap
- [x] Player.js — `JSON.parse(JSON.stringify(...))` deep clone
- [x] ChaosMode.js:99,101 — `(x || 0)` should be `(x ?? 1)` for multipliers
- [x] ChaosMode.js:489-490 — `val.isMelee` on numeric val
- [x] dlc/echos_of_eternity/LoveHero.js — `Math.max(undefined, 600) → NaN`
- [x] dlc/echos_of_eternity/TimeHero.js — `Math.floor(Date.now()/750) % 1` always 0
- [x] dlc/champions_of_chaos/GravityHero.js — saveData write spam in passive pull
- [x] dlc/champions_of_chaos/GravityHero.js — quasar block missing `floatingTexts` typeof guard
- [x] dlc/faith_of_fortune/ChanceHero.js — JACKPOT skips `player.onKill`
- [x] dlc/faith_of_fortune/SpiritHero.js — Tranquility never restores enemy speed
- [x] dlc/disciples_of_deception/SmokeHero.js — Blackout cap inconsistency
- [x] UI/SkillTree.js — `desc.replace('+','+')` no-op
- [x] UI/Statistics.js — leastPlayed picks fresh-unlocked count=0
- [x] OnlineTestBot.js — dead 'level_up' branch
- [x] dlc/waker_of_winds/index.js — story double-injection
- [x] dlc/echos_of_eternity/index.js — story-injection guard order

## MED / LOW

- [x] Utils.js — `parseInt`→`Math.round`, `==`→`===`, `var`→`let/const`
- [x] Entities/GoldDrop.js — no-op `replace('rgba','rgba')`
- [x] Entities/Projectile.js — cache `Date.now()` once per draw
- [x] dlc/faith_of_fortune/SpiritHero.js — double registration
- [x] dlc/faith_of_fortune/ChanceHero.js — double registration
- [x] dlc/symphony_of_sickness/SoundHero.js — double registration
- [x] dlc/faith_of_fortune/Story.js — typos
- [x] dlc/champions_of_chaos/Story.js — leading-space title
- [x] dlc/faith_of_fortune/index.js — duplicate exclamation-path registration

## Review

### Files touched

Core: `Player.js`, `Companion.js`, `Boss.js`, `Enemy.js`, `ChaosMode.js`, `game.js`, `Utils.js`, `OnlineTestBot.js`
Managers: `Managers/StoryManager.js`, `Managers/NetworkManager.js`, `Managers/UIManager.js`
UI: `UI/MainMenu.js`, `UI/SkillTree.js`, `UI/Statistics.js`, `UI/Achievements.js`
Entities: `Entities/Projectile.js`, `Entities/GoldDrop.js`
DLC: `dlc/echos_of_eternity/TimeBosses.js`, `TimeHero.js`, `LoveHero.js`; `dlc/faith_of_fortune/index.js`, `ChanceHero.js`, `SpiritHero.js`, `Story.js`; `dlc/champions_of_chaos/Story.js`, `GravityHero.js`; `dlc/disciples_of_deception/SmokeHero.js`; `dlc/symphony_of_sickness/index.js`; `dlc/waker_of_winds/index.js`, `AirHero.js`
Server: `server/server.js`, `server/simulation/GameSession.js`
Docs: `CHANGELOG.md`, `tasks/codebase-audit-2026-05-10.md`

### Highest-impact fixes

1. Player.js altar cooldown reductions hoisted out of `chance` branch — were dead code for fire/water/ice/plant/metal heroes.
2. `forEach + arr.splice(index)` purged across 10+ hot loops in `game.js` — half of pending entity removals were skipped per frame.
3. TimeBosses.js `spawnProj` arg order fixed — every Echos boss attack was producing malformed projectiles.
4. Faith of Fortune ChanceHero — Windfall every-frame `*= 1.5`, divide-by-multiply timeouts in BAD/DIAMOND outcomes, missing `onKill` on JACKPOT screen-wipe; Spirit `e` vs `enemy` ReferenceError; Tranquility permanent slow leak.
5. AirHero "Storm" buff was permanent; now gated on transform/hurricane state.
6. Server `_giveXP` now grants multiple levels; level-up resume clears action latches; `send()` wraps `try/catch`.
7. SkillTree RNG seed switched from `type.length` to string-hash so heroes with same-length names get distinct trees.

### Skipped (out of scope for this pass)

- Snapshot per-client perspective + delta-tracking refactor in GameSession (CRIT-but-architectural)
- Boss class-replacement vs registry unification across DLCs
- Move draws-in-update to proper draw phase across all DLC heroes
- DLC base-class extraction for `mkSet/createCardSet/addDLCAch` boilerplate
- `setTimeout`-driven gameplay → frame counter migration (Player INFERNO ring, Ironbark DR, EvilMode wave-12)
- Audio lazy-loading, gradient caching, spatial-hash projectile collision
- SaveManager UTF-8 / TextEncoder migration
- Rejoin full-snapshot on REJOINED (server)

These need their own dedicated tasks to land safely.

### Verification

- All modified JS files pass `node -c` syntax check.
- Did not run or playtest the game (no UI verification).
- Did not run server tests (no test suite invoked).
- Code-review level confidence on all CRIT/HIGH fixes; MED/LOW are mechanical/cosmetic.
