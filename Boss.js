
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
            // Makuta Special Boss
            this.color = '#000000'; // Pure Black
            this.radius = 80; // Larger

            // Wave 50 vs Wave 100 Scaling
            if (wave === 50) {
                this.maxHp *= 2.0; // 2x Normal Boss HP
                this.damage *= 1.5;
                this.speed *= 1.2;
            } else if (wave >= 100) {
                this.maxHp *= 5.0; // 5x Normal Boss HP (Final Boss)
                this.damage *= 2.5;
                this.speed *= 1.5;
            }
            this.hp = this.maxHp;
        } else if (this.type === 'GREEN_GOBLIN') {
            this.color = '#2ecc71';
            this.speed *= 1.3;
            this.maxHp *= 0.8;
            this.hp = this.maxHp;
            this.magnetStrength = 0.8; // Reduced from 2.0 to 0.8
            this.magnetTimer = 0; // Active time
            this.magnetCooldown = 180; // Wait time
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
        }
    }

    update() {
        if (typeof WindBosses !== 'undefined' && WindBosses.isWindBoss(this.type)) {
            WindBosses.update(this, player, arena);
            // Clamp position
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

        // Phase Transition Logic
        if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
            this.phase = 2;
            floatingTexts.push(new FloatingText(this.x, this.y - 60, "PHASE 2!", "#e74c3c", 30));
            createExplosion(this.x, this.y, this.color);

            if (this.type === 'TANK') {
                this.speed *= 2.0; // Move faster
                this.damage *= 1.5; // Hit harder
                // Visual change handled in draw
            } else if (this.type === 'SUMMONER') {
                this.immune = true;
                this.minionsToKill = 5;
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
                }
            }
        }

        // Green Goblin Magnet (Pulsing)
        if (this.type === 'GREEN_GOBLIN') {
            if (this.magnetCooldown > 0) {
                this.magnetCooldown--;
                if (this.magnetCooldown <= 0) {
                    this.magnetTimer = 120; // Active for 2 seconds
                    if (typeof showNotification === 'function') showNotification("MAGNET ACTIVATE!", "#2ecc71");
                }
            } else if (this.magnetTimer > 0) {
                this.magnetTimer--;
                if (this.magnetTimer <= 0) this.magnetCooldown = 300; // Cooldown 5 seconds

                const dist = Math.hypot(player.x - this.x, player.y - this.y);
                if (dist < 500) {
                    const pullAngle = Math.atan2(this.y - player.y, this.x - player.x);
                    player.x += Math.cos(pullAngle) * this.magnetStrength;
                    player.y += Math.sin(pullAngle) * this.magnetStrength;

                    // Visual effect
                    if (frame % 5 === 0) {
                        ctx.save();
                        ctx.strokeStyle = '#2ecc71';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(player.x, player.y);
                        ctx.lineTo(this.x, this.y);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
            }
        }

        const angle = Math.atan2(player.y - this.y, player.x - this.x);
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
            // Makuta Logic: Teleportation & Shadow Bolts

            // Standard Movement
            nextX += Math.cos(angle) * this.speed;
            nextY += Math.sin(angle) * this.speed;

            // Teleport Ability (Every 5 seconds)
            if (frame % 300 === 0) {
                createExplosion(this.x, this.y, '#000');
                // Teleport near player
                const offsetAngle = Math.random() * Math.PI * 2;
                this.x = player.x + Math.cos(offsetAngle) * 300;
                this.y = player.y + Math.sin(offsetAngle) * 300;
                createExplosion(this.x, this.y, '#000');
                // Clamp
                this.x = Math.max(this.radius, Math.min(arena.width - this.radius, this.x));
                this.y = Math.max(this.radius, Math.min(arena.height - this.radius, this.y));
                return; // Skip collision check for this frame
            }

            this.attackCooldown--;
        } else if (this.type === 'GREEN_GOBLIN') {
            // Hover/Kite Behavior
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            const idealDist = 350;

            if (dist < 200) {
                // Too close! Retreat
                nextX -= Math.cos(angle) * (this.speed * 1.2);
                nextY -= Math.sin(angle) * (this.speed * 1.2);
            } else if (dist > 500) {
                // Too far! Chase
                nextX += Math.cos(angle) * this.speed;
                nextY += Math.sin(angle) * this.speed;
            } else {
                // Sweet spot! Strafe around player
                // Move perpendicular to angle
                const strafeAngle = angle + Math.PI / 2;
                nextX += Math.cos(strafeAngle) * (this.speed * 0.8);
                nextY += Math.sin(strafeAngle) * (this.speed * 0.8);

                // Slight drift towards ideal distance
                if (dist > idealDist) {
                    nextX += Math.cos(angle) * 0.5;
                    nextY += Math.sin(angle) * 0.5;
                } else {
                    nextX -= Math.cos(angle) * 0.5;
                    nextY -= Math.sin(angle) * 0.5;
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
                } else if (this.type === 'MAKUTA') {
                    // Shadow Nova
                    for (let i = 0; i < 16; i++) {
                        const a = (Math.PI * 2 / 16) * i;
                        const vel = { x: Math.cos(a) * 7, y: Math.sin(a) * 7 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#000', 12, 'enemy', 0, true));
                    }
                    // Summon Shadow Minions
                    if (Math.random() < 0.5) {
                        for (let i = 0; i < 3; i++) {
                            const minion = new Enemy(true);
                            minion.x = this.x + (Math.random() - 0.5) * 100;
                            minion.y = this.y + (Math.random() - 0.5) * 100;
                            // Force Shadow Type for minions
                            minion.color = '#333';
                            minion.hp *= 1.5;
                            enemies.push(minion);
                        }
                    }
                    // Shadow Beam (Aimed at player)
                    const beamAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    const beamVel = { x: Math.cos(beamAngle) * 12, y: Math.sin(beamAngle) * 12 };
                    projectiles.push(new Projectile(this.x, this.y, beamVel, this.damage * 1.5, '#500', 20, 'enemy', 0, true));

                    this.attackCooldown = 100; // Slightly slower to account for intensity
                } else if (this.type === 'SUMMONER') {
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
                    // Explosive Pumpkin Bombs
                    for (let i = 0; i < 3; i++) {
                        const spread = (Math.random() - 0.5) * 0.5;
                        const a = Math.atan2(player.y - this.y, player.x - this.x) + spread;
                        const vel = { x: Math.cos(a) * 9, y: Math.sin(a) * 9 };
                        // Orange projectiles that look like bombs
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage * 1.2, '#e67e22', 12, 'enemy', 0, true));
                    }
                    this.attackCooldown = 90;
                }
            } else { this.attackCooldown--; }
        }
    }

    draw() {
        if (typeof WindBosses !== 'undefined' && WindBosses.isWindBoss(this.type)) {
            WindBosses.draw(ctx, this);
            return;
        }

        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(frame * 0.02);
        // 3D boss body — radial gradient lit from top-left
        const _bLight = shadeColor(this.color, +50);
        const _bDark  = shadeColor(this.color, -65);
        const _brg = ctx.createRadialGradient(
            -this.radius * 0.28, -this.radius * 0.28, this.radius * 0.05,
             0, 0, this.radius
        );
        _brg.addColorStop(0,    _bLight);
        _brg.addColorStop(0.45, this.color);
        _brg.addColorStop(1,    _bDark);
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
        ctx.beginPath(); ctx.moveTo( _br * 0.20, -_br * 0.28); ctx.lineTo( _br * 0.47, -_br * 0.10); ctx.stroke();

        // Glowing red fill pass on top
        ctx.shadowColor = '#ff1100';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = _bSlitW;
        ctx.beginPath(); ctx.moveTo(-_br * 0.20, -_br * 0.28); ctx.lineTo(-_br * 0.47, -_br * 0.10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( _br * 0.20, -_br * 0.28); ctx.lineTo( _br * 0.47, -_br * 0.10); ctx.stroke();

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