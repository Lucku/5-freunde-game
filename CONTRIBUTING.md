# Contributing

Quick-start guide for working on 5 Freunde: Elemental Arena.

## Setup

```bash
git clone <repo>
cd "5 Freunde"
npm install            # pulls Electron, Vite, ESLint, Vitest, server deps
```

No platform-specific toolchain required. macOS / Windows / Linux all build the same. Steam Deck is a build target.

## Running

| Command | What it does |
|---------|--------------|
| `npm run dev:electron` | Boots Vite dev server + Electron pointed at it. JS/HTML edits → full reload. `main.css` edits → live swap via Vite HMR. |
| `npm start` | electron-forge. Loads `dist/game.html` if present, else source `game.html`. Used by packaged builds. |
| `npm run build` | Vite production bundle into `dist/`. Mirrors static dirs (`audio/`, `images/`, `dlc/`) + classic-script files. |
| `npm run preview` | Serves the built `dist/` over Vite preview server. |
| `npm run lint` / `lint:fix` | ESLint (flat config). Warnings-only; 0 errors required to land. |
| `npm test` | Vitest unit suites + `server/simulation/parityTest.js`. Must be green to land. |
| `npm run server` | Standalone Node WebSocket server for online co-op + leaderboards. |

## Before opening a PR

1. `npm run lint` — must be **0 errors**. Warning count may grow but not by more than ~10.
2. `npm test` — must be **48/48 Vitest + 80/80 parity**.
3. `npm run build` — bundle must succeed. Note bundle-size delta in the PR description.
4. Manually smoke-test the path you touched (start a run, hit one wave, exit).
5. Update [`CHANGELOG.md`](CHANGELOG.md) under `## [Unreleased]` with a single bullet describing the user-facing or developer-facing impact.

## Commit convention

```
<type>: <short imperative description>
```

`type` ∈ `feat` | `fix` | `chore` | `refactor` | `docs` | `perf` | `test`.
Subject ≤ 72 chars, lowercase after the type. Body explains *why*, not *what*. Example: `fix: gray enemies after ESM migration — bare wave reads`.

## Code conventions

- 4-space indent, single quotes, semicolons, 120-col soft wrap. Enforced by `.prettierrc`.
- Prefer `const` and `let` over `var`. ESLint flags new `var` declarations as warnings.
- Avoid `arr.forEach((e, i) => arr.splice(i, 1))` — the local lint rule `5freunde/no-foreach-splice` blocks the index-skip bug class. Use reverse-`for` with explicit splice.
- DLC consumers reference cross-module symbols as bare globals via `window.X` shims; do not break the shim list at the bottom of `game.js` without auditing DLCs.
- Game-state writes from any module other than `game.js` must go through `window.GAME_API` or one of the documented `Object.defineProperty` getter/setter pairs. Plain `var X` in `game.js` is module-scoped under ESM — it does **not** auto-attach to `window`.

## Where things live

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full map. Cheat sheet:

- **Entry**: [`game.html`](game.html) loads scripts; [`game.js`](game.js) wires everything.
- **Per-feature code**: `Entities/` (game-object classes), `Managers/` (audio / input / save / story / network), `UI/` (menu screens), `dlc/<pack>/` (drop-in content).
- **Server**: [`server/server.js`](server/server.js) (auth + WS handlers) + [`server/simulation/`](server/simulation/) (authoritative game-tick loop reused from client code via `loader.js`).
- **Save data**: `Managers/SaveManager.js`. HMAC-signed envelope. Bump `SCHEMA_VERSION` + add a `MIGRATIONS` entry when the shape changes.
- **Debug + cheat tools**: see [`DEBUG_KEYS.md`](DEBUG_KEYS.md).

## Improvement backlog

Tracked in [`tasks/improvements-2026-05-10.md`](tasks/improvements-2026-05-10.md). Pick a `[ ]` item, open a PR, mark `[x]` with a short note when shipped.

## Reporting bugs

Open a GitHub issue or use the in-game "Report Bug" button. Crash reports auto-upload to `/api/crash` on the server when `crashReportsEnabled` is on (default).
