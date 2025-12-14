class Companion {
    constructor(type, player) {
        this.type = type;
        this.player = player;
        this.x = player.x;
        this.y = player.y;
        this.radius = 15;
        this.speed = player.speed * 0.9;
        this.angle = 0;
        this.distance = 60; // Distance to hover from player
        this.attackCooldown = 0;
        this.attackMaxCooldown = 120; // Attacks every 2 seconds
        this.active = true;
        this.color = this.getColorByType(type);
    }

    getColorByType(type) {
        switch (type) {
            case 'fire': return '#e74c3c';
            case 'ice': return '#3498db';
            case 'plant': return '#2ecc71';
            case 'metal': return '#95a5a6';
            case 'water': return '#2980b9';
            default: return '#ffffff';
        }
    }

    update() {
        if (!this.active) return;

        // Orbit/Follow Logic
        // Calculate target position (orbiting the player)
        this.angle += 0.02;
        const targetX = this.player.x + Math.cos(this.angle) * this.distance;
        const targetY = this.player.y + Math.sin(this.angle) * this.distance;

        // Move towards target position
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        this.x += dx * 0.1;
        this.y += dy * 0.1;

        // Attack Logic
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        } else {
            this.performSynergy();
            this.attackCooldown = this.attackMaxCooldown;
        }
    }

    performSynergy() {
        // Find nearest enemy
        let nearest = null;
        let minDist = 400; // Range

        enemies.forEach(e => {
            const d = Math.hypot(e.x - this.x, e.y - this.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        });

        if (nearest) {
            // Visual beam to enemy
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(nearest.x, nearest.y);
            ctx.stroke();
            ctx.restore();

            // Apply Effect
            this.applyEffect(nearest);
        } else if (this.type === 'plant') {
            // Plant heals player if no enemies nearby (or always?)
            // User said: "Plant friend drops in, healing you while you tank the damage."
            // Let's make Plant heal periodically regardless of enemies, or maybe target player.
            this.applyEffect(this.player);
        }
    }

    applyEffect(target) {
        // Synergy Logic
        // If Player is Ice, Companion is Fire -> Thermal Shock
        if (this.type === 'fire' && this.player.type === 'ice') {
            // Thermal Shock: High Damage to frozen enemies
            if (target.frozenTimer > 0) {
                createDamageNumber(target.x, target.y, 50, '#e74c3c');
                target.hp -= 50;
                target.frozenTimer = 0; // Melt
            } else {
                createDamageNumber(target.x, target.y, 10, '#e74c3c');
                target.hp -= 10;
            }
        }
        // If Player is Metal, Companion is Plant -> Healing
        else if (this.type === 'plant' && this.player.type === 'metal') {
            if (target === this.player) {
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 5, this.player.maxHp);
                    createDamageNumber(this.player.x, this.player.y, 5, '#2ecc71'); // Green number for heal
                }
            }
        }
        // Generic Attacks for other combos
        else {
            if (target !== this.player) {
                target.hp -= 15;
                createDamageNumber(target.x, target.y, 15, this.color);
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = 0.6; // Ghostly/Holographic

        // Tether to player
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.player.x, this.player.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Companion
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();

        ctx.restore();
    }
}
