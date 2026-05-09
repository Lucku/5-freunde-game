# DLC Design: Disciples of Deception

**Type:** Character Pack (no story mode, no memory shards)
**ID:** `disciples_of_deception`
**Heroes:** Psycho · Mirror · Smoke
**Folder:** `dlc/disciples_of_deception/`

---

## Overview

First character-only DLC. Three deception-themed heroes with full gameplay systems, visuals, SFX, voice lines, unique biomes, and battle music — but no story campaign and no memory shards.

### What's included
- Hero JS files (stats, upgrade pool, perm upgrades, skill tree, HERO_LOGIC)
- Biome JS files (one per hero — registered to `window.BIOME_LOGIC`)
- Battle music (2 tracks per biome)
- Visual assets: hero portrait images + `title.png`
- SFX per hero: attack, melee, dash, special + biome ambient
- Voice lines per hero: all standard exclamation triggers
- Collector cards (bronze → platinum)
- Altar skill trees
- Achievements (gameplay-based, no story gates)
- `index.js` manifest

### What's NOT included (vs. standard DLC)
- No `Story.js`
- No `MEMORY_STORIES` / memory shards
- No custom enemy files
- No story arc labels

---

## Hero 1 — Psycho

**Color:** `#1abc9c` (teal)
**Archetype:** Chaos disruptor — low HP glass cannon who thrives in unpredictability
**Stat Profile:** Low HP (45), high speed (5.5), high range damage (35), short cooldown (10), small projectiles

### Core Mechanic: Hysteria
Psycho has a **Hysteria Gauge** that fills as he takes damage and kills enemies. When full, he enters **Hysteria Mode** — movement speed +40%, all projectiles split into 3 erratic shots, and enemies near him randomly change direction (confused AI). Confused enemies display a swirling teal icon above their head for the debuff duration. Hysteria Mode lasts 6 seconds.

### Special: Mind Fracture
Fires a psychic bolt that bounces between up to 4 enemies, dealing damage and applying a 2s confusion debuff (enemies walk away from Psycho instead of toward him).

### Upgrade Pool
| ID | Title | Description | Icon |
|----|-------|-------------|------|
| `health` | Manic Energy | +25 Max HP, heal 20% | 🧠 |
| `cooldown` | Racing Thoughts | Cooldowns -10% | ⚡ |
| `hysteria_gain` | Hypersensitive | Hysteria fills 25% faster | 🌀 |
| `bounce` | Ricochet Mind | Mind Fracture bounces +1 target | 🔀 |
| `speed` | Flight Response | Move speed +10% | 💨 |
| `damage` | Unhinged | Damage +10% | 🔪 |
| `crit` | Snap | +5% Crit Chance, +20% Crit Damage | 💥 |
| `hysteria_duration` | Deep Break | Hysteria Mode lasts +2s | ⏳ |

### Permanent Upgrades (Altar)
| Key | Name | Desc |
|-----|------|------|
| `health` | Fractured Mind | +5 Starting HP |
| `greed` | Magpie | +5% Gold Gain |
| `power` | Raw Edge | +1% Damage |
| `swift` | Live Wire | +1% Speed |
| `defense` | Erratic Dodge | +1% Damage Reduction |
| `wisdom` | Obsessive Focus | +2% XP Gain |

### Skill Tree Weights
`COOLDOWN: 0.20 / HYSTERIA_GAIN: 0.20 / DAMAGE: 0.15 / SPEED: 0.15 / HEALTH: 0.10 / BOUNCE: 0.10 / CRIT: 0.10`

### Visual Design
- Color: teal `#1abc9c`
- Body: thin, twitchy silhouette — jagged aura lines that pulse erratically
- Projectile: small crackling psychic sparks, teal with white flicker
- Special: teal bolt with fracturing lightning arcs between targets
- Hysteria Mode: aura turns white, movement trail glitches/stutters visually

### SFX
| File | Description |
|------|-------------|
| `attack_psycho.wav` | Sharp crackle, slightly unhinged pitch |
| `melee_psycho.wav` | Wild slap/thud with distorted echo |
| `dash_psycho.wav` | Glitchy zap with pitch shift |
| `special_psycho.wav` | Shimmering psychic resonance, multi-layered |
| `hysteria_activate.wav` | High-pitched mental snap, reverb tail |

