# TODO #185 — Map Workshop Moderation (2026-05-20)

Goal: give admins full moderation control over community maps via the admin dashboard, plus the underlying public API (ratings 1-5★, reports) so player-facing UI can be wired up later. Required before upload volume scales.

## Schema

- [ ] `custom_maps`: add `hidden INTEGER NOT NULL DEFAULT 0`, `rating_sum INTEGER NOT NULL DEFAULT 0`, `rating_count INTEGER NOT NULL DEFAULT 0`, `report_count INTEGER NOT NULL DEFAULT 0` (idempotent ALTER on boot, like existing `verified` upgrade pattern).
- [ ] `custom_map_ratings`: `id, map_id, user_id, stars (1-5), created_at`, UNIQUE(map_id, user_id) so a user's rating is upsertable.
- [ ] `custom_map_reports`: `id, map_id, user_id, reason TEXT, created_at, resolved INTEGER DEFAULT 0, resolved_at, resolved_by TEXT`.

## Public API

- [ ] `POST /api/maps/:id/rate` (auth, rate-limited) — body `{ stars: 1..5 }`. Upsert into `custom_map_ratings`, recompute `rating_sum`/`rating_count` on `custom_maps`. Returns `{ avg, count, mine }`.
- [ ] `POST /api/maps/:id/report` (auth, rate-limited: 5/h/IP) — body `{ reason }`. Insert into `custom_map_reports`, bump `report_count`. Idempotent per user/map (UNIQUE).
- [ ] `GET /api/maps` and `GET /api/maps/:id`: filter out `hidden = 1` rows unless the requester is the owner. Include `avgRating`, `ratingCount`.
- [ ] `GET /api/maps/:id`: 404 (not 403) if hidden and requester isn't owner — leak nothing.

## Admin API (all `requireAdmin`)

- [ ] `GET /api/admin/maps` — every map, hidden incl., joined with `rating_count`, `avg`, `report_count`, `play_count`. Sortable via `?sort=reports|newest|popular|rating`.
- [ ] `GET /api/admin/maps/:id` — full row incl. `mapData` JSON for inspection.
- [ ] `POST /api/admin/maps/:id/hide` — set `hidden = 1`. 
- [ ] `POST /api/admin/maps/:id/unhide` — set `hidden = 0`.
- [ ] `DELETE /api/admin/maps/:id` — hard delete map + scores + likes + ratings + reports (admin override; owner check skipped).
- [ ] `GET /api/admin/map-reports` — list reports `?status=open|resolved|all` (default open), newest first, joined with map name/author.
- [ ] `POST /api/admin/map-reports/:id/resolve` — mark resolved.
- [ ] `DELETE /api/admin/map-reports/:id` — drop a noise report.

## Dashboard

- [ ] New tab "Maps" between "Events" and "Technical".
- [ ] Top: 4 KPI cards — total maps, hidden count, open reports, avg rating overall.
- [ ] Section: **Open Reports** table. Columns: when, map name (link → expands map detail), reporter, reason, [Resolve] [Delete report] buttons. Sort newest first.
- [ ] Section: **All Maps** table. Columns: id, name, author, biome, plays, likes, ★ rating (avg / count), reports, status (Visible/Hidden pill), actions [View] [Hide]/[Unhide] [Delete]. Sortable header.
- [ ] Map detail expansion: biome, dimensions, obstacle count, biome zones count, trap count, mapData JSON pretty-printed.
- [ ] `fetchAll` polls `/api/admin/maps` + `/api/admin/map-reports`.

## Acceptance

- [ ] Hidden maps disappear from `/api/maps` and player workshop UI but stay queryable by admin.
- [ ] Admin can hide → unhide → delete from the dashboard with confirmation prompts on destructive actions.
- [ ] Reports counter bumps on `POST /api/maps/:id/report`; resolving zeros nothing (the counter is for moderation triage; cleared records simply hide from the open-reports list).
- [ ] Rate endpoint computes avg correctly across multiple users; same user re-rating updates not duplicates.
- [ ] `CHANGELOG.md` `[Unreleased]` updated; TODO.txt item 185 checked off.

## Non-goals (this pass)

- Player-facing rating UI / report UI in `UI/WorkshopPanel.js` & `UI/CustomMapsPanel.js`. Endpoints exist; UI can land in a follow-up.
- Auto-takedown thresholds. Admin-only manual moderation for now.
- Map versioning / appeals workflow.
