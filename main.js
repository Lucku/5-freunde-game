// #171 — Single ESM entry point. Replaces the 70 individual
// `<script type="module" src="…">` tags previously listed in game.html.
//
// Side-effect-only imports: each module's body runs in declaration order,
// preserving the legacy load semantics (each file sets its own `window.X = X`
// shim at module top so cross-file global access keeps working). Vite/Rollup
// now sees a single dependency graph rooted at this file, which:
//   - lets the bundler tree-shake unreachable exports
//   - cuts the boot waterfall from 70 module-fetches to one bundle
//   - prepares the codebase for the gradual shim removal that follows
//
// Order matches the original game.html block. Do NOT reorder without checking
// runtime side-effects — many files mutate window state at module load.

// Foundation — globals, platform detection, config
import './shared/world.js';
import './Platform.js';
import './GameContext.js';
import './Constants.js';
import './Config.js';
import './dlc/DLCManager.js';
import './AltarData.js';

// World + scene
import './Arena.js';
import './Biomes.js';
import './Museum.js';
import './GlobalLobbyScene.js';
import './Altar.js';
import './Tutorial.js';
import './Managers/StoryManager.js';

// Actors
import './Player.js';
import './Enemy.js';
import './Boss.js';
import './Companion.js';
import './MemoryStories.js';
import './MemoryShard.js';
import './CompletionMenu.js';

// Managers
import './Managers/IntroManager.js';
import './Managers/AudioManager.js';
import './Managers/InputManager.js';
import './Managers/SaveManager.js';
import './Managers/CloudSaveManager.js';
import './Managers/NetworkManager.js';
import './Managers/CrashReporter.js';
import './Managers/TelemetryManager.js';
import './Managers/SpatialHash.js';
import './Managers/EventBus.js';
import './Managers/UIManager.js';
import './Managers/HUDLayout.js';

// Controllers
import './Entities/PlayerController.js';
import './Entities/NetworkInputController.js';

// UI
import './UI/HeroDetails.js';
import './UI/Completion.js';
import './UI/Collection.js';
import './UI/SkillTree.js';
import './UI/Achievements.js';
import './UI/Statistics.js';
import './UI/Shop.js';
import './UI/LevelUp.js';
import './UI/Options.js';
import './UI/OnlineLobby.js';
import './UI/WorkshopPanel.js';
import './Managers/MapManager.js';
import './UI/CustomMapsPanel.js';
import './UI/VersusMenu.js';
import './UI/InfoDialogueManager.js';
import './UI/MainMenu.js';
import './UI/MenuBackground.js';

// Modes
import './ChaosMode.js';
import './EvilHeroes.js';
import './EvilMode.js';
import './scripts/VersusTest.js';

// Utils + entities (load order matters: Utils, then projectiles/drops/etc.)
import './Utils.js';
import './Entities/Projectile.js';
import './Entities/MeleeSwipe.js';
import './Entities/GoldDrop.js';
import './Entities/CardDrop.js';
import './Entities/HolyMask.js';
import './Entities/PowerUp.js';
import './Entities/Particle.js';
import './Entities/FloatingText.js';

// Input
import './CoopGamepadController.js';
import './OnlineTestBot.js';

// Game entry — pulls in its own dep graph (Camera, Spawner, Wave, RunState,
// GameLoop) via existing `import` statements at the top of game.js.
import './game.js';

// Tutorial-mode and Testing-Grounds overlays — depend on game.js globals so
// must load after it.
import './TutorialMode.js';
import './TestingGrounds.js';
