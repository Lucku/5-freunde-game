// Sound Hero (Light Blue) Logic
// Playstyle: Rhythm/Timing based. Strong when synced, weak when off-beat.
// Unique: "Sync Meter", "Sound Wave" Ultimate
// Weakness: Needs Sound Biome for full potential

class SoundHero {
    static init(player) {
        // Base Stats
        player.speedMultiplier = 1.0;
        player.damageMultiplier = 1.0; // Standard until modified by Beat

        // Unique Resource: Sync Meter
        player.syncMeter = 0;
        player.maxSyncMeter = 100;
        player.beatStreak = 0; // Consecutive on-beat hits

        player.specialName = "CRESCENDO";
        player.specialMaxCooldown = 900; // 15s

        const iconEl = document.getElementById('special-icon');
        if (iconEl) iconEl.innerText = "🎵";

        // Double check special name assignment
        if (!player.specialName || player.specialName === "undefined") {
            player.specialName = "CRESCENDO";
        }

        player.customUpdate = (dx, dy) => SoundHero.update(player, dx, dy);
        player.customSpecial = () => SoundHero.useSpecial(player);
        player.shoot = (dx, dy) => SoundHero.shootNote(player, dx, dy);

        // Form Name
        player.getFormName = function () { return 'PERFORMER'; };

        // Visuals
        player.visualPulse = 0;

        // Reset DLC State
        if (window.SYMPHONY_STATE) {
            window.SYMPHONY_STATE.totems = [];
            window.SYMPHONY_STATE.totemsConquered = 0;
        }
    }

    static checkConvergence(player, id) {
        if (typeof has === 'function') return has(id);
        if (window.player && window.player.upgradeList) return window.player.upgradeList.includes(id);
        return false;
    }

    static getSkillTreeWeights() {
        return { SYNC_CAP: 0.25, BEAT_WINDOW: 0.25, WAVE_SIZE: 0.20, DAMAGE: 0.15, SPEED: 0.15 };
    }

