class Enemy {
    constructor(isBossMinion = false, forcedType = null) {
        let safe = false;
        while (!safe) {
            const cam = arena.camera;
            if (Math.random() < 0.5) {
                this.x = Math.random() < 0.5 ? cam.x - 30 : cam.x + cam.width + 30;
                this.y = cam.y + Math.random() * cam.height;
            } else {
                this.x = cam.x + Math.random() * cam.width;
                this.y = Math.random() < 0.5 ? cam.y - 30 : cam.y + cam.height + 30;
            }
            if (!arena.checkCollision(this.x, this.y, 20)) safe = true;
        }

        const prestige = saveData[player.type].prestige;
        const difficultyMult = (1 + (wave * 0.2)) * (1 + (prestige * 0.5));

        // Enemy Types: BASIC, SHOOTER, BRUTE, SPEEDSTER, SWARM, SUMMONER
        // NEW: GHOST, SNIPER, BOMBER, TOXIC, SHIELDER
        this.subType = forcedType;

        // Global Override from Mutator
        if (!this.subType && typeof forcedEnemyType !== 'undefined' && forcedEnemyType) {
            this.subType = forcedEnemyType;
        }

        if (!this.subType) {
            const rand = Math.random();
            if (wave > 10 && rand < 0.05) this.subType = 'SNIPER';
            else if (wave > 8 && rand < 0.1) this.subType = 'BOMBER';
            else if (wave > 6 && rand < 0.15) this.subType = 'GHOST';
            else if (wave > 5 && rand < 0.2) this.subType = 'BRUTE';
            else if (wave > 4 && rand < 0.25) this.subType = 'TOXIC';
            else if (wave > 3 && rand < 0.3) this.subType = 'SPEEDSTER';
            else if (wave > 8 && rand < 0.35) this.subType = 'SUMMONER';
            else if (wave > 12 && rand < 0.4) this.subType = 'SHIELDER';
            else if (wave > 1 && rand < 0.45) this.subType = 'SHOOTER';
            else this.subType = 'BASIC';
        }

        this.radius = 15 + Math.random() * 10;
        this.hp = (20 + Math.random() * 20) * difficultyMult;
        this.speed = (1 + Math.random() * 1.5) * (1 + (wave * 0.1));
        this.color = '#555';
        this.damage = 20 * difficultyMult;
        this.sides = Math.floor(Math.random() * 3) + 4;
        this.shootCooldown = 0;
        this.summonCooldown = 0;
        this.frozenTimer = 0;

        // Chaos: Giant Enemies
        if (typeof isChaosActive === 'function' && isChaosActive('GIANT_ENEMIES')) {
            this.radius *= 2;
            this.hp *= 2;
            this.damage *= 1.5;
        }

        // Chaos: Double Speed
        if (typeof isChaosActive === 'function' && isChaosActive('DOUBLE_SPEED')) {
            this.speed *= 2;
        }
        this.alpha = 1; // For Ghost
        this.biomeSpeedMod = 1; // Biome Modifier

        // Type Specific Overrides
        if (this.subType === 'SHOOTER') {
            this.radius = 18; this.color = '#f1c40f'; this.sides = 3;
        } else if (this.subType === 'BRUTE') {
            this.radius = 30; this.hp *= 4; this.speed *= 0.5; this.color = '#5d4037'; this.damage *= 2; this.sides = 4;
        } else if (this.subType === 'SPEEDSTER') {
            this.radius = 12; this.hp *= 0.5; this.speed *= 1.8; this.color = '#e74c3c'; this.sides = 3;
            if (saveData.collection.includes('SPEEDSTER_4')) this.speed *= 0.9;
        } else if (this.subType === 'SWARM') {
            this.radius = 8; this.hp = 1; this.speed *= 1.2; this.color = '#8e44ad'; this.sides = 0;
        } else if (this.subType === 'SUMMONER') {
            this.radius = 25; this.hp *= 2; this.speed *= 0.8; this.color = '#2980b9'; this.sides = 5; this.summonCooldown = 200;
        }
        // --- NEW ENEMIES ---
        else if (this.subType === 'GHOST') {
            this.radius = 15; this.hp *= 0.8; this.speed *= 1.2; this.color = '#bdc3c7'; this.sides = 0; this.alpha = 0.1;
        } else if (this.subType === 'SNIPER') {
            this.radius = 15; this.hp *= 0.6; this.speed *= 0.7; this.color = '#16a085'; this.sides = 3; this.shootCooldown = 180;
        } else if (this.subType === 'BOMBER') {
            this.radius = 22; this.hp *= 1.5; this.speed *= 0.6; this.color = '#2c3e50'; this.sides = 8;
            if (saveData.collection.includes('BOMBER_4')) this.hp *= 0.5;
        } else if (this.subType === 'TOXIC') {
            this.radius = 18; this.color = '#27ae60'; this.sides = 6; this.shootCooldown = 20; // Trail timer
        } else if (this.subType === 'SHIELDER') {
            this.radius = 25; this.hp *= 3; this.speed *= 0.4; this.color = '#7f8c8d'; this.sides = 4;
        } else if (this.subType === 'GOBLIN') {
            this.radius = 12; this.hp *= 0.6; this.speed *= 1.3; this.color = '#2ecc71'; this.sides = 3; this.damage *= 0.8;
        }

        // --- MUTATOR MODIFIERS ---
        if (typeof activeMutators !== 'undefined') {
            if (activeMutators.some(m => m.id === 'GIANTS')) {
                this.radius *= 1.5;
                this.hp *= 2;
            }
            if (activeMutators.some(m => m.id === 'SWARM')) {
                this.radius *= 0.6;
                this.hp *= 0.6;
            }
            if (activeMutators.some(m => m.id === 'FOG')) {
                this.alpha = 0; // Start invisible
            }
        }

        this.maxHp = this.hp;
    }

