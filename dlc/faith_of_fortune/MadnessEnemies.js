// Fortune Enemies
// Unique enemies for Faith of Fortune DLC

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
        if (this.teleportTimer > 120 && Math.random() < 0.05) {
             this.x += (Math.random() - 0.5) * 300;
             this.y += (Math.random() - 0.5) * 300;
             this.teleportTimer = 0;
             // Audio glitch
             if (typeof audioManager !== 'undefined') audioManager.play('menu_click'); 
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
    }

    update(player) {
        // Slow drift
        this.x += Math.sin(window.frame * 0.05);
        this.y += Math.cos(window.frame * 0.03);

        this.shootTimer++;
        if (this.shootTimer > 60) {
            this.shoot(player);
            this.shootTimer = 0;
        }
    }

    shoot(player) {
        // Shoots random geometric shapes with different behaviors
        const r = Math.random();
        
        if (typeof enemyProjectiles === 'undefined') return;

        let projectile = {
            x: this.x,
            y: this.y,
            life: 200,
            dmg: 15,
            color: "#fff",
            update: () => {},
            draw: () => {}
        };

        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        if (r < 0.33) {
            // TYPE 1: The "Homing Error" (Blue Screen)
            projectile.vx = Math.cos(angle) * 3;
            projectile.vy = Math.sin(angle) * 3;
            projectile.color = "#0000ff";
            projectile.update = function() {
                // Homing
                if (Math.random() < 0.1) { // Redirect occasionally
                     const a2 = Math.atan2(player.y - this.y, player.x - this.x);
                     this.vx = Math.cos(a2) * 5;
                     this.vy = Math.sin(a2) * 5;
                }
                this.x += this.vx; 
                this.y += this.vy;
                this.life--;
            };
            projectile.draw = function() {
                 window.ctx.fillStyle = this.color;
                 window.ctx.fillRect(this.x-5, this.y-5, 10, 10);
                 window.ctx.fillStyle = "#fff";
                 window.ctx.fillText(":(" , this.x-4, this.y+3);
            };
        } 
        else if (r < 0.66) {
             // TYPE 2: The "Sine Wave of Doom"
            projectile.baseAngle = angle;
            projectile.speed = 4;
            projectile.t = 0;
            projectile.update = function() {
                this.t += 0.2;
                const perp = this.baseAngle + Math.PI/2;
                const wave = Math.sin(this.t) * 3;
                
                this.x += Math.cos(this.baseAngle) * this.speed + Math.cos(perp) * wave;
                this.y += Math.sin(this.baseAngle) * this.speed + Math.sin(perp) * wave;
                this.life--;
            };
            projectile.draw = function() {
                window.ctx.fillStyle = "#ffff00"; // Yellow
                window.ctx.beginPath();
                window.ctx.arc(this.x, this.y, 6, 0, Math.PI*2);
                window.ctx.fill();
            }
        } 
        else {
            // TYPE 3: "Lag Spike" (Stops then dashes)
            projectile.vx = Math.cos(angle) * 10;
            projectile.vy = Math.sin(angle) * 10;
            projectile.state = 0; // 0: Move, 1: Stop, 2: Dash
            projectile.timer = 0;
            projectile.update = function() {
                this.timer++;
                if (this.state === 0) {
                     this.x += this.vx; 
                     this.y += this.vy;
                     if (this.timer > 20) { this.state = 1; this.timer = 0; }
                } else if (this.state === 1) {
                    // Frozen
                    if (this.timer > 30) { 
                        this.state = 2; 
                        // Re-aim
                        const a3 = Math.atan2(player.y - this.y, player.x - this.x);
                        this.vx = Math.cos(a3) * 15; // Fast!
                        this.vy = Math.sin(a3) * 15;
                    }
                } else {
                    this.x += this.vx;
                    this.y += this.vy;
                }
                this.life--;
            };
            projectile.draw = function() {
                 window.ctx.fillStyle = this.state === 1 ? "#ff0000" : "#ffaa00";
                 window.ctx.fillRect(this.x-4, this.y-4, 8, 8);
            }
        }

        enemyProjectiles.push(projectile);
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
