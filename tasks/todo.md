# Admin Dashboard Hardening (2026-05-15)

Goal: replace the plaintext-password-as-bearer scheme on `/api/admin/*` with a bcrypt-verified password + JWT session, fail-secure boot, and brute-force rate limiting. Eliminates the worst risk: the dashboard polls every 5 s, so the admin password currently traverses the network 720× per hour while the tab is open.

User decisions:
- **Creds**: `ADMIN_PASSWORD_HASH` env (bcrypt) only. Plain `ADMIN_PASSWORD` fallback dropped entirely. `'admin'` default dropped.
- **Session**: JWT `kind:'admin'`, 8 h TTL.
- **2FA**: none (out of scope this pass).
- **Login rate limit**: 5 attempts / 15 min per IP.
- **JWT_SECRET**: loud warning in production when default; not fail-secure this pass.

## Plan

- [ ] **Server credential layer** — `server/server.js`
  - [ ] Drop `ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'` default.
  - [ ] Boot-time `_ensureAdminCredential()`:
    - [ ] If `ADMIN_PASSWORD_HASH` set → use it directly.
    - [ ] Else if `NODE_ENV !== 'production'` → generate ephemeral random password (`crypto.randomBytes(16).toString('hex')`), hash it, log once so the operator can paste it.
    - [ ] Else (production, hash not set) → `console.error` + `process.exit(1)`. Fail-secure.
  - [ ] If `ADMIN_PASSWORD` env still set → log loud warning that it is ignored (catches stale deploy configs).
- [ ] **Login endpoint** — `POST /api/admin/login`
  - [ ] Rate-limited 5 attempts / 900 s per IP.
  - [ ] `bcrypt.compare(password, _adminHash)`. Success: JWT `{ kind:'admin' }` 8 h TTL. Fail: 401.
- [ ] **`requireAdmin` rewrite** — verify JWT, reject if `kind !== 'admin'`. 16 endpoint reference sites unchanged.
- [ ] **Dashboard** — `tryLogin()` POSTs to `/api/admin/login`, stores `{ token, expiresAt }` in sessionStorage. All polls send the JWT. 401 → logout. Boot wipes expired tokens.
- [ ] **CLI helper** — `scripts/admin-hash.js` + `npm run admin-hash <password>`.
- [ ] **Tests** — `tests/adminAuth.test.js`: bcrypt verify, JWT mint, requireAdmin kind-rejection, rate limit 429.
- [ ] **Docs** — CHANGELOG entry + `server/README.md` if it references the password.

## Acceptance

1. Production boot with neither env set → exits with `[admin] FATAL: no credentials configured`.
2. `npm run admin-hash hunter2`, set env, restart → login once, subsequent polls show JWT in DevTools.
3. 6 failed logins in 15 min from one IP → 429.
4. Player JWT (`kind:'gs'`) hitting `/api/admin/sessions` → 403.
5. Vitest green.

## Risks / non-goals

- Not introducing a separate admin DB user — single creds env keeps deploy story simple.
- Not adding TOTP — explicit decline this pass.
- `JWT_SECRET` default `'change-this-secret-in-production'` is pre-existing; admin JWTs sign with the same secret. Production deploys MUST override. Boot warning will surface this.

## Review (shipped 2026-05-16)

All 8 checklist items shipped. Files touched:

| File | Change |
|------|--------|
| `server/adminAuth.js` | New. `resolveAdminHash` (env → hash, fail-secure in prod, ephemeral dev fallback) + `signAdminToken` (kind:'admin', 8 h default TTL) + `verifyAdminToken` (returns `{ok}` or `{ok:false, status, reason}` for clean middleware mapping). Pure functions, no Express/DB deps — fully unit-testable. |
| `server/server.js` | Dropped `ADMIN_PASSWORD` env + `'admin'` default. Boot resolves hash via `resolveAdminHash`; exits 1 on production-without-hash. New `POST /api/admin/login` rate-limited 5/900s, `bcrypt.compare` on the stored hash, mints `signAdminToken(JWT_SECRET)`. `requireAdmin` delegates to `verifyAdminToken`. Stale `ADMIN_PASSWORD` triggers loud warning. Placeholder `JWT_SECRET` triggers second warning in prod. |
| `server/dashboard.html` | `tryLogin` POSTs `/api/admin/login` (no more raw-password Bearer); stores `{token, expiresAt}` in `sessionStorage.admin_session`; wipes legacy `admin_token` on every boot. `fetchAll` watches for 401/403 across all polls and auto-logs-out via the `sawAuthFailure` accumulator. Boot path bounces on `expiresAt <= Date.now()`. |
| `scripts/admin-hash.js` | New CLI. `npm run admin-hash <password>` → prints `ADMIN_PASSWORD_HASH=$2b$10$…`. Refuses passwords < 8 chars. Resolves bcrypt from `server/node_modules` (with fallback to root) so root doesn't need the native dep. |
| `package.json` | `scripts.admin-hash` entry. |
| `tests/adminAuth.test.js` | 18 assertions — verifyAdminToken (8 cases), signAdminToken (2), resolveAdminHash (5), rate limit (3). |
| `CHANGELOG.md` | `[Unreleased] / Security` entry. |

**Verification:**
- `npx vitest run tests/adminAuth.test.js` → 18/18 green.
- Full suite: 9 files passed (saveManager.test.js failure is the pre-existing `window`-undefined import error from previous session, unrelated).
- `node --check` clean for `server/server.js`, `server/adminAuth.js`, `scripts/admin-hash.js`.
- CLI smoke: `node scripts/admin-hash.js hunter2x` prints `ADMIN_PASSWORD_HASH=$2b$10$…`.

