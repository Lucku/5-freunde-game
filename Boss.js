
class Boss {
    constructor(type) {
        this.isBoss = true; // Flag for special interactions (e.g. Void Biome)
        this.type = type || BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
        const cam = arena.camera;
        // Spawn near player but ensure inside map
        this.x = cam.x + cam.width / 2 + (Math.random() * 100 - 50);
        this.y = cam.y - 100;

        // Clamp to map bounds
        this.x = Math.max(60, Math.min(arena.width - 60, this.x));
        this.y = Math.max(60, Math.min(arena.height - 60, this.y));

        // Collision Check (Ensure boss doesn't spawn in wall)
        let attempts = 0;
        while (attempts < 10 && arena.checkCollision(this.x, this.y, 60)) {
            this.x = Math.random() * (arena.width - 120) + 60;
            this.y = Math.random() * (arena.height - 120) + 60;
            attempts++;
        }

        this.radius = 60;

        const prestige = saveData[player.type].prestige;
        const difficultyMult = (1 + (prestige * 0.5));

        this.maxHp = 1500 * wave * difficultyMult;
        this.hp = this.maxHp;
        this.speed = 1.5 + (wave * 0.1);
        this.color = '#c0392b';
        this.damage = 30 * difficultyMult;
        this.attackCooldown = 100;
        this.state = 0; // For complex bosses like Rhino

        // Phase & Mechanics
        this.phase = 1;
        this.immune = false;
        this.minionsToKill = 0;
        this.telegraphTimer = 0;
        this.telegraphDuration = 60;
        this.telegraphData = null; // {x, y, radius, type}

        if (this.type === 'TANK') { this.maxHp *= 1.5; this.hp = this.maxHp; this.speed *= 0.5; }
        else if (this.type === 'SPEEDSTER') { this.maxHp *= 0.7; this.hp = this.maxHp; this.speed *= 1.5; }
        else if (this.type === 'NOVA') { this.maxHp *= 0.8; this.color = '#8e44ad'; this.speed *= 0.2; }
        else if (this.type === 'RHINO') { this.maxHp *= 1.2; this.color = '#7f8c8d'; this.speed *= 0.5; }
        else if (this.type === 'HYDRA') { this.maxHp *= 1.0; this.color = '#27ae60'; }
        else if (this.type === 'MAKUTA') {
            this.color = '#000000';
            this.radius = 85;
            if (wave === 50) {
                this.maxHp *= 2.5; this.damage *= 1.8; this.speed *= 1.1;
            } else if (wave >= 100) {
                this.maxHp *= 6.0; this.damage *= 3.0; this.speed *= 1.4;
            }
            this.hp = this.maxHp;

            // Orbiting decorative shadow orbs
            this.mkOrbs = Array.from({ length: 3 }, (_, i) => ({
                angle: (Math.PI * 2 / 3) * i, speed: 0.022, dist: 115
            }));

            // Teleport cooldown
            this.mkTeleportCd = 180;

            // Attack state machine: 'IDLE' | 'CHANNEL' | 'BARRAGE' | 'SWEEP'
            this.mkState = 'IDLE';
            this.mkChannelTimer = 0;
            this.mkBarrageCount = 0;
            this.mkBarrageCd = 0;
            this.mkSweepAngle = 0;
            this.mkSweepCd = 0;
            this.mkSweepShots = 0;

            // Visual animation counters
            this.mkEyeFlare = 0;
            this.mkBodyPulse = 0;
            this.mkHornSway = 0;

            // Makuta handles its own phase transitions
            this.mkP2done = false;
            this.mkP3done = false;
        } else if (this.type === 'GREEN_GOBLIN') {
            this.color = '#1d8a2e';
            this.radius = 52;
            this.speed *= 1.35;
            this.maxHp *= 0.9;
            this.hp = this.maxHp;
            // --- Trick Bombs ---
            this.pendingBombs = [];          // { x, y, timer, maxTimer, radius }
            this.bombCooldown = 85;
            // --- Magnet ---
            this.magnetTimer = 0;
            this.magnetCooldown = 200;
            this.magnetStrength = 1.1;
            // --- Glider Dive (unlocks in phase 2) ---
            this.goblinState = 'HOVER';      // HOVER | DIVE_WINDUP | DIVE | RECOVER
            this.diveCooldown = 320;
            this.diveWindupTimer = 0;
            this.diveTarget = null;
            this.diveVelocity = null;
            this.diveTimer = 0;
            this.recoverTimer = 0;
            // --- Cackle / Minion summon (phase 2+) ---
            this.cackleCooldown = 1400;
            // --- Animation ---
            this.wiggle = 0;
            this.eyeGlow = 0;
        } else if (this.type === 'DARK_GOLEM') {
            this.color = '#212121'; // Dark Obsidian
            this.radius = 90; // Massive
            this.maxHp *= 3.0; // Very tanky
            this.hp = this.maxHp;
            this.speed *= 0.4; // Very slow
            this.damage *= 2.0; // One-shot potential
            this.knockbackResist = 1.0; // Unmovable
        } else if (this.type === 'ZEUS') {
            this.color = '#ffffff'; // White Hot
            this.radius = 80;
            this.maxHp *= 2.5; // Superboss
            this.hp = this.maxHp;
            this.speed *= 1.5; // Fast
            this.damage *= 1.2;
            this.knockbackResist = 0.8;
            this.state = 'IDLE';
            this.stormTimer = 0;
        } else if (typeof WindBosses !== 'undefined' && WindBosses.isWindBoss(this.type)) {
            WindBosses.init(this);
        } else if (window._DLC_BOSS_REGISTRY && window._DLC_BOSS_REGISTRY[this.type]) {
            window._DLC_BOSS_REGISTRY[this.type].init(this);
        }
    }

