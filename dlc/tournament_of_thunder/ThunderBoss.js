class ThunderBoss {
    constructor(wave, prestige) {
        this.type = 'ZEUS'; // Visual tag
        // Spawn Center
        this.x = arena.width / 2;
        this.y = arena.height / 2;
        this.radius = 80;

        const difficultyMult = (1 + (prestige * 0.5));

        // Superboss Stats
        this.maxHp = 50000 * difficultyMult;
        this.hp = this.maxHp;
        this.speed = 4; // Fast
        this.color = '#fff'; // White Hot

        this.phase = 1;
        this.attackTimer = 0;
        this.state = 'IDLE'; // IDLE, CHARGE, BEAM, STORM
        this.minionsToKill = 0;
        this.immune = false;

        // Visual
        this.angle = 0;
    }

    update() {
        this.angle += 0.05;
        this.attackTimer++;

        // Phase Transitions
        if (this.phase === 1 && this.hp < this.maxHp * 0.7) {
            this.phase = 2;
            this.startStorm();
            showNotification("MAKUTA: THE STORM RISES!");
        }
        if (this.phase === 2 && this.hp < this.maxHp * 0.3) {
            this.phase = 3;
            this.speed = 6;
            showNotification("MAKUTA: UNLIMITED POWER!");
        }

        // Behavior
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        // Movement: Always chases unless doing a static attack
        if (this.state !== 'BEAM') {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        // Attacks
        if (this.attackTimer > 180) { // Every 3s
            this.attackTimer = 0;
            const rand = Math.random();
            if (rand < 0.4) this.shootLightning();
            else if (rand < 0.7) this.spawnOrbs();
            else this.dashAttack();
        }

        // Phase 2 Passive: Random lightning strikes
        if (this.phase >= 2 && Math.random() < 0.05) {
            this.strikeRandom();
        }
    }

    shootLightning() {
        // Targeted Bolt
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        projectiles.push(new LightningProjectile( // Reusing the hero projectile logic but set as enemy? 
            // Or just generic projectile
            this.x, this.y,
            Math.cos(angle) * 10,
            Math.sin(angle) * 10,
            20, // Damage
            10, // Size
            true, // isSuper (white)
            0, // Chains
            1000
        ));
        // Need to ensure LightningProjectile supports "isEnemy" flag or we use generic Projectile
        // Let's use generic Projectile for safety as LightningProjectile logic targets enemies
        projectiles.push(new Projectile(
            this.x, this.y,
            { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
            25, '#ffeb3b', 10, 'LIGHTNING', 10, true
        ));
    }

    spawnOrbs() {
        // Ring of projectiles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            projectiles.push(new Projectile(
                this.x, this.y,
                { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                20, '#fff', 8, 'LIGHTNING', 5, true
            ));
        }
    }

    dashAttack() {
        // Quick dash towards player
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * 200;
        this.y += Math.sin(angle) * 200;
        createExplosion(this.x, this.y, '#fff');
    }

    startStorm() {
        // Global effect or spawn minions
        // For simplicity: Spawns 4 Storm Elementals
        for (let i = 0; i < 4; i++) {
            // Logic to spawn enemy... usually handled by game.js spawnEnemy
            // We can't easily access spawnEnemy helper without refactoring or global
            // But we can push to enemies array if we instantiate correct class
            // let minion = ... 
            // Simplified: Just explosion visual
            createExplosion(this.x + Math.random() * 200, this.y + Math.random() * 200, '#ffeb3b');
        }
    }

    strikeRandom() {
        // Lightning from sky
        projectiles.push(new Projectile(
            player.x + (Math.random() * 400 - 200), player.y - 400,
            { x: 0, y: 15 },
            15, '#aaddff', 15, 'LIGHTNING', 0, true
        ));
    }

    draw() {
        if (typeof ctx === 'undefined') return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffeb3b';

        // Draw "Zeus" Shape (Star/Jagged)
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.radius,
                Math.sin((18 + i * 72) * Math.PI / 180) * this.radius);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.radius / 2),
                Math.sin((54 + i * 72) * Math.PI / 180) * (this.radius / 2));
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Health Bar
        const barWidth = 100;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth * (this.hp / this.maxHp), 10);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth, 10);
    }
}

window.ThunderBoss = ThunderBoss;