    static getSkillNodeDetails(type, val, desc) {
        if (type === 'SYNC_CAP') return { val: 20, desc: "+20 Max Sync" };
        if (type === 'BEAT_WINDOW') return { val: 10, desc: "+10ms Beat Window" }; // Logic needs access to this
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'SYNC_CAP') base.maxSyncMeter = (base.maxSyncMeter || 100) + node.value;
        // Standard
        if (node.type === 'DAMAGE') base.damageMultiplier = (base.damageMultiplier || 1) + 0.1;
    }

    static applyUpgrade(player, type) {
        if (type === 'metronome') {
            player.autoSync = true; // Skill: Auto-hit perfectly every 4th beat?
            return true;
        }
        return false;
    }

    static update(player, dx, dy) {
        // 1. Initialize Totems if needed
        if (!window.SYMPHONY_STATE.totems || window.SYMPHONY_STATE.totems.length === 0) {
            SoundHero.startTotems(player);
        }

        // 2. Logic: Totem Conquest (Biome Assimilation)
        SoundHero.updateTotems(player);

        // 3. Biome Buffs/Debuffs
        const currentBiome = window.currentBiome || 'standard';
        // Note: We removed the "Story Mode" debuff to focus on the mechanic.
        // Instead, the player is just "neutral" until they assimilate.

        // Sync Meter Decay
        if (player.syncMeter > 0 && window.frame % 60 === 0) {
            player.syncMeter = Math.max(0, player.syncMeter - 2);
        }

        // 4. Passive Logic (Pulse, UI, Ultimate)
        SoundHero.handlePassiveLogic(player);
    }

    static startTotems(player) {
        // Spawn 3 Totems in a triangle around the center, or random
        // Arena is usually -2000 to 2000 approx, or 4000x4000
        // Let's check Arena.width if possible, else assume standard large map
        const range = 800;
        window.SYMPHONY_STATE.totems = [
            { x: player.x + range, y: player.y + range, radius: 150, progress: 0, max: 600, state: 'neutral', id: 1 },
            { x: player.x - range, y: player.y + range, radius: 150, progress: 0, max: 600, state: 'neutral', id: 2 },
            { x: player.x, y: player.y - range, radius: 150, progress: 0, max: 600, state: 'neutral', id: 3 }
        ];
        window.SYMPHONY_STATE.totemsConquered = 0;
    }

    static updateTotems(player) {
        if (!window.SYMPHONY_STATE.totems) return;

        let conqueredCount = 0;

        window.SYMPHONY_STATE.totems.forEach(totem => {
            if (totem.state === 'conquered') {
                conqueredCount++;
                return;
            }

            // 1. Check Player Presence
            const distPlayer = Math.hypot(player.x - totem.x, player.y - totem.y);
            const playerInside = distPlayer < totem.radius;

            // 2. Check Enemy Presence
            let enemyInside = false;
            if (playerInside) {
                // Optimization: Only check if player is there to save perf
                for (const enemy of window.enemies) {
                    if (enemy.hp > 0 && Math.hypot(enemy.x - totem.x, enemy.y - totem.y) < totem.radius) {
                        enemyInside = true;
                        break;
                    }
                }
            }

            // 3. Logic
            if (playerInside) {
                if (enemyInside) {
                    // Contested! Reset progress or halt? User said "progress stops/resets"
                    totem.state = 'contested';
                    if (totem.progress > 0) totem.progress -= 5; // Rapid decay
                } else {
                    // Capturing
                    totem.state = 'capturing';
                    totem.progress++;
                    if (totem.progress >= totem.max) {
                        totem.state = 'conquered';
                        totem.progress = totem.max;
                        // Boom effect
                        if (typeof showNotification === 'function') showNotification("TOTEM HARMONIZED!", "#4fc3f7");
                        // Push back enemies?
                    }
                }
            } else {
                // Abandoned
                if (totem.progress > 0) {
                    totem.state = 'neutral';
                    totem.progress = Math.max(0, totem.progress - 1); // Slow decay
                } else {
                    totem.state = 'neutral';
                }
            }
        });

        window.SYMPHONY_STATE.totemsConquered = conqueredCount;

        // Check Victory
        if (conqueredCount >= 3 && window.currentBiome !== 'sound' && window.SYMPHONY_STATE.triggerBiomeAssimilation) {
            window.SYMPHONY_STATE.triggerBiomeAssimilation('sound');
        }
    }

    static drawTotems(ctx, player) {
        if (!window.SYMPHONY_STATE.totems) return;

        ctx.save();
        window.SYMPHONY_STATE.totems.forEach(totem => {
            // Screen Culling (Simple)
            if (Math.abs(totem.x - player.x) > 1000 || Math.abs(totem.y - player.y) > 1000) return;

            // Draw Base
            ctx.beginPath();
            ctx.arc(totem.x - window.cameraX, totem.y - window.cameraY, totem.radius, 0, Math.PI * 2);
            ctx.strokeStyle = totem.state === 'conquered' ? '#00e5ff' : '#555';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Progress Fill
            if (totem.progress > 0) {
                ctx.beginPath();
                ctx.arc(totem.x - window.cameraX, totem.y - window.cameraY, totem.radius, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * (totem.progress / totem.max)));
                ctx.strokeStyle = totem.state === 'contested' ? '#ff0000' : '#4fc3f7';
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            // Draw Center Icon
            ctx.fillStyle = totem.state === 'conquered' ? '#00e5ff' : (totem.state === 'contested' ? '#ff5252' : '#888');
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(totem.state === 'conquered' ? '♫' : '⚠', totem.x - window.cameraX, totem.y - window.cameraY);

            // Draw Label
            /*
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(totem.state.toUpperCase(), totem.x - window.cameraX, totem.y - window.cameraY + 40);
            */
        });
        ctx.restore();
    }

    // 4. Visual Pulse (Beat Visualization) & Logic Update
    // Merged logic that was previously floating outside class methods
    static handlePassiveLogic(player) {
        const isStoryMode = (typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled);

        // Secondary Objective / Passive Conversion
        if (isStoryMode && player.syncMeter > 80 && window.frame % 60 === 0) {
            window.SYMPHONY_STATE.biomeTransformation = Math.min(100, (window.SYMPHONY_STATE.biomeTransformation || 0) + 1);
        }

        // Visual Pulse
        if (window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat) {
            player.visualPulse = 10;
        }
        if (player.visualPulse > 0) player.visualPulse--;

        // Ultimate Form Update
        if (player.transformActive && player.currentForm === 'PERFORMER') {
            player.syncMeter = player.maxSyncMeter; // Infinite Sync
            // AoE Pulse damage around player
            if (window.frame % 30 === 0) {
                if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, "#4fc3f7", 40);
                if (window.enemies) {
                    window.enemies.forEach(e => {
                        if (Math.hypot(e.x - player.x, e.y - player.y) < 200) {
                            e.hp -= 20 * player.damageMultiplier;
                            // Push back
                            const angle = Math.atan2(e.y - player.y, e.x - player.x);
                            e.x += Math.cos(angle) * 10;
                            e.y += Math.sin(angle) * 10;
                        }
                    });
                }
            }
        }

        SoundHero.drawUI(player);
    }

    static drawUI(player) {
        if (!window.ctx) return;
        const ctx = window.ctx;

        // Draw Sync Meter
        const x = player.x - 20;
        const y = player.y + 35;
        const w = 40, h = 4;

        ctx.fillStyle = "#333";
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = "#4fc3f7";
        ctx.fillRect(x, y, w * (player.syncMeter / player.maxSyncMeter), h);

        // Visual Pulse Ring
        if (player.visualPulse > 0) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 195, 247, ${player.visualPulse / 10})`;
            ctx.lineWidth = 3;
            ctx.arc(player.x, player.y, 20 + (10 - player.visualPulse) * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    static shootNote(player, dx, dy) {
        if (player.rangeCooldown > 0) return;

        // Fix: Calculate direction if missing (called from Player.shoot())
        if (dx === undefined || dy === undefined) {
            let angle = player.aimAngle || 0;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        }

        // Check rhythm
        const isOnBeat = window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat;

        let dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier;
        let color = "#4fc3f7";
        let scale = 1.0;
        let isPowerChord = false;

        if (isOnBeat) {
            dmg *= 2.0; // Crit
            color = "#00bcd4"; // Darker Blue
            scale = 1.5;
            player.syncMeter = Math.min(player.maxSyncMeter, player.syncMeter + 5);
            player.beatStreak++;
            isPowerChord = true;
            if (typeof showNotification === 'function' && Math.random() < 0.2) showNotification("PERFECT!", color);
            // Audio
            if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_perfect'); // Need to map this
        } else {
            dmg *= 0.5; // Weak hit
            player.beatStreak = 0;
            // Audio
            if (typeof audioManager !== 'undefined') audioManager.play('shoot_weak');
        }

        // Ultimate Wave Check
        if (player.syncMeter >= player.maxSyncMeter) {
            SoundHero.fireSoundWave(player);
            player.syncMeter = 0; // Reset
            return;
        }

        if (typeof projectiles !== 'undefined') {
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: dx * 10,
                vy: dy * 10,
                radius: 8 * scale,
                color: color,
                damage: dmg,
                life: 60,
                type: 'NOTE',
                update: function () {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.life--;
                    if (this.life <= 0) this.dead = true;
                },
                draw: function (ctx) {
                    if (!ctx) ctx = window.ctx;
                    if (!ctx) return;
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.fillStyle = this.color;

                    // Draw Music Note Head (Using Text)
                    ctx.font = (this.radius * 3) + "px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("♪", 0, 0);

                    ctx.restore();
                }
            });
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    static fireSoundWave(player) {
        // Radial or Conical Wave logic
        if (typeof showNotification === 'function') showNotification("SOUND WAVE!", "#4fc3f7");

        const count = 12; // 360 degrees
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            if (typeof projectiles !== 'undefined') {
                projectiles.push({
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * 8,
                    vy: Math.sin(angle) * 8,
                    radius: 12,
                    color: "#00bcd4",
                    damage: 30 * player.damageMultiplier,
                    life: 40,
                    type: 'WAVE',
                    update: function () {
                        this.x += this.vx;
                        this.y += this.vy;
                        this.radius += 0.5; // Grow
                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },
                    draw: function () {
                        const ctx = window.ctx;
                        if (!ctx) return;
                        ctx.save();
                        ctx.translate(this.x, this.y);
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(0, 0, this.radius, 0, Math.PI * 2); // Ring
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }
        }
    }

    static useSpecial(player) {
        if (player.transformActive) return false;

        player.transformActive = true;
        player.currentForm = 'PERFORMER';
        player.syncMeter = player.maxSyncMeter; // Fill

        // Duration: 10s (600 frames)
        player.transformDuration = 600;

        if (typeof showNotification === 'function') showNotification(player.specialName + "!", "#4fc3f7");

        return true; // Signal success to Player.js to apply cooldown
    }
}

// Register in logic system
if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['sound'] = SoundHero;
window.SoundHero = SoundHero;