### Voice Lines
| Trigger | Line |
|---------|------|
| `injured` | "Pain? Ha! Pain is interesting!" |
| `failure_1` | "The voices go quiet. I hate the quiet." |
| `failure_2` | "Too much... too fast... too—" |
| `twin_event` | "Two of you! My mind is already racing!" |
| `boss_moment_1` | "You think you're scary? I've been scared my whole life." |
| `boss_moment_2` | "Let's see what breaks first. You or me." |
| `boss_win_1` | "That was... beautiful. Chaotic and beautiful." |
| `boss_win_2` | "Did you feel that? I felt everything." |
| `found_1` | "Oh. OH. This changes the equation." |
| `found_2` | "Yes. Yes yes yes. Take it." |
| `level_up_1` | "Getting louder. I love it." |
| `level_up_2` | "The noise in my head — it's singing!" |
| `ultimate` | "HYSTERIA! Everything is beautiful and terrible!" |

---

## Biome 1 — The Mindscape (Psycho)

**Key:** `psycho` → `window.BIOME_LOGIC['psycho']`
**Background:** `#0a1a18` (deep teal-black)
**Grid color:** `#1abc9c44` (transparent teal grid)

### Atmosphere
The arena feels unstable — pulsing teal energy lines crawl across the ground. Obstacles flicker and slightly shift position every 15 seconds ("glitch step"), telegraphed by a brief white flash. Ambient particles: small erratic sparks that drift in random directions.

### generate(arena)
- 12–16 rectangular obstacles, scattered asymmetrically, avoiding center spawn zone
- No traps — the environment itself disorients
- One large **Fracture Zone** (biome zone) covering 60% of arena: enemies inside occasionally stutter in place for 0.5s (visual only, no mechanical stun — matches the confusion theme)

### update(arena, player, enemies)
- Every 15s: each obstacle shifts by ±30px in a random direction (glitch step) with white flash
- Spawn 1–2 teal spark particles per frame near player (radius 800), drifting erratically
- During **Hysteria Mode**: particle spawn rate ×4, grid pulses brighter

### draw(ctx, arena)
- Background: deep teal-black fill + subtle teal radial glow around player
- Particles: small white/teal dots with short life, random velocity
- Active Hysteria overlay: screen-edge teal vignette flicker

### drawObstacle(ctx, obs)
- Base: dark teal `#0d2b27` with cracked surface texture (diagonal scratch lines)
- Bevel: teal highlight top-left, black shadow bottom-right
- Glitch state: white overlay flash when shifting, stutters to new position

### Battle Music
| File | Description |
|------|-------------|
| `battle_psycho_1.wav` | Unsettling, arrhythmic — syncopated percussion, dissonant teal synth |
| `battle_psycho_2.wav` | Frantic and escalating — glitch beats, distorted vocal samples |

---

## Hero 2 — Mirror

**Color:** `#1a5276` (marine blue)
**Archetype:** Reactive defender — punishes aggressive enemies, weak to ranged spam
**Stat Profile:** Medium HP (75), low speed (3.5), low range damage (12), high melee damage (140), long range cooldown (30)

### Core Mechanic: Reflection
Mirror's **special** creates a **Mirror Shield** (3s duration, fixed toggle) that reflects all incoming projectiles back at their source for 150% of original damage. Blocked projectiles also restore 5 HP each. Melee attacks against Mirror during Shield are reflected as a point-blank burst dealing 80% melee damage.

### Special: Shatter
Fires a slow-moving mirror shard that splits into 6 fragments on contact with an enemy or wall, each fragment dealing 60% of base range damage. Fragments travel outward in a star pattern.

### Upgrade Pool
| ID | Title | Description | Icon |
|----|-------|-------------|------|
| `health` | Tempered Glass | +25 Max HP, heal 20% | 🛡️ |
| `reflect_dmg` | Perfect Reflection | Reflected projectile damage +20% | 🪞 |
| `shield_duration` | Resilient Surface | Mirror Shield lasts +1s | ⏱️ |
| `fragments` | Shatterpoint | Shatter fires +2 fragments | 💠 |
| `speed` | Light Step | Move speed +10% | 🦶 |
| `damage` | Sharp Edge | Damage +10% | 🔷 |
| `cooldown` | Quick Polish | Cooldowns -10% | ✨ |
| `crit` | Blind Spot | +5% Crit Chance, +20% Crit Damage | 🎯 |

### Permanent Upgrades (Altar)
| Key | Name | Desc |
|-----|------|------|
| `health` | Reinforced Frame | +5 Starting HP |
| `greed` | Glinting Eye | +5% Gold Gain |
| `power` | Razor Surface | +1% Damage |
| `swift` | Refraction | +1% Speed |
| `defense` | Layered Glass | +1% Damage Reduction |
| `wisdom` | Studied Reflection | +2% XP Gain |

