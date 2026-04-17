# Changelog

All notable changes to this project will be documented in this file, starting with version 1.0.0 and recent changes involved just before that release.

## [Unreleased]

### Fixed
- Story Mode button now shows yellow controller-selection outline when navigated to with a gamepad (was hidden by `border: none !important`)
- Windows installer now uses the correct app icon (`images/icons/win/icon.ico`) instead of the default Electron icon; icon path is now platform-aware in `forge.config.js`
- Installed app on Windows now correctly shows `5 Freunde: Elemental Arena` as product name instead of `5-freunde-arena`

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
