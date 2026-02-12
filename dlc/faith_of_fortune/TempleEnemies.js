// Temple Enemies
// Unique enemies for Faith of Fortune DLC (Temple Biome)

/* 
  TEMPLE ENEMIES
  Theme: Balance, Reflection, Monks, Guardians.
*/

class TempleGuardian {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 200; // Tanky
        this.maxHp = 200;
        this.speed = 1.5;
        this.color = "#F0D080";
        this.size = 25;
        this.type = 'GUARDIAN';
        this.name = "Ivory Guardian";
        this.shieldActive = true;
        this.shieldTimer = 0;
        
        // Card Nerf: No Shields
        if (typeof saveData !== 'undefined' && saveData.collection && saveData.collection.includes('GUARDIAN_4')) {
            this.shieldActive = false; // Start disabled
            this.shieldsDisabled = true; // Permanent flag
        } else {
            this.shieldsDisabled = false;
        }
    }

    update(player) {
        // Movement: Slow and steady pursuit
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Shield Logic
        // Periodically brings up a shield that reflects projectiles? 
        // Or just high defense.

        this.shieldTimer++;
        if (!this.shieldsDisabled) {
            if (this.shieldTimer > 300) { // Every 5 seconds, toggle shield
                this.shieldActive = !this.shieldActive;
                this.shieldTimer = 0;
            }
        } else {
            this.shieldActive = false;
        }
    }

    takeDamage(amount) {
        // Reduced damage if shield is active
        if (this.shieldActive) {
            this.hp -= amount * 0.2;
            // Visual feedback for block
            if (typeof createTextEffect !== 'undefined') createTextEffect(this.x, this.y - 20, "BLOCKED", "#fff");
        } else {
            this.hp -= amount;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.shieldActive) {
            // Draw Shield Aura
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(240, 208, 128, ${0.5 + Math.sin(window.frame * 0.1) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Body (Statue-like)
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // Face
        ctx.fillStyle = "#000";
        ctx.fillRect(-5, -5, 10, 2); // Eyes

        ctx.restore();
    }
}

class SpiritMonk {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 60;
        this.maxHp = 60;
        this.speed = 3;
        this.color = "#e6c200";
        this.size = 15;
        this.type = 'MONK';
        this.name = "Silent Monk";
        this.state = 'MEDITATE'; // MEDITATE, CHASE
        this.timer = 0;

        // Card Nerf: No Healing
        this.healingDisabled = false;
        if (typeof saveData !== 'undefined' && saveData.collection && saveData.collection.includes('MONK_4')) {
            this.healingDisabled = true;
        }
    }

    update(player) {
        this.timer++;

        if (this.state === 'MEDITATE') {
            // Regeneration / Buffing allies if we had that logic
            if (!this.healingDisabled && this.hp < this.maxHp) this.hp += 0.1;

            // Switch to Attack if close or random
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 150 || this.timer > 120) {
                this.state = 'ATTACK';
                this.timer = 0;
            }
        }
        else if (this.state === 'ATTACK') {
            // Dash Attack logic
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed * 1.5; // Fast burst
            this.y += Math.sin(angle) * this.speed * 1.5;

            if (this.timer > 60) {
                this.state = 'MEDITATE';
                this.timer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Headband
        ctx.fillStyle = "#fff";
        ctx.fillRect(-this.size, -5, this.size * 2, 3);

        if (this.state === 'MEDITATE') {
            ctx.strokeStyle = "#fff";
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2); // Halo
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Register
if (typeof window.FORTUNE_ENEMIES === 'undefined') window.FORTUNE_ENEMIES = {};
window.FORTUNE_ENEMIES['temple_guardian'] = TempleGuardian;
window.FORTUNE_ENEMIES['spirit_monk'] = SpiritMonk;