### Skill Tree Weights
`REFLECT_DMG: 0.25 / SHIELD_DURATION: 0.20 / HEALTH: 0.15 / DAMAGE: 0.15 / FRAGMENTS: 0.15 / SPEED: 0.05 / COOLDOWN: 0.05`

### Visual Design
- Color: marine blue `#1a5276`
- Body: smooth, geometric silhouette — surface shimmers like polished glass
- Projectile: faceted blue crystal shard with glint effect
- Special: radial burst of translucent mirror fragments, refracting light
- Shield: hexagonal mirror overlay around player, briefly reflects arena geometry behind it

### SFX
| File | Description |
|------|-------------|
| `attack_mirror.wav` | Crystal chime with sharp trailing ring |
| `melee_mirror.wav` | Heavy glass crack, deep impact |
| `dash_mirror.wav` | Smooth glide with shimmer tail |
| `special_mirror.wav` | Shattering glass burst, multi-hit cascade |
| `shield_activate.wav` | Clean resonant ping, rising tone |
| `shield_reflect.wav` | Sharp deflection chime, slightly reversed |

### Voice Lines
| Trigger | Line |
|---------|------|
| `injured` | "You cracked the surface. That was a mistake." |
| `failure_1` | "I shattered. It happens to the best of us." |
| `failure_2` | "The reflection fades." |
| `twin_event` | "Two angles of attack. I see both." |
| `boss_moment_1` | "Come. I want to see what you fear." |
| `boss_moment_2` | "You'll see yourself in the end." |
| `boss_win_1` | "What you sent at me, I returned." |
| `boss_win_2` | "The image breaks. So do you." |
| `found_1` | "Curious. This will change my shape." |
| `found_2` | "I can use this." |
| `level_up_1` | "Clearer now." |
| `level_up_2` | "The reflection sharpens." |
| `ultimate` | "SHATTER. Every piece is a weapon." |

---

## Biome 2 — The Hall of Mirrors (Mirror)

**Key:** `mirror` → `window.BIOME_LOGIC['mirror']`
**Background:** `#050d14` (near-black deep blue)
**Grid color:** `#1a527644` (transparent marine blue)

### Atmosphere
Vast, cold, geometric. The arena is lined with reflective panel obstacles that shimmer and show distorted inversions of the player's position. Ambient light refracts off surfaces, casting moving prismatic streaks across the floor.

### generate(arena)
- 8–12 tall, narrow rectangular obstacles arranged in rough parallel rows — evoking mirror panels in a maze
- Obstacles are larger than average (width 40–60, height 200–300) to create corridors
- 4–6 **Mirror Panels** placed along arena walls: purely decorative, but same visual as obstacles, framing the arena

### update(arena, player, enemies)
- Every 8s: prismatic light streak sweeps across the full arena floor (left-to-right or diagonal), lasts 1.5s — purely visual, no gameplay effect
- Each frame: spawn 1 faint blue-white glint particle on any obstacle surface near player (sparkle effect)
- When Mirror Shield is active: all obstacles pulse with a brief white glow

### draw(ctx, arena)
- Background: deep blue-black fill + faint radial blue glow (large, dim) centered on arena
- Prismatic sweep: thin diagonal gradient strip (white → transparent) animating across floor
- Particle glints: tiny white dots with very short life (20 frames), spawned on obstacle edges

### drawObstacle(ctx, obs)
- Base: dark marine blue `#0a1f30` with smooth finish (no texture lines — polished look)
- Surface highlight: thin bright line along top and left edges (simulates reflective sheen)
- Interior: subtle radial gradient — slightly lighter center fading to dark edges
- Bevel: bright marine blue top-left, near-black bottom-right
- Border: `#0d2840` stroke

### Battle Music
| File | Description |
|------|-------------|
| `battle_mirror_1.wav` | Cold, precise — glass percussion, sparse piano, deep sub-bass pulses |
| `battle_mirror_2.wav` | Tense and reflective — reversed instrument layers, building tension |

---

## Hero 3 — Smoke

**Color:** `#5a5a6e` (slate gray)
**Archetype:** Control specialist — area denial, positional play, punishes melee clusters
**Stat Profile:** Medium HP (65), high speed (5), medium range damage (20), medium melee damage (100), medium cooldown (18)

