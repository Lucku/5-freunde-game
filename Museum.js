const MUSEUM_DIALOGUES = {
    fire: ["Is it hot in here, or is it just me?", "I remember the burning fields...", "My flames will never be extinguished!", "Do you have a lighter?", "Chaos is just energy in disguise."],
    water: ["The flow of time is like a river...", "Stay hydrated.", "I miss the ocean waves.", "Calm yourself, friend.", "Water adapts to any vessel."],
    ice: ["Cool it.", "Preservation is key.", "The cold never bothered me anyway.", "Stay frosty.", "Time freezes for no one."],
    plant: ["Nature always finds a way.", "Photosynthesis is underrated.", "Let's put down some roots.", "Growth requires patience.", "I speak for the trees."],
    metal: ["Efficiency is my middle name.", "Steel wins battles.", "I am unbreakable.", "Clink, clank.", "Upgrade complete."],
    bg: ["Welcome to the Hall of Memories.", "Silence is golden.", "Don't touch the artifacts!", "Admire the history.", "Shh..."]
};

class Museum {
    constructor() {
        this.width = 2400;
        this.height = 1800;
        this.camera = { x: 0, y: 0, width: canvas.width, height: canvas.height };
        this.entities = [];
        this.walls = [];
        this.rooms = [];
        this.artifacts = [];
        this.cards = [];
        this.decorations = []; // New Decorations Array
        this.scrollY = 0;
        this.activeDialogue = null; // { text: "...", x: 0, y: 0, timer: 0 }

        // Player Avatar in Museum (defaults to selected hero)
        this.player = { x: 1200, y: 1600, radius: 20, speed: 5, type: selectedHeroType, angle: 0 };

        this.generateLayout();
        this.generateDecorations(); // Generate Decorations
        this.generateTrophies(); // Generate Trophies
        this.spawnEntities();
    }

    generateLayout() {
        // Define Rooms
        // Main Hall: 800, 1200 to 1600, 1800 (Entrance)
        // Central Hub: 800, 800 to 1600, 1200
        // Hero Rooms: Top (3), Left (1), Right (1)
        // Gallery: Bottom Left/Right or separate wing? 
        // Let's make a cross shape with extra rooms.

        // Walls (x, y, w, h)
        this.walls = [
            // Outer Boundary
            { x: 0, y: 0, w: 2400, h: 50 }, // Top
            { x: 0, y: 1750, w: 2400, h: 50 }, // Bottom
            { x: 0, y: 0, w: 50, h: 1800 }, // Left
            { x: 2350, y: 0, w: 50, h: 1800 }, // Right

            // Room Dividers
            // Horizontal Line at y=600 (Top Rooms)
            // Fire Room Door (Gap at 350-450)
            { x: 0, y: 600, w: 350, h: 50 },
            { x: 450, y: 600, w: 450, h: 50 }, // Ends at 900

            // Water Room Door (Gap at 900-1500) - Already exists as gap between 900 and 1500

            // Ice Room Door (Gap at 1950-2050)
            { x: 1500, y: 600, w: 450, h: 50 }, // Starts at 1500, ends at 1950
            { x: 2050, y: 600, w: 350, h: 50 }, // Starts at 2050, ends at 2400

            // Vertical Lines for Top Rooms (3 rooms: 0-800, 800-1600, 1600-2400)
            { x: 800, y: 0, w: 50, h: 600 },
            { x: 1600, y: 0, w: 50, h: 600 },

            // Central Hub Walls
            { x: 600, y: 600, w: 50, h: 600 }, // Left Hub Wall
            { x: 1750, y: 600, w: 50, h: 600 }, // Right Hub Wall
        ];

        // Define Zones for Logic/Decor
        this.rooms = [
            { name: 'fire', x: 50, y: 50, w: 750, h: 550, color: '#2c0b0b' },
            { name: 'water', x: 850, y: 50, w: 750, h: 550, color: '#0b1a2c' },
            { name: 'ice', x: 1650, y: 50, w: 700, h: 550, color: '#1a252a' },
            { name: 'plant', x: 50, y: 650, w: 550, h: 1100, color: '#0b2c14' }, // Left Wing
            { name: 'metal', x: 1800, y: 650, w: 550, h: 1100, color: '#1a1a1a' }, // Right Wing
            { name: 'gallery', x: 650, y: 650, w: 1100, h: 1100, color: '#84806bcc' } // Central/Main
        ];
    }

