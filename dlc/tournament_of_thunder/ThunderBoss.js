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
        this.state = 'IDLE'; // IDLE, CASTING, DASHING
        this.minionsToKill = 0;
        this.immune = false;

        // Boss Properties
        this.isBoss = true;
        this.xpValue = 5000;

        // Visual
        this.angle = 0;
    }

    update() {
        this.angle += 0.05;
        this.attackTimer++;

        // Phase Transitions
        if (this.phase === 1 && this.hp < this.maxHp * 0.7) {
            this.phase = 2;
            createExplosion(this.x, this.y, '#ffeb3b', 20); // Visual flair
            showNotification("ZEUS: THE SKY BELONGS TO ME!");
        }
        if (this.phase === 2 && this.hp < this.maxHp * 0.3) {
            this.phase = 3;
            this.speed = 8;
            createExplosion(this.x, this.y, '#ffffff', 30);
            showNotification("ZEUS: I AM THE GOD OF THUNDER!");
        }

        // Behavior
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        const preferredDist = 500; // Prefer range combat

        // Movement: Kiting and Orbiting
        if (this.state !== 'CASTING' && this.state !== 'DASHING') {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);

            if (dist > preferredDist + 150) {
                // Too far, chase
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            } else if (dist < preferredDist - 150) {
                // Too close, retreat (Flash away)
                this.x -= Math.cos(angle) * (this.speed * 1.2);
                this.y -= Math.sin(angle) * (this.speed * 1.2);
            } else {
                // Sweet spot: Orbit/Strafe
                // Circle around the player
                this.x += Math.cos(angle + Math.PI / 2) * (this.speed * 0.8);
                this.y += Math.sin(angle + Math.PI / 2) * (this.speed * 0.8);
            }
        }

        // Boundaries
        this.x = Math.max(0, Math.min(arena.width, this.x));
        this.y = Math.max(0, Math.min(arena.height, this.y));


        // Attacks
        // Attack rate increases with phase
        const attackThreshold = this.phase === 3 ? 120 : (this.phase === 2 ? 150 : 180);

        if (this.attackTimer > attackThreshold) {
            this.attackTimer = 0;
            const rand = Math.random();

            if (this.phase === 3 && rand < 0.3) this.wrathOfOlympus(); // Ult
            else if (rand < 0.4) this.thunderSpear();
            else if (rand < 0.7) this.stormRing();
            else this.staticField();
        }

        // Passive Effects
        if (this.phase >= 2 && Math.random() < 0.02) {
            this.strikeRandom(); // Random environmental lightning
        }
    }

    thunderSpear() {
        // High speed, high damage snipe
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        // Telegraph
        createExplosion(this.x, this.y, '#ffeb3b');

        setTimeout(() => {
            projectiles.push(new Projectile(
                this.x, this.y,
                { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 }, // Very Fast
                40, // High Damage
                '#ffff00',
                15,
                'LIGHTNING_SPEAR',
                20,
                true
            ));
        }, 500); // 0.5s delay
    }

    stormRing() {
        // Expanding ring of orbs
        const count = this.phase === 3 ? 24 : 16;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            projectiles.push(new Projectile(
                this.x, this.y,
                { x: Math.cos(angle) * 6, y: Math.sin(angle) * 6 },
                20, '#aaddff', 8, 'LIGHTNING', 5, true
            ));
        }
    }

    dashAttack() {
        // Replaced by Kiting/Movement logic, but kept as a defensive burst if stuck?
        // Let's replace with Teleport
        createExplosion(this.x, this.y, '#fff');
        const angle = Math.random() * Math.PI * 2;
        this.x += Math.cos(angle) * 300;
        this.y += Math.sin(angle) * 300;
        createExplosion(this.x, this.y, '#fff');
    }

    staticField() {
        // Place a mine/trap near player
        projectiles.push(new Projectile(
            player.x + (Math.random() * 200 - 100),
            player.y + (Math.random() * 200 - 100),
            { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 }, // Drift to ensure cleanup
            10, // Continuous Low Damage (if touched)
            '#55aaff',
            40, // Large
            'STATIC',
            0,
            true
        ));
    }

    wrathOfOlympus() {
        showNotification("WRATH OF OLYMPUS!");
        this.state = 'CASTING';

        // Massive Bullet Hell
        let volleys = 5;
        let volleyDelay = 200; // ms

        for (let v = 0; v < volleys; v++) {
            setTimeout(() => {
                createExplosion(this.x, this.y, '#fff', 30);
                const count = 12;
                const offset = (v % 2 === 0) ? 0 : (Math.PI / count); // Interleaved
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + offset + this.angle; // Spiraling
                    projectiles.push(new Projectile(
                        this.x, this.y,
                        { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                        25, '#ff0000', 12, 'LIGHTNING_WRATH', 10, true
                    ));
                }
                if (v === volleys - 1) this.state = 'IDLE';
            }, v * volleyDelay);
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