### Core Mechanic: Smoke Trail
Whenever Smoke **dashes**, it leaves a smoke cloud at the origin point (radius 60, lasts 4s). Enemies inside smoke clouds have their speed reduced by 40% and move semi-randomly (lose targeting accuracy). Clouds are visible to all players in co-op and versus modes. Max 3 simultaneous clouds.

### Special: Blackout
Releases a large burst cloud (radius 120) centered on player, dealing light damage to all enemies caught in it and applying a 3s blind debuff — blinded enemies cannot target Smoke (attack nearby empty space instead). 12s cooldown.

### Upgrade Pool
| ID | Title | Description | Icon |
|----|-------|-------------|------|
| `health` | Dense Vapor | +25 Max HP, heal 20% | 💨 |
| `cloud_size` | Thick Cloud | Smoke cloud radius +20% | 🌫️ |
| `cloud_duration` | Lingering | Smoke clouds last +1.5s | ⏳ |
| `cooldown` | Flash Step | Cooldowns -10% | ⚡ |
| `speed` | Drift | Move speed +10% | 🌀 |
| `damage` | Toxic Haze | Damage +10%, clouds deal 2 DPS | ☠️ |
| `cloud_count` | Smog Screen | +1 simultaneous cloud | ➕ |
| `crit` | Blindside | +5% Crit Chance, +20% Crit Damage | 🎯 |

### Permanent Upgrades (Altar)
| Key | Name | Desc |
|-----|------|------|
| `health` | Iron Lung | +5 Starting HP |
| `greed` | Murky Profits | +5% Gold Gain |
| `power` | Corrosive | +1% Damage |
| `swift` | Vapor Trail | +1% Speed |
| `defense` | Cloud Cover | +1% Damage Reduction |
| `wisdom` | Unseen Study | +2% XP Gain |

### Skill Tree Weights
`CLOUD_SIZE: 0.20 / CLOUD_DURATION: 0.20 / DAMAGE: 0.15 / COOLDOWN: 0.15 / SPEED: 0.15 / CLOUD_COUNT: 0.10 / HEALTH: 0.05`

### Visual Design
- Color: slate gray `#5a5a6e`
- Body: semi-translucent silhouette, edges dissolve into wisps
- Projectile: dark gray smoke bolt, leaves faint trailing particles
- Special: expanding dark smoke burst, fades from center outward
- Smoke clouds: circular semi-transparent gray overlays with slow swirl animation
- Dash: leaves visible smoke ghost at origin (lingers 0.5s, then disperses)

### SFX
| File | Description |
|------|-------------|
| `attack_smoke.wav` | Soft compressed air release, muffled impact |
| `melee_smoke.wav` | Heavy whoosh with dull thud |
| `dash_smoke.wav` | Fast exhale, short sharp hiss |
| `special_smoke.wav` | Deep pressurized burst, expanding room-tone |

### Voice Lines
| Trigger | Line |
|---------|------|
| `injured` | "You got lucky. That won't happen again." |
| `failure_1` | "Fading. Just like smoke." |
| `failure_2` | "Dissipate. That's all." |
| `twin_event` | "Two targets. More cloud cover needed." |
| `boss_moment_1` | "You can't hit what you can't see." |
| `boss_moment_2` | "Breathe in. That was a mistake." |
| `boss_win_1` | "You stood still too long." |
| `boss_win_2` | "The haze clears. You don't." |
| `found_1` | "That'll do nicely." |
| `found_2` | "Useful. Keep moving." |
| `level_up_1` | "Thicker. Darker. Better." |
| `level_up_2` | "Getting harder to see me." |
| `ultimate` | "BLACKOUT. Good luck finding me in here." |

---

## Biome 3 — The Smog Quarter (Smoke)

**Key:** `smoke` → `window.BIOME_LOGIC['smoke']`
**Background:** `#0f0f14` (near-black gray)
**Grid color:** `#5a5a6e33` (transparent slate)

### Atmosphere
Industrial ruin. Visibility is reduced by a persistent gray haze that covers the arena. Obstacles are crumbling concrete blocks half-swallowed by drifting smoke. Particles: slow-rolling smoke wisps that drift in a consistent wind direction.

### generate(arena)
- 14–18 square/blocky obstacles scattered throughout, more dense than average — creates chokepoints and cover opportunities that reward Smoke's positional play
- 3–4 large **Smog Pockets** (biome zones): all enemies entering lose 15% speed regardless of Smoke's active clouds (stacks with Smoke's clouds)
- Wind direction chosen at arena gen (random cardinal): smoke particles all drift that way