    generateDecorations() {
        this.decorations = [];

        this.rooms.forEach(room => {
            // 1. Rugs (Center of room)
            this.decorations.push({
                type: 'RUG',
                x: room.x + room.w / 2,
                y: room.y + room.h / 2,
                w: room.w * 0.8,
                h: room.h * 0.8,
                color: shadeColor(room.color, 10) // Slightly lighter than floor
            });

            // 2. Pillars (Corners, inset)
            const inset = 60;
            this.decorations.push({ type: 'PILLAR', x: room.x + inset, y: room.y + inset, color: shadeColor(room.color, -30) });
            this.decorations.push({ type: 'PILLAR', x: room.x + room.w - inset, y: room.y + inset, color: shadeColor(room.color, -30) });
            this.decorations.push({ type: 'PILLAR', x: room.x + inset, y: room.y + room.h - inset, color: shadeColor(room.color, -30) });
            this.decorations.push({ type: 'PILLAR', x: room.x + room.w - inset, y: room.y + room.h - inset, color: shadeColor(room.color, -30) });

            // 3. Specific Room Decor
            if (room.name === 'fire') {
                this.decorations.push({ type: 'FLAME', x: room.x + room.w / 2, y: room.y + 100 });
                this.decorations.push({ type: 'FLAME', x: room.x + 100, y: room.y + room.h / 2 });
                this.decorations.push({ type: 'FLAME', x: room.x + room.w - 100, y: room.y + room.h / 2 });
            } else if (room.name === 'water') {
                this.decorations.push({ type: 'FOUNTAIN', x: room.x + room.w / 2, y: room.y + room.h / 2 });
            } else if (room.name === 'plant') {
                this.decorations.push({ type: 'PLANT_POT', x: room.x + 100, y: room.y + 100 });
                this.decorations.push({ type: 'PLANT_POT', x: room.x + room.w - 100, y: room.y + 100 });
                this.decorations.push({ type: 'PLANT_POT', x: room.x + 100, y: room.y + room.h - 100 });
                this.decorations.push({ type: 'PLANT_POT', x: room.x + room.w - 100, y: room.y + room.h - 100 });
            }
        });

        // Hallway Benches
        this.decorations.push({ type: 'BENCH', x: 750, y: 1400, w: 30, h: 80, angle: 0 });
        this.decorations.push({ type: 'BENCH', x: 1620, y: 1400, w: 30, h: 80, angle: 0 });
    }

