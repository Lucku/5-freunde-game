// #173 phase 10 — leaf-module extraction of `_updateGameplayPre`. Pure update
// helper called from game.js. Reads run-scoped state via the singleton
// `runState` imported from RunState.js. Module-scope renderer globals
// (`arena`, `canvas`, `audioManager`, `EvilMode`, `GAMEPLAY`, `WEATHER_TYPES`,
// `Boss`, `Enemy`, `PowerUp`, `FloatingText`, `TutorialMode`, etc.) and
// helper functions (`isPhotoMode`, `triggerHitStop`, `triggerImpact`,
// `triggerStory`, `updateChaosObjective`, `isWaveCleared`, `advanceWave`,
// `gameOver`, `_renderBossIntroCinematic`, `_renderBossDeathCinematic`,
// `_renderBossChoiceScreen`, `applyDamage`, `createExplosion`, `showNotification`,
// `_replaceArrInPlace`) resolve via bare-name global lookup — `window.X`
// bridges in the renderer, `global.X` stubs in `server/simulation/loader.js`.
import { runState } from '../RunState.js';
import { isPhotoMode } from '../Camera.js';

export
function _updateGameplayPre(deltaTime) {
    // Evil Mode — check if all enemy heroes are dead → boss-defeated cinematic then advance
    if (runState.isEvilMode && typeof EvilMode !== 'undefined' && EvilMode.checkWaveEnd()) {
        EvilMode.onWaveCleared(); // cleanup + sets waveJustCleared
        if (typeof audioManager !== 'undefined') {
            audioManager.play('wave_completed');
            if (runState.player) audioManager.playHeroExclamation(runState.player.type, 'boss_win');
        }
        runState.bossDeathTimer = GAMEPLAY.BOSS_DEATH_FRAMES;
        triggerHitStop(GAMEPLAY.HITSTOP_BOSS_KILL); // #39 boss-kill freeze
    }

    if (runState.isChaosShuffleMode) updateChaosObjective(deltaTime / 1000);

    // Update Camera — skipped during photo mode so manual pan sticks (#51).
    if (!isPhotoMode()) {
        if (runState.isCoopMode && runState.player2) {
            const ref1 = !runState.player.isDead ? runState.player : runState.player2;
            const ref2 = runState.player2 && !runState.player2.isDead ? runState.player2 : runState.player;
            runState.coopZoom = arena.updateCameraForTwo(ref1, ref2, canvas.width, canvas.height);
        } else {
            arena.updateCamera(runState.player, canvas.width, canvas.height);
            runState.coopZoom = 1.0;
        }
    } else {
        // Need camera dimensions for draw clipping.
        arena.camera.width  = canvas.width;
        arena.camera.height = canvas.height;
    }

    // Heatwave Mirage Effect (Camera Wobble)
    if (runState.currentWeather && runState.currentWeather.id === 'HEATWAVE') {
        const wobbleX = Math.sin(runState.frame * 0.05) * 15;
        const wobbleY = Math.cos(runState.frame * 0.03) * 15;
        arena.camera.x += wobbleX;
        arena.camera.y += wobbleY;
    }

    arena.update(runState.player);

    // --- OBJECTIVE LOGIC ---
    if (runState.currentObjective && runState.currentObjective.state === 'ACTIVE') {
        if (runState.currentObjective.type === 'INFERNO') {
            if (runState.player.combo >= 10) {
                runState.currentObjective.current += 1 / 60; // Add 1 second per 60 frames
            }
            if (runState.currentObjective.current >= runState.currentObjective.target) {
                runState.currentObjective.state = 'COMPLETED';
                showNotification("OBJECTIVE COMPLETE!");
                triggerStory(runState.wave); // Advance
            }
        } else if (runState.currentObjective.type === 'DEFENSE') {
            // Sapling Logic handled in draw/enemy loop
            if (runState.currentObjective.data.sapling.hp <= 0) {
                runState.currentObjective.state = 'FAILED';
                gameOver();
            }
            // Survival Condition: Kill all enemies or survive time?
            // Let's say kill count for now, or just standard wave clear
            if (isWaveCleared(runState.wave, runState.enemiesKilledInWave)) {
                runState.currentObjective.state = 'COMPLETED';
                showNotification("SAPLING SAVED!");
                triggerStory(runState.wave);
            }
        } else if (runState.currentObjective.type === 'EYE_OF_STORM') {
            const eye = runState.currentObjective.data.stormEye;
            // Move Eye
            const dx = eye.tx - eye.x;
            const dy = eye.ty - eye.y;
            const distToTarget = Math.hypot(dx, dy);
            if (distToTarget < 10) {
                eye.tx = Math.random() * arena.width;
                eye.ty = Math.random() * arena.height;
            } else {
                eye.x += (dx / distToTarget) * 1.5; // Speed
                eye.y += (dy / distToTarget) * 1.5;
            }

            // Check Player
            const d = Math.hypot(runState.player.x - eye.x, player.y - eye.y);
            if (d < eye.radius) {
                runState.currentObjective.current += 1 / 60;
            } else {
                // Damage if outside
                if (runState.frame % 60 === 0) {
                    if (!runState.player.isInvincible) {
                        runState.player.hp -= 5;
                        try { audioManager.play('damage'); } catch (e) { }
                        runState.currentRunStats.damageTaken += 5;
                        floatingTexts.push(FloatingText.acquire(runState.player.x, runState.player.y - 20, "STORM!", "#3498db", 20));
                    }
                    if (runState.player.hp <= 0) gameOver();
                }
            }

            if (runState.currentObjective.current >= runState.currentObjective.target) {
                runState.currentObjective.state = 'COMPLETED';
                showNotification("STORM SURVIVED!");
                triggerStory(runState.wave);
            }
        } else if (runState.currentObjective.type === 'UNTOUCHABLE') {
            if (runState.currentObjective.current >= runState.currentObjective.target) {
                runState.currentObjective.state = 'FAILED';
                gameOver();
            }
            if (isWaveCleared(runState.wave, runState.enemiesKilledInWave)) {
                runState.currentObjective.state = 'COMPLETED';
                showNotification("UNTOUCHABLE!");
                triggerStory(runState.wave);
            }
        } else if (runState.currentObjective.type === 'IRON_WILL') {
            // Decay HP
            if (runState.frame % 60 === 0) {
                if (!runState.player.isInvincible) {
                    runState.player.hp -= 2; // Lose 2 HP per second
                    audioManager.play('damage');
                }
                if (runState.player.hp <= 0) {
                    runState.currentObjective.state = 'FAILED';
                    gameOver();
                }
            }
            runState.currentObjective.current += 1 / 60;
            if (runState.currentObjective.current >= runState.currentObjective.target) {
                runState.currentObjective.state = 'COMPLETED';
                showNotification("SURVIVED!");
                triggerStory(runState.wave);
            }
        }

        // DLC Hook: Check Completion
        if (window.HERO_LOGIC && window.HERO_LOGIC[runState.player.type] && window.HERO_LOGIC[runState.player.type].checkObjectiveCompletion) {
            window.HERO_LOGIC[runState.player.type].checkObjectiveCompletion(runState.currentObjective, runState.wave);
        }
    }

    // Boss Intro Cinematic — see `_renderBossIntroCinematic`. Owns the
    // frame while bossIntroTimer > 0; bail out for the rest of master loop.
    if (_renderBossIntroCinematic()) return true;

    // Boss Death Cinematic — see `_renderBossDeathCinematic`. Owns the
    // frame while bossDeathTimer > 0; invokes `_finalizeBossDeathCinematic`
    // when the timer just hit 0 (handles daily/weekly win, tutorial /
    // evil hooks, or opens the boss-choice screen).
    if (_renderBossDeathCinematic()) return true;

    // Boss-Defeated Choice Screen (runs after cinematic, before next wave)
        if (_renderBossChoiceScreen()) return true;


    runState.frame++;
    if (window._world) {
        window._world.frame            = runState.frame;
        window._world.wave             = runState.wave;
        window._world.score            = runState.score;
        window._world.gamePaused       = runState.gamePaused;
        window._world.isLevelingUp     = runState.isLevelingUp;
        window._world.isShopping       = runState.isShopping;
        window._world.currentWeather   = runState.currentWeather;
        window._world.currentObjective = runState.currentObjective;
        window._world.bossActive       = runState.bossActive;
    }

    // ── Weather Logic ─────────────────────────────────────────────────
    if (runState.currentWeather) {
        runState.weatherDuration--;
        // Update duration bar width every 6 frames (no need every frame)
        if (runState.frame % 6 === 0) {
            const _wbf = document.getElementById('weather-bar-fill');
            if (_wbf) _wbf.style.width = Math.max(0, (runState.weatherDuration / runState.currentWeather.duration) * 100) + '%';
        }
        if (runState.weatherDuration <= 0) {
            // Weather ending
            if (typeof audioManager !== 'undefined') audioManager.stopLoop('weather_' + runState.currentWeather.id.toLowerCase());
            runState.currentWeather = null;
            runState.weatherParticles = [];
            runState._weatherBolts = [];
            runState._weatherFlash = 0;
            document.getElementById('weather-overlay').style.backgroundColor = 'transparent';
            document.getElementById('weather-display').style.display = 'none';
            const _wbw = document.getElementById('weather-bar-wrap');
            if (_wbw) _wbw.style.display = 'none';
            runState.weatherTimer = 3600 + Math.random() * 2400;
        } else {
            const wProg = runState.weatherDuration / runState.currentWeather.duration; // 1→0 as weather fades
            const wFadeIn = Math.min(1, (runState.currentWeather.duration - runState.weatherDuration) / 120);

            if (runState.currentWeather.id === 'BLIZZARD') {
                // ── Snow particles (screen-space, spawned per frame) ──────────
                const spawnCount = Math.floor(4 * wFadeIn) + 1;
                for (let _s = 0; _s < spawnCount; _s++) {
                    runState.weatherParticles.push({
                        x: Math.random() * canvas.width,
                        y: -8,
                        vx: (Math.random() - 0.5) * 1.2 - 0.5,
                        vy: 1.2 + Math.random() * 2.0,
                        r: 1.0 + Math.random() * 2.2,
                        alpha: 0.55 + Math.random() * 0.4,
                        wobble: Math.random() * Math.PI * 2,
                    });
                }
                // Projectile drag — wind resistance slows shots mid-air
                for (let _pi = 0; _pi < projectiles.length; _pi++) {
                    projectiles[_pi].velocity.x *= 0.975;
                    projectiles[_pi].velocity.y *= 0.975;
                }

            } else if (runState.currentWeather.id === 'HEATWAVE') {
                // ── Rising ember / shimmer particles ─────────────────────────
                if (Math.random() < 0.35 * wFadeIn) {
                    runState.weatherParticles.push({
                        x: Math.random() * canvas.width,
                        y: canvas.height + 5,
                        vx: (Math.random() - 0.5) * 0.8,
                        vy: -(0.6 + Math.random() * 1.4),
                        r: 1.2 + Math.random() * 2.5,
                        alpha: 0.3 + Math.random() * 0.35,
                        wobble: Math.random() * Math.PI * 2,
                        ember: true,
                    });
                }

            } else if (runState.currentWeather.id === 'THUNDERSTORM') {
                // ── Rain streak particles ─────────────────────────────────────
                const rainCount = Math.floor(6 * wFadeIn) + 1;
                for (let _r = 0; _r < rainCount; _r++) {
                    runState.weatherParticles.push({
                        x: Math.random() * (canvas.width + 100) - 50,
                        y: -10,
                        vx: -1.5,
                        vy: 14 + Math.random() * 6,
                        len: 12 + Math.random() * 10,
                        alpha: 0.25 + Math.random() * 0.25,
                        wobble: 0,
                        rain: true,
                    });
                }

                // ── Lightning bolts + enemy damage ───────────────────────────
                runState._weatherFlash = Math.max(0, runState._weatherFlash - 0.04);

                // Chance to strike a bolt each frame
                const strikeChance = 0.018 + (1 - wProg) * 0.012; // ramps up over time
                if (Math.random() < strikeChance * wFadeIn) {
                    runState._weatherFlash = 0.55;
                    if (typeof audioManager !== 'undefined') audioManager.play('weather_thunder_crack');

                    // Pick a random target point — bias toward enemies
                    let tx, ty;
                    if (enemies.length > 0 && Math.random() < 0.65) {
                        const target = enemies[Math.floor(Math.random() * enemies.length)];
                        tx = target.x - arena.camera.x;
                        ty = target.y - arena.camera.y;
                        // Damage the struck enemy
                        target.hp -= (runState.player.rangeDmg || 20) * 1.8;
                        createExplosion(target.x, target.y, '#ffffaa', 6);
                    } else {
                        tx = Math.random() * canvas.width;
                        ty = Math.random() * canvas.height;
                    }

                    // Build jagged bolt segments from top of screen down to target
                    const segs = [];
                    let bx = tx + (Math.random() - 0.5) * 200;
                    const steps = 8 + Math.floor(Math.random() * 5);
                    for (let _i = 0; _i <= steps; _i++) {
                        const progress = _i / steps;
                        segs.push({
                            x: bx + (Math.random() - 0.5) * 60,
                            y: progress * ty
                        });
                        bx += (tx - bx) * 0.25;
                    }
                    segs[segs.length - 1] = { x: tx, y: ty };
                    runState._weatherBolts.push({ segs, life: 10, maxLife: 10 });
                }

                // Age bolts
                for (let _bi = runState._weatherBolts.length - 1; _bi >= 0; _bi--) {
                    if (--runState._weatherBolts[_bi].life <= 0) runState._weatherBolts.splice(_bi, 1);
                }

            } else if (runState.currentWeather.id === 'SANDSTORM') {
                // ── Horizontal sand streak particles ─────────────────────────
                const sandCount = Math.floor(8 * wFadeIn) + 2;
                for (let _s = 0; _s < sandCount; _s++) {
                    runState.weatherParticles.push({
                        x: -20,
                        y: Math.random() * canvas.height,
                        vx: 8 + Math.random() * 6,
                        vy: (Math.random() - 0.5) * 1.5,
                        len: 18 + Math.random() * 20,
                        alpha: 0.2 + Math.random() * 0.3,
                        wobble: 0,
                        sand: true,
                        color: `hsl(${30 + Math.random() * 20}, 70%, ${50 + Math.random() * 20}%)`,
                    });
                }

            } else if (runState.currentWeather.id === 'ACIDIC_FOG') {
                // ── Drifting acid mist particles ─────────────────────────────
                if (Math.random() < 0.25 * wFadeIn) {
                    runState.weatherParticles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: (Math.random() - 0.5) * 0.4,
                        r: 30 + Math.random() * 40,
                        alpha: 0.04 + Math.random() * 0.06,
                        wobble: Math.random() * Math.PI * 2,
                        fog: true,
                    });
                }
                // DoT: 1% max HP every 4s
                if (runState.frame % 240 === 0 && wFadeIn >= 1) {
                    const acidDmg = Math.ceil(runState.player.maxHp * 0.01);
                    applyDamage(runState.player, acidDmg, { label: 'ACID FOG', color: '#2ecc71', size: 16, prefix: '☠', sfx: null }); // #18
                }

            } else if (runState.currentWeather.id === 'GALE') {
                // ── Wind streak particles ─────────────────────────────────────
                if (Math.random() < 0.4 * wFadeIn) {
                    runState.weatherParticles.push({
                        x: -10,
                        y: Math.random() * canvas.height,
                        vx: 12 + Math.random() * 8,
                        vy: (Math.random() - 0.5) * 1.0,
                        len: 30 + Math.random() * 30,
                        alpha: 0.1 + Math.random() * 0.15,
                        wobble: 0,
                        gale: true,
                    });
                }
                // Projectile wind deflection — drift all projectiles rightward
                for (let _pi = 0; _pi < projectiles.length; _pi++) {
                    const _pp = projectiles[_pi];
                    if (_pp.velocity) _pp.velocity.x += 0.18 * wFadeIn;
                    else if (_pp.vx !== undefined) _pp.vx += 0.18 * wFadeIn;
                }
            } else if (window._weatherLogicHooks[runState.currentWeather.id]) {
                // DLC custom weather logic hook — only run if registering DLC is active
                const _lhLock = window._weatherBiomeLocks && window._weatherBiomeLocks[runState.currentWeather.id];
                const _lhDlc = _lhLock && _lhLock.dlcId;
                const _lhOk = !_lhDlc || (window.dlcManager && window.dlcManager.isDLCActive(_lhDlc));
                if (_lhOk) window._weatherLogicHooks[runState.currentWeather.id](wFadeIn, runState.frame);
            }

            // Tick all weather particles
            for (let _pi = runState.weatherParticles.length - 1; _pi >= 0; _pi--) {
                const p = runState.weatherParticles[_pi];
                p.wobble += 0.05;
                p.x += p.vx + Math.sin(p.wobble) * 0.5;
                p.y += p.vy;
                if (p.y > canvas.height + 10 || p.y < -10 || p.x > canvas.width + 60) runState.weatherParticles.splice(_pi, 1);
            }
        }
    } else {
        runState.weatherTimer--;
        if (runState.weatherTimer <= 0) {
            // Helper: returns true if weather w is eligible for the current biome + loaded DLCs
            const _weatherAllowed = (w) => {
                const lock = window._weatherBiomeLocks && window._weatherBiomeLocks[w.id];
                if (!lock) return true; // no restriction
                const biomes = lock.biomes || lock; // support both { biomes, dlcId } and legacy array
                const dlcId = lock.dlcId;
                const dlcOk = !dlcId || (window.dlcManager && window.dlcManager.isDLCActive(dlcId));
                return dlcOk && biomes.includes(runState.currentBiomeType);
            };

            // Biome-locked weathers: fire→HEATWAVE, cloud→THUNDERSTORM, wind→GALE
            // DLC biomes hook in via _weatherBiomeLocks — e.g. 'time' biome → TEMPORAL_RIFT (EoE only)
            const _dlcBiomeLock = window._weatherBiomeLocks &&
                Object.keys(window._weatherBiomeLocks).find(id => _weatherAllowed({ id }));
            const _biomeLockedWeather = _dlcBiomeLock || { fire: 'HEATWAVE', cloud: 'THUNDERSTORM', wind: 'GALE' }[runState.currentBiomeType];
            if (_biomeLockedWeather) {
                runState.currentWeather = WEATHER_TYPES.find(w => w.id === _biomeLockedWeather) || WEATHER_TYPES[0];
            } else {
                // Build weighted pool — biome boosts its preferred weather 3×
                const _biomeBoost = { ice: 'BLIZZARD', plant: 'ACIDIC_FOG', metal: 'SANDSTORM', water: 'THUNDERSTORM', black: 'ACIDIC_FOG' }[runState.currentBiomeType];
                const _weatherPool = [];
                for (const w of WEATHER_TYPES) {
                    if (w.id === 'BLIZZARD' && runState.currentBiomeType === 'fire') continue; // incompatible
                    if (w.id === 'HEATWAVE' && runState.currentBiomeType === 'ice') continue;
                    if (!_weatherAllowed(w)) continue; // DLC/biome-locked
                    const weight = (w.id === _biomeBoost) ? 3 : 1;
                    for (let _wi = 0; _wi < weight; _wi++) _weatherPool.push(w);
                }
                runState.currentWeather = _weatherPool[Math.floor(Math.random() * _weatherPool.length)];
            }
            // Wave scaling: +1% duration per wave, capped at 2×
            const _waveDurationMult = Math.min(2.0, 1 + runState.wave * 0.01);
            runState.weatherDuration = Math.floor(runState.currentWeather.duration * _waveDurationMult);
            document.getElementById('weather-overlay').style.backgroundColor = runState.currentWeather.color;
            const wDisplay = document.getElementById('weather-display');
            wDisplay.innerText = `⚠ ${runState.currentWeather.name}`;
            const _wColor = { HEATWAVE: '#e74c3c', THUNDERSTORM: '#9b59b6', SANDSTORM: '#c8922a', ACIDIC_FOG: '#2ecc71', GALE: '#a8d8f0', TEMPORAL_RIFT: '#b8a0ff', PETAL_STORM: '#ff80c0' }[runState.currentWeather.id] || '#3498db';
            wDisplay.style.color = _wColor;
            wDisplay.style.display = 'block';
            const wBarWrap = document.getElementById('weather-bar-wrap');
            const wBarFill = document.getElementById('weather-bar-fill');
            if (wBarWrap && wBarFill) {
                wBarWrap.style.display = 'block';
                wBarFill.style.background = _wColor;
                wBarFill.style.width = '100%';
            }
            if (typeof audioManager !== 'undefined') audioManager.startLoop('weather_' + runState.currentWeather.id.toLowerCase());
        }
    }
    // ── Weather stacking (wave 30+): run a second concurrent weather ──
    if (runState.wave >= 30) {
        if (runState.currentWeather2) {
            runState.weatherDuration2--;
            if (runState.weatherDuration2 <= 0) {
                if (typeof audioManager !== 'undefined') audioManager.stopLoop('weather_' + runState.currentWeather2.id.toLowerCase());
                runState.currentWeather2 = null;
                runState.weatherDuration2 = 0;
            }
        } else if (runState.currentWeather && Math.random() < 0.0003) {
            // Small chance each frame to stack a second weather (different from first, biome/DLC eligible)
            const _stackPool = WEATHER_TYPES.filter(w => {
                if (w.id === runState.currentWeather.id) return false;
                const _lk = window._weatherBiomeLocks && window._weatherBiomeLocks[w.id];
                if (!_lk) return true;
                const _biomes = _lk.biomes || _lk;
                const _dlcId = _lk.dlcId;
                return (!_dlcId || (window.dlcManager && window.dlcManager.isDLCActive(_dlcId)))
                    && _biomes.includes(runState.currentBiomeType);
            });
            if (_stackPool.length > 0) {
                runState.currentWeather2 = _stackPool[Math.floor(Math.random() * _stackPool.length)];
                const _waveMult2 = Math.min(2.0, 1 + runState.wave * 0.01);
                runState.weatherDuration2 = Math.floor(runState.currentWeather2.duration * _waveMult2 * 0.6); // shorter than primary
                if (typeof audioManager !== 'undefined') audioManager.startLoop('weather_' + runState.currentWeather2.id.toLowerCase());
                showNotification(`⚠ ${runState.currentWeather2.name} STACKS WITH ${runState.currentWeather.name}!`);
            }
        }
        // Run secondary weather's particle/effect logic by temporarily swapping
        if (runState.currentWeather2) {
            const _wProg2 = runState.weatherDuration2 / runState.currentWeather2.duration;
            const _wFI2 = Math.min(1, (runState.currentWeather2.duration - runState.weatherDuration2) / 120);
            if (runState.currentWeather2.id === 'GALE') {
                for (let _pi2 = 0; _pi2 < projectiles.length; _pi2++) {
                    const _pp2 = projectiles[_pi2];
                    if (_pp2.velocity) _pp2.velocity.x += 0.18 * _wFI2;
                    else if (_pp2.vx !== undefined) _pp2.vx += 0.18 * _wFI2;
                }
                if (Math.random() < 0.4 * _wFI2) runState.weatherParticles.push({ x: -10, y: Math.random() * canvas.height, vx: 12 + Math.random() * 8, vy: (Math.random() - 0.5), len: 30 + Math.random() * 30, alpha: 0.1 + Math.random() * 0.15, wobble: 0, gale: true });
            } else if (runState.currentWeather2.id === 'BLIZZARD') {
                if (Math.random() < 0.5 * _wFI2) runState.weatherParticles.push({ x: Math.random() * canvas.width, y: -8, vx: (Math.random() - 0.5) * 1.2 - 0.5, vy: 1.2 + Math.random() * 2.0, r: 1.0 + Math.random() * 2.2, alpha: 0.55 + Math.random() * 0.4, wobble: Math.random() * Math.PI * 2 });
            } else if (runState.currentWeather2.id === 'ACIDIC_FOG') {
                if (runState.frame % 240 === 0 && _wFI2 >= 1) {
                    const _ad2 = Math.ceil(runState.player.maxHp * 0.01);
                    applyDamage(runState.player, _ad2, { label: 'ACID FOG', color: '#2ecc71', size: 16, prefix: '☠', sfx: null }); // #18
                }
            }
            void _wProg2; // suppress unused warning
        }
    }
    // ── End Weather Logic ─────────────────────────────────────────────

    // --- Spawning Logic ---
    // Disable standard boss spawn if Objective Wave or Boss already active (e.g. Instant Spawn)
    if (!runState.bossActive && runState.bossDeathTimer === 0 && !runState.isTestingMode && !runState.isEvilMode && isWaveCleared(runState.wave, runState.enemiesKilledInWave) && (!runState.isTutorialMode || TutorialMode.bossForced)) {
        if (runState.currentObjective && runState.currentObjective.state === 'ACTIVE') {
            // Do nothing, wait for objective completion logic
        } else if (runState.isWorkshopMode && window.pendingCustomMap?.waveConfig?.bossType === 'none') {
            // Workshop: no boss configured — advance wave directly
            advanceWave();
        } else {
            runState.bossActive = true;
            // Boss spawn — heavy ground-pound rumble
            triggerImpact(9, 22, 0.45, 0.90, 550);
            if (runState.isTutorialMode) {
                // Tutorial: one plain boss (no type modifier), reduced HP, no minions
                const tutBoss = new Boss('BASIC');
                tutBoss.hp = tutBoss.maxHp = Math.max(1, Math.floor(tutBoss.maxHp * 0.4));
                enemies.unshift(tutBoss);
            } else {
                // Standard Boss Spawning
                const _workshopBossType = (runState.isWorkshopMode && window.pendingCustomMap?.waveConfig?.bossType)
                    ? window.pendingCustomMap.waveConfig.bossType : null;
                const _bossArg = (_workshopBossType && _workshopBossType !== 'random') ? _workshopBossType : undefined;

                const _isStoryMode = (saveData.story && saveData.story.enabled !== false) && !runState.isDailyMode && !runState.isWeeklyMode && !runState.isChaosShuffleMode && !runState.isVersusMode;
                if (!runState.isWorkshopMode && !_isStoryMode && Math.random() < 0.05) {
                    document.getElementById('event-text').style.display = 'block';
                    setTimeout(() => document.getElementById('event-text').style.display = 'none', 3000);
                    if (typeof audioManager !== 'undefined') {
                        audioManager.play('twin_event');
                        audioManager.playHeroExclamation(runState.player.type, 'twin_event');
                    }
                    enemies.unshift(new Boss(), new Boss());
                } else {
                    // Mutator: Double Boss
                    if ((runState.isDailyMode || runState.isWeeklyMode) && runState.activeMutators.some(m => m.id === 'DOUBLE_BOSS')) {
                        enemies.unshift(new Boss(), new Boss());
                        showNotification("DOUBLE BOSS SPAWN!");
                    } else {
                        enemies.unshift(new Boss(_bossArg));
                    }
                }
                if (!runState.currentStoryEvent || !runState.currentStoryEvent.data || !runState.currentStoryEvent.data.suppressMinions) {
                    for (let i = 0; i < 5; i++) enemies.push(new Enemy(true));
                }
            }
        }
    }

    if (!runState.isVersusMode && !runState.isTestingMode && !runState.isEvilMode) {
        if (!runState.bossActive && runState.bossDeathTimer === 0) {
            let spawnRate = Math.max(10, 45 - (runState.wave * 1.3));
            let forcedType = null;

            // Workshop waveConfig overrides
            if (runState.isWorkshopMode && window.pendingCustomMap?.waveConfig) {
                const _wc = window.pendingCustomMap.waveConfig;
                const _base  = _wc.spawnRateBase         ?? 45;
                const _decay = _wc.spawnRateDecayPerWave ?? 1.3;
                spawnRate = Math.max(10, _base - (runState.wave * _decay));
                if (_wc.enemyPool && _wc.enemyPool.length > 0) {
                    forcedType = _wc.enemyPool[Math.floor(Math.random() * _wc.enemyPool.length)];
                }
            }

            // Story Override
            if (runState.currentStoryEvent && runState.currentStoryEvent.type === 'WAVE_OVERRIDE' && runState.currentStoryEvent.data) {
                if (runState.currentStoryEvent.data.spawnRateMod) {
                    spawnRate = Math.max(5, spawnRate * runState.currentStoryEvent.data.spawnRateMod);
                }
                if (runState.currentStoryEvent.data.forcedEnemyType) {
                    forcedType = runState.currentStoryEvent.data.forcedEnemyType;
                }
            }

            // Maze of Time: use node's deterministic enemy pool
            if (window.mazeCurrentNode && window.mazeCurrentNode.enemyOverride) {
                forcedType = window.MazeOfTime.pickNextEnemyType() || forcedType;
            }

            const nonBossCount = enemies.filter(e => !(e instanceof Boss) && e.hp > 0).length;
            const enemyCap = Math.min(22, 5 + runState.wave) + ((runState.isCoopMode || runState.isAICompanionMode) ? 4 : 0);
            if (runState.frame % Math.floor(spawnRate) === 0 && nonBossCount < enemyCap) {
                let loops = 1;
                if (typeof runState.activeMutators !== 'undefined' && runState.activeMutators.some(m => m.id === 'SWARM')) loops = 2;

                for (let l = 0; l < loops; l++) {
                    if (forcedType) {
                        enemies.push(new Enemy(false, forcedType));
                    } else {
                        // Swarm Logic
                        if (runState.wave > 2 && Math.random() < 0.1) {
                            for (let i = 0; i < 5; i++) {
                                const swarm = new Enemy(false, 'SWARM');
                                // Offset slightly
                                swarm.x += (Math.random() - 0.5) * 50;
                                swarm.y += (Math.random() - 0.5) * 50;
                                enemies.push(swarm);
                            }
                        } else {
                            enemies.push(new Enemy());
                        }
                    }
                }
            }
        } else {
            let suppress = false;
            if (runState.currentStoryEvent && runState.currentStoryEvent.data && runState.currentStoryEvent.data.suppressMinions) {
                suppress = true;
            }
            if (!suppress && runState.frame % 150 === 0) enemies.push(new Enemy(true));
        }
    }

    // Co-op / AI companion: scale new non-boss enemy HP up
    if (runState.isCoopMode || runState.isAICompanionMode) {
        enemies.forEach(e => {
            if (!(e instanceof Boss) && !e._coopScaled) {
                e._coopScaled = true;
                e.hp *= 1.4; e.maxHp = e.hp;
            }
        });
    }

    // Maze of Time: scale enemy HP by node waveStrength
    if (window.mazeCurrentNode && window.mazeCurrentNode.waveStrength !== 1.0) {
        const s = window.mazeCurrentNode.waveStrength;
        enemies.forEach(e => {
            if (!(e instanceof Boss) && !e._mazeScaled) {
                e._mazeScaled = true;
                e.hp = Math.round(e.hp * s);
                e.maxHp = e.hp;
            }
        });
    }

    // Tutorial: scale new non-boss enemy HP to 40% and cap count at 8
    if (runState.isTutorialMode) {
        enemies.forEach(e => {
            if (!(e instanceof Boss) && !e._tutorialScaled) {
                e._tutorialScaled = true;
                e.hp = e.maxHp = Math.max(1, Math.floor(e.maxHp * 0.4));
            }
        });
        const nonBoss = enemies.filter(e => !(e instanceof Boss));
        if (nonBoss.length > 8) {
            const excess = new Set(nonBoss.slice(8));
            _replaceArrInPlace(enemies, enemies.filter(e => !excess.has(e)));
        }
    }

    if (runState.frame % 600 === 0) powerUps.push(new PowerUp());
    return false;
}
// — end #173 phase 10 leaf module —