### update(arena, player, enemies)
- Each frame: spawn 2–3 smoke wisp particles at random arena positions, drifting in wind direction, slow velocity, long life (400–600 frames), large radius (8–15), low alpha
- Every 20s: wind direction shifts 90° clockwise — brief `showNotification("WIND SHIFT")` in gray
- Visibility effect: draw a global semi-transparent gray overlay (`rgba(15,15,20,0.25)`) over entire arena — applies regardless of which hero is playing. Enemies beyond radius 500 from player are dimmed further in draw pass.

### draw(ctx, arena)
- Background: near-black fill + diffuse gray radial fog (large, low opacity, player-centered)
- Smoke wisps: large soft circles (low alpha, `#8888aa` to `#555566`), drifting in wind direction
- Visibility vignette: dark gray overlay around screen edges, thinning at center

### drawObstacle(ctx, obs)
- Base: dark cracked concrete `#1a1a22` with rough texture (horizontal crack lines, varied spacing)
- Surface: soot staining — random dark patches drawn as low-opacity filled rects
- Bevel: light gray top-left edge (faded), near-black bottom-right
- Border: `#111118` stroke, slightly thicker than default

### Battle Music
| File | Description |
|------|-------------|
| `battle_smoke_1.wav` | Heavy, oppressive — low drones, muffled percussion, industrial noise |
| `battle_smoke_2.wav` | Tense and murky — staccato bass hits, filtered high-end, slow build |

---

## Collector Cards

Each hero gets a Bronze → Platinum card set:

| Card | Drop Chance | Bonus |
|------|-------------|-------|
| `psycho_1` — Psycho Bronze | 5% | Unlock Card |
| `psycho_2` — Psycho Silver | 1% | +10% Def vs Psycho-type |
| `psycho_3` — Psycho Gold | 0.1% | +20% XP from Psycho kills |
| `psycho_4` — Psycho Platinum | 0.05% | Hysteria Gauge fills 15% faster |
| `mirror_1` — Mirror Bronze | 5% | Unlock Card |
| `mirror_2` — Mirror Silver | 1% | +10% Def vs Mirror-type |
| `mirror_3` — Mirror Gold | 0.1% | +20% XP from Mirror kills |
| `mirror_4` — Mirror Platinum | 0.05% | Shield reflects deal +25% damage |
| `smoke_1` — Smoke Bronze | 5% | Unlock Card |
| `smoke_2` — Smoke Silver | 1% | +10% Def vs Smoke-type |
| `smoke_3` — Smoke Gold | 0.1% | +20% XP from Smoke kills |
| `smoke_4` — Smoke Platinum | 0.05% | Smoke clouds slow enemies +15% extra |

---

## Achievements

No story-gated achievements. All gameplay-based.

| ID | Title | Description | Bonus |
|----|-------|-------------|-------|
| `dod_psycho_hysteria` | Feedback Loop | Activate Hysteria 50 times total | +5% Dmg |
| `dod_psycho_reach30` | Unraveling | Reach Wave 30 with Psycho | +5% Speed |
| `dod_psycho_biome` | Into the Fracture | Survive 10 waves in the Mindscape biome | +3% Dmg |
| `dod_mirror_reflect100` | Hall of Mirrors | Reflect 100 projectiles total | +5% Def |
| `dod_mirror_reach30` | Perfect Surface | Reach Wave 30 with Mirror | +5% Dmg |
| `dod_mirror_biome` | Shining Labyrinth | Survive 10 waves in the Hall of Mirrors biome | +3% Def |
| `dod_smoke_clouds` | Smog City | Have 3 simultaneous smoke clouds 25 times | +5% XP |
| `dod_smoke_reach30` | Vanishing Act | Reach Wave 30 with Smoke | +5% Def |
| `dod_smoke_biome` | Lost in the Haze | Survive 10 waves in the Smog Quarter biome | +3% Speed |
| `dod_pack_all` | Disciples | Reach Wave 20 with all 3 DLC heroes | +3% all stats |

---

## File Structure