    generateTrophies() {
        // Trophies logic (Story, HighScore, Ultimate)
        const heroes = ['fire', 'water', 'ice', 'plant', 'metal'];

        // Find High Score Holder
        let highScoreHero = null;
        let maxScore = -1;
        heroes.forEach(h => {
            if (saveData[h] && saveData[h].highScore > maxScore && saveData[h].highScore > 0) {
                maxScore = saveData[h].highScore;
                highScoreHero = h;
            }
        });

        heroes.forEach(h => {
            const room = this.rooms.find(r => r.name === h);
            if (!room) return;

            // X positions along the back wall (y + 100)
            const trophyY = room.y + 80;
            let trophyX = room.x + 150;

            // 1. Story Trophy (Completed Story if maxWinPrestige exists)
            // Ideally check saveData.story.completed logic, but using maxWinPrestige check for now as proxy for winning a run
            if (saveData[h].maxWinPrestige !== undefined && saveData[h].maxWinPrestige >= 0) {
                this.artifacts.push({
                    type: 'TROPHY',
                    subtype: 'STORY',
                    x: trophyX,
                    y: trophyY,
                    text: 'Story Conqueror',
                    color: '#e67e22',
                    hero: h
                });
            }
            trophyX += 100;

            // 2. High Score Trophy (Unique to one hero)
            if (h === highScoreHero) {
                this.artifacts.push({
                    type: 'TROPHY',
                    subtype: 'HIGHSCORE',
                    x: trophyX,
                    y: trophyY,
                    text: 'Champion',
                    color: '#f1c40f',
                    hero: h
                });
            }
            trophyX += 100;

            // 3. Ultimate Trophy (All Altar Items)
            if (typeof ALTAR_TREE !== 'undefined' && ALTAR_TREE[h]) {
                const totalItems = ALTAR_TREE[h].length;
                const unlockedItems = saveData.altar.active.filter(id => ALTAR_TREE[h].find(item => item.id === id)).length;

                if (unlockedItems >= totalItems) {
                    this.artifacts.push({
                        type: 'TROPHY',
                        subtype: 'ULTIMATE',
                        x: trophyX,
                        y: trophyY,
                        text: 'Master of Elements',
                        color: '#9b59b6',
                        hero: h
                    });
                }
            }
        });

        // 4. 100% Completion Trophy (Center of Gallery)
        // Check if CompletionMenu class is available
        if (typeof CompletionMenu !== 'undefined') {
            const tempMenu = new CompletionMenu();
            if (tempMenu.calculateProgress) {
                try {
                    const progress = tempMenu.calculateProgress();
                    // Check logic: progress.total.percent >= 100
                    if (progress.total && progress.total.percent >= 99.9) {
                        const gallery = this.rooms.find(r => r.name === 'gallery');
                        if (gallery) {
                            this.artifacts.push({
                                type: 'TROPHY',
                                subtype: 'PLATINUM',
                                x: gallery.x + gallery.w / 2,
                                y: gallery.y + gallery.h / 2,
                                text: 'THE 5 FRIENDS (100%)',
                                color: '#00ffff', // Cyan/Platinum
                                hero: 'all'
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error calculating progress for Museum trophy:", e);
                }
            }
        }
    }

    spawnEntities() {
        // Spawn Heroes in their rooms (Exclude current player)
        if (this.player.type !== 'fire') this.entities.push(new MuseumEntity(400, 300, 'fire', true));
        if (this.player.type !== 'water') this.entities.push(new MuseumEntity(1200, 300, 'water', true));
        if (this.player.type !== 'ice') this.entities.push(new MuseumEntity(2000, 300, 'ice', true));
        if (this.player.type !== 'plant') this.entities.push(new MuseumEntity(300, 1200, 'plant', true));
        if (this.player.type !== 'metal') this.entities.push(new MuseumEntity(2100, 1200, 'metal', true));

        // Spawn Collected Enemies in Gallery
        const collected = saveData.collection || [];
        collected.forEach((id, index) => {
            // Simple grid layout in Gallery
            const col = index % 10;
            const row = Math.floor(index / 10);
            const x = 700 + col * 100;
            const y = 800 + row * 100;

            // Parse ID to get type (e.g., "BASIC_1" -> "BASIC", "ELITE_AURA_SPEED_1" -> "ELITE_AURA_SPEED")
            const parts = id.split('_');
            parts.pop(); // Remove the number suffix
            const type = parts.join('_');
            this.entities.push(new MuseumEntity(x, y, type, false));
        });

        // Spawn Memory Displays
        if (saveData.memories) {
            const heroes = ['fire', 'water', 'ice', 'plant', 'metal'];
            heroes.forEach(h => {
                let count = 0;
                if (Array.isArray(saveData.memories[h])) {
                    count = saveData.memories[h].length;
                } else {
                    count = saveData.memories[h] || 0;
                }

                if (count > 0) {
                    // Find room center
                    const room = this.rooms.find(r => r.name === h);
                    if (room) {
                        this.artifacts.push({
                            x: room.x + room.w / 2,
                            y: room.y + room.h - 50,
                            text: `Memories: ${count}`,
                            color: '#fff',
                            type: 'MEMORY',
                            hero: h
                        });
                    }
                }
            });

            // Special Black Memory in Gallery
            if (saveData.memories['black'] && Array.isArray(saveData.memories['black']) && saveData.memories['black'].length > 0) {
                const count = saveData.memories['black'].length;
                const room = this.rooms.find(r => r.name === 'gallery');
                if (room) {
                    this.artifacts.push({
                        x: room.x + room.w / 2,
                        y: room.y + 50, // Top of the gallery
                        text: `Shadows: ${count}`,
                        color: '#000',
                        type: 'MEMORY',
                        hero: 'black'
                    });
                }
            }

            // Special Makuta Memory in Gallery
            if (saveData.memories['makuta'] && Array.isArray(saveData.memories['makuta']) && saveData.memories['makuta'].length > 0) {
                const count = saveData.memories['makuta'].length;
                const room = this.rooms.find(r => r.name === 'gallery');
                if (room) {
                    this.artifacts.push({
                        x: room.x + room.w / 2,
                        y: room.y + room.h - 50, // Bottom of the gallery
                        text: `Darkness: ${count}`,
                        color: '#8e44ad',
                        type: 'MEMORY',
                        hero: 'makuta'
                    });
                }
            }
        }
    }

    update() {
        if (this.viewingStory) {
            if (keys['escape']) {
                this.viewingStory = null;
                this.scrollY = 0;
                keys['escape'] = false;
                if (audioManager.voice) {
                    audioManager.voice.pause(); // Stop voice when closing menu
                }
            }

            const gp = navigator.getGamepads()[0];
            if (gp && gp.buttons[1].pressed) {
                this.viewingStory = null;
                this.scrollY = 0;
                if (audioManager.voice) {
                    audioManager.voice.pause();
                }
            }

            // Init timer
            if (typeof this.scrollTimer === 'undefined') this.scrollTimer = 0;
            if (this.scrollTimer > 0) this.scrollTimer--;

            // Navigation
            if (this.scrollTimer <= 0) {
                const stories = MEMORY_STORIES[this.viewingStory] || [];
                if (keys['ArrowUp'] || keys['w'] || (gp && gp.axes[1] < -0.5)) {
                    this.selectedStoryIndex = Math.max(0, this.selectedStoryIndex - 1);
                    this.scrollTimer = 5;
                }
                if (keys['ArrowDown'] || keys['s'] || (gp && gp.axes[1] > 0.5)) {
                    this.selectedStoryIndex = Math.min(stories.length - 1, this.selectedStoryIndex + 1);
                    this.scrollTimer = 5;
                }

                // Play Audio
                if (keys['e'] || keys['p'] || (gp && gp.buttons[0].pressed) || (gp && gp.buttons[2].pressed)) { // A or X
                    const unlocked = saveData.memories[this.viewingStory];
                    let isOwned = false;
                    if (Array.isArray(unlocked)) isOwned = unlocked.includes(this.selectedStoryIndex);
                    else if (typeof unlocked === 'number') isOwned = this.selectedStoryIndex < unlocked;

                    if (isOwned && audioManager.hasVoice(this.viewingStory, this.selectedStoryIndex)) {
                        audioManager.playVoice(this.viewingStory, this.selectedStoryIndex);
                        this.scrollTimer = 30;
                    }
                }
            }

            // Auto-center scroll
            const targetY = 120 + this.selectedStoryIndex * 40;
            const screenCenter = 1800 / 2; // Fixed height logic, wait canvas is window size?
            // "this.height = 1800" but UI is drawn to canvas which is usually window/screen.
            // drawStory uses "canvas.height". Assuming global canvas context.
            // Let's use 450 (approx half of typical screen) or a fixed offset.
            // Actually, just center the selected item at Y=300 relative to screen.
            const desiredScroll = 300 - targetY;
            this.scrollY += (desiredScroll - this.scrollY) * 0.1;

            return;
        }

        // Move Player
        let dx = 0; let dy = 0;
        if (keys['ArrowUp'] || keys['w']) dy = -this.player.speed;
        if (keys['ArrowDown'] || keys['s']) dy = this.player.speed;
        if (keys['ArrowLeft'] || keys['a']) dx = -this.player.speed;
        if (keys['ArrowRight'] || keys['d']) dx = this.player.speed;

        // Exit with Escape
        if (keys['escape']) {
            setUIState('MENU');
            document.getElementById('menu-overlay').style.display = 'flex';
        }

        // Gamepad
        const gp = navigator.getGamepads()[0];
        if (gp) {
            if (Math.abs(gp.axes[0]) > 0.1) dx = gp.axes[0] * this.player.speed;
            if (Math.abs(gp.axes[1]) > 0.1) dy = gp.axes[1] * this.player.speed;

            // Exit with B
            if (gp.buttons[1].pressed) {
                setUIState('MENU');
                document.getElementById('menu-overlay').style.display = 'flex';
            }
        }

        // Update Rotation
        if (dx !== 0 || dy !== 0) {
            this.player.angle = Math.atan2(dy, dx);
        }

        // Collision with Walls
        const nextX = this.player.x + dx;
        const nextY = this.player.y + dy;
        if (!this.checkWallCollision(nextX, this.player.y)) this.player.x = nextX;
        if (!this.checkWallCollision(this.player.x, nextY)) this.player.y = nextY;

        // Update Camera
        this.camera.x = this.player.x - this.camera.width / 2;
        this.camera.y = this.player.y - this.camera.height / 2;

        // Clamp Camera
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.width - this.camera.width));
        this.camera.y = Math.max(0, Math.min(this.camera.y, this.height - this.camera.height));

        // Update Entities (Wander)
        this.entities.forEach(e => e.update(this.walls));

        // Update Dialogue
        if (this.activeDialogue) {
            this.activeDialogue.timer--;
            if (this.activeDialogue.timer <= 0) this.activeDialogue = null;
        }

        // Automatic Dialogue Trigger (Proximity)
        // Check every 60 frames (1 sec) to avoid constant checking? No, smooth check needed.
        // We add a cooldown to prevent spam.
        if (!this.dialogueCooldown) this.dialogueCooldown = 0;
        if (this.dialogueCooldown > 0) this.dialogueCooldown--;

        if (this.dialogueCooldown <= 0 && !this.activeDialogue) {
            const closestEntity = this.entities.find(e => e.isHero && Math.hypot(this.player.x - e.x, this.player.y - e.y) < 100);
            if (closestEntity) {
                const lines = MUSEUM_DIALOGUES[closestEntity.type] || MUSEUM_DIALOGUES['bg'];
                const text = lines[Math.floor(Math.random() * lines.length)];
                this.activeDialogue = {
                    text: text,
                    x: closestEntity.x,
                    y: closestEntity.y - 40,
                    timer: 240 // 4 seconds duration
                };

                // Set cooldown (e.g., 10 seconds before next auto-dialogue)
                this.dialogueCooldown = 600;
            }
        }

        // Check Interaction
        let interact = keys['e'];
        if (gp && gp.buttons[0].pressed) interact = true; // Button A

        if (interact) {
            // Artifacts (Memories)
            const closestArtifact = this.artifacts.find(a => a.type === 'MEMORY' && Math.hypot(this.player.x - a.x, this.player.y - a.y) < 50);
            if (closestArtifact) {
                this.viewingStory = closestArtifact.hero;
                this.selectedStoryIndex = 0;
                this.scrollY = 0;
                keys['e'] = false;
                return; // Stop processing other interactions
            }
        }
    }

    checkWallCollision(x, y) {
        // Boundary
        if (x < 0 || x > this.width || y < 0 || y > this.height) return true;

        // Walls
        for (let w of this.walls) {
            if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.viewingStory) {
            this.drawStory(ctx);
            return;
        }

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Floor
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Rooms
        this.rooms.forEach(r => {
            ctx.fillStyle = r.color;
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Room Label
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(r.name.toUpperCase(), r.x + r.w / 2, r.y + r.h / 2);

            // Draw Artifacts (Prestige)
            if (['fire', 'water', 'ice', 'plant', 'metal'].includes(r.name)) {
                const prestige = saveData[r.name].prestige;
                for (let i = 0; i < prestige; i++) {
                    const ax = r.x + 50 + (i % 10) * 40;
                    const ay = r.y + 50 + Math.floor(i / 10) * 40;
                    this.drawArtifact(ctx, ax, ay, r.name);
                }
            }
        });

        // Draw Walls
        ctx.fillStyle = '#444';
        this.walls.forEach(w => {
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(w.x, w.y, w.w, w.h);
        });

        // Draw Decorations
        this.drawDecorations(ctx);

        // Draw Entities
        this.entities.forEach(e => e.draw(ctx));

        // Draw Active Dialogue
        if (this.activeDialogue) {
            ctx.save();
            ctx.font = 'bold 16px Arial';
            const w = ctx.measureText(this.activeDialogue.text).width + 20;
            const h = 30;
            const x = this.activeDialogue.x;
            const y = this.activeDialogue.y;

            // Bubble
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(x - w / 2, y - h, w, h, 10);
            ctx.fill();

            // Triangle tail
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y + 5);
            ctx.lineTo(x + 5, y);
            ctx.fill();

            // Text
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.activeDialogue.text, x, y - h / 2);
            ctx.restore();
        }

        // Draw Artifacts (Memories & Trophies)
        this.artifacts.forEach(a => {
            if (a.type === 'TROPHY') {
                ctx.save();
                ctx.translate(a.x, a.y);

                // Glow
                ctx.fillStyle = a.color;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(0, 0, 15 + Math.sin(Date.now() * 0.005) * 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Icon
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (a.subtype === 'STORY') ctx.fillText('📖', 0, 0); // Book/Scroll
                else if (a.subtype === 'HIGHSCORE') ctx.fillText('🏆', 0, 0); // Trophy Cup
                else if (a.subtype === 'ULTIMATE') ctx.fillText('🌟', 0, 0); // Star
                else if (a.subtype === 'PLATINUM') {
                    ctx.font = '48px Arial'; // Bigger
                    ctx.fillText('👑', 0, 0); // Crown
                }

                // Label (Only when close)
                if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < 80) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '12px Arial';
                    ctx.fillText(a.text, 0, -25);
                }

                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = a.color;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(a.text, a.x, a.y);

                // Draw Icon
                ctx.beginPath();
                ctx.moveTo(a.x, a.y - 30);
                ctx.lineTo(a.x + 10, a.y - 15);
                ctx.lineTo(a.x, a.y);
                ctx.lineTo(a.x - 10, a.y - 15);
                ctx.closePath();
                ctx.fillStyle = '#f1c40f';
                ctx.fill();
                ctx.restore();
            }
        });

