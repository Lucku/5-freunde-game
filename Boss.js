
class Boss {
    constructor(type) {
        this.type = type || BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
        const cam = arena.camera;
        // Spawn near player but ensure inside map
        this.x = cam.x + cam.width / 2 + (Math.random() * 100 - 50);
        this.y = cam.y - 100;

        // Clamp to map bounds
        this.x = Math.max(60, Math.min(arena.width - 60, this.x));
        this.y = Math.max(60, Math.min(arena.height - 60, this.y));

        this.radius = 60;

        const prestige = saveData[player.type].prestige;
        const difficultyMult = (1 + (prestige * 0.5));

        this.maxHp = 1000 * wave * difficultyMult;
        this.hp = this.maxHp;
        this.speed = 1.5 + (wave * 0.1);
        this.color = '#c0392b';
        this.damage = 30 * difficultyMult;
        this.attackCooldown = 100;
        this.state = 0; // For complex bosses like Rhino

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
        }
    }

    update() {
        // Green Goblin Magnet
        if (this.type === 'GREEN_GOBLIN') {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 400) { // Reduced range from 500 to 400
                const pullAngle = Math.atan2(this.y - player.y, this.x - player.x);
                // Pull player
                player.x += Math.cos(pullAngle) * this.magnetStrength;
                player.y += Math.sin(pullAngle) * this.magnetStrength;

                // Visual effect for magnet
                if (frame % 10 === 0) {
                    ctx.save();
                    ctx.strokeStyle = '#2ecc71';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(player.x, player.y);
                    ctx.lineTo(this.x, this.y);
                    ctx.stroke();
                    ctx.restore();
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
                if (this.type === 'TANK') {
                    for (let i = 0; i < 12; i++) {
                        const a = (Math.PI * 2 / 12) * i + (frame * 0.1);
                        const vel = { x: Math.cos(a) * 5, y: Math.sin(a) * 5 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#e74c3c', 8, 'enemy', 0, true));
                    }
                    this.attackCooldown = 180;
                } else if (this.type === 'SPEEDSTER') {
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
                    for (let i = 0; i < 3; i++) {
                        const a = (frame * 0.1) + (Math.PI * 2 / 3) * i;
                        const vel = { x: Math.cos(a) * 4, y: Math.sin(a) * 4 };
                        projectiles.push(new Projectile(this.x, this.y, vel, this.damage, '#8e44ad', 6, 'enemy', 0, true));
                    }
                    this.attackCooldown = 5; // Very fast fire rate
                } else if (this.type === 'HYDRA') {
                    // Triple Shot
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
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(frame * 0.02);
        ctx.fillStyle = this.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
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

        // Boss Eyes
        ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(-20, -10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, -10, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(-20, -10, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, -10, 4, 0, Math.PI * 2); ctx.fill();

        if (this.type === 'RHINO' && this.state === 1) {
            // Charge effect
            ctx.strokeStyle = 'orange'; ctx.lineWidth = 5; ctx.stroke();
        }

        ctx.restore();
    }
}