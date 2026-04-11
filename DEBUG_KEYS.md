# Debug Keys

These keys are only active when running in the **browser** (non-Electron build). They are disabled in the shipped game.

---

## In-Game (while a run is active)

| Key | Condition | Effect |
|-----|-----------|--------|
| `K` | Game running, not paused | Kills the player instantly |
| `N` | Game running, not paused | Skips the current wave — clears all enemies and projectiles. If the current wave number is even, opens the shop instead of advancing. |
| `B` | Game running, not paused, no boss active | Forces a boss spawn by marking all wave enemies as killed |
| `I` | Game running, not paused | Toggles player invincibility on/off |
| `L` | Game running, not paused | Triggers an immediate level-up for the player |
| `J` | Game running, not paused | Opens a prompt to jump to a specific wave number, resetting all enemies/projectiles/power-ups and triggering story logic for that wave |
| `U` | Game running, not paused | Activates the player's ultimate / transformation form. Also triggers the Air hero's Hurricane if the hero is Zephyr form. |

---

## Testing Grounds (only while `isTestingMode` is active)

Enter Testing Grounds from the menu with `D` (see below).

| Key | Condition | Effect |
|-----|-----------|--------|
| `Tab` | Testing Grounds active, not leveling up | Toggles the enemy spawn menu |
| `C` | Testing Grounds active, not paused | Clears all enemies and projectiles from the arena |

---

## In Menu (while the main menu is open)

| Key | Condition | Effect |
|-----|-----------|--------|
| `B` | Menu state | Selects the hidden **Black** hero (not shown in the normal hero picker) |
| `L` | Menu state | Toggles the **Love** hero unlock in save data and saves — useful for testing DLC hero availability without owning the DLC |
| `P` | Menu state | Adds +1 skill point to the currently selected hero and saves |
| `T` | Menu state | Resets the tutorial-seen flag in save data and re-triggers the first-launch tutorial prompt |
| `D` | Menu state, menu overlay visible | Opens the **Testing Grounds** sandbox mode |
| `E` | Menu state | Force-unlocks **Evil Mode** — sets `maxWinPrestige = 0` for all 5 base heroes in save data and saves, making the hidden Evil Mode button appear in the mode selection |
