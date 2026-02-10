// Air Hero Logic
// Name: AIR (Turquoise)
// Concept: Movement-based Controller. Projectiles that curve/return. 
// Unique mechanic: "Flow". "The Weather Vane" story mechanic.

class AirHero {
    static init(player) {
        // Unique Resource: Flow
        player.flow = 0;
        player.maxFlow = 100;
        player.flowDecay = 0.5;

        // Base Stats Override (Weak body, Strong movement)
        player.maxHp = 60; // Adjusted: Buffed from 40 to 60 (Standard Low)
        player.hp = 60;
        player.damageMultiplier = 0.85; // Adjusted: Nerfed damage (was 1.0)
        player.speedMultiplier = 1.2;

        // Hooks
        player.customUpdate = (dx, dy) => AirHero.update(player, dx, dy);
        player.shoot = (dx, dy) => AirHero.shoot(player, dx, dy);
        player.customSpecial = () => AirHero.useUltimate(player);

        // Ult Icon
        player.icon = "🌪️";
        const iconEl = document.getElementById('special-icon');
        if (iconEl) iconEl.innerText = "🌪️";

        // Ultimate: TORNADO FORM
        player.specialName = "TORNADO";
        player.specialMaxCooldown = 1200; // Adjusted: 20 seconds (was 18000/5mins)

        // Override Form Name
        player.getFormName = function () {
            return 'ZEPHYR';
        };

        // Skill Tree
        if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
        window.HERO_LOGIC['air'] = AirHeroLogic;

        // Custom Projectile Storage
        player.activeChakrams = [];
        player.windArtifacts = []; // For collection objectives

        // --- THE WEATHER VANE (Story Mechanic) ---
        player.weatherVane = {
            direction: 'NORTH', // NORTH, SOUTH, EAST, WEST
            hitsTakenThisWave: 0,
            waveStartTime: Date.now(),
            ultimatesUsedThisWave: 0
        };
        player.lastWaveCheck = 0;
        player.bossHold = null; // Store boss here if it spawns early

        // Campaign / Objective State
        player.currentObjective = {
            type: 'NONE', // COLLECT, KILL, COMBO, ABILITY, SURVIVE
            target: 0,
            current: 0,
            text: "Prepare...",
            completed: false
        };

        // Hook Damage to track Hits
        const originalTakeDamage = player.takeDamage.bind(player);
        player.takeDamage = (amount) => {
            player.weatherVane.hitsTakenThisWave++;
            // Reset "No Hit" objective if failed? Or just fail it.
            if (player.currentObjective.type === 'SURVIVE' && player.currentObjective.subtype === 'NO_HIT') {
                player.currentObjective.failed = true;
            }
            return originalTakeDamage(amount);
        };
    }

