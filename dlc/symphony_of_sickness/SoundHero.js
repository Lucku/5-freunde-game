// Sound Hero (Light Blue) Logic
// Playstyle: Rhythm/Timing based. Strong when synced, weak when off-beat.
// Unique Mechanics:
//   - Ritual of Resonance: conquer 3 totems (random map positions, one per wave)
//     to transform the biome — only available outside the Sound biome
//   - Sync Meter: fills from on-beat attacks ONLY while in Sound biome → 10s Sync State
//   - CRESCENDO Special: omnidirectional wave burst + 10s AoE Performer form

class SoundHero {
    static init(player) {
        // Base Stats
        player.speedMultiplier = 1.0;
        player.damageMultiplier = 1.0;

        // Unique Resource: Sync Meter
        player.syncMeter = 0;
        player.maxSyncMeter = 100;
        player.beatStreak = 0;

        // Sync State (triggered by filling the meter while in Sound biome)
        player.syncStateActive = false;
        player.syncStateDuration = 0;

        player.specialName = "CRESCENDO";
        player.specialMaxCooldown = 900; // 15s

        if (!player.isCPU) {
            const iconEl = document.getElementById('special-icon');
            if (iconEl) iconEl.innerText = "🎵";
        }

        if (!player.specialName || player.specialName === "undefined") {
            player.specialName = "CRESCENDO";
        }

        player.customUpdate = (dx, dy) => SoundHero.update(player, dx, dy);
        player.customSpecial = () => SoundHero.useSpecial(player);
        player.shoot = (dx, dy) => SoundHero.shootNote(player, dx, dy);

        // Altar: cooldown reduction (so1)
        const active = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const has = (id) => active.includes(id);
        if (has('so1')) player.specialMaxCooldown = Math.floor(player.specialMaxCooldown * 0.9);

        player.getFormName = function () { return 'PERFORMER'; };
        player.visualPulse = 0;

        // Reset DLC State
        if (window.SYMPHONY_STATE) {
            window.SYMPHONY_STATE.totems = [];
            window.SYMPHONY_STATE.totemsConquered = 0;
            window.SYMPHONY_STATE._lastWave = null;
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
        if (type === 'BEAT_WINDOW') return { val: 10, desc: "+10ms Beat Window" };
        return { val, desc };
    }

    static applySkillNode(base, node) {
        if (node.type === 'SYNC_CAP') base.maxSyncMeter = (base.maxSyncMeter || 100) + node.value;
        if (node.type === 'DAMAGE') base.damageMultiplier = (base.damageMultiplier || 1) + 0.1;
    }

    static applyUpgrade(player, type) {
        if (type === 'metronome') {
            player.autoSync = true;
            return true;
        }
        if (type === 'transform') {
            player.transformActive = true;
            player.currentForm = 'PERFORMER';
            player.grandFinaleTimer = 600;
            player._beatFired = false;
            SoundHero.spawnResonanceRing(player);
            if (typeof createExplosion !== 'undefined') createExplosion(player.x, player.y, '#00e5ff', 30);
            if (typeof showNotification === 'function') showNotification("GRAND FINALE!", "#00e5ff");
            return true;
        }
        return false;
    }

    static isInSoundBiome() {
        const check = (val) => typeof val === 'string' && (val.toLowerCase().includes('sound') || val.toLowerCase() === 'rhythm');
        if (check(window.currentBiome)) return true;
        if (typeof currentBiomeType !== 'undefined' && check(currentBiomeType)) return true;
        if (check(window.currentBiomeType)) return true;
        return false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    static update(player, dx, dy) {
        const inSoundBiome = SoundHero.isInSoundBiome();

        // ── Totem system: only active when NOT already in Sound biome ──
        if (!inSoundBiome) {
            // Reset totems at the start of each new wave
            const currentWave = window.wave || 1;
            if (window.SYMPHONY_STATE._lastWave !== currentWave) {
                window.SYMPHONY_STATE._lastWave = currentWave;
                window.SYMPHONY_STATE.totems = [];
                window.SYMPHONY_STATE.totemsConquered = 0;
            }

            if (!window.SYMPHONY_STATE.totems || window.SYMPHONY_STATE.totems.length === 0) {
                SoundHero.startTotems(player);
            }

            SoundHero.updateTotems(player);
        }

        // ── Sync meter: only active in Sound biome ──
        if (inSoundBiome) {
            // Decay when not in sync state
            if (!player.syncStateActive && player.syncMeter > 0 && window.frame % 60 === 0) {
                player.syncMeter = Math.max(0, player.syncMeter - 2);
            }

            // Sync state countdown
            if (player.syncStateActive) {
                player.syncStateDuration--;
                if (player.syncStateDuration <= 0) {
                    player.syncStateActive = false;
                    player.syncMeter = 0;
                    if (typeof showNotification === 'function') showNotification("SYNC FADED", "#90caf9");

                    // cv_so_m: Steel Tempo — remove damage reduction bonus on exit
                    if (player.steelTempoApplied) {
                        player.steelTempoApplied = false;
                        player.damageReduction = Math.max(0, (player.damageReduction || 0) - 0.3);
                    }
                }
            }

            // Trigger sync state when meter fills
            if (!player.syncStateActive && player.syncMeter >= player.maxSyncMeter) {
                player.syncStateActive = true;
                player.syncStateDuration = 600; // 10 seconds at 60fps
                if (typeof showNotification === 'function') showNotification("IN SYNC!", "#00e5ff");

                // cv_so_m: Steel Tempo — gain 30% damage reduction on Sync State entry
                const altActive = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
                if (altActive.includes('cv_so_m') && !player.steelTempoApplied) {
                    player.steelTempoApplied = true;
                    player.damageReduction = (player.damageReduction || 0) + 0.3;
                }
            }
        } else {
            // Outside Sound biome: sync state cannot exist
            if (player.syncStateActive) {
                player.syncStateActive = false;
                player.syncStateDuration = 0;
            }
            player.syncMeter = 0;
        }

        // ── PERFORMER: GRAND FINALE form ──
        if (player.transformActive && player.currentForm === 'PERFORMER') {
            if (!player.grandFinaleTimer) player.grandFinaleTimer = 600;
            player.grandFinaleTimer--;

            // Auto-fire 8-way omnidirectional burst on every beat
            const onBeat = window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat;
            if (onBeat && !player._beatFired) {
                player._beatFired = true;
                SoundHero.fireGrandFinaleOmni(player);
            }
            if (!onBeat) player._beatFired = false;

            // Orbiting note damage ring every 30 frames
            if (window.frame % 30 === 0 && window.enemies) {
                const dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier * 1.2;
                window.enemies.forEach(e => {
                    if (e.hp > 0 && Math.hypot(e.x - player.x, e.y - player.y) < 100) {
                        if (typeof e.takeDamage === 'function') e.takeDamage(dmg); else e.hp -= dmg;
                        if (e.resonating > 0) {
                            if (typeof e.takeDamage === 'function') e.takeDamage(dmg); else e.hp -= dmg;
                        }
                        if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y - 15, Math.floor(dmg), '#00e5ff');
                    }
                });
            }

            if (player.grandFinaleTimer <= 0) {
                player.transformActive = false;
                if (typeof showNotification === 'function') showNotification("FINAL NOTE...", "#90caf9");
            }
        }

        // ── Visuals, AoE, and UI ──
        SoundHero.handlePassiveLogic(player);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RITUAL OF RESONANCE – TOTEM SYSTEM
    // ─────────────────────────────────────────────────────────────────────────

    static startTotems(player) {
        const aw = (window.arena && window.arena.width) ? window.arena.width : 4000;
        const ah = (window.arena && window.arena.height) ? window.arena.height : 4000;
        const margin = 350;
        const minFromPlayer = 500;
        const minBetween = 600;

        const totems = [];
        let attempts = 0;

        while (totems.length < 3 && attempts < 300) {
            attempts++;
            const tx = margin + Math.random() * (aw - margin * 2);
            const ty = margin + Math.random() * (ah - margin * 2);

            if (Math.hypot(tx - player.x, ty - player.y) < minFromPlayer) continue;

            let tooClose = false;
            for (const t of totems) {
                if (Math.hypot(tx - t.x, ty - t.y) < minBetween) { tooClose = true; break; }
            }
            if (tooClose) continue;

            totems.push({
                x: tx, y: ty,
                radius: 150,
                progress: 0, max: 600,
                state: 'neutral', // neutral | capturing | contested | conquered
                id: totems.length + 1
            });
        }

        window.SYMPHONY_STATE.totems = totems;
        window.SYMPHONY_STATE.totemsConquered = 0;
    }

    static updateTotems(player) {
        if (!window.SYMPHONY_STATE.totems) return;

        let conqueredCount = 0;

        window.SYMPHONY_STATE.totems.forEach(totem => {
            if (totem.state === 'conquered') { conqueredCount++; return; }

            const playerInside = Math.hypot(player.x - totem.x, player.y - totem.y) < totem.radius;

            if (playerInside) {
                let enemyInside = false;
                for (const enemy of window.enemies) {
                    if (enemy.hp > 0 && Math.hypot(enemy.x - totem.x, enemy.y - totem.y) < totem.radius) {
                        enemyInside = true;
                        break;
                    }
                }

                if (enemyInside) {
                    // Contested: enemy presence halts progress
                    totem.state = 'contested';
                } else {
                    // Capturing: player alone fills the meter
                    totem.state = 'capturing';
                    totem.progress = Math.min(totem.max, totem.progress + 1);
                    if (totem.progress >= totem.max) {
                        totem.state = 'conquered';
                        if (typeof showNotification === 'function') showNotification("TOTEM HARMONIZED!", "#4fc3f7");
                    }
                }
            } else {
                // Player not inside: check for enemy-only presence
                let enemyInside = false;
                for (const enemy of window.enemies) {
                    if (enemy.hp > 0 && Math.hypot(enemy.x - totem.x, enemy.y - totem.y) < totem.radius) {
                        enemyInside = true;
                        break;
                    }
                }

                if (enemyInside) {
                    // Enemy alone: instant reset
                    totem.progress = 0;
                    totem.state = 'neutral';
                } else if (totem.progress > 0) {
                    // Abandoned: very slow decay (1 per 10 frames → ~100s to fully empty)
                    totem.state = 'neutral';
                    if ((window.frame || 0) % 10 === 0) {
                        totem.progress = Math.max(0, totem.progress - 1);
                    }
                } else {
                    totem.state = 'neutral';
                }
            }
        });

        window.SYMPHONY_STATE.totemsConquered = conqueredCount;

        if (conqueredCount >= 2 && !SoundHero.isInSoundBiome() && window.SYMPHONY_STATE.triggerBiomeAssimilation) {
            window.SYMPHONY_STATE.triggerBiomeAssimilation('sound');
        }
    }

    // Draw totems — called while camera transform IS active (world space coordinates)
    static drawTotems(ctx, player) {
        if (!window.SYMPHONY_STATE.totems || !ctx) return;
        if (SoundHero.isInSoundBiome()) return; // No ritual needed once in Sound biome

        ctx.save();

        window.SYMPHONY_STATE.totems.forEach(totem => {
            if (Math.abs(totem.x - player.x) > 1400 || Math.abs(totem.y - player.y) > 1400) return;

            // ── Territory circle ──
            ctx.beginPath();
            ctx.arc(totem.x, totem.y, totem.radius, 0, Math.PI * 2);
            ctx.setLineDash([8, 6]);
            if (totem.state === 'conquered') {
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
                ctx.lineWidth = 3;
            } else if (totem.state === 'capturing') {
                ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
                ctx.lineWidth = 2;
            } else if (totem.state === 'contested') {
                ctx.strokeStyle = 'rgba(255, 82, 82, 0.7)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(120, 120, 140, 0.35)';
                ctx.lineWidth = 1.5;
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // ── Territory fill tint ──
            ctx.beginPath();
            ctx.arc(totem.x, totem.y, totem.radius, 0, Math.PI * 2);
            if (totem.state === 'conquered') ctx.fillStyle = 'rgba(0, 229, 255, 0.07)';
            else if (totem.state === 'capturing') ctx.fillStyle = 'rgba(79, 195, 247, 0.05)';
            else if (totem.state === 'contested') ctx.fillStyle = 'rgba(255, 82, 82, 0.06)';
            else ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.fill();

            // ── Capture progress arc (outside the ring) ──
            if (totem.progress > 0 && totem.state !== 'conquered') {
                ctx.beginPath();
                const arcStart = -Math.PI / 2;
                ctx.arc(totem.x, totem.y, totem.radius + 9, arcStart, arcStart + Math.PI * 2 * (totem.progress / totem.max));
                ctx.strokeStyle = totem.state === 'contested' ? '#ff5252' : '#4fc3f7';
                ctx.lineWidth = 5;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.lineCap = 'butt';
            }

            // ── Center icon ──
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (totem.state === 'conquered') {
                ctx.fillStyle = '#00e5ff';
                ctx.fillText('♫', totem.x, totem.y);
            } else if (totem.state === 'contested') {
                ctx.fillStyle = '#ff5252';
                ctx.fillText('✕', totem.x, totem.y);
            } else {
                ctx.fillStyle = totem.state === 'capturing' ? '#4fc3f7' : '#555';
                ctx.fillText('♩', totem.x, totem.y);
            }

            // ── Progress % label ──
            if (totem.state !== 'conquered' && totem.progress > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = 'bold 11px Arial';
                ctx.fillText(Math.floor((totem.progress / totem.max) * 100) + '%', totem.x, totem.y + 24);
            }
        });

        ctx.restore();

        // ── Screen-space HUD: ritual tracker ──
        // Reset transform temporarily to draw at fixed screen position
        const cvs = window.canvas || document.getElementById('gameCanvas');
        if (!cvs) return;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const conquered = window.SYMPHONY_STATE.totemsConquered || 0;
        const total = (window.SYMPHONY_STATE.totems || []).length;
        const REQUIRED = 2;
        const allDone = conquered >= REQUIRED && total > 0;

        const hudX = cvs.width / 2;
        const hudY = 52;
        const hudW = 150;
        const hudH = 24;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(hudX - hudW / 2, hudY - hudH / 2, hudW, hudH);

        ctx.fillStyle = allDone ? '#00e5ff' : '#4fc3f7';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(allDone ? '♫ RITUAL COMPLETE' : `♩ RITUAL: ${conquered} / ${REQUIRED} TOTEMS`, hudX, hudY);

        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSIVE LOGIC (called each frame while camera transform IS active)
    // ─────────────────────────────────────────────────────────────────────────

    static handlePassiveLogic(player) {
        const isStoryMode = (typeof saveData !== 'undefined' && saveData.story && saveData.story.enabled);
        if (isStoryMode && player.syncMeter > 80 && window.frame % 60 === 0) {
            window.SYMPHONY_STATE.biomeTransformation = Math.min(100, (window.SYMPHONY_STATE.biomeTransformation || 0) + 1);
        }

        // Beat pulse visual (always active for feel, regardless of biome)
        if (window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat) {
            player.visualPulse = 10;
        }
        if (player.visualPulse > 0) player.visualPulse--;


        // All drawing goes through here while camera transform is active
        const ctx = window.ctx;
        if (ctx) {
            SoundHero.drawTotems(ctx, player);
            SoundHero.drawUI(player, ctx);
            SoundHero.drawBeatIndicator(player, ctx);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCREEN-SPACE BEAT INDICATOR — always visible, works with sound off
    // ─────────────────────────────────────────────────────────────────────────

    static drawBeatIndicator(player, ctx) {
        if (!window.SYMPHONY_STATE) return;
        if (!SoundHero.isInSoundBiome()) return;

        const ss = window.SYMPHONY_STATE;
        const phase    = ss.beatPhase    !== undefined ? ss.beatPhase    : 0; // 0→1 between beats
        const onBeat   = !!ss.onBeat;
        const inBiome  = SoundHero.isInSoundBiome();
        const streak   = player.beatStreak || 0;
        const syncActive = !!player.syncStateActive;

        // Screen-space anchor — bottom-center, above the special bar area
        const sw = window.innerWidth  || 800;
        const sh = window.innerHeight || 600;
        const cx = sw / 2;
        const cy = sh - 72;    // 72px from bottom
        const R  = 28;         // outer radius
        const r  = 20;         // inner radius (ring width = 8px)

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // escape camera transform

        // ── Background ring (dark) ──
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 10, 20, 0.72)';
        ctx.fill();

        // ── Progress arc (phase 0 = full bright, phase 1 = about to beat) ──
        // Arc sweeps clockwise from top. Angle 0 = 12 o'clock.
        const startAngle = -Math.PI / 2;
        const endAngle   = startAngle + Math.PI * 2 * (1 - phase); // shrinks toward beat

        // Color: cyan normally, warm yellow as beat approaches, white flash on beat
        let arcColor;
        if (onBeat) {
            arcColor = '#ffffff';
        } else if (phase > 0.75) {
            const t = (phase - 0.75) / 0.25; // 0→1 in the final quarter
            const r2 = Math.round(79  + t * (255 - 79));
            const g2 = Math.round(195 + t * (230 - 195));
            const b2 = Math.round(247 + t * (50  - 247));
            arcColor = `rgb(${r2},${g2},${b2})`;
        } else {
            arcColor = syncActive ? '#00e5ff' : '#4fc3f7';
        }

        // Glow when on beat or near beat
        if (onBeat || phase > 0.8) {
            ctx.shadowBlur  = onBeat ? 18 : 8;
            ctx.shadowColor = arcColor;
        }

        ctx.strokeStyle = arcColor;
        ctx.lineWidth   = R - r;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        if (endAngle > startAngle) {
            ctx.arc(cx, cy, (R + r) / 2, startAngle, endAngle);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // ── Beat flash overlay ──
        if (onBeat) {
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fill();
        }

        // ── Tick marks at 4 quarter-beats ──
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'butt';
        for (let i = 0; i < 4; i++) {
            const a = startAngle + (i / 4) * Math.PI * 2;
            const x1 = cx + Math.cos(a) * r;
            const y1 = cy + Math.sin(a) * r;
            const x2 = cx + Math.cos(a) * R;
            const y2 = cy + Math.sin(a) * R;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // ── Center content ──
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        if (onBeat) {
            // "♩" flash on beat
            ctx.fillStyle = '#ffffff';
            ctx.font      = 'bold 14px sans-serif';
            ctx.fillText('♩', cx, cy);
        } else if (syncActive) {
            // Sync state: show remaining time in seconds
            const secsLeft = Math.ceil((player.syncStateDuration || 0) / 60);
            ctx.fillStyle = '#00e5ff';
            ctx.font      = 'bold 11px monospace';
            ctx.fillText(secsLeft + 's', cx, cy);
        } else if (streak > 0) {
            // Beat streak count
            ctx.fillStyle = '#4fc3f7';
            ctx.font      = 'bold 11px monospace';
            ctx.fillText('×' + streak, cx, cy);
        } else {
            // Musical note when idle
            ctx.fillStyle = 'rgba(79,195,247,0.55)';
            ctx.font      = '12px sans-serif';
            ctx.fillText('♩', cx, cy);
        }

        // ── Label ──
        ctx.fillStyle = 'rgba(150,210,255,0.55)';
        ctx.font      = '8px monospace';
        ctx.fillText('BEAT', cx, cy + R + 8);

        // ── Sync meter arc (outer ring, only in Sound biome) ──
        if (inBiome) {
            const pct = (player.syncMeter || 0) / (player.maxSyncMeter || 100);
            const mR  = R + 6;
            ctx.strokeStyle = syncActive ? 'rgba(0,229,255,0.9)' : 'rgba(79,195,247,0.6)';
            ctx.lineWidth   = 2.5;
            ctx.lineCap     = 'round';
            if (syncActive) { ctx.shadowBlur = 8; ctx.shadowColor = '#00e5ff'; }
            ctx.beginPath();
            ctx.arc(cx, cy, mR, startAngle, startAngle + Math.PI * 2 * pct);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HUD DRAWING — sync meter + aura (world space, camera transform active)
    // ─────────────────────────────────────────────────────────────────────────

    static drawUI(player, ctx) {
        // game.js calls this as drawUI(ctx) — first arg is ctx, second arg is absent.
        // All drawing already happens via handlePassiveLogic, so return early to
        // prevent a ghost image rendered in screen space with world coordinates.
        if (!ctx) return;

        // Ensure player is a valid player object, not the ctx passed by the game.js hook
        if (!player || typeof player.syncMeter === 'undefined') return;

        const inSoundBiome = SoundHero.isInSoundBiome();

        // ── Sync meter bar (above player, world coords) ──
        // Only draw when in Sound biome (outside it the meter doesn't exist)
        if (inSoundBiome) {
            const x = player.x - 20;
            const y = player.y + 36;
            const w = 40, h = 4;

            ctx.fillStyle = '#0d0d1a';
            ctx.fillRect(x, y, w, h);

            if (player.syncStateActive) {
                const pulse = Math.abs(Math.sin((window.frame || 0) * 0.1));
                ctx.fillStyle = `rgba(0, 229, 255, ${0.8 + 0.2 * pulse})`;
            } else {
                ctx.fillStyle = '#4fc3f7';
            }
            ctx.fillRect(x, y, w * (player.syncMeter / player.maxSyncMeter), h);

            // ── Sync state aura ──
            if (player.syncStateActive) {
                const t = (window.frame || 0) * 0.08;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 + 0.2 * Math.sin(t)})`;
                ctx.lineWidth = 2;
                ctx.arc(player.x, player.y, 30 + Math.sin(t) * 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // ── PERFORMER form: orbiting notes + close-range ring ──
        if (player.transformActive && player.currentForm === 'PERFORMER') {
            const t = (window.frame || 0) * 0.07;
            const orbitR = 85;
            const notes = ['♪', '♫', '♩'];
            notes.forEach((note, i) => {
                const a = t + (i / notes.length) * Math.PI * 2;
                const nx = player.x + Math.cos(a) * orbitR;
                const ny = player.y + Math.sin(a) * orbitR;
                ctx.save();
                ctx.fillStyle = `rgba(0, 229, 255, ${0.75 + 0.25 * Math.sin(t * 3 + i)})`;
                ctx.font = '18px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.shadowBlur = 12; ctx.shadowColor = '#00e5ff';
                ctx.fillText(note, nx, ny);
                ctx.shadowBlur = 0;
                ctx.restore();
            });
            // Pulsing ring
            const pulse = 0.3 + 0.2 * Math.sin(t * 4);
            ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(player.x, player.y, orbitR, 0, Math.PI * 2);
            ctx.stroke();
            // Timer bar (screen space)
            const timerPct = Math.max(0, (player.grandFinaleTimer || 0) / 600);
            const bw = 50, bh = 4;
            const bx = player.x - bw / 2, by = player.y - 52;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(bx, by, bw * timerPct, bh);
        }

        // ── Beat pulse ring (Sound biome only) ──
        if (inSoundBiome && player.visualPulse > 0) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79, 195, 247, ${player.visualPulse / 10})`;
            ctx.lineWidth = 2;
            ctx.arc(player.x, player.y, 22 + (10 - player.visualPulse) * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACK: SHOOT NOTE (normal, beat-synced; fires waves in Sync State)
    // ─────────────────────────────────────────────────────────────────────────

    static shootNote(player, dx, dy) {
        if (player.transformActive && player.currentForm === 'PERFORMER') {
            SoundHero.fireGrandFinaleNote(player, dx, dy);
            return;
        }
        if (player.rangeCooldown > 0) return;

        if (dx === undefined || dy === undefined) {
            const angle = player.aimAngle || 0;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
        }

        // ── Auto-aim: redirect toward nearest enemy when buff active ──
        if (player.buffs && player.buffs.autoaim > 0 && window.enemies) {
            let nearest = null, minDst = Infinity;
            window.enemies.forEach(e => {
                if (e.hp <= 0) return;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDst) { minDst = d; nearest = e; }
            });
            if (nearest) {
                const a = Math.atan2(nearest.y - player.y, nearest.x - player.x);
                dx = Math.cos(a);
                dy = Math.sin(a);
            }
        }

        // ── In Sync State: fire directional wave projectiles ──
        if (player.syncStateActive) {
            SoundHero.fireSyncWave(player, dx, dy);
            return;
        }

        // ── Normal attack: check beat timing ──
        const isOnBeat = window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat;
        const inSoundBiome = SoundHero.isInSoundBiome();

        let dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier;
        let color = '#4fc3f7';
        let scale = 1.0;

        if (isOnBeat) {
            // Altar so2: On-Beat Bonus +25%
            const altarActive = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
            const has = (id) => altarActive.includes(id);
            const beatMult = has('so2') ? 2.25 : 2.0;
            dmg *= beatMult;
            color = '#00bcd4';
            scale = 1.5;
            // Sync meter only fills in Sound biome
            if (inSoundBiome) {
                // Altar cv_so_w: Sonar Current — fill Sync Meter 50% faster on beat
                const syncGain = has('cv_so_w') ? 7.5 : 5;
                player.syncMeter = Math.min(player.maxSyncMeter, player.syncMeter + syncGain);
                player.beatStreak++;
            }
            if (typeof showNotification === 'function' && Math.random() < 0.2) showNotification("PERFECT!", color);
            if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_crit');
        } else {
            dmg *= 0.5;
            if (inSoundBiome) player.beatStreak = 0;
            if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_' + (Math.floor(Math.random() * 4) + 1));
        }

        // Build shot angle list, respecting multi-projectile
        const baseAngle = Math.atan2(dy, dx);
        let shotCount = 1 + (player.extraProjectiles || 0);
        if (player.buffs && player.buffs.multi > 0) shotCount += 1;
        const angles = [];
        for (let i = 0; i < shotCount; i++) {
            const offset = shotCount === 1 ? 0 : (i - (shotCount - 1) / 2) * 0.3;
            angles.push(baseAngle + offset);
        }

        if (typeof projectiles !== 'undefined') {
            angles.forEach(angle => {
                projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 10,
                    radius: 8 * scale,
                    color: color,
                    damage: dmg,
                    knockback: player.stats.knockback || 0,
                    life: 60,
                    type: 'NOTE', owner: player,
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
                        ctx.font = (this.radius * 3) + 'px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('♪', 0, 0);
                        ctx.restore();
                    }
                });
            });
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACK: SYNC WAVE (fired during Sync State, directional fan)
    // ─────────────────────────────────────────────────────────────────────────

    static fireSyncWave(player, dx, dy) {
        if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_sync_' + (Math.floor(Math.random() * 4) + 1));
        const dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier * 1.8;
        const baseAngle = Math.atan2(dy, dx);

        // Base fan of 3; extra outer waves per additional projectile
        const fanAngles = [-0.28, 0, 0.28];
        const extraCount = (player.extraProjectiles || 0) + (player.buffs && player.buffs.multi > 0 ? 1 : 0);
        for (let i = 1; i <= extraCount; i++) {
            fanAngles.push(-0.28 * (i + 1), 0.28 * (i + 1));
        }

        if (typeof projectiles !== 'undefined') {
            fanAngles.forEach(offset => {
                const angle = baseAngle + offset;
                projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle) * 7,
                    vy: Math.sin(angle) * 7,
                    radius: 8,
                    color: '#00e5ff',
                    damage: dmg,
                    knockback: player.stats.knockback || 0,
                    life: 48,
                    type: 'WAVE', owner: player,
                    update: function () {
                        this.x += this.vx;
                        this.y += this.vy;
                        this.radius += 0.4;
                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },
                    draw: function () {
                        const ctx = window.ctx;
                        if (!ctx) return;
                        ctx.save();
                        ctx.globalAlpha = this.life / 48;
                        ctx.strokeStyle = this.color;
                        ctx.lineWidth = 2.5;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = this.color;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            });
        }

        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GRAND FINALE: 5-way directional fan (replaces normal shot in PERFORMER form)
    // ─────────────────────────────────────────────────────────────────────────

    static fireGrandFinaleNote(player, dx, dy) {
        if (player.rangeCooldown > 0) return;

        if (dx === undefined || dy === undefined) {
            const angle = player.aimAngle || 0;
            dx = Math.cos(angle); dy = Math.sin(angle);
        }

        const isOnBeat = window.SYMPHONY_STATE && window.SYMPHONY_STATE.onBeat;
        const dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier * (isOnBeat ? 3.5 : 2.5);
        const baseAngle = Math.atan2(dy, dx);
        const offsets = isOnBeat ? [-0.5, -0.25, 0, 0.25, 0.5, -0.75, 0.75] : [-0.4, -0.2, 0, 0.2, 0.4];

        if (typeof projectiles !== 'undefined') {
            offsets.forEach(offset => {
                const angle = baseAngle + offset;
                const note = isOnBeat ? '♫' : '♪';
                projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle) * 11, vy: Math.sin(angle) * 11,
                    radius: 11,
                    color: '#00e5ff', damage: dmg,
                    knockback: player.stats.knockback || 0,
                    life: 65, type: 'FINALE_NOTE', owner: player,
                    _note: note,
                    update: function () {
                        this.x += this.vx; this.y += this.vy;
                        this.radius += 0.25; this.life--;
                        if (this.life <= 0) this.dead = true;
                    },
                    draw: function () {
                        const ctx = window.ctx; if (!ctx) return;
                        ctx.save();
                        ctx.shadowBlur = 18; ctx.shadowColor = '#00e5ff';
                        ctx.fillStyle = '#00e5ff';
                        ctx.font = (this.radius * 2.2) + 'px Arial';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(this._note, this.x, this.y);
                        ctx.shadowBlur = 0;
                        ctx.restore();
                    }
                });
            });
        }

        if (isOnBeat) {
            if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_crit');
        }
        player.rangeCooldown = player.stats.rangeCd * player.cooldownMultiplier * 0.65;
    }

    // GRAND FINALE: automatic 8-way omnidirectional burst on each beat
    static fireGrandFinaleOmni(player) {
        const dmg = (player.stats.rangeDmg || 10) * player.damageMultiplier * 2.0;
        if (typeof projectiles !== 'undefined') {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9,
                    radius: 9,
                    color: '#ffffff', damage: dmg,
                    knockback: player.stats.knockback || 0,
                    life: 55, type: 'OMNI_NOTE', owner: player,
                    update: function () {
                        this.x += this.vx; this.y += this.vy;
                        this.life--;
                        if (this.life <= 0) this.dead = true;
                    },
                    draw: function () {
                        const ctx = window.ctx; if (!ctx) return;
                        ctx.save();
                        ctx.globalAlpha = this.life / 55;
                        ctx.shadowBlur = 12; ctx.shadowColor = '#ffffff';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('♩', this.x, this.y);
                        ctx.shadowBlur = 0;
                        ctx.restore();
                    }
                });
            }
        }
        if (typeof audioManager !== 'undefined') audioManager.play('attack_sound_sync_' + (Math.floor(Math.random() * 4) + 1));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRESCENDO: RESONANCE CASCADE — expanding shockwave ring
    // Sweeps outward across the entire arena, hitting each enemy exactly once,
    // knocking them back, and applying a Resonating debuff (3s).
    // While the player is in PERFORMER form, on-beat attacks auto-fire homing
    // echo notes toward the nearest enemy and resonating enemies pulse with damage.
    // ─────────────────────────────────────────────────────────────────────────

    static spawnResonanceRing(player) {
        if (typeof projectiles === 'undefined') return;
        const dmg = 45 * player.damageMultiplier;

        // Altar checks (read once for the ring's lifetime via closure)
        const altarActive = (saveData.altar && saveData.altar.active) ? saveData.altar.active : [];
        const ringHas = (id) => altarActive.includes(id);
        const hasSurge   = ringHas('so3');
        const hasFlame   = ringHas('cv_so_f');
        const hasCryo    = ringHas('cv_so_i');
        const hasRoots   = ringHas('cv_so_p');
        const hasToxFreq = ringHas('cv_so_po');
        let ringHealCount = 0;

        projectiles.push({
            x: player.x, y: player.y,
            radius: 30,
            damage: dmg,
            color: '#00e5ff',
            life: 120,       // 2 seconds to expand
            type: 'CRESCENDO_RING',
            owner: player,
            hitEnemies: [],
            onHit() { return 'STOP'; }, // Bypass standard circle collision — ring handles its own hit detection in update()
            update() {
                // Expand from 30 → 950 over 120 frames
                this.radius += (950 - 30) / 120;
                this.life--;
                if (this.life <= 0) { this.dead = true; return; }
                if (!window.enemies) return;
                window.enemies.forEach(e => {
                    if (e.hp <= 0 || this.hitEnemies.includes(e)) return;
                    const dist = Math.hypot(e.x - this.x, e.y - this.y);
                    if (Math.abs(dist - this.radius) < 28) {
                        this.hitEnemies.push(e);
                        if (typeof saveData !== 'undefined') {
                            saveData.global.sound_crescendo_hits = (saveData.global.sound_crescendo_hits || 0) + 1;
                        }

                        // so3: Resonance Surge — double damage to already-resonating enemies
                        let hitDmg = this.damage;
                        if (hasSurge && e.resonating > 0) hitDmg *= 2;

                        if (typeof e.takeDamage === 'function') e.takeDamage(hitDmg);
                        else e.hp -= hitDmg;
                        e.resonating = 180; // 3 seconds resonating
                        // Knockback away from epicenter
                        const a = Math.atan2(e.y - this.y, e.x - this.x);
                        e.x += Math.cos(a) * 80;
                        e.y += Math.sin(a) * 80;
                        if (typeof createDamageNumber === 'function') createDamageNumber(e.x, e.y, Math.floor(hitDmg), '#00e5ff');
                        if (typeof createExplosion !== 'undefined') createExplosion(e.x, e.y, '#4fc3f7', 20);

                        // cv_so_f: Resonant Flame — ignite hit enemies
                        if (hasFlame) e.burnTimer = Math.max(e.burnTimer || 0, 120);

                        // cv_so_i: Cryosonic — freeze hit enemies for 1.5s
                        if (hasCryo) e.frozen = Math.max(e.frozen || 0, 90);

                        // cv_so_po: Toxic Frequency — apply 30 poison stacks
                        if (hasToxFreq) e.poisonStacks = Math.min((e.poisonStacks || 0) + 30, 100);

                        // cv_so_p: Resonant Roots — track hits to heal after
                        if (hasRoots) ringHealCount++;
                    }
                });

                // cv_so_p: Resonant Roots — heal player 1 HP per enemy hit this frame
                if (hasRoots && ringHealCount > 0 && player && player.hp < player.maxHp) {
                    if (typeof isChaosActive === 'function' && !isChaosActive('NO_REGEN')) {
                        player.hp = Math.min(player.maxHp, player.hp + ringHealCount);
                    }
                    ringHealCount = 0;
                }
            },
            draw() {
                const ctx = window.ctx; if (!ctx) return;
                const t = this.life / 120; // 1 → 0 as ring expands
                ctx.save();
                // Outer bright ring
                ctx.globalAlpha = t * 0.85;
                ctx.shadowBlur = 30; ctx.shadowColor = '#00e5ff';
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 6 + (1 - t) * 6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
                // Inner glow trail
                ctx.globalAlpha = t * 0.35;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#b2ebf2';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius - 14, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SPECIAL ABILITY: CRESCENDO
    // ─────────────────────────────────────────────────────────────────────────

    static useSpecial(player) {
        SoundHero.spawnResonanceRing(player);
        if (typeof audioManager !== 'undefined') audioManager.play('special_sound');
        if (typeof showNotification === 'function') showNotification("CRESCENDO!", "#00e5ff");

        return true;
    }
}

// Register in the hero logic system
if (typeof window.HERO_LOGIC === 'undefined') window.HERO_LOGIC = {};
window.HERO_LOGIC['sound'] = SoundHero;
window.SoundHero = SoundHero;