    update() {
        if (typeof WindBosses !== 'undefined' && WindBosses.isWindBoss(this.type)) {
            WindBosses.update(this, player, arena);
            this.x = Math.max(this.radius, Math.min(arena.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));
            return;
        }
        if (window._DLC_BOSS_REGISTRY && window._DLC_BOSS_REGISTRY[this.type]) {
            window._DLC_BOSS_REGISTRY[this.type].update(this, player, arena);
            this.x = Math.max(this.radius, Math.min(arena.width - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));
            return;
        }

        // ZEUS Logic
        if (this.type === 'ZEUS') {
            // Check phases
            if (this.phase === 1 && this.hp < this.maxHp * 0.6) {
                this.phase = 2;
                // Trigger Storm
                createExplosion(this.x, this.y, '#ffff00');
                if (typeof showNotification === 'function') showNotification("THE STORM RISES!");
            }
            if (this.phase === 2 && this.hp < this.maxHp * 0.3) {
                this.phase = 3;
                this.speed *= 1.5;
                if (typeof showNotification === 'function') showNotification("UNLIMITED POWER!");
            }

            // Random lightning strikes around boss
            if (Math.random() < 0.05) {
                // Assuming createProjectile exists or similiar.
                // For now, just explosions
                createExplosion(this.x + (Math.random() * 400 - 200), this.y + (Math.random() * 400 - 200), '#ffff00');
            }
        }

        // Phase Transition Logic (GREEN_GOBLIN and MAKUTA handle their own phases)
        if (this.phase === 1 && this.hp <= this.maxHp * 0.5 && this.type !== 'GREEN_GOBLIN' && this.type !== 'MAKUTA') {
            this.phase = 2;
            floatingTexts.push(new FloatingText(this.x, this.y - 60, "PHASE 2!", "#e74c3c", 30));
            createExplosion(this.x, this.y, this.color);

            if (this.type === 'TANK') {
                this.speed *= 2.0; // Move faster
                this.damage *= 1.5; // Hit harder
                if (typeof audioManager !== 'undefined') audioManager.play('boss_tank_phase2');
                // Visual change handled in draw
            } else if (this.type === 'SUMMONER') {
                this.immune = true;
                this.minionsToKill = 5;
                if (typeof audioManager !== 'undefined') audioManager.play('boss_summoner_phase2');
                // Spawn 5 specific minions
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 / 5) * i;
                    let dist = 100;
                    const m = new Enemy(true);

                    // Calculate spawn position
                    let spawnX = this.x + Math.cos(angle) * dist;
                    let spawnY = this.y + Math.sin(angle) * dist;

                    // Check collision with obstacles, pull closer if needed
                    let attempts = 0;
                    while (arena.checkCollision(spawnX, spawnY, m.radius) && attempts < 5) {
                        dist -= 20;
                        spawnX = this.x + Math.cos(angle) * dist;
                        spawnY = this.y + Math.sin(angle) * dist;
                        attempts++;
                    }

                    // Fallback: Spawn on boss if still invalid (Boss is always in valid spot)
                    if (arena.checkCollision(spawnX, spawnY, m.radius)) {
                        spawnX = this.x;
                        spawnY = this.y;
                    }

                    m.x = spawnX;
                    m.y = spawnY;
                    m.isSummonedMinion = true;
                    m.parentBoss = this;
                    m.color = '#8e44ad'; // Purple minions
                    enemies.push(m);
                    createExplosion(m.x, m.y, '#8e44ad');
                }
            }
        }

        // Summoner Immunity Check
        if (this.type === 'SUMMONER' && this.phase === 2) {
            if (this.minionsToKill <= 0) {
                if (this.immune) {
                    this.immune = false;
                    floatingTexts.push(new FloatingText(this.x, this.y - 60, "SHIELD BROKEN!", "#fff", 30));
                    createExplosion(this.x, this.y, '#fff');
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_summoner_shield_break');
                }
            }
        }

        // ── GREEN GOBLIN — full mechanics ────────────────────────────────────
        if (this.type === 'GREEN_GOBLIN') {
            // Animation ticks
            this.wiggle = (this.wiggle + 0.09) % (Math.PI * 2);
            this.eyeGlow = (this.eyeGlow + 0.06) % (Math.PI * 2);

            // Phase transitions
            if (this.phase === 1 && this.hp <= this.maxHp * 0.6) {
                this.phase = 2;
                this.speed *= 1.3;
                this.bombCooldown = Math.min(this.bombCooldown, 60);
                createExplosion(this.x, this.y, '#e67e22');
                floatingTexts.push(new FloatingText(this.x, this.y - 80, "GOING MAD!", "#e67e22", 28));
                if (typeof showNotification === 'function') showNotification("GOING MAD!", "#e67e22");
            }
            if (this.phase === 2 && this.hp <= this.maxHp * 0.3) {
                this.phase = 3;
                this.speed *= 1.2;
                this.magnetStrength = 2.2;
                this.bombCooldown = Math.min(this.bombCooldown, 42);
                createExplosion(this.x, this.y, '#e74c3c');
                floatingTexts.push(new FloatingText(this.x, this.y - 80, "MANIC MODE!", "#e74c3c", 32));
                if (typeof showNotification === 'function') showNotification("MANIC MODE!", "#e74c3c");
            }

            // Pending bomb timers & explosions
            for (let _bi = this.pendingBombs.length - 1; _bi >= 0; _bi--) {
                const _b = this.pendingBombs[_bi];
                _b.timer--;
                if (_b.timer <= 0) {
                    createExplosion(_b.x, _b.y, '#e67e22');
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_stomp');
                    const _targets = [player];
                    if (typeof player2 !== 'undefined' && player2) _targets.push(player2);
                    for (const _t of _targets) {
                        const _bd = Math.hypot(_t.x - _b.x, _t.y - _b.y);
                        if (_bd < _b.radius + _t.radius) {
                            if (!_t.isInvincible && (_t.invincibleTimer || 0) <= 0) {
                                const _dmg = this.damage * 1.6 * (1 - (_t.damageReduction || 0));
                                _t.hp -= _dmg;
                                floatingTexts.push(new FloatingText(_t.x, _t.y - 20, Math.ceil(_dmg), "#e74c3c", 20));
                                if (typeof audioManager !== 'undefined') audioManager.play('damage');
                            }
                        }
                    }
                    this.pendingBombs.splice(_bi, 1);
                }
            }

            // Magnet pull
            if (this.magnetCooldown > 0) {
                this.magnetCooldown--;
            } else if (this.magnetTimer > 0) {
                this.magnetTimer--;
                if (this.magnetTimer <= 0) {
                    this.magnetCooldown = this.phase >= 3 ? 180 : 260;
                }
                const _targets = [player];
                if (typeof player2 !== 'undefined' && player2) _targets.push(player2);
                for (const _t of _targets) {
                    const _md = Math.hypot(_t.x - this.x, _t.y - this.y);
                    if (_md < 620) {
                        const _pa = Math.atan2(this.y - _t.y, this.x - _t.x);
                        _t.x += Math.cos(_pa) * this.magnetStrength;
                        _t.y += Math.sin(_pa) * this.magnetStrength;
                    }
                }
            } else {
                this.magnetTimer = this.phase >= 3 ? 110 : 85;
                if (typeof showNotification === 'function') showNotification("TRICK OR TREAT!", "#2ecc71");
            }

            // Cackle / minion summon (phase 2+)
            if (this.phase >= 2) {
                this.cackleCooldown--;
                if (this.cackleCooldown <= 0) {
                    const _mc = this.phase >= 3 ? 4 : 3;
                    for (let _mi = 0; _mi < _mc; _mi++) {
                        const _ma = (Math.PI * 2 / _mc) * _mi;
                        const _m = new Enemy(true);
                        _m.x = this.x + Math.cos(_ma) * 110;
                        _m.y = this.y + Math.sin(_ma) * 110;
                        _m.color = '#27ae60';
                        _m.hp *= 0.45;
                        _m.radius *= 0.65;
                        enemies.push(_m);
                        createExplosion(_m.x, _m.y, '#27ae60');
                    }
                    if (typeof showNotification === 'function') showNotification("HA HA HA!", "#2ecc71");
                    this.cackleCooldown = this.phase >= 3 ? 700 : 1100;
                }
            }
        }
        // ── end GREEN GOBLIN mechanics ────────────────────────────────────────

        const _bossTarget = (typeof getCoopTarget === 'function') ? getCoopTarget(this.x, this.y) : player;
        const angle = Math.atan2(_bossTarget.y - this.y, _bossTarget.x - this.x);
        let nextX = this.x;
        let nextY = this.y;

        // Movement Logic
        if (this.type === 'RHINO') {
            // State 0: Aiming, State 1: Charging, State 2: Cooldown
            if (this.state === 0) {
                // Slowly turn towards player
                nextX += Math.cos(angle) * this.speed;
                nextY += Math.sin(angle) * this.speed;
                if (this.attackCooldown <= 0) {
                    this.state = 1;
                    this.chargeAngle = angle;
                    this.attackCooldown = 60; // Charge duration
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_rhino_charge');
                }
            } else if (this.state === 1) {
                // Charge fast
                nextX += Math.cos(this.chargeAngle) * (this.speed * 8);
                nextY += Math.sin(this.chargeAngle) * (this.speed * 8);
                if (this.attackCooldown <= 0) {
                    this.state = 2;
                    this.attackCooldown = 120; // Rest time
                }
            } else {
                // Rest
                if (this.attackCooldown <= 0) {
                    this.state = 0;
                    this.attackCooldown = 100;
                }
            }
            this.attackCooldown--;
        } else if (this.type === 'MAKUTA') {
            // ── Animation ticks ───────────────────────────────────────────────
            this.mkBodyPulse = (this.mkBodyPulse + 0.04) % (Math.PI * 2);
            this.mkHornSway = (this.mkHornSway + 0.018) % (Math.PI * 2);
            if (this.mkEyeFlare > 0) this.mkEyeFlare = Math.max(0, this.mkEyeFlare - 0.04);

            // Rotate orbiting shadow orbs
            for (const orb of this.mkOrbs) orb.angle += orb.speed;

            // ── Phase transitions ─────────────────────────────────────────────
            if (!this.mkP2done && this.hp < this.maxHp * 0.6) {
                this.mkP2done = true;
                this.phase = 2;
                this.speed *= 1.25;
                this.mkTeleportCd = 130;
                this.mkEyeFlare = 1;
                createExplosion(this.x, this.y, '#330033');
                for (let i = 0; i < 12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    projectiles.push(new Projectile(this.x, this.y,
                        { x: Math.cos(a) * 5, y: Math.sin(a) * 5 },
                        this.damage * 0.8, '#550055', 10, 'enemy', 0, true));
                }
                for (let i = 0; i < 3; i++) {
                    const mn = new Enemy(true);
                    mn.x = this.x + Math.cos((Math.PI * 2 / 3) * i) * 120;
                    mn.y = this.y + Math.sin((Math.PI * 2 / 3) * i) * 120;
                    mn.color = '#330033'; mn.hp *= 1.2;
                    enemies.push(mn);
                }
                if (typeof showNotification === 'function') showNotification("MAKUTA UNLEASHED!", '#c026d3');
                if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_teleport');
            }
            if (!this.mkP3done && this.hp < this.maxHp * 0.25) {
                this.mkP3done = true;
                this.phase = 3;
                this.speed *= 1.2;
                this.mkTeleportCd = 80;
                this.mkEyeFlare = 1;
                createExplosion(this.x, this.y, '#000');
                if (typeof showNotification === 'function') showNotification("DARKNESS INCARNATE!", '#ff0055');
                if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_nova');
            }

            // ── Teleport ──────────────────────────────────────────────────────
            this.mkTeleportCd--;
            if (this.mkTeleportCd <= 0) {
                createExplosion(this.x, this.y, '#220022');
                if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_teleport');
                const tOff = Math.random() * Math.PI * 2;
                const tDist = 220 + Math.random() * 120;
                this.x = Math.max(this.radius, Math.min(arena.width - this.radius, _bossTarget.x + Math.cos(tOff) * tDist));
                this.y = Math.max(this.radius, Math.min(arena.height - this.radius, _bossTarget.y + Math.sin(tOff) * tDist));
                createExplosion(this.x, this.y, '#330033');
                this.mkEyeFlare = 0.6;
                this.mkTeleportCd = this.phase >= 3 ? 80 : this.phase >= 2 ? 130 : 200;
                return;
            }

            // ── Movement ──────────────────────────────────────────────────────
            if (this.mkState === 'IDLE') {
                // Orbit / strafe: circle the player at mid-range
                const dist = Math.hypot(_bossTarget.x - this.x, _bossTarget.y - this.y);
                const idealDist = 260;
                if (dist < idealDist - 40) {
                    nextX -= Math.cos(angle) * this.speed;
                    nextY -= Math.sin(angle) * this.speed;
                } else if (dist > idealDist + 80) {
                    nextX += Math.cos(angle) * this.speed;
                    nextY += Math.sin(angle) * this.speed;
                } else {
                    const strafe = angle + Math.PI / 2;
                    nextX += Math.cos(strafe) * this.speed * 0.8;
                    nextY += Math.sin(strafe) * this.speed * 0.8;
                }
            } else if (this.mkState === 'CHANNEL') {
                // Hover in place while charging up
                nextX += Math.cos(angle) * this.speed * 0.15;
                nextY += Math.sin(angle) * this.speed * 0.15;
            } else if (this.mkState === 'SWEEP') {
                // Drift slowly while sweeping
                nextX += Math.cos(angle) * this.speed * 0.3;
                nextY += Math.sin(angle) * this.speed * 0.3;
            }
            // BARRAGE: standard approach
            else {
                nextX += Math.cos(angle) * this.speed;
                nextY += Math.sin(angle) * this.speed;
            }

            // ── Attack state machine ──────────────────────────────────────────
            this.attackCooldown--;

            if (this.mkState === 'CHANNEL') {
                // Count down, then fire shadow nova burst
                this.mkChannelTimer--;
                this.mkEyeFlare = Math.min(1, this.mkEyeFlare + 0.03);
                if (this.mkChannelTimer <= 0) {
                    // Burst: rings + aimed beam
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_nova');
                    const rings = this.phase >= 3 ? 3 : this.phase >= 2 ? 2 : 1;
                    for (let r = 0; r < rings; r++) {
                        const ringOffset = (r / rings) * (Math.PI * 2 / 20);
                        for (let i = 0; i < 20; i++) {
                            const a = (Math.PI * 2 / 20) * i + ringOffset;
                            const spd = 5 + r * 1.5;
                            projectiles.push(new Projectile(this.x, this.y,
                                { x: Math.cos(a) * spd, y: Math.sin(a) * spd },
                                this.damage * 0.9, '#550066', 10, 'enemy', 0, true));
                        }
                    }
                    // Aimed shadow beam
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_beam');
                    const ba = Math.atan2(_bossTarget.y - this.y, _bossTarget.x - this.x);
                    projectiles.push(new Projectile(this.x, this.y,
                        { x: Math.cos(ba) * 13, y: Math.sin(ba) * 13 },
                        this.damage * 2.0, '#ff0055', 18, 'enemy', 0, true));
                    this.mkEyeFlare = 1;
                    this.mkState = 'IDLE';
                    this.attackCooldown = this.phase >= 3 ? 80 : this.phase >= 2 ? 110 : 140;
                }
            } else if (this.mkState === 'BARRAGE') {
                // Rapid triple-shot at player
                this.mkBarrageCd--;
                if (this.mkBarrageCd <= 0 && this.mkBarrageCount > 0) {
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_beam');
                    const ba = Math.atan2(_bossTarget.y - this.y, _bossTarget.x - this.x);
                    for (let s = -1; s <= 1; s++) {
                        const a = ba + s * 0.18;
                        projectiles.push(new Projectile(this.x, this.y,
                            { x: Math.cos(a) * 11, y: Math.sin(a) * 11 },
                            this.damage * 1.1, '#220033', 12, 'enemy', 0, true));
                    }
                    this.mkBarrageCount--;
                    this.mkBarrageCd = this.phase >= 3 ? 8 : 12;
                    this.mkEyeFlare = Math.min(1, this.mkEyeFlare + 0.25);
                    if (this.mkBarrageCount <= 0) {
                        this.mkState = 'IDLE';
                        this.attackCooldown = this.phase >= 3 ? 60 : this.phase >= 2 ? 90 : 120;
                    }
                }
            } else if (this.mkState === 'SWEEP') {
                // Rotating sweep beam
                this.mkSweepCd--;
                if (this.mkSweepCd <= 0 && this.mkSweepShots > 0) {
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_makuta_shadow_beam');
                    for (let s = 0; s < 2; s++) {
                        const sa = this.mkSweepAngle + s * Math.PI;
                        projectiles.push(new Projectile(this.x, this.y,
                            { x: Math.cos(sa) * 9, y: Math.sin(sa) * 9 },
                            this.damage * 1.2, '#440022', 14, 'enemy', 0, true));
                    }
                    this.mkSweepAngle += 0.22;
                    this.mkSweepShots--;
                    this.mkSweepCd = 4;
                    if (this.mkSweepShots <= 0) {
                        this.mkState = 'IDLE';
                        this.attackCooldown = this.phase >= 3 ? 50 : 80;
                    }
                }
            } else if (this.attackCooldown <= 0) {
                // Choose next attack based on phase + randomness
                const roll = Math.random();
                if (this.phase >= 2 && roll < 0.35) {
                    // Sweep (phase 2+)
                    this.mkState = 'SWEEP';
                    this.mkSweepAngle = Math.atan2(_bossTarget.y - this.y, _bossTarget.x - this.x);
                    this.mkSweepShots = this.phase >= 3 ? 28 : 20;
                    this.mkSweepCd = 4;
                } else if (roll < 0.65) {
                    // Barrage
                    this.mkState = 'BARRAGE';
                    this.mkBarrageCount = this.phase >= 3 ? 8 : this.phase >= 2 ? 6 : 4;
                    this.mkBarrageCd = 6;
                } else {
                    // Channel nova
                    this.mkState = 'CHANNEL';
                    this.mkChannelTimer = this.phase >= 3 ? 55 : 70;
                }
            }

            // Phase 2+: summon shadow minions periodically
            if (this.phase >= 2) {
                if (!this.mkMinionCd) this.mkMinionCd = 0;
                this.mkMinionCd--;
                if (this.mkMinionCd <= 0) {
                    const mc = this.phase >= 3 ? 3 : 2;
                    for (let i = 0; i < mc; i++) {
                        const ma = (Math.PI * 2 / mc) * i + Math.random();
                        const mn = new Enemy(true);
                        mn.x = this.x + Math.cos(ma) * 100;
                        mn.y = this.y + Math.sin(ma) * 100;
                        mn.color = '#330033'; mn.hp *= 1.0;
                        mn.radius *= 0.8;
                        enemies.push(mn);
                        createExplosion(mn.x, mn.y, '#550055');
                    }
                    this.mkMinionCd = this.phase >= 3 ? 480 : 680;
                }
            }
        } else if (this.type === 'GREEN_GOBLIN') {
            // ── Glider Dive state machine ──────────────────────────────────
            if (this.goblinState === 'DIVE_WINDUP') {
                // Track player during windup, lock direction when it expires
                this.diveWindupTimer--;
                this.diveTarget = { x: _bossTarget.x, y: _bossTarget.y };
                if (this.diveWindupTimer <= 0) {
                    const _da = Math.atan2(this.diveTarget.y - this.y, this.diveTarget.x - this.x);
                    const _ds = this.speed * 7;
                    this.diveVelocity = { x: Math.cos(_da) * _ds, y: Math.sin(_da) * _ds };
                    this.goblinState = 'DIVE';
                    this.diveTimer = 24;
                }
                // Barely moves — slight hover bob
            } else if (this.goblinState === 'DIVE') {
                nextX += this.diveVelocity.x;
                nextY += this.diveVelocity.y;
                this.diveTimer--;
                if (this.diveTimer <= 0) {
                    this.goblinState = 'RECOVER';
                    this.recoverTimer = 38;
                    // Phase 3: drop a bomb at landing spot
                    if (this.phase >= 3) {
                        this.pendingBombs.push({ x: this.x, y: this.y, timer: 55, maxTimer: 55, radius: 85 });
                    }
                }
            } else if (this.goblinState === 'RECOVER') {
                // Slide away
                nextX -= Math.cos(angle) * (this.speed * 1.8);
                nextY -= Math.sin(angle) * (this.speed * 1.8);
                this.recoverTimer--;
                if (this.recoverTimer <= 0) {
                    this.goblinState = 'HOVER';
                    this.diveCooldown = this.phase >= 3 ? 155 : 270;
                }
            } else {
                // HOVER: kite + oscillating strafe + dive cooldown
                if (this.phase >= 2) {
                    this.diveCooldown--;
                    if (this.diveCooldown <= 0) {
                        this.goblinState = 'DIVE_WINDUP';
                        this.diveWindupTimer = 48;
                        this.diveTarget = null;
                    }
                }
                const _gd = Math.hypot(_bossTarget.x - this.x, _bossTarget.y - this.y);
                const _idealDist = this.phase >= 2 ? 290 : 340;
                if (_gd < 175) {
                    nextX -= Math.cos(angle) * (this.speed * 1.6);
                    nextY -= Math.sin(angle) * (this.speed * 1.6);
                } else if (_gd > 520) {
                    nextX += Math.cos(angle) * this.speed;
                    nextY += Math.sin(angle) * this.speed;
                } else {
                    // Oscillating strafe direction keeps movement unpredictable
                    const _sd = Math.sin(frame * 0.016) > 0 ? 1 : -1;
                    const _sa = angle + _sd * Math.PI / 2;
                    nextX += Math.cos(_sa) * (this.speed * 0.9);
                    nextY += Math.sin(_sa) * (this.speed * 0.9);
                    const _drift = _gd > _idealDist ? 0.45 : -0.45;
                    nextX += Math.cos(angle) * _drift;
                    nextY += Math.sin(angle) * _drift;
                }
            }
        } else {
            // Standard movement
            nextX += Math.cos(angle) * this.speed;
            nextY += Math.sin(angle) * this.speed;
        }

        if (!arena.checkCollision(nextX, nextY, this.radius)) { this.x = nextX; this.y = nextY; }
        else {
            if (!arena.checkCollision(nextX, this.y, this.radius)) this.x = nextX;
            else if (!arena.checkCollision(this.x, nextY, this.radius)) this.y = nextY;
        }

        // Clamp to map bounds (Fix for knockback OOB)
        this.x = Math.max(this.radius, Math.min(arena.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));

        // Attack Logic
        if (this.type !== 'RHINO') { // Rhino handles cooldown in movement
            if (this.attackCooldown <= 0) {
                // Telegraphed Attacks
                if (this.type === 'TANK' && this.phase === 2 && Math.random() < 0.3) {
                    // Big Slam
                    this.telegraphData = { x: this.x, y: this.y, radius: 150, type: 'CIRCLE' };
                    this.telegraphTimer = 60;
                    this.attackCooldown = 120;
                    return; // Wait for telegraph
                }
            }

            // Execute Telegraphed Attack
            if (this.telegraphTimer > 0) {
                this.telegraphTimer--;
                if (this.telegraphTimer <= 0) {
                    // Execute
                    if (this.telegraphData.type === 'CIRCLE') {
                        if (typeof audioManager !== 'undefined') audioManager.play('boss_stomp');
                        createExplosion(this.telegraphData.x, this.telegraphData.y, '#e74c3c');
                        // Damage player if in range
                        const dist = Math.hypot(player.x - this.telegraphData.x, player.y - this.telegraphData.y);
                        if (dist < this.telegraphData.radius) {
                            player.hp -= this.damage * 2;
                            floatingTexts.push(new FloatingText(player.x, player.y - 20, Math.ceil(this.damage * 2), "#e74c3c", 20));
                        }
                    }
                    this.telegraphData = null;
                }
                return; // Don't move or do other attacks while telegraphing
            }

            if (this.attackCooldown <= 0) {
                if (this.type === 'TANK') {
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_tank_ring');
                    for (let i = 0; i < 12; i++) {
                        const a = (Math.PI * 2 / 12) * i + (frame * 0.1);
                        const vel = { x: Math.cos(a) * 5, y: Math.sin(a) * 5 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#e74c3c', 8, 'enemy', 0, true));
                    }
                    this.attackCooldown = 180;
                } else if (this.type === 'SPEEDSTER') {
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_shooter');
                    const a = Math.atan2(player.y - this.y, player.x - this.x);
                    const vel = { x: Math.cos(a) * 10, y: Math.sin(a) * 10 };
                    projectiles.push(new Projectile(this.x, this.y, vel, this.damage * 0.8, '#f1c40f', 5, 'enemy', 0, true));
                    this.attackCooldown = 10;
                } else if (this.type === 'SUMMONER') {
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_summoner_spawn');
                    for (let i = 0; i < 3; i++) enemies.push(new Enemy(true));
                    this.attackCooldown = 200;
                } else if (this.type === 'NOVA') {
                    // Spiral Pattern
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_shooter');
                    for (let i = 0; i < 3; i++) {
                        const a = (frame * 0.1) + (Math.PI * 2 / 3) * i;
                        const vel = { x: Math.cos(a) * 4, y: Math.sin(a) * 4 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#8e44ad', 6, 'enemy', 0, true));
                    }
                    this.attackCooldown = 5; // Very fast fire rate
                } else if (this.type === 'HYDRA') {
                    // Triple Shot
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_shooter');
                    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    for (let i = -1; i <= 1; i++) {
                        const a = baseAngle + (i * 0.3);
                        const vel = { x: Math.cos(a) * 7, y: Math.sin(a) * 7 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#27ae60', 10, 'enemy', 0, true));
                    }
                    this.attackCooldown = 60;
                } else if (this.type === 'GREEN_GOBLIN') {
                    // Trick Bombs — schedule as pending AoE explosions
                    const _ct2 = (typeof getCoopTarget === 'function') ? getCoopTarget(this.x, this.y) : player;
                    const bombCount = this.phase >= 3 ? 3 : this.phase >= 2 ? 2 : 1;
                    for (let i = 0; i < bombCount; i++) {
                        // Aim at player + some predictive lead
                        const lead = i * 28;
                        const lx = _ct2.x + (_ct2.vx || 0) * lead;
                        const ly = _ct2.y + (_ct2.vy || 0) * lead;
                        // Add jitter on extra bombs
                        const jx = i > 0 ? (Math.random() - 0.5) * 140 : 0;
                        const jy = i > 0 ? (Math.random() - 0.5) * 140 : 0;
                        const delay = i * 18;
                        this.pendingBombs.push({
                            x: lx + jx, y: ly + jy,
                            timer: delay, fuseTimer: delay,
                            maxTimer: 52 + delay, radius: 70,
                            damage: this.damage * (this.phase >= 3 ? 1.5 : 1.2)
                        });
                    }
                    this.bombCooldown = this.phase >= 3 ? 55 : this.phase >= 2 ? 70 : 85;
                    this.attackCooldown = this.bombCooldown;
                }
            } else { this.attackCooldown--; }
        }
    }

    draw() {
        if (typeof WindBosses !== 'undefined' && WindBosses.isWindBoss(this.type)) {
            WindBosses.draw(ctx, this);
            return;
        }
        if (window._DLC_BOSS_REGISTRY && window._DLC_BOSS_REGISTRY[this.type]) {
            window._DLC_BOSS_REGISTRY[this.type].draw(ctx, this);
            return;
        }

        // ── Green Goblin custom draw ───────────────────────────────────────────
        if (this.type === 'GREEN_GOBLIN') {
            const g = this;
            const gx = g.x, gy = g.y;
            const r = g.radius; // 52

            // -- Pending bomb indicators (world space, drawn under goblin) --
            for (const b of g.pendingBombs) {
                const warmup = Math.max(0, 1 - b.timer / b.maxTimer);
                const pulse = 0.5 + 0.5 * Math.sin(frame * 0.25 + b.x);
                ctx.save();
                ctx.globalAlpha = 0.18 + 0.25 * warmup;
                ctx.strokeStyle = '#e67e22';
                ctx.lineWidth = 2 + warmup * 3;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius * (0.4 + 0.6 * warmup), 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                // Pulsing inner core
                ctx.globalAlpha = (0.3 + 0.4 * pulse) * warmup;
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 8 + warmup * 12, 0, Math.PI * 2);
                ctx.fill();
                // Fuse line to goblin
                ctx.globalAlpha = 0.25 * warmup;
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 8]);
                ctx.beginPath();
                ctx.moveTo(gx, gy);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            // -- Magnet pull lines (phase 2+) --
            if (g.phase >= 2 && g.magnetTimer > 0) {
                const prog = g.magnetTimer / 60;
                ctx.save();
                ctx.globalAlpha = 0.35 * prog;
                ctx.strokeStyle = '#9b59b6';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 9]);
                ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(player.x, player.y); ctx.stroke();
                if (window.player2 && !player2.isDead) {
                    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(player2.x, player2.y); ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.restore();
            }

            ctx.save();
            ctx.translate(gx, gy);

            // Phase glow ring
            if (g.phase >= 2) {
                const glowCol = g.phase >= 3 ? '#e74c3c' : '#f39c12';
                ctx.save();
                ctx.shadowColor = glowCol;
                ctx.shadowBlur = 28 + 12 * Math.sin(frame * 0.08);
                ctx.strokeStyle = glowCol;
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.55;
                ctx.beginPath();
                ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // -- Glider wings (behind body) --
            const wingFlap = Math.sin(frame * 0.12) * 0.22;
            ctx.save();
            ctx.rotate(wingFlap);
            // Left wing
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.1);
            ctx.quadraticCurveTo(-r * 1.5, -r * 0.8, -r * 1.8, r * 0.3);
            ctx.quadraticCurveTo(-r * 1.1, r * 0.6, -r * 0.3, r * 0.2);
            ctx.closePath();
            const _wgL = ctx.createLinearGradient(-r * 1.8, 0, -r * 0.3, 0);
            _wgL.addColorStop(0, 'rgba(20,90,20,0.55)');
            _wgL.addColorStop(1, 'rgba(40,160,40,0.75)');
            ctx.fillStyle = _wgL;
            ctx.strokeStyle = 'rgba(0,80,0,0.6)';
            ctx.lineWidth = 1.5;
            ctx.fill(); ctx.stroke();
            // Right wing (mirrored)
            ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(-r * 0.3, -r * 0.1);
            ctx.quadraticCurveTo(-r * 1.5, -r * 0.8, -r * 1.8, r * 0.3);
            ctx.quadraticCurveTo(-r * 1.1, r * 0.6, -r * 0.3, r * 0.2);
            ctx.closePath();
            ctx.fillStyle = _wgL;
            ctx.fill(); ctx.stroke();
            ctx.restore();

            // -- Dive telegraph arrow --
            if (g.goblinState === 'DIVE_WINDUP' && g.diveTarget) {
                const prog = Math.min(1, g.diveWindupTimer / 45);
                const ang = Math.atan2(g.diveTarget.y - gy, g.diveTarget.x - gx);
                ctx.save();
                ctx.rotate(ang);
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(frame * 0.3);
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 3 + prog * 3;
                const arrowLen = r * 1.4 + prog * r;
                ctx.beginPath();
                ctx.moveTo(r + 6, 0);
                ctx.lineTo(r + 6 + arrowLen, 0);
                ctx.stroke();
                // Arrowhead
                ctx.beginPath();
                ctx.moveTo(r + 6 + arrowLen, 0);
                ctx.lineTo(r + 6 + arrowLen - 14, -9);
                ctx.lineTo(r + 6 + arrowLen - 14, 9);
                ctx.closePath();
                ctx.fillStyle = '#e74c3c';
                ctx.fill();
                ctx.restore();
            }

            // -- Dive speed lines --
            if (g.goblinState === 'DIVE' && g.diveVelocity) {
                ctx.save();
                const dang = Math.atan2(g.diveVelocity.y, g.diveVelocity.x);
                ctx.rotate(dang + Math.PI);
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#7ddd7d';
                ctx.lineWidth = 2;
                for (let i = -3; i <= 3; i++) {
                    const yoff = i * 10;
                    const len = 28 + Math.random() * 28;
                    ctx.beginPath();
                    ctx.moveTo(r + 4, yoff);
                    ctx.lineTo(r + 4 + len, yoff);
                    ctx.stroke();
                }
                ctx.restore();
            }

            // -- Body (dark green sphere with highlight) --
            const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.08, 0, 0, r);
            bodyGrad.addColorStop(0, '#5ddb6e');
            bodyGrad.addColorStop(0.42, '#1d8a2e');
            bodyGrad.addColorStop(1, '#0a3d14');
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = bodyGrad;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#0a3d14';
            ctx.lineWidth = 3;
            ctx.stroke();

            // -- Hat (pointy witch hat silhouette) --
            ctx.save();
            ctx.fillStyle = '#1a1a00';
            ctx.strokeStyle = '#3a3a00';
            ctx.lineWidth = 2;
            // Brim
            ctx.beginPath();
            ctx.ellipse(0, -r * 0.72, r * 0.68, r * 0.17, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            // Cone
            ctx.beginPath();
            ctx.moveTo(-r * 0.40, -r * 0.72);
            ctx.lineTo(0, -r * 2.1);
            ctx.lineTo(r * 0.40, -r * 0.72);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            // Hat buckle
            ctx.fillStyle = '#c8a800';
            ctx.fillRect(-r * 0.13, -r * 0.92, r * 0.26, r * 0.18);
            ctx.restore();

            // -- Glowing eyes --
            const eyeGlow = g.eyeGlow || 0;
            const eyePulse = 0.8 + 0.2 * Math.sin(frame * 0.18);
            ctx.save();
            ctx.shadowColor = '#ffe000';
            ctx.shadowBlur = 14 + eyeGlow * 20;
            ctx.fillStyle = `rgba(255, 220, 0, ${0.85 * eyePulse})`;
            // Left eye — almond shape
            ctx.beginPath();
            ctx.ellipse(-r * 0.28, -r * 0.12, r * 0.14, r * 0.09, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Right eye
            ctx.beginPath();
            ctx.ellipse(r * 0.28, -r * 0.12, r * 0.14, r * 0.09, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Dark pupils
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1a0a00';
            ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.12, r * 0.055, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.12, r * 0.055, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // -- Wicked grin --
            ctx.save();
            ctx.strokeStyle = '#0a1a00';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, r * 0.18, r * 0.38, 0.2, Math.PI - 0.2);
            ctx.stroke();
            // Teeth
            ctx.fillStyle = '#e8e0c0';
            const toothCount = 5;
            for (let i = 0; i < toothCount; i++) {
                const ta = 0.25 + (i / (toothCount - 1)) * (Math.PI - 0.5);
                const tx = Math.cos(ta) * r * 0.38;
                const ty = r * 0.18 + Math.sin(ta) * r * 0.38;
                ctx.beginPath();
                ctx.moveTo(tx - 4, ty);
                ctx.lineTo(tx, ty + (i % 2 === 0 ? 9 : 6));
                ctx.lineTo(tx + 4, ty);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // -- Claw hands --
            ctx.save();
            ctx.strokeStyle = '#2a6e1e';
            ctx.fillStyle = '#1d8a2e';
            ctx.lineWidth = 2;
            const wiggle = Math.sin(frame * 0.14) * 0.18;
            // Left claw
            ctx.save();
            ctx.translate(-r * 0.85, r * 0.28);
            ctx.rotate(-0.4 + wiggle);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#0a3d14'; ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                const ca = -Math.PI * 0.5 + i * 0.5;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ca) * r * 0.22, Math.sin(ca) * r * 0.22);
                ctx.lineTo(Math.cos(ca) * r * 0.38, Math.sin(ca) * r * 0.38 - 4);
                ctx.stroke();
            }
            ctx.restore();
            // Right claw
            ctx.save();
            ctx.translate(r * 0.85, r * 0.28);
            ctx.rotate(0.4 - wiggle);
            ctx.fillStyle = '#1d8a2e'; ctx.strokeStyle = '#2a6e1e'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#0a3d14'; ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                const ca = -Math.PI * 0.5 + i * 0.5;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ca) * r * 0.22, Math.sin(ca) * r * 0.22);
                ctx.lineTo(Math.cos(ca) * r * 0.38, Math.sin(ca) * r * 0.38 - 4);
                ctx.stroke();
            }
            ctx.restore();
            ctx.restore();

            // -- Immunity shield --
            if (g.immune) {
                ctx.save();
                ctx.shadowColor = '#3498db'; ctx.shadowBlur = 18;
                ctx.strokeStyle = '#3498db'; ctx.lineWidth = 4;
                ctx.globalAlpha = 0.8;
                ctx.beginPath(); ctx.arc(0, 0, r + 12, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }

            ctx.restore();

            // -- HP bar (reuse standard logic position) --
            const bw = 80, bh = 8;
            const bx = gx - bw / 2, by = gy - r - 22;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            const pct = Math.max(0, g.hp / g.maxHp);
            const barCol = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
            ctx.fillStyle = barCol;
            ctx.fillRect(bx, by, bw * pct, bh);
            ctx.restore();
            return;
        }
        // ── End Green Goblin ───────────────────────────────────────────────────

        // ── MAKUTA custom draw ────────────────────────────────────────────────
        if (this.type === 'MAKUTA') {
            const mx = this.x, my = this.y, mr = this.radius;
            const pulse = 0.5 + 0.5 * Math.sin(this.mkBodyPulse);
            const hsway = Math.sin(this.mkHornSway) * 0.07;
            const eFlare = this.mkEyeFlare || 0;
            const phase = this.phase || 1;

            // ── Orbiting shadow orbs ──────────────────────────────────────────
            for (const orb of (this.mkOrbs || [])) {
                const ox = mx + Math.cos(orb.angle) * orb.dist;
                const oy = my + Math.sin(orb.angle) * orb.dist;
                ctx.save();
                ctx.shadowColor = '#cc00ff';
                ctx.shadowBlur = 14 + 8 * pulse;
                ctx.fillStyle = phase >= 3 ? '#ff0055' : phase >= 2 ? '#9900cc' : '#550088';
                ctx.globalAlpha = 0.75 + 0.25 * pulse;
                ctx.beginPath();
                ctx.arc(ox, oy, 9 + 4 * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                // Trailing wisp line toward Makuta
                ctx.save();
                ctx.globalAlpha = 0.2;
                ctx.strokeStyle = '#880088';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 8]);
                ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ox, oy); ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            // ── Channel charge aura ───────────────────────────────────────────
            if (this.mkState === 'CHANNEL') {
                const cp = Math.max(0, 1 - this.mkChannelTimer / 70);
                ctx.save();
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 40 * cp;
                ctx.strokeStyle = `rgba(200,0,255,${0.4 + 0.4 * cp})`;
                ctx.lineWidth = 4 + 6 * cp;
                ctx.beginPath();
                ctx.arc(mx, my, mr + 18 + 20 * cp, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // ── Sweep arc indicator ───────────────────────────────────────────
            if (this.mkState === 'SWEEP') {
                ctx.save();
                ctx.strokeStyle = 'rgba(255,0,80,0.35)';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.arc(mx, my, 240, this.mkSweepAngle - 0.5, this.mkSweepAngle + 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            ctx.save();
            ctx.translate(mx, my);

            // ── Dark aura / shadow corona ─────────────────────────────────────
            const coronaGrad = ctx.createRadialGradient(0, 0, mr * 0.6, 0, 0, mr * 1.65);
            coronaGrad.addColorStop(0, `rgba(80,0,100,${0.25 + 0.15 * pulse})`);
            coronaGrad.addColorStop(0.6, `rgba(30,0,50,${0.15 + 0.08 * pulse})`);
            coronaGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = coronaGrad;
            ctx.beginPath();
            ctx.arc(0, 0, mr * 1.65, 0, Math.PI * 2);
            ctx.fill();

            // ── Mask face shape — angular & wide ─────────────────────────────
            // Outer glow ring
            ctx.save();
            const glowCol = phase >= 3 ? '#ff0055' : phase >= 2 ? '#cc00ff' : '#660088';
            ctx.shadowColor = glowCol;
            ctx.shadowBlur = 28 + 20 * pulse + 30 * eFlare;
            ctx.strokeStyle = glowCol;
            ctx.lineWidth = phase >= 2 ? 4 : 2;
            ctx.globalAlpha = 0.7 + 0.3 * eFlare;
            ctx.beginPath();
            ctx.arc(0, 0, mr + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Mask body — dark polygon with subtle concave sides
            ctx.save();
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 16;
            const mg = ctx.createRadialGradient(-mr * 0.2, -mr * 0.3, mr * 0.05, 0, 0, mr);
            mg.addColorStop(0, '#2a0030');
            mg.addColorStop(0.5, '#110018');
            mg.addColorStop(1, '#060008');
            ctx.fillStyle = mg;
            ctx.beginPath();
            // Octagonal angular mask silhouette (wide, flat top, pointed jaw)
            ctx.moveTo(-mr * 0.72, mr * 0.65);   // bottom-left jaw
            ctx.lineTo(-mr * 0.55, mr * 0.85);   // chin left
            ctx.lineTo(0, mr * 0.95);   // chin center
            ctx.lineTo(mr * 0.55, mr * 0.85);   // chin right
            ctx.lineTo(mr * 0.72, mr * 0.65);   // bottom-right jaw
            ctx.lineTo(mr * 1.00, mr * 0.10);   // right cheekbone
            ctx.lineTo(mr * 0.95, -mr * 0.30);   // right temple
            ctx.lineTo(mr * 0.65, -mr * 0.75);   // right brow outer
            ctx.lineTo(mr * 0.22, -mr * 0.95);   // right crown inner
            ctx.lineTo(0, -mr * 1.00);   // crown center
            ctx.lineTo(-mr * 0.22, -mr * 0.95);   // left crown inner
            ctx.lineTo(-mr * 0.65, -mr * 0.75);   // left brow outer
            ctx.lineTo(-mr * 0.95, -mr * 0.30);   // left temple
            ctx.lineTo(-mr * 1.00, mr * 0.10);   // left cheekbone
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Mask outline stroke
            ctx.save();
            ctx.shadowColor = phase >= 2 ? '#9900bb' : '#440055';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = phase >= 2 ? '#6600aa' : '#330044';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-mr * 0.72, mr * 0.65);
            ctx.lineTo(-mr * 0.55, mr * 0.85);
            ctx.lineTo(0, mr * 0.95);
            ctx.lineTo(mr * 0.55, mr * 0.85);
            ctx.lineTo(mr * 0.72, mr * 0.65);
            ctx.lineTo(mr * 1.00, mr * 0.10);
            ctx.lineTo(mr * 0.95, -mr * 0.30);
            ctx.lineTo(mr * 0.65, -mr * 0.75);
            ctx.lineTo(mr * 0.22, -mr * 0.95);
            ctx.lineTo(0, -mr * 1.00);
            ctx.lineTo(-mr * 0.22, -mr * 0.95);
            ctx.lineTo(-mr * 0.65, -mr * 0.75);
            ctx.lineTo(-mr * 0.95, -mr * 0.30);
            ctx.lineTo(-mr * 1.00, mr * 0.10);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // ── Crown horns (4 spikes, sway slightly) ────────────────────────
            ctx.save();
            ctx.rotate(hsway);
            const hornColor = phase >= 3 ? '#cc0033' : phase >= 2 ? '#880099' : '#440055';
            const hornGlowC = phase >= 3 ? '#ff2255' : '#bb00ee';
            ctx.shadowColor = hornGlowC;
            ctx.shadowBlur = 12 + 8 * pulse;
            ctx.fillStyle = hornColor;
            ctx.strokeStyle = phase >= 2 ? hornGlowC : '#220033';
            ctx.lineWidth = 1.5;
            // Center-left horn (tallest)
            ctx.beginPath();
            ctx.moveTo(-mr * 0.20, -mr * 0.92);
            ctx.lineTo(-mr * 0.36, -mr * 1.72);
            ctx.lineTo(-mr * 0.08, -mr * 0.98);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Center-right horn
            ctx.beginPath();
            ctx.moveTo(mr * 0.20, -mr * 0.92);
            ctx.lineTo(mr * 0.36, -mr * 1.72);
            ctx.lineTo(mr * 0.08, -mr * 0.98);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Outer-left horn (shorter)
            ctx.beginPath();
            ctx.moveTo(-mr * 0.55, -mr * 0.72);
            ctx.lineTo(-mr * 0.74, -mr * 1.28);
            ctx.lineTo(-mr * 0.42, -mr * 0.76);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // Outer-right horn
            ctx.beginPath();
            ctx.moveTo(mr * 0.55, -mr * 0.72);
            ctx.lineTo(mr * 0.74, -mr * 1.28);
            ctx.lineTo(mr * 0.42, -mr * 0.76);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();

            // ── Eye slots — fierce V-shaped, inward-angled ───────────────────
            const eyeCol = phase >= 3 ? '#ff2244' : '#ff3300';
            const eyeGlow2 = phase >= 3 ? '#ff0033' : phase >= 2 ? '#ff4400' : '#cc2200';
            const eyeW = mr * 0.085 + mr * 0.04 * eFlare;
            const eyePulse = 0.80 + 0.20 * Math.sin(frame * 0.18) + 0.3 * eFlare;

            ctx.save();
            ctx.lineCap = 'round';
            // Dark shadow under eyes
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = eyeW + 4;
            // Left eye slit — angled down-right inward
            ctx.beginPath(); ctx.moveTo(-mr * 0.52, -mr * 0.22); ctx.lineTo(-mr * 0.20, -mr * 0.42); ctx.stroke();
            // Right eye slit — mirror
            ctx.beginPath(); ctx.moveTo(mr * 0.52, -mr * 0.22); ctx.lineTo(mr * 0.20, -mr * 0.42); ctx.stroke();
            // Glowing fill
            ctx.shadowColor = eyeGlow2;
            ctx.shadowBlur = 20 + 20 * eFlare;
            ctx.strokeStyle = eyeCol;
            ctx.lineWidth = eyeW;
            ctx.globalAlpha = 0.85 * eyePulse;
            ctx.beginPath(); ctx.moveTo(-mr * 0.52, -mr * 0.22); ctx.lineTo(-mr * 0.20, -mr * 0.42); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mr * 0.52, -mr * 0.22); ctx.lineTo(mr * 0.20, -mr * 0.42); ctx.stroke();
            // Fierce central bridge glow
            ctx.globalAlpha = 0.6 * eyePulse;
            ctx.shadowBlur = 24 + 16 * eFlare;
            ctx.beginPath(); ctx.arc(0, -mr * 0.30, mr * 0.06, 0, Math.PI * 2);
            ctx.fillStyle = eyeCol; ctx.fill();
            ctx.restore();

            // ── Nose ridge / face details ─────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = '#330044';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            // Vertical nose ridge
            ctx.beginPath();
            ctx.moveTo(0, -mr * 0.28);
            ctx.lineTo(0, mr * 0.20);
            ctx.stroke();
            // Cheekbone lines
            ctx.beginPath(); ctx.moveTo(-mr * 0.55, -mr * 0.05); ctx.lineTo(-mr * 0.80, mr * 0.25); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(mr * 0.55, -mr * 0.05); ctx.lineTo(mr * 0.80, mr * 0.25); ctx.stroke();
            ctx.restore();

            // ── Mouth — jagged cruel grin ─────────────────────────────────────
            ctx.save();
            ctx.strokeStyle = '#220033';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(-mr * 0.42, mr * 0.38);
            ctx.lineTo(-mr * 0.20, mr * 0.52);
            ctx.lineTo(0, mr * 0.42);
            ctx.lineTo(mr * 0.20, mr * 0.52);
            ctx.lineTo(mr * 0.42, mr * 0.38);
            ctx.stroke();
            // Lip glow
            ctx.shadowColor = phase >= 2 ? '#cc0055' : '#550000';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = phase >= 2 ? '#990033' : '#440000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // ── Phase 2: dark energy cracks across mask ───────────────────────
            if (phase >= 2) {
                ctx.save();
                const crackAlpha = 0.4 + 0.2 * pulse;
                ctx.strokeStyle = phase >= 3 ? '#ff0055' : '#9900cc';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = crackAlpha;
                ctx.shadowColor = phase >= 3 ? '#ff0055' : '#cc00ff';
                ctx.shadowBlur = 6;
                // Left crack
                ctx.beginPath();
                ctx.moveTo(-mr * 0.30, -mr * 0.10);
                ctx.lineTo(-mr * 0.55, mr * 0.30);
                ctx.lineTo(-mr * 0.40, mr * 0.50);
                ctx.stroke();
                // Right crack
                ctx.beginPath();
                ctx.moveTo(mr * 0.30, -mr * 0.10);
                ctx.lineTo(mr * 0.55, mr * 0.30);
                ctx.lineTo(mr * 0.40, mr * 0.50);
                ctx.stroke();
                ctx.restore();
            }

            // ── Phase 3: molten interior glow behind eye slots ────────────────
            if (phase >= 3) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 0.12 + 0.10 * pulse;
                const meltGrad = ctx.createRadialGradient(0, -mr * 0.30, 0, 0, -mr * 0.10, mr * 0.55);
                meltGrad.addColorStop(0, '#ff2244');
                meltGrad.addColorStop(1, 'rgba(120,0,0,0)');
                ctx.fillStyle = meltGrad;
                ctx.beginPath(); ctx.arc(0, -mr * 0.10, mr * 0.55, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            ctx.restore(); // end translate(mx, my)

            return;
        }
        // ── End Makuta ────────────────────────────────────────────────────────

        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(frame * 0.02);
        // 3D boss body — radial gradient lit from top-left
        const _bLight = shadeColor(this.color, +50);
        const _bDark = shadeColor(this.color, -65);
        const _brg = ctx.createRadialGradient(
            -this.radius * 0.28, -this.radius * 0.28, this.radius * 0.05,
            0, 0, this.radius
        );
        _brg.addColorStop(0, _bLight);
        _brg.addColorStop(0.45, this.color);
        _brg.addColorStop(1, _bDark);
        ctx.fillStyle = _brg;
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 4;
        ctx.beginPath();
        let sides = 6;
        if (this.type === 'SPEEDSTER') sides = 3;
        if (this.type === 'SUMMONER') sides = 4;
        if (this.type === 'NOVA') sides = 8;
        if (this.type === 'HYDRA') sides = 5;
        if (this.type === 'GREEN_GOBLIN') sides = 3;

        for (let i = 0; i < sides; i++) {
            ctx.lineTo(this.radius * Math.cos(i * 2 * Math.PI / sides), this.radius * Math.sin(i * 2 * Math.PI / sides));
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // Menacing glowing eye slits — angled inward, fierce V-shape
        const _br = this.radius;
        const _bSlitW = Math.max(3, _br * 0.075);
        ctx.save();
        ctx.lineCap = 'round';

        // Dark outline pass — drawn first, slightly thicker, no glow
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = _bSlitW + 3;
        ctx.beginPath(); ctx.moveTo(-_br * 0.20, -_br * 0.28); ctx.lineTo(-_br * 0.47, -_br * 0.10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(_br * 0.20, -_br * 0.28); ctx.lineTo(_br * 0.47, -_br * 0.10); ctx.stroke();

        // Glowing red fill pass on top
        ctx.shadowColor = '#ff1100';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = _bSlitW;
        ctx.beginPath(); ctx.moveTo(-_br * 0.20, -_br * 0.28); ctx.lineTo(-_br * 0.47, -_br * 0.10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(_br * 0.20, -_br * 0.28); ctx.lineTo(_br * 0.47, -_br * 0.10); ctx.stroke();

        // Fierce central glow between the eyes
        ctx.beginPath(); ctx.arc(0, -_br * 0.16, _br * 0.055, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,40,0,0.80)'; ctx.shadowBlur = 28; ctx.fill();
        ctx.restore();

        if (this.type === 'RHINO' && this.state === 1) {
            // Charge effect
            ctx.strokeStyle = 'orange'; ctx.lineWidth = 5; ctx.stroke();
        }

        // Phase 2 Visuals
        if (this.phase === 2) {
            if (this.type === 'TANK') {
                // Broken Armor Look
                ctx.strokeStyle = '#e74c3c';
                ctx.setLineDash([10, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Immunity Shield
        if (this.immune) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Telegraph Indicators
        if (this.telegraphTimer > 0 && this.telegraphData) {
            ctx.restore(); // Restore to world coordinates for telegraph
            ctx.save();
            ctx.translate(this.telegraphData.x, this.telegraphData.y);

            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;

            if (this.telegraphData.type === 'CIRCLE') {
                ctx.beginPath();
                ctx.arc(0, 0, this.telegraphData.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Progress
                ctx.beginPath();
                ctx.arc(0, 0, this.telegraphData.radius * (1 - this.telegraphTimer / 60), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(231, 76, 60, 0.5)';
                ctx.fill();
            }
            ctx.restore();
            return; // Already restored
        }

        ctx.restore();
    }
}