    static getSkillTreeWeights() {
        return { SPEED: 0.3, FLOW_CAP: 0.25, KNOCKBACK: 0.25, DMG: 0.2 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'SPEED') { val = 0.05; desc = "+5% Movement Speed"; }
        if (type === 'FLOW_CAP') { val = 10; desc = "+10 Max Flow"; }
        if (type === 'KNOCKBACK') { val = 1; desc = "+1 Knockback"; }
        if (type === 'DMG') { val = 0.1; desc = "+10% Damage"; }
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'SPEED') base.speedMultiplier = (base.speedMultiplier || 1.2) + node.value;
        if (node.type === 'FLOW_CAP') base.maxFlow = (base.maxFlow || 100) + node.value;
        if (node.type === 'KNOCKBACK') base.stats.knockback = (base.stats.knockback || 4) + node.value;
        if (node.type === 'DMG') base.damageMultiplier = (base.damageMultiplier || 1) + node.value;
    }

    static applyWindShift(player) {
        if (player.type === 'air' && player.weatherVane) {
            const dirs = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
            const current = player.weatherVane.direction;
            let next = current;
            while (next === current) {
                next = dirs[Math.floor(Math.random() * dirs.length)];
            }
            player.weatherVane.direction = next;
            if (window.showNotification) window.showNotification(`WINDS SHIFTED: ${next}`);
            if (window.createExplosion) window.createExplosion(player.x, player.y, '#40e0d0');
        }
    }

    static update(player, dx, dy) {
        // 0. Story Mechanic: Weather Vane & Objectives
        const currentWave = typeof wave !== 'undefined' ? wave : 1;

        // --- NEW WAVE LOGIC ---
        if (currentWave > player.lastWaveCheck) {

            // 1. ROTATE WIND (Always)
            const dirs = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
            const currentIdx = dirs.indexOf(player.weatherVane.direction);
            const nextIdx = (currentIdx + 1) % 4;
            player.weatherVane.direction = dirs[nextIdx];

            // 2. CHECK GAME MODE
            const isStoryMode = (typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled) &&
                (typeof isDailyMode === 'undefined' || !isDailyMode) &&
                (typeof isWeeklyMode === 'undefined' || !isWeeklyMode) &&
                (typeof isVersusMode === 'undefined' || !isVersusMode) &&
                (typeof isChaosShuffleMode === 'undefined' || !isChaosShuffleMode);

            // 3. GENERATE NEW OBJECTIVE (Story Only)
            if (isStoryMode) {
                AirHero.generateWaveObjective(player, currentWave);
                if (typeof showNotification === 'function') {
                    setTimeout(() => showNotification(`GOAL: ${player.currentObjective.text}`), 500);
                }
            } else {
                // Disable objectives in other modes
                player.currentObjective = { type: 'NONE', completed: true };
            }

            // 4. RESET WAVE STATS
            player.lastWaveCheck = currentWave;
            player.weatherVane.hitsTakenThisWave = 0;
            player.weatherVane.waveStartTime = Date.now();
            player.weatherVane.ultimatesUsedThisWave = 0;
            player.weatherVane.startKills = (typeof currentRunStats !== 'undefined' ? currentRunStats.enemiesKilled : 0);
            player.windArtifacts = []; // Clear old ones

            // Feedback
            if (typeof FloatingText !== 'undefined') {
                new FloatingText(player.x, player.y - 80, `Wind Shifts ${player.weatherVane.direction}!`, '#40e0d0', 120);
            }
        }

        // --- CHECK OBJECTIVE PROGRESS VS BOSS ---
        AirHero.checkObjective(player);

        // BOSS BLOCKING MECHANIC
        // If objective NOT complete, prevent boss from appearing/acting
        // Scan enemies for Boss type
        if (player.currentObjective.type !== 'NONE' && !player.currentObjective.completed) {

            // 1. Keep Wave Going (Infinite Enemies)
            // If kills reached max but objective not done, reset kills slightly to keep spawning?
            // Or just rely on Boss Blocking logic if it's a boss wave.

            // 2. Hide/Block Boss (Deprecated, we now control spawn condition)
            // But if one exists anyway:
            if (window.enemies) {
                const boss = window.enemies.find(e => e.isBoss || e.constructor.name === 'Boss');
                if (boss && !boss.hiddenByObjective) {
                    boss.hiddenByObjective = true;
                    boss.oldX = boss.x;
                    boss.x = -99999;
                    boss.active = false;
                    if (typeof showNotification === 'function') showNotification("BOSS LOCKED UNTIL OBJECTIVE COMPLETE!", "#ff0000");
                }
            }

            // BOSS SPAWN CONTROL:
            // Prevent spawn by capping kill count
            if (typeof window.enemiesKilledInWave !== 'undefined' && typeof window.ENEMIES_PER_WAVE !== 'undefined') {
                const maxKills = window.ENEMIES_PER_WAVE * currentWave;
                if (window.enemiesKilledInWave >= maxKills - 1) {
                    window.enemiesKilledInWave = maxKills - 1;
                }
            }
        } else {
            // Objective Completed: Release Boss
            if (window.enemies) {
                const boss = window.enemies.find(e => e.hiddenByObjective);
                if (boss) {
                    boss.hiddenByObjective = false;
                    boss.x = boss.oldX || (window.innerWidth / 2); // Restore pos
                    boss.active = true;
                    if (typeof showNotification === 'function') showNotification("BOSS UNLOCKED!", "#00ff00");
                    createExplosion(boss.x, boss.y, '#40e0d0', 50);
                }
            }
        }
        // Global Buffs (The Storm)
        // Regen
        if (frame % 60 === 0 && player.hp < player.maxHp) player.hp += 0.5;
        // Speed
        player.speedMultiplier = Math.max(player.speedMultiplier, 1.5);
        // Dmg
        player.damageMultiplier = Math.max(player.damageMultiplier, 1.5);

        // Visuals: The Hurricane (Only if upgraded)
        // Sync transformation state
        if (player.transformActive && player.currentForm === 'ZEPHYR') {
            player.hurricaneActive = true;
        }
        
        if (player.hurricaneActive && window.ctx) {
            const ctx = window.ctx;
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(frame * 0.05);

            // Massive Outer Ring
            ctx.beginPath();
            ctx.arc(0, 0, 200, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(64, 224, 208, 0.2)`;
            ctx.lineWidth = 20;
            ctx.stroke();

            // Orbiting Debris
            for (let i = 0; i < 5; i++) {
                const ang = (frame * 0.02) + (i * (Math.PI * 2 / 5));
                const dx = Math.cos(ang) * 200;
                const dy = Math.sin(ang) * 200;
                ctx.beginPath();
                ctx.fillStyle = '#fff';
                ctx.arc(dx, dy, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        // Mechanic: Orbiting Projectiles
        // Any projectile fired doesn't leave immediately; it orbits for 1s then launches
        // (Handled partially in shoot, but let's override behavior here or add passive damage aura)

        // Passive Storm Damage to anything inside ring
        if (player.hurricaneActive && frame % 10 === 0 && window.enemies) {
            window.enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 220) {
                    e.hp -= 2 * player.damageMultiplier;
                    // Suck them into the "Wall" of the storm (radius 200)
                    const angle = Math.atan2(e.y - player.y, e.x - player.x);
                    // If outside 200, pull in. If inside 200, push out.
                    // Ideally keep them at radius 200
                    const dist = Math.hypot(e.x - player.x, e.y - player.y);
                    const force = (dist - 200) * 0.1; // proportional pull/push
                    e.x -= Math.cos(angle) * force;
                    e.y -= Math.sin(angle) * force;
                }
            });
        }

        // 3. TORNADO ULTIMATE Logic
        if (player.activeTornado) {
            const t = player.activeTornado;
            t.timer--;

            // Suction & Damage
            if (window.enemies) {
                window.enemies.forEach(e => {
                    const dist = Math.hypot(e.x - t.x, e.y - t.y);
                    if (dist < 200) { // Suction range
                        const angle = Math.atan2(t.y - e.y, t.x - e.x);
                        e.x += Math.cos(angle) * 5; // Pull in
                        e.y += Math.sin(angle) * 5;

                        if (dist < 80) { // Damage range
                            // Damage every 10 frames
                            if (frame % 10 === 0) {
                                const dmg = (player.stats.rangeDmg || 10) * 0.5 * player.damageMultiplier;
                                e.hp -= dmg;
                                createExplosion(e.x, e.y, '#40e0d0', 2);
                                if (typeof FloatingText !== 'undefined') new FloatingText(e.x, e.y - 20, Math.floor(dmg), '#40e0d0', 14);
                                if (e.hp <= 0 && e.hp + dmg > 0) e.lastHitBy = 'PROJECTILE';
                            }
                        }
                    }
                });
            }

            // Visuals
            if (frame % 3 === 0) {
                // Debris/Wind particles
                createExplosion(t.x + (Math.random() - 0.5) * 100, t.y + (Math.random() - 0.5) * 100, '#fff', 5);
                createExplosion(t.x + (Math.random() - 0.5) * 60, t.y + (Math.random() - 0.5) * 60, '#40e0d0', 8);
            }

            // Draw Tornado Spirit
            if (window.ctx) {
                const ctx = window.ctx;
                ctx.save();
                ctx.translate(t.x, t.y);

                // --- RESTORED: Floating Ring (Suction Range) ---
                ctx.save();
                ctx.rotate(frame * 0.05); // Slow rotation

                // Broad translucent ring
                ctx.beginPath();
                ctx.arc(0, 0, 200, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(64, 224, 208, 0.2)`;
                ctx.lineWidth = 20;
                ctx.stroke();

                // Dashed detail ring
                ctx.beginPath();
                ctx.arc(0, 0, 200, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
                ctx.lineWidth = 2;
                ctx.setLineDash([40, 40]);
                ctx.stroke();

                ctx.restore();
                // -----------------------------------------------

                // Draw multiple layers rotating at different speeds
                // Base
                ctx.rotate(frame * 0.2);
                ctx.beginPath();
                ctx.fillStyle = 'rgba(64, 224, 208, 0.3)';
                ctx.arc(0, 0, 40 + Math.sin(frame * 0.1) * 10, 0, Math.PI * 2);
                ctx.fill();

                // Spiral Lines - Inner
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    ctx.rotate((Math.PI * 2) / 3);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(20, 20, 40, 0);
                    ctx.stroke();
                }

                // Spiral Lines - Outer (Counter rotation)
                ctx.rotate(frame * -0.4);
                ctx.strokeStyle = `rgba(64, 224, 208, 0.6)`;
                ctx.lineWidth = 5;
                for (let i = 0; i < 5; i++) {
                    ctx.rotate((Math.PI * 2) / 5);
                    ctx.beginPath();
                    ctx.arc(30, 0, 10, 0, Math.PI, false);
                    ctx.stroke();
                }

                ctx.restore();
            }

            if (t.timer <= 0) {
                player.activeTornado = null;
            }
        }

        // 4. Update Chakrams
        if (player.activeChakrams) {
            player.activeChakrams = player.activeChakrams.filter(p => !p.dead);
        }

        // 6. Generic Active Effect (Barrier, Vortex)
        if (player.activeEffect) {
            const eff = player.activeEffect;
            eff.timer--;

            if (window.ctx) {
                const ctx = window.ctx;
                ctx.save();
                ctx.translate(eff.x, eff.y);

                if (eff.type === 'BARRIER') {
                    // Draw Barrier
                    ctx.beginPath();
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 5;
                    ctx.arc(0, 0, 100, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                    ctx.fill();

                    // Logic: Push Enemies OUT
                    if (window.enemies) {
                        window.enemies.forEach(e => {
                            const d = Math.hypot(e.x - eff.x, e.y - eff.y);
                            if (d < 100) {
                                const a = Math.atan2(e.y - eff.y, e.x - eff.x);
                                e.x += Math.cos(a) * 5; // Strong push
                                e.y += Math.sin(a) * 5;
                            }
                        });
                    }
                } else if (eff.type === 'VORTEX') {
                    // Draw Vortex
                    ctx.rotate(frame * 0.1);

                    // Manual Spiral 
                    ctx.beginPath();
                    ctx.fillStyle = '#9b59b6';
                    ctx.globalAlpha = 0.3;
                    ctx.arc(0, 0, 60, 0, Math.PI * 2);
                    ctx.fill();

                    // Logic: Suck Enemies IN
                    if (window.enemies) {
                        window.enemies.forEach(e => {
                            const d = Math.hypot(e.x - eff.x, e.y - eff.y);
                            if (d < 150) {
                                const a = Math.atan2(eff.y - e.y, eff.x - e.x);
                                e.x += Math.cos(a) * 3;
                                e.y += Math.sin(a) * 3;
                                e.hp -= 0.5 * player.damageMultiplier;
                            }
                        });
                    }
                }
                ctx.restore();
            }

            if (eff.timer <= 0) {
                player.activeEffect = null;
            }
        }

        // 5. UI: Draw Flow Meter & Weather Vane
        if (window.ctx) {
            const ctx = window.ctx;
            const x = player.x - 20;
            const y = player.y + 30;
            const w = 40;
            const h = 4;

            ctx.fillStyle = "#222";
            ctx.fillRect(x, y, w, h);

            // Turquoise bar
            ctx.fillStyle = "#40e0d0";
            ctx.fillRect(x, y, w * (player.flow / player.maxFlow), h);

            // Draw Vane Icon
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            const dirChar = player.weatherVane.direction.charAt(0);
            ctx.fillText(dirChar, player.x, player.y + 45);
        }

        // Draw Objective HUD
        AirHero.drawObjectiveHUD(player);
    }

    static drawSpiral(x, y, color, rot) {
        if (!window.ctx) return;
        const ctx = window.ctx;
        ctx.save();
        ctx.translate(x, y);

        ctx.rotate(rot * 0.2);
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(20, 20, 40, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    static generateWaveObjective(player, wave) {
        const types = ['COLLECT', 'KILL', 'COMBO', 'ABILITY', 'SURVIVE'];
        const type = types[Math.floor(Math.random() * types.length)];

        let target = 10;
        let text = "";
        let subtype = null;

        if (type === 'COLLECT') {
            target = 3 + Math.floor(wave / 2);
            text = `Collect ${target} Wind Artifacts`;
        } else if (type === 'KILL') {
            target = 15 + (wave * 5);
            text = `Defeat ${target} Enemies`;
        } else if (type === 'COMBO') {
            target = 20 + (wave * 5);
            text = `Reach Combo ${target}`;
        } else if (type === 'ABILITY') {
            target = 3 + Math.floor(wave / 5);
            text = `Use Special ${target} Times`;
        } else if (type === 'SURVIVE') {
            target = 30; // seconds
            subtype = 'NO_HIT';
            text = `Avoid Damage for ${target}s`;
        }

        player.currentObjective = {
            type: type,
            subtype: subtype,
            target: target,
            current: 0,
            text: text,
            completed: false,
            failed: false,
            startTime: Date.now()
        };
    }

    static checkObjective(player) {
        const obj = player.currentObjective;
        if (!obj || obj.completed) return; // Already done

        // FAIL CONDITIONS
        if (obj.failed) {
            obj.text = "FAILED: Took Damage!";
            return;
        }

        // UPDATE PROGRESS
        if (obj.type === 'COLLECT') {
            // Logic handled in Artifact Update loop below
            // Spawn artifacts periodically
            if (Math.random() < 0.005 && player.windArtifacts.length < 3) {
                // Spawn
                const ang = Math.random() * Math.PI * 2;
                const dist = 300 + Math.random() * 200;
                player.windArtifacts.push({
                    x: player.x + Math.cos(ang) * dist,
                    y: player.y + Math.sin(ang) * dist,
                    timer: 0
                });
            }
        }
        else if (obj.type === 'KILL') {
            const kills = (typeof currentRunStats !== 'undefined' ? currentRunStats.enemiesKilled : 0) - (player.weatherVane.startKills || 0);
            obj.current = kills;
        }
        else if (obj.type === 'COMBO') {
            obj.current = player.combo || 0;
        }
        else if (obj.type === 'ABILITY') {
            obj.current = player.weatherVane.ultimatesUsedThisWave;
        }
        else if (obj.type === 'SURVIVE') {
            if (obj.subtype === 'NO_HIT') {
                const elapsed = (Date.now() - player.weatherVane.waveStartTime) / 1000;
                obj.current = Math.floor(elapsed);
                if (obj.failed) obj.current = 0; // Reset or freeze
            }
        }
        else if (obj.type === 'LEVEL_REACH') {
            obj.current = player.level || 1;
        }

        // CHECK COMPLETION
        if (obj.current >= obj.target && !obj.failed) {
            obj.completed = true;
            obj.state = 'COMPLETED'; // Unlock game loop spawn logic

            if (typeof showNotification === 'function') showNotification("OBJECTIVE COMPLETE! BOSS PHASE!", '#40e0d0');
            if (typeof audioManager !== 'undefined') audioManager.play('challenge_completed');

            // FORCE BOSS PHASE
            // Set global kill count to max to trigger standard game loop boss spawn
            if (window.ENEMIES_PER_WAVE) {
                const currentWave = window.wave || 1;
                window.enemiesKilledInWave = (window.ENEMIES_PER_WAVE * currentWave) + 100;
            }
            // Fallback: If variables aren't global, try to find boss in pool or spawn
            if (window.enemies && !window.bossActive) {
                // Check if boss already exists but hidden
                const existingBoss = window.enemies.find(e => e.isBoss || e.constructor.name === 'Boss');
                if (existingBoss) {
                    existingBoss.hiddenByObjective = false;
                    existingBoss.x = existingBoss.oldX || (window.innerWidth / 2);
                    existingBoss.active = true;
                } else {
                    // Spawn new if standard logic fails
                    if (typeof Boss !== 'undefined') {
                        window.bossActive = true;
                        window.enemies.unshift(new Boss());
                    }
                }
            }
        }
    }

    static drawObjectiveHUD(player) {
        const ctx = window.ctx;
        if (!ctx) return;

        // Draw HUD in SCREEN SPACE (Reset Transform)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity matrix

        // Draw Artifacts (These are in World Space, so we need to restore logic locally or separate them)
        // Wait! The artifacts drawing code below used World Coords (a.x, a.y).
        // Since we reset transform, we can't draw world items here easily unless we convert coords.
        // BETTER STRATEGY: Isolate HUD text from World Items.

        ctx.restore(); // Undo Reset for now to handle World Items

        // 1. Draw In-World Items (Artifacts)
        if (player.windArtifacts) {
            player.windArtifacts.forEach((a, i) => {
                a.timer++;
                // Bobbing animation
                const yOff = Math.sin(a.timer * 0.1) * 5;

                // Draw
                ctx.save();
                ctx.translate(a.x, a.y + yOff);
                ctx.rotate(a.timer * 0.02);
                ctx.fillStyle = '#40e0d0';
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, 5);
                ctx.lineTo(-8, 5);
                ctx.fill();
                ctx.restore();

                // Collection Check
                const dist = Math.hypot(player.x - a.x, player.y - (a.y + yOff));
                if (dist < 30) {
                    player.windArtifacts.splice(i, 1);
                    if (player.currentObjective.type === 'COLLECT') {
                        player.currentObjective.current++;
                        if (typeof audioManager !== 'undefined') audioManager.play('coin');
                    }
                }
            });
        }

        // 2. Draw HUD Text (Screen Space)
        const obj = player.currentObjective;
        if (!obj || obj.type === 'NONE') return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Switch to Screen Space

        const screenW = ctx.canvas.width; // Use canvas dim
        const screenH = ctx.canvas.height;
        const x = screenW / 2;
        const y = 80;

        ctx.textAlign = "center";
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = obj.completed ? "#00ff00" : (obj.failed ? "#ff0000" : "#ffffff");
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;

        let progressText = `${Math.floor(obj.current)} / ${obj.target}`;
        if (obj.completed) progressText = "COMPLETE";
        if (obj.failed) progressText = "FAILED";

        ctx.fillText(`${obj.text}`, x, y);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#40e0d0";
        ctx.fillText(progressText, x, y + 20);

        ctx.restore();
    }

    static useUltimate(player) {
        if (player.activeEffect || player.activeTornado) return;
        if (player.weatherVane) player.weatherVane.ultimatesUsedThisWave++;

        // Reset CD
        if (typeof player.specialCooldown !== 'undefined') player.specialCooldown = player.specialMaxCooldown;

        const dir = player.weatherVane.direction; // NORTH, SOUTH, EAST, WEST

        if (dir === 'EAST') {
            // EAST: ZEPHYR DASH (Direct Action)
            const dAngle = player.aimAngle || 0;
            const dist = 300;
            const oldX = player.x;
            const oldY = player.y;

            player.x += Math.cos(dAngle) * dist;
            player.y += Math.sin(dAngle) * dist;

            // Trail Damage
            if (window.enemies) {
                window.enemies.forEach(e => {
                    // Simple line collision check logic omitted for brevity, using large radius
                    const d = Math.hypot(e.x - oldX, e.y - oldY);
                    if (d < dist) {
                        e.hp -= 20 * player.damageMultiplier;
                        createExplosion(e.x, e.y, '#f1c40f', 5);
                    }
                });
            }
            if (typeof showNotification === 'function') showNotification("ZEPHYR DASH!");

        } else if (dir === 'SOUTH') {
            // SOUTH: TORNADO
            player.activeTornado = {
                x: player.x,
                y: player.y,
                timer: 400 // Longer duration for Tornado
            };
            if (typeof showNotification === 'function') showNotification("TORNADO ACTIVE!");

        } else {
            // NORTH (BARRIER) or WEST (VORTEX)
            let type = (dir === 'NORTH') ? 'BARRIER' : 'VORTEX';

            player.activeEffect = {
                x: player.x,
                y: player.y,
                timer: 300,
                type: type
            };
            if (typeof showNotification === 'function') showNotification(`${type} ACTIVE!`);
        }
    }

    static shoot(player, dx, dy) {
        if (!gameRunning || gamePaused || isLevelingUp || isShopping) return;

        const dir = player.weatherVane.direction;

        // Cooldown Multipliers (Reload Times)
        let cdMult = 1.0;
        if (dir === 'NORTH') cdMult = 3.0; // Shotgun: Slow reload
        if (dir === 'SOUTH') cdMult = 4.0; // Sniper: Very slow reload
        if (dir === 'EAST') cdMult = 0.3;  // Rifle: Very fast
        if (dir === 'WEST') cdMult = 2.0;  // Orb: Slow

        const now = Date.now();
        const baseCd = (player.stats.rangeCd || 200) * player.cooldownMultiplier;
        const cd = Math.max(50, baseCd * cdMult);

        if (player.lastShotTime && (now - player.lastShotTime < cd)) return;
        player.lastShotTime = now;

        if (typeof audioManager !== 'undefined') audioManager.play('shoot_weak');

        let angle = player.aimAngle;
        let speed = player.stats.projectileSpeed * 2.0;
        let dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier;

        // --- COMPASS ATTACK LOGIC ---
        // Pushes to window.projectiles
        const spawnProj = (props) => {
            const p = {
                x: player.x,
                y: player.y,
                vx: Math.cos(props.angle) * props.speed,
                vy: Math.sin(props.angle) * props.speed,
                owner: player,
                life: props.life || 60,
                damage: props.damage,
                radius: props.radius || (player.stats.projectileSize * 1.5),
                knockback: props.knockback || 4,
                color: props.color || "#e0f7fa",
                type: 'WIND_BURST',
                pierce: props.pierce || 0,
                windStyle: props.windStyle || 'DEFAULT', // NEW: Style prop

                update: function () {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.life--;
                    if (this.life <= 0) this.dead = true;

                    // WIND VISUAL (Particles Trail)
                    if (typeof createExplosion !== 'undefined' && Math.random() < 0.3) {
                        createExplosion(this.x, this.y, '#e0f7fa', 2);
                    }
                },
                draw: function () {
                    const ctx = window.ctx;
                    if (!ctx) return;

                    ctx.save();
                    ctx.translate(this.x, this.y);

                    const rot = Math.atan2(this.vy, this.vx);
                    ctx.rotate(rot);

                    if (this.windStyle === 'SCATTER') {
                        // NORTH: Shotgun (Chaotic puffs)
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = 0.8;
                        ctx.beginPath();
                        // Draw a rough "cloud" shape
                        for (let i = 0; i < 6; i++) {
                            const a = (i / 6) * Math.PI * 2;
                            const r = this.radius * (0.6 + Math.random() * 0.4);
                            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                        }
                        ctx.fill();

                        // Inner detail
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
                        ctx.fill();

                    } else if (this.windStyle === 'LANCE') {
                        // SOUTH: Sniper (Sharp Lance)
                        // Glowing core
                        ctx.fillStyle = '#fff';
                        ctx.shadowColor = this.color;
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.moveTo(this.radius * 2, 0); // Tip
                        ctx.lineTo(-this.radius, -this.radius * 0.4);
                        ctx.lineTo(-this.radius * 0.5, 0);
                        ctx.lineTo(-this.radius, this.radius * 0.4);
                        ctx.fill();

                        // Trailing lines
                        ctx.shadowBlur = 0;
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(-this.radius * 2, 0);
                        ctx.lineTo(-this.radius, 0);
                        ctx.stroke();

                    } else if (this.windStyle === 'BLADE') {
                        // EAST: Rifle (Crescent Wind Blades)
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 3;
                        ctx.lineCap = 'round';

                        // Curve
                        ctx.beginPath();
                        ctx.arc(-this.radius, 0, this.radius * 1.5, -Math.PI / 3, Math.PI / 3);
                        ctx.stroke();

                        // Inner white blade
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(-this.radius, 0, this.radius * 1.5, -Math.PI / 4, Math.PI / 4);
                        ctx.stroke();

                    } else if (this.windStyle === 'ORB') {
                        // WEST: Orb (Spinning Vortex)
                        const spin = (Date.now() / 100) % (Math.PI * 2);

                        // We must undo the velocity rotation to make it spin on its own axis relative to world,
                        // OR adds to it. Let's start from 0 for local spin.
                        ctx.rotate(-rot); // Reset direction rotation to spin locally freely? 
                        // Actually, keep it moving, but spin visual:
                        ctx.rotate(spin);

                        // Core
                        ctx.fillStyle = 'rgba(64, 224, 208, 0.4)';
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                        ctx.fill();

                        // Arms
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2;
                        for (let i = 0; i < 3; i++) {
                            ctx.rotate((Math.PI * 2) / 3);
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.quadraticCurveTo(this.radius, this.radius, this.radius * 1.2, 0);
                            ctx.stroke();
                        }
                    } else {
                        // Default
                        ctx.fillStyle = this.color;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.restore();
                }
            };
            if (window.projectiles) window.projectiles.push(p);
        };

        if (dir === 'NORTH') {
            // NORTH: SHOTGUN (High spread, high reload)
            for (let i = -2; i <= 2; i++) {
                spawnProj({
                    angle: angle + (i * 0.15),
                    speed: speed * 0.9,
                    damage: dmg * 0.8,
                    life: 40,
                    radius: 6,
                    color: '#40e0d0', // Turquoise
                    windStyle: 'SCATTER'
                });
            }
        } else if (dir === 'SOUTH') {
            // SOUTH: SNIPER (Pierce, high reload, high damage)
            spawnProj({
                angle: angle,
                speed: speed * 2.5,
                damage: dmg * 5.0,
                life: 120,
                radius: 8,
                color: '#81eff7', // Lighter Turquoise/Cyan
                pierce: 999,
                windStyle: 'LANCE'
            });
        } else if (dir === 'EAST') {
            // EAST: FAST RIFLE (Rapid fire, low dmg)
            spawnProj({
                angle: angle + (Math.random() - 0.5) * 0.05,
                speed: speed * 1.3,
                damage: dmg * 0.6,
                life: 80,
                radius: 6,
                color: '#20b2aa', // Light Sea Green
                windStyle: 'BLADE'
            });

        } else {
            // WEST: ORB (Slow, big, lingers, pierces all)
            spawnProj({
                angle: angle,
                speed: speed * 0.3,
                damage: dmg * 1.5,
                life: 150,
                radius: 15,
                color: '#00ced1', // Dark Turquoise
                pierce: 999,
                windStyle: 'ORB'
            });
        }
    }
}

const AirHeroLogic = {
    init: AirHero.init,
    // Merge standard pool with Wind Shift, removing the old custom stats from Level Up logic
    upgradePool: (typeof UPGRADE_POOL !== 'undefined' ? [...UPGRADE_POOL] : []).concat([
        { id: 'wind_shift', title: 'Shift Winds', desc: 'Change Compass Orientation', icon: '🧭' }
    ]),

    // OFFLOADING
    getSkillTreeWeights: AirHero.getSkillTreeWeights,
    getSkillNodeDetails: AirHero.getSkillNodeDetails,
    applySkillNode: AirHero.applySkillNode,
    applyWindShift: AirHero.applyWindShift // Fix for Level Up item
};

// Register Hero Logic for Injection
if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['air'] = AirHeroLogic;

