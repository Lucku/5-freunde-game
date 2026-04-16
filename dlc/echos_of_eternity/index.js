// Echos of Eternity — DLC Manifest
// The narrative and mechanical culmination of 5 Freunde.
// Introduces the Time hero (sand), the hidden Love hero (pink),
// and the Maze of Time — a persistent branching story map.
//
// Phase 1–3 scope: Time hero, biome, Timeline Fracture mechanic,
//                  Maze of Time (75 deterministic nodes), Hunting List,
//                  altar, achievements, memories, collector cards, audio hooks.

const ECHOS_OF_ETERNITY = {
    id: 'echos_of_eternity',
    name: "Echos of Eternity",
    heroes: ['time', 'love'],

    load: async function () {
        console.log("[DLC] Loading: Echos of Eternity...");

        if (window.dlcManager) {
            await window.dlcManager.loadScript('dlc/echos_of_eternity/TimeBiome.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/TimeHero.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/LoveBiome.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/LoveHero.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/MazeOfTime.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/MazeUI.js');
            await window.dlcManager.loadScript('dlc/echos_of_eternity/TimeBosses.js');
        }

        this.injectHeroes();
        this.injectBiome();
        this.injectWeather();
        this.injectMaze();
        this.injectStory();
        this.injectStoryArcLabels();
        this.injectAltar();
        this.injectAchievements();
        this.injectMemories();
        this.injectCards();

        if (typeof audioManager !== 'undefined') {
            audioManager.registerSounds({
                // ── Music ─────────────────────────────────────────────────────────
                'battle_dlc_1': { path: 'dlc/echos_of_eternity/audio/music/battle_all_1.wav', loop: true, volume: 0.40 },
                'battle_dlc_2': { path: 'dlc/echos_of_eternity/audio/music/battle_all_2.wav', loop: true, volume: 0.40 },
                'battle_dlc_3': { path: 'dlc/echos_of_eternity/audio/music/battle_all_3.wav', loop: true, volume: 0.40 },
                'boss_dlc_all': { path: 'dlc/echos_of_eternity/audio/music/boss_all.wav', loop: true, volume: 0.60 },
                'eternal_collapse': { path: 'dlc/echos_of_eternity/audio/music/boss_eternal_collapse.wav', loop: true, volume: 0.65 },
                'maze_theme': { path: 'dlc/echos_of_eternity/audio/music/time_maze.wav', loop: true, volume: 0.45 },
                // ── Time Hero SFX ─────────────────────────────────────────────────
                'attack_time': { path: 'dlc/echos_of_eternity/audio/sounds/attack_time.wav', volume: 0.22 },
                'melee_time': { path: 'dlc/echos_of_eternity/audio/sounds/melee_time.wav', volume: 0.28 },
                'special_time': { path: 'dlc/echos_of_eternity/audio/sounds/special_time.wav', volume: 0.50 },
                'paradox_time': { path: 'dlc/echos_of_eternity/audio/sounds/paradox_time.wav', volume: 0.65 },
                'paradox_end_time': { path: 'dlc/echos_of_eternity/audio/sounds/paradox_end_time.wav', volume: 0.45 },
                // ── TimeBoss SFX ──────────────────────────────────────────────────
                'time_wraith_shadow_pulse': { path: 'dlc/echos_of_eternity/audio/sounds/boss_time_wraith_shadow_pulse.wav', volume: 0.45 },
                'time_wraith_twin_shot': { path: 'dlc/echos_of_eternity/audio/sounds/boss_time_wraith_twin_shot.wav', volume: 0.35 },
                'time_wraith_blink': { path: 'dlc/echos_of_eternity/audio/sounds/boss_time_wraith_blink.wav', volume: 0.40 },
                'time_wraith_clone_spawn': { path: 'dlc/echos_of_eternity/audio/sounds/boss_time_wraith_clone_spawn.wav', volume: 0.50 },
                'time_wraith_final_echo': { path: 'dlc/echos_of_eternity/audio/sounds/boss_time_wraith_final_echo.wav', volume: 0.60 },
                'temporal_rift_portal_shot': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_rift_portal_shot.wav', volume: 0.30 },
                'temporal_rift_void_pull': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_rift_void_pull.wav', volume: 0.55 },
                'temporal_rift_shockwave': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_rift_shockwave.wav', volume: 0.55 },
                'temporal_rift_destabilized': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_rift_destabilized.wav', volume: 0.65 },
                'eternal_collapse_absorb': { path: 'dlc/echos_of_eternity/audio/sounds/boss_eternal_collapse_absorb.wav', volume: 0.45 },
                'eternal_collapse_release': { path: 'dlc/echos_of_eternity/audio/sounds/boss_eternal_collapse_release.wav', volume: 0.55 },
                'eternal_collapse_spiral': { path: 'dlc/echos_of_eternity/audio/sounds/boss_eternal_collapse_spiral.wav', volume: 0.40 },
                'eternal_collapse_mega_burst': { path: 'dlc/echos_of_eternity/audio/sounds/boss_eternal_collapse_mega_burst.wav', volume: 0.70 },
                'eternal_collapse_phase_surge': { path: 'dlc/echos_of_eternity/audio/sounds/boss_eternal_collapse_phase_surge.wav', volume: 0.65 },
                'mask_guardian_shield_up': { path: 'dlc/echos_of_eternity/audio/sounds/boss_mask_guardian_shield_up.wav', volume: 0.50 },
                'mask_guardian_shield_break': { path: 'dlc/echos_of_eternity/audio/sounds/boss_mask_guardian_shield_break.wav', volume: 0.55 },
                'mask_guardian_dash_charge': { path: 'dlc/echos_of_eternity/audio/sounds/boss_mask_guardian_dash_charge.wav', volume: 0.50 },
                'mask_guardian_unleashed': { path: 'dlc/echos_of_eternity/audio/sounds/boss_mask_guardian_unleashed.wav', volume: 0.65 },
                'makuta_void_spiral': { path: 'dlc/echos_of_eternity/audio/sounds/boss_makuta_void_spiral.wav', volume: 0.40 },
                'makuta_echo_spawn': { path: 'dlc/echos_of_eternity/audio/sounds/boss_makuta_echo_spawn.wav', volume: 0.45 },
                'makuta_void_nova': { path: 'dlc/echos_of_eternity/audio/sounds/boss_makuta_void_nova.wav', volume: 0.60 },
                'makuta_echo_convergence': { path: 'dlc/echos_of_eternity/audio/sounds/boss_makuta_echo_convergence.wav', volume: 0.65 },
                'chrome_leviathan_laser': { path: 'dlc/echos_of_eternity/audio/sounds/boss_chrome_leviathan_laser.wav', volume: 0.50 },
                'chrome_leviathan_stomp': { path: 'dlc/echos_of_eternity/audio/sounds/boss_chrome_leviathan_stomp.wav', volume: 0.60 },
                'chrome_leviathan_spread': { path: 'dlc/echos_of_eternity/audio/sounds/boss_chrome_leviathan_spread.wav', volume: 0.35 },
                'chrome_leviathan_rage': { path: 'dlc/echos_of_eternity/audio/sounds/boss_chrome_leviathan_rage.wav', volume: 0.65 },
                'temporal_warden_dash': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_warden_dash.wav', volume: 0.40 },
                'temporal_warden_dash_burst': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_warden_dash_burst.wav', volume: 0.45 },
                'temporal_warden_erase_grid': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_warden_erase_grid.wav', volume: 0.55 },
                'temporal_warden_unchained': { path: 'dlc/echos_of_eternity/audio/sounds/boss_temporal_warden_unchained.wav', volume: 0.65 },
                'boss_thunder_lightning_volley': { path: 'dlc/echos_of_eternity/audio/sounds/boss_thunder_lightning_volley.wav', volume: 0.45 },
                'boss_thunder_barrage': { path: 'dlc/echos_of_eternity/audio/sounds/boss_thunder_barrage.wav', volume: 0.50 },
                'boss_thunder_storm_ring': { path: 'dlc/echos_of_eternity/audio/sounds/boss_thunder_storm_ring.wav', volume: 0.60 },
                'boss_thunder_titan_fury': { path: 'dlc/echos_of_eternity/audio/sounds/boss_thunder_titan_fury.wav', volume: 0.65 },
                'boss_spirit_orb_fire': { path: 'dlc/echos_of_eternity/audio/sounds/boss_spirit_orb_fire.wav', volume: 0.25 },
                'boss_spirit_luck_cascade': { path: 'dlc/echos_of_eternity/audio/sounds/boss_spirit_luck_cascade.wav', volume: 0.50 },
                'boss_spirit_chaos_nova': { path: 'dlc/echos_of_eternity/audio/sounds/boss_spirit_chaos_nova.wav', volume: 0.55 },
                'boss_spirit_chaos_ascendant': { path: 'dlc/echos_of_eternity/audio/sounds/boss_spirit_chaos_ascendant.wav', volume: 0.65 },
            });
            // ── Music hooks (priority: maze=200 > eternal_collapse=100 > boss_dlc=75 > battle=50) ──
            audioManager.registerMusicHook({
                priority: 200,
                check: () => !!window.mazeIsOpen,
                play: () => 'maze_theme',
            });
            audioManager.registerMusicHook({
                priority: 100,
                check: () => typeof bossActive !== 'undefined' && bossActive &&
                    typeof player !== 'undefined' && player &&
                    (player.type === 'time' || player.type === 'love') &&
                    typeof enemies !== 'undefined' &&
                    enemies.some(e => e instanceof Boss && e.type === 'ETERNAL_COLLAPSE'),
                play: () => 'eternal_collapse',
            });
            audioManager.registerMusicHook({
                priority: 75,
                check: () => typeof bossActive !== 'undefined' && bossActive &&
                    typeof player !== 'undefined' && player &&
                    (player.type === 'time' || player.type === 'love'),
                play: () => 'boss_dlc_all',
            });
            audioManager.registerMusicHook({
                priority: 50,
                check: () => typeof player !== 'undefined' && player &&
                    (player.type === 'time' || player.type === 'love') &&
                    audioManager.isStoryMode(),
                play: (am) => {
                    // Keep playing whichever track is already running to avoid mid-song interrupts
                    const pool = ['battle_dlc_1', 'battle_dlc_2', 'battle_dlc_3'];
                    const playing = pool.find(k => am.tracks[k] && !am.tracks[k].paused);
                    if (playing) return playing;
                    return pool[Math.floor(Math.random() * pool.length)];
                },
            });

            audioManager.registerVoicePath('time', id => `dlc/echos_of_eternity/audio/memories/time_${id}.mp3`);
            audioManager.registerVoicePath('love', id => `dlc/echos_of_eternity/audio/memories/love_${id}.mp3`);
            window.STORY_AUDIO_RESOLVERS = window.STORY_AUDIO_RESOLVERS || {};
            const _eoeAudio = (id) => `dlc/echos_of_eternity/audio/story/${id.replace(/^maze_/, '')}.mp3`;
            window.STORY_AUDIO_RESOLVERS['TIME'] = _eoeAudio;
            window.STORY_AUDIO_RESOLVERS['LOVE'] = _eoeAudio;
            audioManager.registerExclamationPath('time', (s) => `dlc/echos_of_eternity/audio/voices/time/${s}.mp3`);
            audioManager.registerExclamationPath('love', (s) => `dlc/echos_of_eternity/audio/voices/love/${s}.mp3`);
            window.STORY_TITLE_IMAGES = window.STORY_TITLE_IMAGES || {};
            window.STORY_TITLE_IMAGES['time'] = 'dlc/echos_of_eternity/images/title.png';
            window.STORY_TITLE_IMAGES['love'] = 'dlc/echos_of_eternity/images/title.png';

            // ── Love Hero SFX + weather DLC sounds ───────────────────────────────
            audioManager.registerSounds({
                'attack_love': { path: 'dlc/echos_of_eternity/audio/sounds/attack_love.wav', volume: 0.22 },
                'melee_love': { path: 'dlc/echos_of_eternity/audio/sounds/melee_love.wav', volume: 0.28 },
                'special_love': { path: 'dlc/echos_of_eternity/audio/sounds/special_love.wav', volume: 0.50 },
                'unity_love': { path: 'dlc/echos_of_eternity/audio/sounds/unity_love.wav', volume: 0.65 },
                'heartburst_love': { path: 'dlc/echos_of_eternity/audio/sounds/heartburst_love.wav', volume: 0.55 },
                'weather_temporal_rift': { path: 'dlc/echos_of_eternity/audio/sounds/weather_temporal_rift.wav', loop: true, volume: 0.30 },
                'weather_petal_storm': { path: 'dlc/echos_of_eternity/audio/sounds/weather_petal_storm.wav', loop: true, volume: 0.25 },
            });
        }

        console.log("[DLC] Loaded: Echos of Eternity (Success)");
    },

    // ─── Heroes ──────────────────────────────────────────────────────────────
    injectHeroes: function () {
        if (typeof BASE_HERO_STATS !== 'undefined') {
            BASE_HERO_STATS['time'] = {
                color: '#c8aa6e',   // Sand gold
                hp: 95,
                speed: 4.2,
                rangeDmg: 24,
                meleeDmg: 55,
                rangeCd: 28,
                meleeCd: 90,
                projectileSpeed: 11,
                projectileSize: 8,
                knockback: 14,
                // Custom resources (applied in TimeHero.init)
                chronoEnergy: 0,
                timelineBurden: 0
            };

            // Love hero — registered but hidden until unlocked via Maze of Time
            BASE_HERO_STATS['love'] = {
                color: '#ff6b9d',   // Rose pink
                hp: 110,
                speed: 4.8,
                rangeDmg: 32,
                meleeDmg: 62,
                rangeCd: 22,
                meleeCd: 65,
                projectileSpeed: 12,
                projectileSize: 10,
                knockback: 12,
                // Custom resource (applied in LoveHero.init)
                affection: 0
            };
        }

        if (!window.HERO_LOGIC) window.HERO_LOGIC = {};
        window.HERO_LOGIC['time'] = window.TimeHero;
        window.HERO_LOGIC['love'] = window.LoveHero;

        // Ensure save data entry for love exists
        if (typeof saveData !== 'undefined') {
            if (!saveData['love']) {
                saveData['love'] = { level: 0, unlocked: 0, highScore: 0, prestige: 0 };
            }
        }
    },

    // ─── Weather ─────────────────────────────────────────────────────────────
    injectWeather: function () {
        if (typeof WEATHER_TYPES === 'undefined') return;
        if (WEATHER_TYPES.some(w => w.id === 'TEMPORAL_RIFT')) return; // already injected

        // TEMPORAL RIFT — TimeBiome exclusive; screen desaturates, time echo particles flicker
        WEATHER_TYPES.push({ id: 'TEMPORAL_RIFT', name: 'TEMPORAL RIFT', color: 'rgba(100, 80, 180, 0.25)', duration: 720 });

        // PETAL STORM — LoveBiome exclusive; aesthetic, slowly fills affection meter
        WEATHER_TYPES.push({ id: 'PETAL_STORM', name: 'PETAL STORM', color: 'rgba(255, 120, 180, 0.12)', duration: 600 });

        // ── TEMPORAL RIFT: logic hook ─────────────────────────────────────────
        if (window._weatherLogicHooks) {
            window._weatherLogicHooks['TEMPORAL_RIFT'] = function (wFadeIn, _frame) {
                // Spawn faint "time echo" particles — ghostly duplicate shapes drifting upward
                if (typeof weatherParticles !== 'undefined' && Math.random() < 0.15 * wFadeIn) {
                    weatherParticles.push({
                        x: Math.random() * (typeof canvas !== 'undefined' ? canvas.width : 800),
                        y: Math.random() * (typeof canvas !== 'undefined' ? canvas.height : 600),
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: -(0.3 + Math.random() * 0.5),
                        r: 8 + Math.random() * 16,
                        alpha: 0.06 + Math.random() * 0.10,
                        wobble: Math.random() * Math.PI * 2,
                        echo: true,
                    });
                }
            };
        }

        // ── TEMPORAL RIFT: draw hook ──────────────────────────────────────────
        if (window._weatherDrawHooks) {
            window._weatherDrawHooks['TEMPORAL_RIFT'] = function (ctx, wFadeIn, _frame) {
                // Desaturation vignette — purple-grey radial gradient
                ctx.save();
                const _tg = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 80,
                    canvas.width / 2, canvas.height / 2, 650
                );
                _tg.addColorStop(0, 'transparent');
                _tg.addColorStop(1, `rgba(60, 40, 100, ${0.50 * wFadeIn})`);
                ctx.fillStyle = _tg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Pulsing time-crack vignette
                const _pulse = 0.5 + 0.5 * Math.sin((_frame || 0) * 0.04);
                ctx.strokeStyle = `rgba(140, 100, 220, ${0.25 * wFadeIn * _pulse})`;
                ctx.lineWidth = 3;
                ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
                ctx.restore();

                // Draw echo particles
                if (typeof weatherParticles !== 'undefined') {
                    ctx.save();
                    for (const p of weatherParticles) {
                        if (!p.echo) continue;
                        ctx.globalAlpha = p.alpha;
                        ctx.strokeStyle = '#b8a0ff';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }
            };
        }

        // ── PETAL STORM: logic hook ───────────────────────────────────────────
        if (window._weatherLogicHooks) {
            window._weatherLogicHooks['PETAL_STORM'] = function (wFadeIn, _frame) {
                // Spawn rose petal particles
                if (typeof weatherParticles !== 'undefined' && Math.random() < 0.5 * wFadeIn) {
                    weatherParticles.push({
                        x: Math.random() * (typeof canvas !== 'undefined' ? canvas.width : 800),
                        y: -10,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: 0.8 + Math.random() * 1.5,
                        r: 3 + Math.random() * 4,
                        alpha: 0.4 + Math.random() * 0.4,
                        wobble: Math.random() * Math.PI * 2,
                        petal: true,
                        hue: 320 + Math.random() * 40,
                    });
                }
                // Slowly fill affection meter for Love hero
                if (typeof player !== 'undefined' && player && player.type === 'love' &&
                    typeof player.affection !== 'undefined' && _frame % 60 === 0) {
                    player.affection = Math.min(100, (player.affection || 0) + 1.5 * wFadeIn);
                }
            };
        }

        // ── PETAL STORM: draw hook ────────────────────────────────────────────
        if (window._weatherDrawHooks) {
            window._weatherDrawHooks['PETAL_STORM'] = function (ctx, wFadeIn, _frame) {
                // Soft pink vignette
                ctx.save();
                const _pg = ctx.createRadialGradient(
                    canvas.width / 2, canvas.height / 2, 100,
                    canvas.width / 2, canvas.height / 2, 700
                );
                _pg.addColorStop(0, 'transparent');
                _pg.addColorStop(1, `rgba(255, 100, 160, ${0.22 * wFadeIn})`);
                ctx.fillStyle = _pg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw petal particles
                if (typeof weatherParticles !== 'undefined') {
                    ctx.save();
                    for (const p of weatherParticles) {
                        if (!p.petal) continue;
                        ctx.globalAlpha = p.alpha;
                        ctx.fillStyle = `hsl(${p.hue || 330}, 90%, 75%)`;
                        ctx.beginPath();
                        ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.wobble, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                    ctx.restore();
                }
            };
        }

        // Biome-lock: these weathers only appear in their biomes
        // They're added via the biome-weighted selection naturally (TimeBiome → TEMPORAL_RIFT, LoveBiome → PETAL_STORM)
        // But we also need them excluded from non-time/love biomes.
        // We inject this exclusion by patching the biome-boost map entry in the weather selector — done by
        // exposing a _weatherBiomeLocks registry that the base game checks.
        if (!window._weatherBiomeLocks) window._weatherBiomeLocks = {};
        window._weatherBiomeLocks['TEMPORAL_RIFT'] = { biomes: ['time', 'eternity'], dlcId: 'echos_of_eternity' };
        window._weatherBiomeLocks['PETAL_STORM'] = { biomes: ['love', 'heart'], dlcId: 'echos_of_eternity' };
    },

    // ─── Biome ───────────────────────────────────────────────────────────────
    injectBiome: function () {
        if (!window.BIOME_LOGIC) window.BIOME_LOGIC = {};
        window.BIOME_LOGIC['time'] = window.TimeBiome;
        window.BIOME_LOGIC['eternity'] = window.TimeBiome;
        window.BIOME_LOGIC['love'] = window.LoveBiome;
        window.BIOME_LOGIC['heart'] = window.LoveBiome;
    },

    // ─── Story Arc Labels ────────────────────────────────────────────────────
    injectStoryArcLabels: function () {
        window.STORY_ARC_LABELS = window.STORY_ARC_LABELS || {};
        window.STORY_ARC_LABELS['time'] = function (w) {
            if (w <= 8) return '✦  PROLOGUE  ·  THE FRACTURE  ✦';
            if (w <= 20) return '✦  ARC I  ·  SHATTERED TIMELINES  ✦';
            if (w <= 35) return '✦  ARC II  ·  THE MAZE OF TIME  ✦';
            if (w <= 48) return '✦  ARC III  ·  CONVERGENCE  ✦';
            return '✦  THE ETERNAL COLLAPSE  ✦';
        };
        window.STORY_ARC_LABELS['love'] = function (w) {
            if (w <= 8) return '✦  PROLOGUE  ·  THE WAITING  ✦';
            if (w <= 20) return '✦  ARC I  ·  UNRAVELING  ✦';
            if (w <= 35) return '✦  ARC II  ·  THE HEART NEXUS  ✦';
            if (w <= 48) return '✦  ARC III  ·  TRUTH  ✦';
            return '✦  HEART OF UNITY  ✦';
        };
    },

    // ─── Story Events (Prologue — 10 linear events before the Maze) ──────────
    injectStory: function () {
        const events = window.STORY_EVENTS || (typeof STORY_EVENTS !== 'undefined' ? STORY_EVENTS : null);
        if (!events) { console.error("[DLC] Echos of Eternity: STORY_EVENTS not found."); return; }
        if (events.some(e => e.id === 'echo_time_1')) return; // already injected

        const timeStory = [
            // ── Prologue: The Fracture ──
            {
                id: 'echo_time_1', wave: 1, hero: 'TIME', type: 'NARRATIVE',
                title: 'The Fracture',
                text: 'Reality is cracking. You can feel it — not with your hands, but with something deeper. A tremor beneath causality itself. You are Time. And something has gone terribly wrong with the timeline.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_2', wave: 2, hero: 'TIME', type: 'NARRATIVE',
                title: 'First Echo',
                text: 'You see yourself. Standing twenty steps ahead. Raising your hand in warning. Then gone — dissolved like smoke. An echo. A memory of a future that never arrived. The cracks are letting them through.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_3', wave: 3, hero: 'TIME', type: 'NARRATIVE',
                title: 'The Weight',
                text: 'You feel every moment simultaneously. The past pressing down. The future bleeding through. Others experience time as a river. You experience it as an ocean. And it is flooding.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_4', wave: 4, hero: 'TIME', type: 'NARRATIVE',
                title: 'A World That Burned',
                text: 'Through a fracture in reality you glimpse another world. The arena, but emptied of everything except ash. The five heroes — defeated. Makuta standing over their silence. This is one of the timelines. This is what awaits if you fail.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_5', wave: 5, hero: 'TIME', type: 'NARRATIVE',
                title: 'The Burden of Knowing',
                text: 'You have always known what would happen. Every action, every consequence cascading outward. You thought it was a gift. Standing here, watching timelines bleed into each other, you understand it was always a curse.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_6', wave: 6, hero: 'TIME', type: 'NARRATIVE',
                title: 'Fragments',
                text: 'Pieces of other realities drift past. A moment where the Fire hero laughed freely at a feast that never happened. A version of the Void hero who chose differently at the end. Versions of everyone — but where is a version of you that was at peace?',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_7', wave: 7, hero: 'TIME', type: 'NARRATIVE',
                title: 'The Hidden Force',
                text: 'Something is guiding events. You can sense it — a subtle current running beneath the fractured chaos. Calm. Warm. Like a hand on your shoulder in the dark. You cannot see it. But you know it is the only reason the timelines have not already collapsed entirely.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_8', wave: 8, hero: 'TIME', type: 'NARRATIVE',
                title: 'What You Left Behind',
                text: 'You see the echo of a house. A door you never opened again. A face you refused to remember. The timeline does not lie. Every choice you ever ran from is here, watching you. You realize this war is not only against the fracture. It is against yourself.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_9', wave: 9, hero: 'TIME', type: 'NARRATIVE',
                title: 'The Maze',
                text: 'Before you a structure materializes from the collapsing timelines — a vast labyrinth woven from every possible path. Every fork a moment where history split. Every dead end a life unlived. This is the Maze of Time. Somewhere inside it is the answer. And somewhere inside it, the truth you have been avoiding.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_time_10', wave: 10, hero: 'TIME', type: 'NARRATIVE',
                title: 'First Step In',
                text: 'You take the first step into the Maze. The air tastes like old decisions. Behind you the entrance seals. There is no turning back — only forward through the fractures, through every version of every moment, toward whatever waits at the center of eternity.',
                data: { biome: 'HERO' }
            },
        ];

        events.push(...timeStory);

        // ── Love Hero Prologue (10 linear events, waves 1-10) ──
        if (events.some(e => e.id === 'echo_love_1')) return;
        const loveStory = [
            {
                id: 'echo_love_1', wave: 1, hero: 'LOVE', type: 'NARRATIVE',
                title: 'The House',
                text: 'The house is quiet again. It is always quiet now. You walk through rooms that used to hold laughter and find only the echo of it — a shape pressed into everything you touch. He left three days ago. He said it was work. You stopped believing that a long time ago.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_2', wave: 2, hero: 'LOVE', type: 'NARRATIVE',
                title: 'What He Said',
                text: 'He was always very good with words. Always had an explanation. Always came back with something that made just enough sense to quiet your doubt. You were a very good student. You learned to doubt your doubt instead of doubting him.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_3', wave: 3, hero: 'LOVE', type: 'NARRATIVE',
                title: 'The Small Signs',
                text: "A receipt in the wrong city. A name in his phone that appeared and disappeared. Cologne you didn't recognize. You filed each one away in the back of your mind, and on top of the pile you placed his explanation, and you called that trust.",
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_4', wave: 4, hero: 'LOVE', type: 'NARRATIVE',
                title: 'Absence',
                text: 'The fractures in reality began as absences. Not cracks in the world — cracks in the shape of him. The space where a Sunday morning used to be. The dinner table for one. The half of a bed that stays cold. You learned to love absence. That is how you survived it.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_5', wave: 5, hero: 'LOVE', type: 'NARRATIVE',
                title: 'What Love Is',
                text: 'You used to think love was a feeling. A warmth. A certainty. Then you thought love was a choice. Then you thought love was an act of will against every instinct that told you to leave. Now, walking through collapsing timelines, you think love might just be the last thing that doesn\'t break.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_6', wave: 6, hero: 'LOVE', type: 'NARRATIVE',
                title: 'The Force',
                text: 'You feel it — something guiding the fractures. Keeping the timelines from collapsing entirely. You didn\'t know you were doing it. You have always been the thing that held the center. You just never had a name for it before.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_7', wave: 7, hero: 'LOVE', type: 'NARRATIVE',
                title: 'The Other Path',
                text: 'Through the fractures you glimpse another person navigating the same maze — from the other side. Movements you almost recognize. A silhouette you know the weight of. He is here. And he doesn\'t know you are too.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_8', wave: 8, hero: 'LOVE', type: 'NARRATIVE',
                title: 'What You Carry',
                text: 'The enemies that attack you carry grief with them. Not their own. Yours. They feed on what you left behind. And you realize that the power growing in you — the ability to bind things, to connect, to convert hate into warmth — is not a gift from the fractures. It was always there.',
                data: { biome: 'HERO' }
            },
            {
                id: 'echo_love_9', wave: 9, hero: 'LOVE', type: 'NARRATIVE',
                title: 'The Heart Nexus',
                text: 'A place forms around you — built from the accumulated warmth of every connection that ever held. The Heart Nexus. It is yours. Not because you claimed it, but because you never stopped building it even when you thought no one was watching.',
                data: { biome: 'love' }
            },
            {
                id: 'echo_love_10', wave: 10, hero: 'LOVE', type: 'NARRATIVE',
                title: 'Into the Maze',
                text: 'The Maze of Time opens before you too. But your paths through it are different from his. You are not trying to fix what he broke. You are trying to understand it. There is a difference. And somewhere in that difference is the end of the story — the one that was never told.',
                data: { biome: 'love' }
            },
        ];

        events.push(...loveStory);
    },

    // ─── Altar ───────────────────────────────────────────────────────────────
    injectAltar: function () {
        if (typeof ALTAR_TREE === 'undefined') return;

        ALTAR_TREE['time'] = [
            { id: 't1', req: 1, type: 'stat', stat: 'chronoGain', val: 0.20, desc: 'Temporal Precision: Chrono energy gain +20%' },
            { id: 't2', req: 3, type: 'unique', desc: 'Echo Mastery: Begin each run with a temporal echo already spawned' },
            { id: 't3', req: 5, type: 'unique', desc: 'Paradox Engine: Fracture shadows explode on death, dealing AoE damage to nearby enemies' }
        ];

        ALTAR_TREE['love'] = [
            { id: 'l1', req: 1, type: 'stat', stat: 'charmDuration', val: 45, desc: 'Lingering Touch: Charm duration +0.75 seconds on all sources' },
            { id: 'l2', req: 3, type: 'unique', desc: 'Devoted Companion: Love Companion spawns immediately at wave start and respawns in half the time' },
            { id: 'l3', req: 5, type: 'unique', desc: 'Healing Bond: Emotional Resonance pulses also heal you for 2 HP each time they fire' }
        ];

        // Cross-element convergence mutations
        const timeMutations = [
            { id: 'ct1', req: { time: 5, lightning: 5 }, type: 'mutation', name: 'Delayed Lightning', desc: 'Temporal bolts trigger a chain lightning strike after 2 seconds' },
            { id: 'ct2', req: { time: 5, gravity: 5 }, type: 'mutation', name: 'Time Dilation', desc: 'Chrono Strike creates a gravity well that amplifies the slow' },
            { id: 'ct3', req: { time: 5, fire: 5 }, type: 'mutation', name: 'Burning Moment', desc: 'Slowed enemies ignite, taking fire damage over time' },
            { id: 'ct4', req: { time: 5, ice: 5 }, type: 'mutation', name: 'Frozen Timeline', desc: 'Chrono Strike fully freezes enemies instead of slowing them' },
            { id: 'ct5', req: { time: 5, void: 5 }, type: 'mutation', name: 'Void Echo', desc: 'Echoes fire void-infused bolts that reduce enemy damage by 15%' },
            { id: 'ct6', req: { time: 5, earth: 5 }, type: 'mutation', name: 'Stone Moment', desc: 'Temporal Anchor also roots enemies in place (cannot be knocked back)' },
            { id: 'ct7', req: { time: 5, air: 5 }, type: 'mutation', name: 'Temporal Gust', desc: 'Echoes move slowly toward enemies, doubling their effective range' },
        ];

        const loveMutations = [
            { id: 'cl1', req: { love: 5, fire: 5 }, type: 'mutation', name: 'Heartbreak', desc: 'Charmed enemies ignite when their charm expires, dealing burst fire damage' },
            { id: 'cl2', req: { love: 5, ice: 5 }, type: 'mutation', name: 'Frozen Heart', desc: 'Heart Arrows freeze enemies briefly instead of charming them' },
            { id: 'cl3', req: { love: 5, lightning: 5 }, type: 'mutation', name: 'Charged Connection', desc: 'Resonance links also fire chain lightning between linked enemies' },
            { id: 'cl4', req: { love: 5, void: 5 }, type: 'mutation', name: 'Void Bond', desc: 'Emotional Resonance creates an unstable link that pulls linked enemies toward each other' },
            { id: 'cl5', req: { love: 5, plant: 5 }, type: 'mutation', name: 'Growing Bond', desc: 'Love Companion also occasionally drops a healing flower on the ground' },
            { id: 'cl6', req: { love: 5, gravity: 5 }, type: 'mutation', name: 'Gravity of Love', desc: 'Embrace pulls enemies twice as far and roots them briefly after landing' },
            { id: 'cl7', req: { love: 5, time: 5 }, type: 'mutation', name: 'Timeless Love', desc: 'Charmed enemies stay charmed even after Time hero uses Chrono Strike on them' },
        ];

        if (ALTAR_TREE.convergence) {
            timeMutations.forEach(m => {
                if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id))
                    ALTAR_TREE.convergence.push(m);
            });
            loveMutations.forEach(m => {
                if (!ALTAR_TREE.convergence.find(ex => ex.id === m.id))
                    ALTAR_TREE.convergence.push(m);
            });
        }
    },

    // ─── Achievements ────────────────────────────────────────────────────────
    injectAchievements: function () {
        const achievements = window.ACHIEVEMENTS || (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS : null);
        if (!achievements) return;

        const add = (id, title, desc, req, stat, type, val, text) => {
            if (!achievements.some(a => a.id === id))
                achievements.push({ id, title, desc, req, stat, bonus: { type, val, text } });
        };

        add('echo_time_story', 'Keeper of Time', 'Complete Story Mode with the Time Hero.', 1, 'story_time', 'health', 0.05, '+5% HP');
        add('echo_time_prestige', 'Eternal Witness', 'Reach Prestige 5 with the Time Hero.', 5, 'time_prestige', 'damage', 0.05, '+5% Dmg');
        add('echo_time_anchors', 'Moment Frozen', 'Use Temporal Anchor 50 times across all runs.', 50, 'time_anchors', 'cooldown', 0.05, '-5% CD');
        add('echo_time_echoes', 'Ghost of Myself', 'Have temporal echoes fire 200 shots across all runs.', 200, 'echo_shots', 'damage', 0.05, '+5% Dmg');
        add('echo_time_burden', 'The Weight of Time', 'Reach a timeline burden of 90 and survive the wave.', 1, 'time_burden_90', 'speed', 0.05, '+5% Speed');
        add('echo_time_wave30', 'Through the Maze', 'Reach Wave 30 while playing as the Time Hero.', 30, 'time_max_wave', 'health', 0.05, '+5% HP');

        // Love Hero achievements
        add('echo_love_unlock', 'Bound by Truth', 'Unlock the Love Hero through the Maze of Time.', 1, 'love_unlocked', 'health', 0.05, '+5% HP');
        add('echo_love_charm100', 'Irresistible', 'Charm 100 enemies across all runs.', 100, 'love_charm_count', 'damage', 0.05, '+5% Dmg');
        add('echo_love_unity', 'Heart of Unity', 'Trigger Heart of Unity 5 times across all runs.', 5, 'love_unity_count', 'speed', 0.05, '+5% Speed');
        add('echo_love_story', 'The Other Side', 'Complete Story Mode with the Love Hero.', 1, 'story_love', 'health', 0.05, '+5% HP');
        add('echo_love_wave30', 'Through the Nexus', 'Reach Wave 30 while playing as the Love Hero.', 30, 'love_max_wave', 'cooldown', 0.05, '-5% CD');
    },

    // ─── Memory Shards ───────────────────────────────────────────────────────
    injectMemories: function () {
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['time'] = [
                // 1-10: Early realizations
                "I used to think I was broken. Now I know I was just early.",
                "Every clock I ever looked at felt like it was mocking me. Tick. Tick. You are wasting this.",
                "I had everything anyone could want. And I kept searching for the thing that would finally make it feel like enough.",
                "The lie started small. So small I didn't recognize it as a lie. By the time I did, it had become the foundation of my life.",
                "I smiled at people I didn't trust. Said fine when I wasn't. Laughed at jokes I found hollow. I was fluent in the language of pretending.",
                "She asked me once where I went when I got that distant look. I said nowhere. I was everywhere. Every other moment I could have chosen instead of this one.",
                "I told myself it was ambition. That I needed more because I was capable of more. It took a long time to admit I needed more because I was afraid of what stillness would reveal.",
                "The hardest thing I ever did was sit quietly with myself and not immediately reach for something to fill the silence.",
                "I remember the exact moment I understood I had been lying. Not to her. To myself. About what I wanted. About who I was.",
                "Time does not heal wounds. It only gives you enough distance to finally look at them directly.",
                // 11-20: Deeper reckoning
                "I used to rewind conversations in my mind and rehearse different endings. Cleverer exits. Better words. As if I could retroactively become the person I wished I had been.",
                "The people who loved me loved a version of me I was performing. I was grateful and terrified in equal measure.",
                "I left because staying felt like suffocation. Only later did I understand that what I was suffocating under was my own silence.",
                "She deserved honesty. I gave her competence instead. I was always there, just never truly present.",
                "I know what it looks like to want someone and treat them as furniture simultaneously. I have done it. I am ashamed.",
                "The moments I cannot rewind are the ones that define me now. I don't get to choose differently. I only get to choose what comes next.",
                "I thought freedom meant having no obligations. I was wrong. Freedom is knowing you could leave and choosing to stay.",
                "There is a version of me in some other timeline who told the truth sooner. I hope he is happier. I know he is.",
                "I am not who I was. But I am made entirely of who I was. That is the paradox I have stopped trying to resolve.",
                "The fractures in time are real. So are the ones in me. Perhaps that is why I can see them when others cannot.",
            ];
        }

        // Hook MemoryShard color
        if (typeof MemoryShard !== 'undefined') {
            const orig = MemoryShard.prototype.getColorByType;
            MemoryShard.prototype.getColorByType = function (type) {
                if (type === 'time') return '#c8aa6e';
                return orig.call(this, type);
            };
        }

        // Museum artifact
        if (typeof Museum !== 'undefined') {
            const origSpawn = Museum.prototype.spawnEntities;
            Museum.prototype.spawnEntities = function () {
                origSpawn.call(this);
                if (saveData.memories && saveData.memories['time'] && saveData.memories['time'].length > 0) {
                    const count = saveData.memories['time'].length;
                    const room = this.rooms.find(r => r.name === 'gallery');
                    if (room) {
                        this.artifacts.push({
                            x: room.x + room.w - 160,
                            y: room.y + room.h / 2,
                            text: `Time: ${count}`,
                            color: '#c8aa6e',
                            type: 'MEMORY',
                            hero: 'time'
                        });
                    }
                }
                if (saveData.memories && saveData.memories['love'] && saveData.memories['love'].length > 0) {
                    const count = saveData.memories['love'].length;
                    const room = this.rooms.find(r => r.name === 'gallery');
                    if (room) {
                        this.artifacts.push({
                            x: room.x + room.w - 300,
                            y: room.y + room.h / 2,
                            text: `Love: ${count}`,
                            color: '#ff6b9d',
                            type: 'MEMORY',
                            hero: 'love'
                        });
                    }
                }
            };
        }

        // Memory shard color for love
        if (typeof MemoryShard !== 'undefined') {
            const orig2 = MemoryShard.prototype.getColorByType;
            MemoryShard.prototype.getColorByType = function (type) {
                if (type === 'love') return '#ff6b9d';
                return orig2.call(this, type);
            };
        }

        // Love memory shards (50 shards + secret shard #51)
        if (typeof MEMORY_STORIES !== 'undefined') {
            MEMORY_STORIES['love'] = [
                // 1-10: Life before
                "He was the kind of man who filled a room. When he laughed, you felt lucky to be the one who made him laugh.",
                "We used to sit at the kitchen table until midnight. Just talking. I thought that meant we understood each other. I think it meant we were both lonely.",
                "He had a way of making you feel chosen. Special. As if you were the only thing he had ever wanted. I didn't know then that was something he did with everyone.",
                "I remember the first time he cancelled plans. He apologized so beautifully that I almost felt guilty for being disappointed.",
                "I built my life around his schedule. Not because he asked. Because I thought that was what love looked like. No one told me love shouldn't require that kind of erosion.",
                "He was always somewhere else, even when he was there. I told myself he was just tired. I knew the word for it now. I just wasn't ready to say it.",
                "I used to rehearse conversations in my head. How I would bring it up. What I would say. Then he would smile and I would put it away again and tell myself I was imagining things.",
                "There are photographs from those years where I look genuinely happy. I was. And that is the part I have the hardest time explaining to people.",
                "I loved him completely. I want that on record. Whatever came after — I loved him completely, and it was real, and that matters.",
                "I think the worst part is not what he did. It is that I can still remember all the reasons I stayed.",
                // 11-20: The cracks
                "The first time I found something I couldn't explain away, I explained it away anyway. Practice makes perfect.",
                "He had a name for how I was feeling. He called it anxiety. He said I needed to trust more. I trusted him enough to believe that.",
                "I started keeping a list. Not to confront him. Just to have something to hold in my hands when my mind told me I was making it up.",
                "The lies got more intricate. More practiced. Looking back, I can see how much effort it took. I wonder if he was exhausted.",
                "I stopped asking where he'd been. Not because I believed the answers. Because the asking hurt more than the not knowing.",
                "There is a kind of loneliness that is worse than being alone. It is the loneliness of being with someone who has already left.",
                "He touched my face one morning before he got up. Gently. Like something precious. I thought it meant things were getting better. I think it was goodbye.",
                "I started crying in the car on the way to work. Not because of anything specific. Just because there was finally space to.",
                "I told my sister something was wrong. She said all couples go through rough patches. She was trying to help. She didn't know.",
                "The day I stopped waiting for him to choose me was the day I started choosing myself. I didn't know that's what I was doing at the time.",
                // 21-30: The knowing
                "When you know, you know. The problem is that knowing and accepting are two entirely different things.",
                "I found the proof on a Tuesday. The world didn't end. I made dinner. I washed the dishes. I went to bed. I lay very still and waited for myself to feel something.",
                "He cried when I confronted him. Real tears. And even then, part of me wanted to comfort him. That is the part of myself I had to learn to understand.",
                "He said it only happened once. I said I know that isn't true. The room got very quiet.",
                "He told me I was the one he wanted. I said that didn't explain the other person. He didn't have an answer for that.",
                "I didn't scream. I didn't throw things. I think that surprised him. He was prepared for anger. He wasn't prepared for how calm I was. I was calm because I had already grieved.",
                "There is a specific loneliness to loving someone who was never quite present enough to receive it.",
                "I had spent years loving a performance. And I think part of him loved me too — or loved the version of himself he was when he was with me.",
                "I asked him where he went. Not on the nights with her. Just generally. Where did he go when he got distant? He said he didn't know. I believe him.",
                "He was broken long before he broke us. That doesn't excuse it. But it helps me carry it.",
                // 31-40: After
                "People say time heals. Time doesn't heal. Distance heals. Understanding heals. Time is just the container.",
                "I had to learn to trust my own perception again. That took longer than I expected.",
                "Some mornings I wake up and I'm fine. Some mornings I wake up and I have to remind myself what is still real. That ratio gets better slowly.",
                "I started noticing things I never would have noticed before. The sound of rain. The weight of silence. All the things I stopped hearing when I was always listening for footsteps.",
                "The anger came later. That surprised me. By the time I was angry, I was already healing. I think that's how it works.",
                "My friends kept asking if I was angry. I kept saying not really. They didn't believe me. Eventually I stopped explaining.",
                "I started painting again. I had stopped — I don't know when. At some point I had just... stopped. Picking it back up felt like finding a piece of myself I had mailed to the wrong address.",
                "I think what I wanted most was an apology that was actually about me. Not about his guilt. Not about his shame. Just: I saw you. And I did that to you anyway. I never got that.",
                "I still have moments of doubt. Did I do something that made it easier for him to choose that? I have learned to sit with the question without letting it answer itself wrong.",
                "The strange thing is that I think losing him made me more capable of love, not less. I know what I'm not willing to accept. That is a kind of freedom.",
                // 41-50: Becoming
                "I remember the exact moment the grief turned into something else. Something quieter. Not peace exactly. More like a decision.",
                "I don't hate him. I tried. I thought it would be easier to carry than this — this grief that still has warmth in it. But you don't get to choose what shape your feelings take.",
                "Forgiveness isn't for him. It was never for him. It's for the version of me that still woke up hoping.",
                "I am different now. Better in some ways. Smaller in others. I am still learning which is which.",
                "I have had to learn to trust slowly. Not because I don't want to. Because I owe it to anyone I let close to me to be honest about what I am bringing.",
                "There are things I will never know. Why. When it started. Whether any of it was real. I have accepted that the not-knowing is permanent and that is a loss too.",
                "I used to think vulnerability was weakness. Now I understand it is the only thing worth protecting.",
                "Someone told me I was brave for staying as long as I did. I told them staying wasn't brave. Leaving was brave. They didn't understand the difference. I do.",
                "He is still somewhere in the world. I think about that sometimes. I hope he figured out why. I hope it cost him something.",
                "I loved him with my whole heart. That heart is mine now.",
            ];

            // Secret shard #51 — revealed automatically when all 50 Love shards are collected
            window.ECHOS_LOVE_SECRET = "His name was Time. And I was the one who kept the world from ending while he was busy breaking it.";
        }
    },

    // ─── Collector Cards ─────────────────────────────────────────────────────
    // ─── Maze of Time ─────────────────────────────────────────────────────────
    injectMaze: function () {
        // Seed the initial discovered nodes (origin) for first-time players
        if (window.MazeOfTime) {
            MazeOfTime.initForRun();
        }
        // Active node reset on new run is handled in game.js triggerStory (completedWave === 0)
    },

    injectCards: function () {
        const mkSet = (type, name, specialDesc, specialBonus) => ({
            [`${type}_1`]: { name: `${name} Bronze`, desc: 'Unlock Card', chance: 0.05, color: '#cd7f32', bonus: { type: 'unlock', target: type } },
            [`${type}_2`]: { name: `${name} Silver`, desc: `+10% Def vs ${name}s`, chance: 0.01, color: '#c0c0c0', bonus: { type: 'defense_vs', val: 0.1, target: type } },
            [`${type}_3`]: { name: `${name} Gold`, desc: `+20% XP from ${name}s`, chance: 0.001, color: '#ffd700', bonus: { type: 'xp_vs', val: 0.2, target: type } },
            [`${type}_4`]: { name: `${name} Platinum`, desc: specialDesc, chance: 0.0005, color: '#e5e4e2', bonus: specialBonus }
        });

        if (typeof COLLECTOR_CARDS !== 'undefined') {
            Object.assign(COLLECTOR_CARDS, {
                // Time Wraith — temporal phantom enemy
                ...mkSet('TIME_WRAITH', 'Time Wraith', 'Chrono Strike ignores Time Wraith resistance', { type: 'special', id: 'WRAITH_PIERCE' }),
                // Temporal Rift — environmental hazard enemy
                ...mkSet('TEMPORAL_RIFT', 'Temporal Rift', 'Temporal Rifts do not slow non-Time heroes', { type: 'special', id: 'RIFT_IMMUNE' }),
                // DLC Bosses
                ...mkSet('ETERNAL_COLLAPSE', 'Eternal Collapse', 'Reality fractures deal 20% less damage to you', { type: 'special', id: 'COLLAPSE_RESIST' }),
                ...mkSet('MASK_GUARDIAN', 'Mask Guardian', 'Guardian shield phases last 25% shorter for you', { type: 'special', id: 'GUARDIAN_BREAK' }),
                ...mkSet('MAKUTA_ECHO', 'Makuta Echo', 'Echo clones deal 30% reduced damage to you', { type: 'special', id: 'ECHO_WEAKEN' }),
                ...mkSet('CHROME_LEVIATHAN', 'Chrome Leviathan', 'Leviathan charge deals 25% less damage to you', { type: 'special', id: 'LEVIATHAN_DODGE' }),
                ...mkSet('TEMPORAL_WARDEN', 'Temporal Warden', 'Warden time locks last 20% shorter for you', { type: 'special', id: 'WARDEN_IMMUNITY' }),
                ...mkSet('BOSS_THUNDER', 'Thunder Titan', 'Titan lightning chains deal 20% less damage to you', { type: 'special', id: 'TITAN_GROUND' }),
                ...mkSet('BOSS_SPIRIT', 'Spirit Revenant', 'Revenant soul explosions deal 25% less damage to you', { type: 'special', id: 'REVENANT_WARD' }),
            });
        }
    },
};

// Register globally
if (!window.DLC_REGISTRY) window.DLC_REGISTRY = {};
window.DLC_REGISTRY['echos_of_eternity'] = ECHOS_OF_ETERNITY;