    update() {
        if (this.frozenTimer > 0) {
            this.frozenTimer--;
            if (frame % 10 === 0) particles.push(new Particle(this.x, this.y, '#aaddff'));
            return;
        }

        // --- TARGETING LOGIC ---
        let targetX = player.x;
        let targetY = player.y;
        let isTargetingSapling = false;

        if (typeof currentObjective !== 'undefined' && currentObjective && currentObjective.type === 'DEFENSE' && currentObjective.data.sapling) {
            // 50% chance to target sapling
            // We can store this preference on the enemy instance if we want consistency
            if (!this.targetPreference) this.targetPreference = Math.random() < 0.5 ? 'SAPLING' : 'PLAYER';
            
            if (this.targetPreference === 'SAPLING') {
                targetX = currentObjective.data.sapling.x;
                targetY = currentObjective.data.sapling.y;
                isTargetingSapling = true;
            }
        }

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        let moveX = 0, moveY = 0;
        let currentSpeed = this.speed * this.biomeSpeedMod;
        if (currentWeather && currentWeather.id === 'BLIZZARD') currentSpeed *= 0.5;

        // --- Behavior Logic ---
        if (this.subType === 'GHOST') {
            const dist = Math.hypot(targetX - this.x, targetY - this.y);
            // Become visible when close or taking damage
            if (saveData.collection.includes('GHOST_4')) this.alpha = 1;
            else if (dist < 150 || this.hp < this.maxHp) this.alpha = Math.min(1, this.alpha + 0.05);
            else this.alpha = Math.max(0.1, this.alpha - 0.02);
            moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
        }
        else if (this.subType === 'SNIPER') {
            const dist = Math.hypot(targetX - this.x, targetY - this.y);
            if (dist > 400) {
                moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
            } else if (dist < 200) {
                moveX = -Math.cos(angle) * currentSpeed; moveY = -Math.sin(angle) * currentSpeed;
            }

            if (this.shootCooldown <= 0) {
                // High velocity, high damage shot
                const vel = { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 };
                const p = new Projectile(this.x, this.y, vel, this.damage * 2, '#16a085', 4, 'enemy', 0, true);
                p.shooterType = 'SNIPER';
                projectiles.push(p);
                this.shootCooldown = 240; // 4 seconds
            }
            if (this.shootCooldown > 0) this.shootCooldown--;
        }
        else if (this.subType === 'BOMBER') {
            moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
            const dist = Math.hypot(targetX - this.x, targetY - this.y);
            if (dist < 60) {
                // Explode
                this.hp = 0;
                createExplosion(this.x, this.y, '#e74c3c');
                // Explosion damage area
                if (Math.hypot(player.x - this.x, player.y - this.y) < 100) {
                    player.hp -= 40 * (1 - player.damageReduction);
                    floatingTexts.push(new FloatingText(player.x, player.y - 20, "40", "#e74c3c", 20));
                    // Track hits for Untouchable objective
                    if (currentObjective && currentObjective.type === 'UNTOUCHABLE') {
                        currentObjective.current++;
                        showNotification(`HIT! ${currentObjective.current}/${currentObjective.target}`);
                    }
                }
                // Damage Sapling
                if (currentObjective && currentObjective.type === 'DEFENSE' && currentObjective.data.sapling) {
                    const s = currentObjective.data.sapling;
                    if (Math.hypot(s.x - this.x, s.y - this.y) < 100) {
                        s.hp -= 100;
                        createExplosion(s.x, s.y, '#2ecc71');
                    }
                }
            }
        }
        else if (this.subType === 'TOXIC') {
            moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
            if (this.shootCooldown <= 0) {
                // Leave a stationary projectile (puddle)
                const puddle = new Projectile(this.x, this.y, { x: 0, y: 0 }, 5, '#2ecc71', 10, 'enemy', 0, true);
                puddle.shooterType = 'TOXIC';
                puddle.life = 180; // Custom life property needed in Projectile or handle cleanup
                // Since Projectile doesn't have life, we'll just use a slow projectile
                projectiles.push(puddle);
                this.shootCooldown = 30;
            }
            if (this.shootCooldown > 0) this.shootCooldown--;
        }
        else if (this.subType === 'SHOOTER') {
            const dist = Math.hypot(targetX - this.x, targetY - this.y);
            if (dist > 250) {
                moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
            } else {
                if (dist < 150) { moveX = -Math.cos(angle) * (currentSpeed * 0.5); moveY = -Math.sin(angle) * (currentSpeed * 0.5); }
                if (this.shootCooldown <= 0) {
                    const vel = { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 };
                    const p = new Projectile(this.x, this.y, vel, this.damage, '#e74c3c', 5, 'enemy', 0, true);
                    p.shooterType = 'SHOOTER';
                    projectiles.push(p);
                    this.shootCooldown = 120;
                }
            }
            if (this.shootCooldown > 0) this.shootCooldown--;
        } else if (this.subType === 'SUMMONER') {
            const dist = Math.hypot(targetX - this.x, targetY - this.y);
            // Stay away from player
            if (dist < 400) {
                moveX = -Math.cos(angle) * currentSpeed; moveY = -Math.sin(angle) * currentSpeed;
            } else if (dist > 600) {
                moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
            } else {
                // Strafe
                moveX = Math.cos(angle + Math.PI / 2) * currentSpeed; moveY = Math.sin(angle + Math.PI / 2) * currentSpeed;
            }

            if (this.summonCooldown <= 0) {
                // Spawn a basic enemy
                const minion = new Enemy(true, 'BASIC');
                minion.x = this.x; minion.y = this.y;
                enemies.push(minion);
                createExplosion(this.x, this.y, '#2980b9');

                let cooldown = 300;
                if (saveData.collection.includes('SUMMONER_4')) cooldown = 450; // 50% slower
                this.summonCooldown = cooldown;
            }
            if (this.summonCooldown > 0) this.summonCooldown--;

        } else {
            // Basic, Brute, Speedster, Swarm just chase
            moveX = Math.cos(angle) * currentSpeed; moveY = Math.sin(angle) * currentSpeed;
        }

        // --- MUTATOR UPDATE LOGIC ---
        if (typeof activeMutators !== 'undefined' && activeMutators.some(m => m.id === 'FOG')) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 180 || this.hp < this.maxHp) {
                this.alpha = Math.min(1, this.alpha + 0.05);
            } else {
                this.alpha = Math.max(0, this.alpha - 0.05);
            }
        }

        let nextX = this.x + moveX; let nextY = this.y + moveY;
        if (!arena.checkCollision(nextX, nextY, this.radius)) { this.x = nextX; this.y = nextY; }
        else {
            if (!arena.checkCollision(nextX, this.y, this.radius)) this.x = nextX;
            else if (!arena.checkCollision(this.x, nextY, this.radius)) this.y = nextY;
        }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);

        // Rotate to face player so eyes look at you
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        ctx.rotate(angle);

        ctx.globalAlpha = this.alpha; // For Ghost
        ctx.fillStyle = this.color; ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath();

        if (this.sides === 0) { // Circle
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else {
            // Draw Polygon
            ctx.moveTo(this.radius, 0);
            for (let i = 1; i <= this.sides; i++) {
                ctx.lineTo(this.radius * Math.cos(i * 2 * Math.PI / this.sides), this.radius * Math.sin(i * 2 * Math.PI / this.sides));
            }
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // --- RESTORED RED EYES ---
        // White Sclera
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(this.radius * 0.3, -this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.radius * 0.3, this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
        // Red Pupils
        ctx.fillStyle = 'red';
        ctx.beginPath(); ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(this.radius * 0.4, this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();

        // Visual Markers
        if (this.subType === 'SNIPER') {
            // Laser sight
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 0);
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            ctx.lineTo(Math.cos(angle) * 400, Math.sin(angle) * 400);
            ctx.stroke();
        }
        if (this.subType === 'BOMBER') {
            // Pulsing effect
            const pulse = Math.sin(frame * 0.2) * 5;
            ctx.strokeStyle = 'orange'; ctx.beginPath(); ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2); ctx.stroke();
        }
        if (this.subType === 'SHIELDER') {
            // Rotating Shield
            ctx.rotate(frame * 0.1);
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(this.radius + 5, -10, 10, 20);
        }

        ctx.restore();
    }
}