**Cannot verify locally (needs the server actually running):**
- End-to-end login flow against `/api/admin/login` — `npm install` in `server/` fails on `better-sqlite3` native build on this machine. Logic is covered by the unit tests; integration smoke is a deploy-time check.

**Notes for the next pass / open follow-ups:**
- `JWT_SECRET` is still allowed to use the placeholder default in production with only a warning. Stricter posture would be to refuse boot, but that's a bigger change (would break any deployment that forgot to set it) — leave as a separate hardening pass.
- No log/audit trail of admin login attempts (success or failure) beyond the existing rate-limiter buckets. Worth adding when admin actions start having side-effects (write endpoints, save edits).
- Login response intentionally does not surface a remaining-attempts hint; rate-limit hits return 429 + `Retry-After` only. Avoids leaking timing oracles to a brute-force attacker.
- The dashboard's `sessionStorage` is per-tab; opening the admin panel in a second tab forces a re-login. Acceptable trade-off — `localStorage` would survive tab close, which is the wrong default for admin creds.
- Server `npm install` blocked by `better-sqlite3` native build on this dev machine. Used `--ignore-scripts` for the testing path. Doesn't affect anyone running the server in its actual deploy environment.

---

# Improvement #3 — JSDoc schema typedefs (2026-05-15)

Goal: document the four cross-cutting shapes called out in the improvement list (`SaveData`, `HeroStats`, `WorldState`, `GameConfig`) so future regressions like `saveData[player.type].prestige` get caught in the IDE instead of at runtime. Conservative path: JSDoc `@typedef` + `jsconfig.json`, opt-in `// @ts-check` per file — no build-pipeline churn, no runtime cost.

User decisions:
- **Approach**: JSDoc typedefs + jsconfig (over full `.d.ts` ambient or TypeScript migration).
- **Scope**: all 4 schemas — `SaveData`, `HeroStats`, `WorldState`/`RunState`, `GameConfig`.

## Plan

- [x] **Types module** — `types/schemas.js`
  - [x] `HeroType` open string union covering base + DLC + Evil-mode heroes.
  - [x] `HeroSaveSlot` + `GlobalSaveStats` + `MetaUpgrades` + top-level `SaveData` (matches `defaultSaveData` in `game.js:131`).
  - [x] `BaseHeroStats` (matches `BASE_HERO_STATS` in `Constants.js`) + `StatBreakdown` + derived `HeroStats` (return of `window.getHeroStats`).
  - [x] `KeyBindings` + `GamepadBindings` + `ColorblindMode` + `OneHandedScheme` + `HUDLayoutOverrides` + `GameConfig` (matches `defaultConfig` in `Config.js`).
  - [x] `ArenaCamera` + `ArenaObstacle` + `BiomeZone` + `ArenaState` + partial `WorldState` (full RunState carve = #11).
  - [x] `GameplayConstants` (matches `GAMEPLAY` in `Constants.js`).
  - [x] `export {}` so the file is a module; runtime-free.
- [x] **IDE config** — `jsconfig.json`
  - [x] `allowJs:true`, `checkJs:false` (per-file opt-in), `moduleResolution:Bundler`.
  - [x] `include`: `types/**`, `Managers/**`, `Entities/**`, `UI/**`, key root files. `exclude`: `node_modules`, `dist`, `DLCs`, `server`.
- [x] **Wire @type references at schema-defining sites**
  - [x] `Constants.js` — `BASE_HERO_STATS`, `GAMEPLAY`.
  - [x] `Config.js` — `defaultConfig`.
  - [x] `game.js` — `defaultSaveData`.
  - [x] `Player.js` — `getHeroStats` (`@param`/`@returns`).
  - [x] `Arena.js` — `camera`, `obstacles`, `biomeZones` field annotations.
  - [x] `Managers/SaveManager.js` — full `@param`/`@returns` on `encodeSaveData`, `decodeSaveData`, `saveGame`, `loadGame`, `_migrate`, `MIGRATIONS[]`.
- [x] **CHANGELOG + improvement list bookkeeping**
  - [x] CHANGELOG `[Unreleased] → Added` entry under #3.
  - [x] `tasks/improvements-2026-05-10.md` #3 checkbox flipped with shipped-summary annotation.

## Review

Shipped:
- New `types/schemas.js` (~290 lines, runtime-free): 13 typedefs covering save data, hero stats, game config, arena/world, gameplay constants.
- New `jsconfig.json` for VSCode IntelliSense.
- `@type` references added at 7 schema-defining sites (`Constants.js`, `Config.js`, `game.js`, `Player.js`, `Arena.js`, `Managers/SaveManager.js`).
- Zero runtime / bundle / lint impact: typedefs are doc-only; `checkJs:false` means existing files are not retroactively checked, and `// @ts-check` is opt-in per file.

Intentionally deferred:
- DLC `dlc/*/` typings — out of scope per user answer; DLCs use registry hooks not the typed bag directly.
- Server `server/*` typings — separate runtime (Node), separate concerns.
- Flipping `checkJs:true` project-wide — would surface ~hundreds of pre-existing loose-typed sites; meant as a follow-up audit once specific subsystems opt-in via `// @ts-check`.
- Per-file `// @ts-check` on `SaveManager.js` — JSDoc gives IDE hover help today; enabling the check is a one-line follow-up once the global lookups (`isElectron`, `fs`, `saveFilePath`) are routed through `Platform.js` (#9 carries that work).

Next opt-in target (when someone wants project-wide enforcement, not now): add `// @ts-check` to `Managers/SaveManager.js` first — it's the smallest schema-critical surface and the migration table is the canonical "structure change" entry point. Then `Player.js` getHeroStats. Each opt-in surfaces a finite number of fixes.
