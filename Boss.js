
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
    }

    update() {
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