        // Draw Interaction Prompt
        const closest = this.artifacts.find(a => a.type === 'MEMORY' && Math.hypot(this.player.x - a.x, this.player.y - a.y) < 50);
        if (closest && closest.type === 'MEMORY') {
            ctx.save();
            ctx.translate(closest.x, closest.y - 60);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("PRESS E OR (A) TO VIEW", 0, 0);
            ctx.restore();
        }

        // Draw Player
        this.drawPlayer(ctx);

        ctx.restore();

        // UI Overlay
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("MUSEUM - Press ESC or (B) to Exit", canvas.width / 2, 30);
    }

    drawDecorations(ctx) {
        this.decorations.forEach(d => {
            ctx.save();
            if (d.type === 'RUG') {
                const rx = d.x - d.w / 2;
                const ry = d.y - d.h / 2;

                // Base
                ctx.fillStyle = d.color;
                ctx.fillRect(rx, ry, d.w, d.h);

                // Texture/Pattern (Diamonds to look like fabric)
                ctx.save();
                ctx.beginPath();
                ctx.rect(rx, ry, d.w, d.h);
                ctx.clip();

                ctx.fillStyle = shadeColor(d.color, -15);
                const tileSize = 80;
                for (let tx = rx - tileSize; tx < rx + d.w + tileSize; tx += tileSize) {
                    for (let ty = ry - tileSize; ty < ry + d.h + tileSize; ty += tileSize) {
                        // Draw rotated square (Diamond)
                        ctx.beginPath();
                        ctx.moveTo(tx + tileSize / 2, ty);
                        ctx.lineTo(tx + tileSize, ty + tileSize / 2);
                        ctx.lineTo(tx + tileSize / 2, ty + tileSize);
                        ctx.lineTo(tx, ty + tileSize / 2);
                        ctx.fill();
                    }
                }
                ctx.restore();

                // Inner Border (Fancy)
                ctx.strokeStyle = shadeColor(d.color, 25);
                ctx.lineWidth = 12;
                ctx.strokeRect(rx + 15, ry + 15, d.w - 30, d.h - 30);

                // Detail Line in Border
                ctx.strokeStyle = shadeColor(d.color, -30);
                ctx.lineWidth = 2;
                ctx.strokeRect(rx + 15, ry + 15, d.w - 30, d.h - 30);

                // Outer Edge
                ctx.strokeStyle = shadeColor(d.color, -40);
                ctx.lineWidth = 4;
                ctx.strokeRect(rx, ry, d.w, d.h);

                // Fringe/Tassels hints (Dashed outer line)
                ctx.strokeStyle = '#d7ccc8';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(rx - 3, ry - 3, d.w + 6, d.h + 6);
                ctx.setLineDash([]);
            } else if (d.type === 'PILLAR') {
                ctx.fillStyle = d.color;
                ctx.beginPath(); ctx.arc(d.x, d.y, 25, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath(); ctx.arc(d.x + 5, d.y + 5, 25, 0, Math.PI * 2); ctx.fill(); // Shadow
                ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
            } else if (d.type === 'BENCH') {
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(d.x, d.y, d.w, d.h);
                ctx.fillStyle = '#3e2723';
                ctx.fillRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
            } else if (d.type === 'FOUNTAIN') {
                ctx.fillStyle = '#3498db';
                ctx.beginPath(); ctx.arc(d.x, d.y, 60, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#85c1e9';
                ctx.beginPath(); ctx.arc(d.x, d.y, 45, 0, Math.PI * 2); ctx.fill();
                // Water effect
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc(d.x, d.y, 30 + Math.sin(Date.now() * 0.005) * 5, 0, Math.PI * 2); ctx.fill();
            } else if (d.type === 'FLAME') {
                ctx.fillStyle = '#c0392b';
                ctx.beginPath(); ctx.arc(d.x, d.y, 20, 0, Math.PI * 2); ctx.fill(); // Base
                ctx.fillStyle = '#f1c40f';
                const flicker = Math.random() * 5;
                ctx.beginPath(); ctx.arc(d.x, d.y - 10, 15 + flicker, 0, Math.PI * 2); ctx.fill(); // Flame
            } else if (d.type === 'PLANT_POT') {
                ctx.fillStyle = '#795548'; // Pot
                ctx.beginPath(); ctx.arc(d.x, d.y, 15, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2ecc71'; // Leaves
                ctx.beginPath(); ctx.arc(d.x, d.y - 10, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#27ae60';
                ctx.beginPath(); ctx.arc(d.x - 5, d.y - 15, 15, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        });
    }

    drawArtifact(ctx, x, y, type) {
        ctx.save();
        ctx.translate(x, y);
        if (type === 'fire') {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.fill();
        } else if (type === 'water') {
            ctx.fillStyle = '#3498db';
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'ice') {
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(-4, -4, 8, 8);
        } else if (type === 'plant') {
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI); ctx.fill(); ctx.fillRect(-1, 0, 2, 8);
        } else if (type === 'metal') {
            ctx.fillStyle = '#95a5a6';
            ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 0); ctx.lineTo(0, 6); ctx.lineTo(-6, 0); ctx.fill();
        }
        ctx.restore();
    }

    drawPlayer(ctx) {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);

        // Rotate based on movement
        ctx.rotate(this.player.angle);

        let color = '#f1c40f';
        if (this.player.type === 'fire') color = '#e74c3c';
        if (this.player.type === 'water') color = '#3498db';
        if (this.player.type === 'ice') color = '#ecf0f1';
        if (this.player.type === 'plant') color = '#2ecc71';
        if (this.player.type === 'metal') color = '#95a5a6';
        if (this.player.type === 'earth') color = '#8d6e63';

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();

        // Visor
        ctx.fillStyle = '#000'; ctx.fillRect(0, -4, 16, 8);

        // Hands/Shoulders
        ctx.fillStyle = shadeColor(color, -40);
        ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI * 2); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    drawStory(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hero = this.viewingStory;
        const stories = MEMORY_STORIES[hero] || [];
        const unlocked = saveData.memories[hero];

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${hero.toUpperCase()} MEMORIES`, canvas.width / 2, 50);

        ctx.font = '18px Arial';
        ctx.textAlign = 'left';

        for (let i = 0; i < stories.length; i++) {
            let y = 120 + i * 40 + this.scrollY;

            if (y < -50 || y > canvas.height + 50) continue;

            let text = "???";
            let isOwned = false;

            if (saveData.debug) isOwned = true; // Debug helper
            if (Array.isArray(unlocked) && unlocked.includes(i)) {
                text = stories[i];
                isOwned = true;
            } else if (typeof unlocked === 'number' && i < unlocked) {
                text = stories[i];
                isOwned = true;
            }

            if (i === this.selectedStoryIndex) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(50, y - 25, canvas.width - 100, 35);
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 2;
                ctx.strokeRect(50, y - 25, canvas.width - 100, 35);
            }

            ctx.fillStyle = (text === "???") ? '#555' : '#ddd';
            if (i === this.selectedStoryIndex) ctx.fillStyle = '#fff';

            ctx.fillText(`${i + 1}. ${text}`, 100, y);

            if (isOwned && audioManager.hasVoice(hero, i)) {
                ctx.fillText("🔊", 65, y);
                if (i === this.selectedStoryIndex) {
                    ctx.save();
                    ctx.fillStyle = '#f1c40f';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'right';
                    ctx.fillText("[PRESS E / (A) TO PLAY]", canvas.width - 60, y);
                    ctx.restore();
                }
            }
        }

        ctx.fillStyle = '#f1c40f';
        ctx.textAlign = 'center';
        ctx.font = '20px Arial';
        ctx.fillText("PRESS ESC OR (B) TO CLOSE | ▲▼ NAVIGATE", canvas.width / 2, canvas.height - 30);
    }
}

class MuseumEntity {
    constructor(x, y, type, isHero) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isHero = isHero;
        this.angle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 100;

        // Defaults
        this.radius = 20;
        this.color = '#fff';
        this.sides = 0;
        this.alpha = 1;

        if (this.isHero) {
            if (this.type === 'fire') this.color = '#e74c3c';
            if (this.type === 'water') this.color = '#3498db';
            if (this.type === 'ice') this.color = '#ecf0f1';
            if (this.type === 'plant') this.color = '#2ecc71';
            if (this.type === 'metal') this.color = '#95a5a6';
        } else {
            // Enemy Defaults
            this.radius = 15 + Math.random() * 10;
            this.color = '#555';
            this.sides = Math.floor(Math.random() * 3) + 4;

            if (this.type === 'SHOOTER') { this.radius = 18; this.color = '#f1c40f'; this.sides = 3; }
            else if (this.type === 'BRUTE') { this.radius = 30; this.color = '#5d4037'; this.sides = 4; }
            else if (this.type === 'SPEEDSTER') { this.radius = 12; this.color = '#e74c3c'; this.sides = 3; }
            else if (this.type === 'SWARM') { this.radius = 8; this.color = '#8e44ad'; this.sides = 0; }
            else if (this.type === 'SUMMONER') { this.radius = 25; this.color = '#2980b9'; this.sides = 5; }
            else if (this.type === 'GHOST') { this.radius = 15; this.color = '#bdc3c7'; this.sides = 0; this.alpha = 0.6; }
            else if (this.type === 'SNIPER') { this.radius = 15; this.color = '#16a085'; this.sides = 3; }
            else if (this.type === 'BOMBER') { this.radius = 22; this.color = '#2c3e50'; this.sides = 8; }
            else if (this.type === 'TOXIC') { this.radius = 18; this.color = '#27ae60'; this.sides = 6; }
            else if (this.type === 'SHIELDER') { this.radius = 25; this.color = '#7f8c8d'; this.sides = 4; }
            // Elites
            else if (this.type === 'ELITE_AURA_SPEED') { this.radius = 25; this.color = '#f1c40f'; this.sides = 6; this.isElite = true; }
            else if (this.type === 'ELITE_AURA_HEAL') { this.radius = 25; this.color = '#2ecc71'; this.sides = 6; this.isElite = true; }
            else if (this.type === 'ELITE_EXPLODER') { this.radius = 25; this.color = '#e74c3c'; this.sides = 6; this.isElite = true; }
            else if (this.type === 'ELITE_TANK') { this.radius = 35; this.color = '#34495e'; this.sides = 8; this.isElite = true; }
            else { this.type = 'BASIC'; } // Fallback
        }
    }

    update(walls) {
        // Simple Wander
        this.timer--;
        if (this.timer <= 0) {
            this.angle += (Math.random() - 0.5) * 2;
            this.timer = 50 + Math.random() * 100;
        }

        const speed = 0.5;
        const dx = Math.cos(this.angle) * speed;
        const dy = Math.sin(this.angle) * speed;

        // Check Wall Collision
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        let hitWall = false;
        // Boundary
        if (nextX < 0 || nextX > 2400 || nextY < 0 || nextY > 1800) hitWall = true;

        // Walls
        if (!hitWall) {
            for (let w of walls) {
                if (nextX > w.x && nextX < w.x + w.w && nextY > w.y && nextY < w.y + w.h) {
                    hitWall = true;
                    break;
                }
            }
        }

        if (!hitWall) {
            this.x = nextX;
            this.y = nextY;
        } else {
            // Turn around if hit wall
            this.angle += Math.PI;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Elite Visuals
        if (this.isElite) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Crown Icon
            ctx.fillStyle = '#f1c40f';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👑', 0, -this.radius - 5);
        }

        // Rotate slightly for movement effect or just face direction
        // Since they wander randomly, let's just use their movement angle
        ctx.rotate(this.angle);

        if (this.isHero) {
            // Draw Hero Style (Matching Player.js)
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); // Radius 15 for museum heroes
            ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();

            // Visor
            ctx.fillStyle = '#000'; ctx.fillRect(0, -4, 16, 8);

            // Hands/Shoulders
            ctx.fillStyle = shadeColor(this.color, -40);
            ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI * 2); ctx.arc(0, 15, 8, 0, Math.PI * 2); ctx.fill();

        } else {
            // Draw Enemy Style (Matching Enemy.js)
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color; ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
            ctx.beginPath();

            if (this.sides === 0) { // Circle
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            } else {
                // Draw Polygon
                ctx.moveTo(this.radius, 0);
                for (let i = 1; i <= this.sides; i++) {
                    ctx.lineTo(this.radius * Math.cos(i * 2 * Math.PI / this.sides), this.radius * Math.sin(i * 2 * Math.PI / this.sides));
                }
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();

            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath(); ctx.arc(this.radius * 0.3, -this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.radius * 0.3, this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2); ctx.fill();
            // Pupils
            ctx.fillStyle = 'red';
            ctx.beginPath(); ctx.arc(this.radius * 0.4, -this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.radius * 0.4, this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2); ctx.fill();

            // Visual Markers
            if (this.type === 'SNIPER') {
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = 'red'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(50, 0); ctx.stroke(); // Short laser
            }
            if (this.type === 'BOMBER') {
                const pulse = Math.sin(Date.now() * 0.005) * 3;
                ctx.strokeStyle = 'orange'; ctx.beginPath(); ctx.arc(0, 0, this.radius + pulse, 0, Math.PI * 2); ctx.stroke();
            }
            if (this.type === 'SHIELDER') {
                ctx.rotate(Date.now() * 0.002);
                ctx.fillStyle = '#95a5a6'; ctx.fillRect(this.radius + 5, -10, 10, 20);
            }
        }
        ctx.restore();
    }
}

// Global Museum Helpers
window.openMuseum = function () {
    document.getElementById('menu-overlay').style.display = 'none';
    window.museum = new Museum();
    if (window.setUIState) window.setUIState('MUSEUM');
};
