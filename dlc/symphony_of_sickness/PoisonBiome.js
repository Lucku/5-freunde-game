class PoisonBiome {
    constructor() {
        this.name = "Poison";
        this.color = "#76ff03"; // Toxic Green
    }

    generate(arena) {
        // Toxic Bog has Sludge Pits and Gas Vents
    }

    update(arena, player, enemies) {
        // --- POISON FLASK SPAWNING ---
        // Only spawn if player is Poison Hero (mechanic requirement) or if we want anyone to see them (flavor)
        // Prompt says "in his biome there should be ... poison flasks"
        // Let's spawn them globally in this biome, but only he can pick them up or they do nothing for others.
        
        if (Math.random() < 0.005) { // 0.5% chance per frame (~1 every 3s)
            // Cap max flasks on ground
            const count = arena.obstacles.filter(o => o instanceof PoisonFlask).length;
            if (count < 5) { // "Only a few flasks are available"
                const x = Math.random() * (arena.width - 100) + 50;
                const y = Math.random() * (arena.height - 100) + 50;
                // Only spawn in safe spot
                if (!arena.checkCollision(x, y, 20)) {
                    arena.obstacles.push(new PoisonFlask(x, y));
                }
            }
        }
    }

    drawBackground(ctx, arena) {
        // Visual Style: Toxic Bog - Distinct Green tint, Bubbles, Slime Trails

        const cam = arena.camera;
        const cellSize = 300; // Smaller grid for more density

        const sx = Math.floor(cam.x / cellSize) * cellSize;
        const sy = Math.floor(cam.y / cellSize) * cellSize;
        const ex = sx + cam.width + cellSize;
        const ey = sy + cam.height + cellSize;

        const time = Date.now() / 1000;

        ctx.save();

        // Distinct global green tint
        ctx.fillStyle = "rgba(100, 221, 23, 0.1)"; // Light Green overlay
        ctx.fillRect(cam.x, cam.y, cam.width, cam.height);

        for (let x = sx; x <= ex; x += cellSize) {
            for (let y = sy; y <= ey; y += cellSize) {
                // Procedural generation based on coords
                const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
                const val = hash - Math.floor(hash);

                // 1. Poison Pools (Bubbling)
                if (val > 0.4) {
                    const cx = x + (val * 1337) % cellSize;
                    const cy = y + (val * 7331) % cellSize;

                    // Animate size slightly
                    const pulse = Math.sin(time + val * 10) * 5;
                    const radius = 20 + val * 30 + pulse;

                    // Pool
                    ctx.fillStyle = "rgba(51, 105, 30, 0.2)"; // Dark Green Sludge
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();

                    // Bubbles
                    if (Math.sin(time * 3 + val * 20) > 0.5) {
                        ctx.fillStyle = "rgba(174, 234, 0, 0.6)"; // Bright Lime Bubble
                        ctx.beginPath();
                        ctx.arc(cx + Math.cos(time) * 10, cy + Math.sin(time) * 10, 5 + val * 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // 2. Dead Vegetation / Spikes
                if (val < 0.3) {
                    const cx = x + (val * 9999) % cellSize;
                    const cy = y + (val * 8888) % cellSize;

                    ctx.strokeStyle = "#5d4037"; // Dark brown
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';

                    ctx.beginPath();
                    // Basic thorn shape
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx - 10, cy - 20);
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + 15, cy - 25);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    update(arena, player, enemies) {
        // --- POISON FLASK LOGIC ---
        // 1. Spawning
        if (Math.random() < 0.002) { // Low spawn rate
            // Cap flasks
            const flasks = arena.obstacles.filter(o => o instanceof PoisonFlask);
            if (flasks.length < 3) { // Max 3 on map
               const x = Math.random() * (arena.width - 100) + 50;
               const y = Math.random() * (arena.height - 100) + 50;
               if(!arena.checkCollision(x, y, 30)) {
                   arena.obstacles.push(new PoisonFlask(x, y));
               }
            }
        }

        // 2. Collision / Update existing flasks (Since they are in obstacles array, Arena draws them, but we need to update logic)
        // Wait, Arena obstacles are usually static blocks. If we add dynamic entities there, we need to ensure they are updated.
        // Arena.update calls objects if they have update? No, usually not.
        // Let's manually manage them here to be safe.
        
        for (let i = arena.obstacles.length - 1; i >= 0; i--) {
            const obs = arena.obstacles[i];
            if (obs instanceof PoisonFlask) {
                obs.update();
                if (obs.checkCollision(player) || obs.life <= 0) {
                    arena.obstacles.splice(i, 1);
                }
            }
        }

        // Biome Effects
        // Check if player is in a Sludge Zone

        // Assuming arena.biomeZones exists and is populated

        if (arena.biomeZones) {
            arena.biomeZones.forEach(zone => {
                if (zone.type === 'SLUDGE') {
                    // Check intersection
                    if (player.x > zone.x && player.x < zone.x + zone.w &&
                        player.y > zone.y && player.y < zone.y + zone.h) {

                        // Poison Hero is immune and maybe healed?
                        if (player.type === 'poison') {
                            if (window.frame % 60 === 0) player.hp = Math.min(player.maxHp, player.hp + 1);
                        } else {
                            // Others slowed
                            player.speedMultiplier = (player.speedMultiplier || 1) * 0.7;
                            // And damaged?
                            if (window.frame % 60 === 0) {
                                player.hp -= 1;
                                if (typeof createDamageNumber === 'function') createDamageNumber(player.x, player.y, 1, "#81c784");
                            }
                        }
                    }
                }
            });
        }
    }
}

// Register
if (typeof window.BIOME_LOGIC === 'undefined') window.BIOME_LOGIC = {};
window.BIOME_LOGIC['poison'] = new PoisonBiome();
// Also register as match for LEVEL_CONFIG key
window.BIOME_LOGIC['POISON_SWAMP'] = window.BIOME_LOGIC['poison'];

// --- ENTITIES ---
class PoisonFlask {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        this.w = 30; // Hitbox width
        this.h = 30;
        this.radius = 15;
        
        const types = ['RED', 'BLUE', 'GREEN'];
        this.type = types[Math.floor(Math.random() * types.length)];
        
        this.life = 1200; // Disappear after 20s if not picked up
        this.bobOffset = Math.random() * Math.PI;
    }

    update() {
        this.life--;
    }

    draw(ctx) {
        // Bobbing animation
        const bob = Math.sin((Date.now() / 200) + this.bobOffset) * 5;
        const drawY = this.y + bob;

        ctx.save();
        
        // Flask Shape
        let color = '#fff';
        if (this.type === 'RED') color = '#e74c3c';
        if (this.type === 'BLUE') color = '#3498db';
        if (this.type === 'GREEN') color = '#76ff03';

        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Bottle body
        ctx.beginPath();
        ctx.arc(this.x, drawY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bottle neck
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 4, drawY - 15, 8, 8);

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.x - 3, drawY - 3, 3, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    // Called by Arena collision loop if implemented, otherwise we check in update loop
    checkCollision(player) {
         if (player.type !== 'poison') return false; // Only Poison Hero can use them
         
         const dist = Math.hypot(player.x - this.x, player.y - this.y);
         if (dist < player.radius + this.radius) {
             // Pick up
             if (player.poisonFlasks) {
                 player.poisonFlasks.push(this.type);
                 if (player.poisonFlasks.length > 2) {
                     player.poisonFlasks.shift(); // Remove oldest (FIFO)
                 }
                 if (typeof playSound === 'function') playSound('potion_pickup');
                 if (typeof showNotification === 'function') showNotification(`Got ${this.type} Flask!`, '#fff');
             }
             return true; // Destroy me
         }
         return false;
    }
}

