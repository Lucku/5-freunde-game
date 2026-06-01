// Fortune Enemies
// Unique enemies for Faith of Fortune DLC

import { Projectile } from '../../Entities/Projectile.js';

/*
  MADNESS ENEMIES
  Theme: Glitches, Reality distortion, 4th wall breaking, Chaos.
*/

class GlitchEnemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 80;
        this.maxHp = 80;
        this.speed = 2; // Baseline logic
        this.color = "#ff00ff";
        this.size = 20;
        this.type = 'GLITCH';
        this.name = "Fatal Exception";
        
        // Madness Props
        this.teleportTimer = 0;
        this.teleportThreshold = 120;
        // Card Nerf: Glitch Teleport Nerf
        if (typeof saveData !== 'undefined' && saveData.collection && saveData.collection.includes('GLITCH_4')) {
            this.teleportThreshold = 240;
        }
        this.glitchOffset = {x:0, y:0};
    }

    update(player) {
        // 1. Erratic Movement (Jittery)
        if (window.frame % 3 === 0) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            // Add noise to angle
            const noisyAngle = angle + (Math.random() - 0.5) * 1.5; 
            this.x += Math.cos(noisyAngle) * this.speed * 4; // Moves in bursts
            this.y += Math.sin(noisyAngle) * this.speed * 4;
        }

        // 2. Teleport (Packet Loss)
        this.teleportTimer++;
        if (this.teleportTimer > this.teleportThreshold && Math.random() < 0.05) {
             this.x += (Math.random() - 0.5) * 300;
             this.y += (Math.random() - 0.5) * 300;
             this.teleportTimer = 0;
             // Audio glitch
             if (typeof audioManager !== 'undefined') audioManager.play('dash'); 
        }

        // 3. Visual Glitch Offset
        this.glitchOffset.x = (Math.random() - 0.5) * 10;
        this.glitchOffset.y = (Math.random() - 0.5) * 10;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.glitchOffset.x, this.y + this.glitchOffset.y);
        
        // Draw corrupt sprites
        ctx.fillStyle = this.color;
        // Random dimensions every frame
        const w = this.size + (Math.random() * 10 - 5);
        const h = this.size + (Math.random() * 10 - 5);
        ctx.fillRect(-w/2, -h/2, w, h);
        
        // Artifacts
        ctx.fillStyle = "#00ff00"; // Green artifacts
        ctx.fillRect((Math.random()-0.5)*w, (Math.random()-0.5)*h, 5, 5);
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect((Math.random()-0.5)*w, (Math.random()-0.5)*h, 2, 20);

        ctx.restore();
    }
}

class RNGTurret {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 150; 
        this.size = 30;
        this.color = "#ff0000";
        this.type = 'TURRET';
        this.name = "RNGesus";
        this.shootTimer = 0;
        this.shootInterval = 60;
        
        // Card Nerf: Turret Fire Speed
        if (typeof saveData !== 'undefined' && saveData.collection && saveData.collection.includes('TURRET_4')) {
            this.shootInterval = 120; // 50% slower -> 2x interval
        }
    }

    update(player) {
        // Slow drift
        this.x += Math.sin(window.frame * 0.05);
        this.y += Math.cos(window.frame * 0.03);

        this.shootTimer++;
        if (this.shootTimer > this.shootInterval) {
            this.shoot(player);
            this.shootTimer = 0;
        }
    }

    shoot(player) {
        // Shoots random geometric shapes with different behaviors.
        // Spawned through the ECS Projectile pool (custom per-projectile state
        // lives in `_`-prefixed extras; movement uses `velocity`).
        const r = Math.random();

        if (typeof Projectile === 'undefined') return;

        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        if (r < 0.33) {
            // TYPE 1: The "Homing Error" (Blue Screen)
            const p = Projectile.acquire(this.x, this.y, { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }, 15, '#0000ff', 7, 'enemy', 0, true);
            p.life = 200;
            p.update = function () {
                // Homing — redirect occasionally
                if (Math.random() < 0.1) {
                    const a2 = Math.atan2(player.y - this.y, player.x - this.x);
                    this.velocity.x = Math.cos(a2) * 5;
                    this.velocity.y = Math.sin(a2) * 5;
                }
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.life--;
            };
            p.draw = function () {
                window.ctx.fillStyle = '#0000ff';
                window.ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
                window.ctx.fillStyle = '#fff';
                window.ctx.fillText(':(', this.x - 4, this.y + 3);
            };
        } else if (r < 0.66) {
            // TYPE 2: The "Sine Wave of Doom"
            const p = Projectile.acquire(this.x, this.y, { x: 0, y: 0 }, 15, '#ffff00', 6, 'enemy', 0, true);
            p.life = 200;
            p._baseAngle = angle;
            p._speed = 4;
            p._t = 0;
            p.update = function () {
                this._t += 0.2;
                const perp = this._baseAngle + Math.PI / 2;
                const wave = Math.sin(this._t) * 3;
                this.x += Math.cos(this._baseAngle) * this._speed + Math.cos(perp) * wave;
                this.y += Math.sin(this._baseAngle) * this._speed + Math.sin(perp) * wave;
                this.life--;
            };
            p.draw = function () {
                window.ctx.fillStyle = '#ffff00';
                window.ctx.beginPath();
                window.ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
                window.ctx.fill();
            };
        } else {
            // TYPE 3: "Lag Spike" (Stops then dashes)
            const p = Projectile.acquire(this.x, this.y, { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 }, 15, '#ffaa00', 6, 'enemy', 0, true);
            p.life = 200;
            p._state = 0; // 0: Move, 1: Stop, 2: Dash
            p._timer = 0;
            p.update = function () {
                this._timer++;
                if (this._state === 0) {
                    this.x += this.velocity.x;
                    this.y += this.velocity.y;
                    if (this._timer > 20) { this._state = 1; this._timer = 0; }
                } else if (this._state === 1) {
                    // Frozen, then re-aim and dash
                    if (this._timer > 30) {
                        this._state = 2;
                        const a3 = Math.atan2(player.y - this.y, player.x - this.x);
                        this.velocity.x = Math.cos(a3) * 15;
                        this.velocity.y = Math.sin(a3) * 15;
                    }
                } else {
                    this.x += this.velocity.x;
                    this.y += this.velocity.y;
                }
                this.life--;
            };
            p.draw = function () {
                window.ctx.fillStyle = this._state === 1 ? '#ff0000' : '#ffaa00';
                window.ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
            };
        }
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(window.frame * 0.1);
        ctx.fillStyle = this.color;
        // Draw Triangle
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-10, -10);
        ctx.fill();
        ctx.restore();
    }
}

// Register
if (typeof window.FORTUNE_ENEMIES === 'undefined') window.FORTUNE_ENEMIES = {};
window.FORTUNE_ENEMIES['glitch'] = GlitchEnemy;
window.FORTUNE_ENEMIES['rng_turret'] = RNGTurret;