```
dlc/disciples_of_deception/
├── index.js
├── PsychoHero.js
├── MirrorHero.js
├── SmokeHero.js
├── MindscapeBiome.js
├── HallOfMirrorsBiome.js
├── SmogQuarterBiome.js
├── images/
│   ├── title.png
│   ├── psycho.png
│   ├── mirror.png
│   └── smoke.png
└── audio/
    ├── music/
    │   ├── battle_psycho_1.wav
    │   ├── battle_psycho_2.wav
    │   ├── battle_mirror_1.wav
    │   ├── battle_mirror_2.wav
    │   ├── battle_smoke_1.wav
    │   └── battle_smoke_2.wav
    ├── sounds/
    │   ├── attack_psycho.wav
    │   ├── melee_psycho.wav
    │   ├── dash_psycho.wav
    │   ├── special_psycho.wav
    │   ├── hysteria_activate.wav
    │   ├── attack_mirror.wav
    │   ├── melee_mirror.wav
    │   ├── dash_mirror.wav
    │   ├── special_mirror.wav
    │   ├── shield_activate.wav
    │   ├── shield_reflect.wav
    │   ├── attack_smoke.wav
    │   ├── melee_smoke.wav
    │   ├── dash_smoke.wav
    │   └── special_smoke.wav
    └── voices/
        ├── psycho/
        │   ├── injured.mp3
        │   ├── failure_1.mp3
        │   ├── failure_2.mp3
        │   ├── twin_event.mp3
        │   ├── boss_moment_1.mp3
        │   ├── boss_moment_2.mp3
        │   ├── boss_win_1.mp3
        │   ├── boss_win_2.mp3
        │   ├── found_1.mp3
        │   ├── found_2.mp3
        │   ├── level_up_1.mp3
        │   ├── level_up_2.mp3
        │   └── ultimate.mp3
        ├── mirror/
        │   └── [same 13 files]
        └── smoke/
            └── [same 13 files]
```

---

## index.js Structure (outline)

```js
const DISCIPLES_OF_DECEPTION = {
    id: 'disciples_of_deception',
    name: "Disciples of Deception",
    heroes: ['psycho', 'mirror', 'smoke'],
    description: "Introduces three deception-themed heroes: Psycho (Teal), Mirror (Marine Blue), and Smoke (Slate Gray).",

    load: async function() {
        // Load hero scripts
        await dlcManager.loadScript('dlc/disciples_of_deception/PsychoHero.js');
        await dlcManager.loadScript('dlc/disciples_of_deception/MirrorHero.js');
        await dlcManager.loadScript('dlc/disciples_of_deception/SmokeHero.js');
        // Load biome scripts
        await dlcManager.loadScript('dlc/disciples_of_deception/MindscapeBiome.js');
        await dlcManager.loadScript('dlc/disciples_of_deception/HallOfMirrorsBiome.js');
        await dlcManager.loadScript('dlc/disciples_of_deception/SmogQuarterBiome.js');

        this.injectHero();       // × 3 heroes
        this.injectBiome();      // registers BIOME_LOGIC keys + dlcBiomes list entry
        this.injectAltar();      // × 3 heroes
        this.injectAchievements();
        this.injectCards();

        // Register battle music
        audioManager.registerSounds({
            'battle_psycho_1': { path: '...', loop: true, volume: 0.4 },
            'battle_psycho_2': { path: '...', loop: true, volume: 0.4 },
            'battle_mirror_1': { path: '...', loop: true, volume: 0.4 },
            'battle_mirror_2': { path: '...', loop: true, volume: 0.4 },
            'battle_smoke_1':  { path: '...', loop: true, volume: 0.4 },
            'battle_smoke_2':  { path: '...', loop: true, volume: 0.4 },
            // SFX ...
        });

        // Register voice exclamation paths
        audioManager.registerExclamationPath('psycho', (s) => `dlc/disciples_of_deception/audio/voices/psycho/${s}.mp3`);
        audioManager.registerExclamationPath('mirror', (s) => `dlc/disciples_of_deception/audio/voices/mirror/${s}.mp3`);
        audioManager.registerExclamationPath('smoke',  (s) => `dlc/disciples_of_deception/audio/voices/smoke/${s}.mp3`);

        // NO: injectStory / injectMemories / injectStoryArcLabels
    }
};
```

> **Note:** `injectBiome()` must push `'psycho'`, `'mirror'`, `'smoke'` into the `dlcBiomes` array in `game.js:advanceWave()`. Biomes then enter the standard random pool for all heroes in non-story runs — same behavior as `earth`, `lightning`, `gravity`, etc.

---

## Resolved Design Decisions

| Topic | Decision |
|-------|----------|
| Hysteria confusion visual | Swirling teal icon above confused enemy for debuff duration |
| Smoke clouds in multiplayer | Visible to all players (co-op and versus) |
| Smog Quarter visibility reduction | Global — applies to all heroes, not just Smoke |
| DLC music | No unique tracks — uses base game music |
| Biome random pool | Added to standard DLC pool, appears for any hero in non-story runs |
