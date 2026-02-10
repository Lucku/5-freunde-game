class WindBosses {
    static isWindBoss(type) {
        return ['CLOUD_GOLEM', 'STORM_CROW', 'TORNADO_MACHINA', 'TEMP_EST'].includes(type);
    }

    static init(boss) {
        const difficultyMult = (1 + (saveData[player.type].prestige * 0.5));

        if (boss.type === 'CLOUD_GOLEM') {
            boss.color = '#bdc3c7'; // Silver
            boss.radius = 80;
            boss.maxHp *= 1.5;
            boss.hp = boss.maxHp;
            boss.speed *= 0.6;
            boss.knockbackResist = 0.9; // Nearly immovable
            boss.damage *= 1.2;
        } else if (boss.type === 'STORM_CROW') {
            boss.color = '#2c3e50'; // Dark Blue
            boss.radius = 50;
            boss.maxHp *= 0.8;
            boss.hp = boss.maxHp;
            boss.speed *= 1.6;
            boss.knockbackResist = 0.1; // Vulnerable if caught
        } else if (boss.type === 'TORNADO_MACHINA') {
            boss.color = '#1abc9c'; // Turquoise/Green
            boss.radius = 70;
            boss.maxHp *= 1.2;
            boss.hp = boss.maxHp;
            boss.speed *= 0.8;
            boss.tornadoTimer = 0;
        } else if (boss.type === 'TEMP_EST') {
            boss.color = '#8e44ad'; // Purple/Storm
            boss.radius = 90;
            boss.maxHp *= 2.5; // Final Boss
            boss.hp = boss.maxHp;
            boss.speed *= 1.2;
            boss.knockbackResist = 0.8;
            boss.phase = 1;
        }
    }

    static update(boss, player, arena) {
        // Generic movement toward player unless specified
        const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);

        if (boss.type === 'CLOUD_GOLEM') {
            // Slow relentless pursuit
            boss.x += Math.cos(angle) * boss.speed;
            boss.y += Math.sin(angle) * boss.speed;

            // Gust Ability: Push player away every few seconds
            if (frame % 200 === 0) {
                if (typeof createExplosion === 'function') createExplosion(boss.x, boss.y, '#fff');
                const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
                player.vx += Math.cos(pushAngle) * 20;
                player.vy += Math.sin(pushAngle) * 20;
                if (typeof showNotification === 'function') showNotification("GUST!");
            }

        } else if (boss.type === 'STORM_CROW') {
            // Swoop and Retreat
            if (!boss.state || boss.state === 'HOVER') {
                // Hover at distance
                const hoverDist = 300;
                const targetX = player.x - Math.cos(angle) * hoverDist;
                const targetY = player.y - Math.sin(angle) * hoverDist;

                boss.x += (targetX - boss.x) * 0.05;
                boss.y += (targetY - boss.y) * 0.05;

                if (frame % 120 === 0) {
                    boss.state = 'DIVE';
                    boss.targetX = player.x;
                    boss.targetY = player.y;
                    if (typeof audioManager !== 'undefined') audioManager.play('boss_rhino_charge');
                }
            } else if (boss.state === 'DIVE') {
                const diveAngle = Math.atan2(boss.targetY - boss.y, boss.targetX - boss.x);
                boss.x += Math.cos(diveAngle) * (boss.speed * 4);
                boss.y += Math.sin(diveAngle) * (boss.speed * 4);

                if (Math.hypot(boss.targetX - boss.x, boss.targetY - boss.y) < 20) {
                    boss.state = 'HOVER';
                }
            }

        } else if (boss.type === 'TORNADO_MACHINA') {
            // Move to center-ish and spin
            boss.x += Math.cos(angle) * boss.speed;
            boss.y += Math.sin(angle) * boss.speed;

            boss.tornadoTimer = (boss.tornadoTimer || 0) + 1;
            if (boss.tornadoTimer > 180) {
                boss.tornadoTimer = 0;
                // Spawn Stationary Tornado (Projectile that lasts long)
                for (let i = 0; i < 3; i++) {
                    const a = (Math.PI * 2 / 3) * i + frame * 0.1;
                    const p = new Projectile(boss.x, boss.y, { x: Math.cos(a), y: Math.sin(a) }, 10, '#1abc9c', 20, 'enemy', 0, true);
                    p.life = 600; // 10 seconds
                    // Custom update for tornado behavior?
                    p.update = function () {
                        this.angle = (this.angle || 0) + 0.1; // Spin visual
                        // Spiral out slowly
                        this.x += this.vx;
                        this.y += this.vy;
                        this.vx *= 1.01;
                        this.vy *= 1.01;
                    };
                    projectiles.push(p);
                }
            }

        } else if (boss.type === 'TEMP_EST') {
            // Moves fast, shoots lightning
            boss.x += Math.cos(angle) * boss.speed;
            boss.y += Math.sin(angle) * boss.speed;

            if (boss.attackCooldown <= 0) {
                // Lightning Strike
                const px = player.x;
                const py = player.y;
                // Telegraph
                if (ctx) {
                    // visual handled in draw typically, but we can spawn a delayed projectile?
                    // Let's spawn an instant projectile
                    projectiles.push(new Projectile(boss.x, boss.y, { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 }, boss.damage, '#8e44ad', 10, 'enemy', 0, true));
                }
                boss.attackCooldown = 40;
            } else {
                boss.attackCooldown--;
            }

            if (boss.phase === 1 && boss.hp < boss.maxHp * 0.5) {
                boss.phase = 2;
                if (typeof showNotification === 'function') showNotification("THE EYE OF THE STORM!");
                boss.speed *= 1.5;
                // Spawn minions
                for (let i = 0; i < 4; i++) enemies.push(new Enemy(true)); // Random elites
            }
        }
    }
    static draw(ctx, boss) {
        ctx.save();
        ctx.translate(boss.x, boss.y);

        if (boss.type === 'CLOUD_GOLEM') {
            // Puffy Cloud Body
            ctx.fillStyle = '#bdc3c7'; // Shadowy white
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i + frame * 0.02;
                const r = boss.radius * 0.6;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                ctx.arc(x, y, boss.radius * 0.5, 0, Math.PI * 2);
            }
            ctx.fill();

            // Core
            ctx.fillStyle = '#ecf0f1'; // White
            ctx.beginPath();
            ctx.arc(0, 0, boss.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(-20, -10, 8, 0, Math.PI * 2);
            ctx.arc(20, -10, 8, 0, Math.PI * 2);
            ctx.fill();

        } else if (boss.type === 'STORM_CROW') {
            // Bird Shape
            ctx.rotate(Math.atan2(player.y - boss.y, player.x - boss.x) + Math.PI / 2);

            ctx.fillStyle = boss.color;
            ctx.beginPath();
            ctx.moveTo(0, -40); // Beak/Head
            ctx.lineTo(30, 20); // Right Wing
            ctx.lineTo(0, 40);  // Tail
            ctx.lineTo(-30, 20); // Left Wing
            ctx.closePath();
            ctx.fill();

            // Wings Flap
            const flap = Math.sin(frame * 0.2) * 20;
            ctx.fillStyle = '#34495e';
            ctx.beginPath();
            ctx.moveTo(30, 20);
            ctx.lineTo(60, 20 + flap);
            ctx.lineTo(30, 40);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-30, 20);
            ctx.lineTo(-60, 20 + flap);
            ctx.lineTo(-30, 40);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#f1c40f'; // Yellow eyes
            ctx.beginPath();
            ctx.arc(-10, -10, 4, 0, Math.PI * 2);
            ctx.arc(10, -10, 4, 0, Math.PI * 2);
            ctx.fill();

        } else if (boss.type === 'TORNADO_MACHINA') {
            // Rotate the whole body
            ctx.rotate(frame * 0.1);

            // Metallic Segments
            ctx.strokeStyle = '#1abc9c';
            ctx.lineWidth = 4;

            for (let i = 3; i > 0; i--) {
                ctx.beginPath();
                ctx.arc(0, 0, boss.radius * (i / 3), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(26, 188, 156, ${0.2 + (i * 0.2)})`;
                ctx.fill();
                ctx.stroke();
            }

            // Blades
            ctx.fillStyle = '#16a085';
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((Math.PI / 2) * i);
                ctx.beginPath();
                ctx.moveTo(boss.radius, -10);
                ctx.lineTo(boss.radius + 30, 0);
                ctx.lineTo(boss.radius, 10);
                ctx.fill();
                ctx.restore();
            }

        } else if (boss.type === 'TEMP_EST') {
            // Chaotic Storm Core
            ctx.fillStyle = '#8e44ad';
            ctx.beginPath();
            ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
            ctx.fill();

            // Lightning Arcs
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            if (frame % 5 === 0) {
                // Flashy arcs around
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const dis = boss.radius + Math.random() * 20;
                    ctx.moveTo(Math.cos(a) * boss.radius, Math.sin(a) * boss.radius);
                    ctx.lineTo(Math.cos(a) * dis, Math.sin(a) * dis);
                }
                ctx.stroke();
            }

            // Eye of the Storm
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            // ctx.fillText("?", 0, 4); 
        }

        // Hit Flash
        if (boss.hitFlash > 0) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = `rgba(255, 255, 255, ${boss.hitFlash / 10})`;
            ctx.fillRect(-100, -100, 200, 200);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }
}
