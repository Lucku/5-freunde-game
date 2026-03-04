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
        this.height = 2200;
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
        this.player = { x: 1200, y: 1300, radius: 20, speed: 5, type: selectedHeroType, angle: 0 };

        this.generateLayout();
        this.generateDecorations(); // Generate Decorations
        this.generateTrophies(); // Generate Trophies
        this.spawnEntities();
    }

    generateLayout() {
        // Walls (x, y, w, h)
        this.walls = [
            // Outer Boundary (world is now 2400 x 2200)
            { x: 0,    y: 0,    w: 2400, h: 50 },    // Top
            { x: 0,    y: 2150, w: 2400, h: 50 },    // Bottom (extended for jail)
            { x: 0,    y: 0,    w: 50,   h: 2200 },  // Left
            { x: 2350, y: 0,    w: 50,   h: 2200 },  // Right

            // Top Room Dividers (horizontal at y=600)
            { x: 0,    y: 600, w: 350, h: 50 },   // Fire door left
            { x: 450,  y: 600, w: 450, h: 50 },   // Fire/Water gap wall
            { x: 1500, y: 600, w: 450, h: 50 },   // Water/Ice gap wall
            { x: 2050, y: 600, w: 350, h: 50 },   // Ice door right

            // Vertical Top Room Dividers
            { x: 800,  y: 0, w: 50, h: 600 },  // Fire / Water
            { x: 1600, y: 0, w: 50, h: 600 },  // Water / Ice

            // Hub Walls (gallery sides, only upper section)
            { x: 600,  y: 600, w: 50, h: 600 }, // Left Hub Wall
            { x: 1750, y: 600, w: 50, h: 600 }, // Right Hub Wall

            // Lower floor: plant/metal room bottom walls (gap in centre for jail entrance)
            { x: 50,   y: 1750, w: 550, h: 50 },  // Plant room bottom
            { x: 1800, y: 1750, w: 550, h: 50 },  // Metal room bottom
            // Gap at x=600-1800 leads down into the Creature Wing

            // Creature Wing (Jail) side walls
            { x: 600,  y: 1800, w: 50, h: 350 }, // Jail left wall
            { x: 1750, y: 1800, w: 50, h: 350 }, // Jail right wall
        ];

        // Define Zones for Logic / Decor
        this.rooms = [
            { name: 'fire',    x: 50,   y: 50,   w: 750,  h: 550,  color: '#3c1212' },
            { name: 'water',   x: 850,  y: 50,   w: 750,  h: 550,  color: '#111e2e' },
            { name: 'ice',     x: 1650, y: 50,   w: 700,  h: 550,  color: '#1e2e35' },
            { name: 'plant',   x: 50,   y: 650,  w: 550,  h: 1100, color: '#102e18' },
            { name: 'metal',   x: 1800, y: 650,  w: 550,  h: 1100, color: '#212122' },
            { name: 'gallery', x: 650,  y: 650,  w: 1100, h: 1100, color: '#272320' },
            { name: 'jail',    x: 650,  y: 1800, w: 1100, h: 350,  color: '#171210' },
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

        // Jail entrance bars (decorative vertical bars at the top of the creature wing)
        const jail = this.rooms.find(r => r.name === 'jail');
        if (jail) {
            for (let bx = jail.x + 80; bx <= jail.x + jail.w - 80; bx += 110) {
                this.decorations.push({ type: 'JAIL_BAR', x: bx, y: jail.y });
            }
        }
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

        // Spawn Collected Enemies in the Creature Wing (Jail) — one per unique type, free-roaming
        const jailRoom = this.rooms.find(r => r.name === 'jail');
        const collected = saveData.collection || [];
        const seenTypes = new Set();
        collected.forEach(id => {
            const parts = id.split('_');
            parts.pop();
            const type = parts.join('_');
            if (!seenTypes.has(type)) {
                seenTypes.add(type);
                const jx = jailRoom ? jailRoom.x + 80 + Math.random() * (jailRoom.w - 160) : 700 + Math.random() * 900;
                const jy = jailRoom ? jailRoom.y + 60 + Math.random() * (jailRoom.h - 120) : 1860 + Math.random() * 200;
                this.entities.push(new MuseumEntity(jx, jy, type, false));
            }
        });

        // Spawn Memory Displays
        if (saveData.memories) {
            const getTotal = h => (typeof MEMORY_STORIES !== 'undefined' && MEMORY_STORIES[h]) ? MEMORY_STORIES[h].length : '?';
            const getCount = h => Array.isArray(saveData.memories[h]) ? saveData.memories[h].length : (saveData.memories[h] || 0);

            // Base heroes — displayed in their own rooms, centered lower
            const baseHeroes = ['fire', 'water', 'ice', 'plant', 'metal'];
            const heroColors = { fire: '#e74c3c', water: '#3498db', ice: '#aac8d8', plant: '#2ecc71', metal: '#95a5a6' };
            baseHeroes.forEach(h => {
                const count = getCount(h);
                if (count > 0) {
                    const room = this.rooms.find(r => r.name === h);
                    if (room) {
                        this.artifacts.push({
                            x: room.x + room.w / 2,
                            y: room.y + room.h - 120,
                            text: `${h}: ${count}`,
                            color: heroColors[h] || '#fff',
                            type: 'MEMORY', hero: h,
                            count, total: getTotal(h)
                        });
                    }
                }
            });

            // Gallery DLC / special memories — evenly spaced 2-column grid
            const galleryRoom = this.rooms.find(r => r.name === 'gallery');
            if (galleryRoom) {
                const gx = galleryRoom.x;
                const gy = galleryRoom.y;

                // Row positions inside gallery
                const gallerySlots = [
                    { hero: 'black',     x: gx + 550, y: gy + 110,  color: '#888888' }, // top centre
                    { hero: 'air',       x: gx + 350, y: gy + 310,  color: '#40e0d0' }, // left col row1
                    { hero: 'void',      x: gx + 750, y: gy + 310,  color: '#5a7a90' }, // right col row1
                    { hero: 'gravity',   x: gx + 250, y: gy + 810,  color: '#8e44ad' }, // left col row3
                    { hero: 'spirit',    x: gx + 550, y: gy + 810,  color: '#F0D080' }, // centre row3
                    { hero: 'chance',    x: gx + 850, y: gy + 810,  color: '#e040fb' }, // right col row3
                    { hero: 'sound',     x: gx + 250, y: gy + 1010, color: '#4fc3f7' }, // left col row4
                    { hero: 'poison',    x: gx + 550, y: gy + 1010, color: '#76ff03' }, // centre row4
                    { hero: 'makuta',    x: gx + 850, y: gy + 1010, color: '#8e44ad' }, // right col row4
                ];
                gallerySlots.forEach(slot => {
                    const count = getCount(slot.hero);
                    if (count > 0 && Array.isArray(saveData.memories[slot.hero])) {
                        this.artifacts.push({
                            x: slot.x, y: slot.y,
                            text: `${slot.hero}: ${count}`,
                            color: slot.color,
                            type: 'MEMORY', hero: slot.hero,
                            count, total: getTotal(slot.hero)
                        });
                    }
                });
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
        ctx.fillStyle = '#1d1810';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Rooms
        this.rooms.forEach(r => {
            ctx.fillStyle = r.color;
            ctx.fillRect(r.x, r.y, r.w, r.h);

            // Room Label
            ctx.fillStyle = 'rgba(255,255,255,0.13)';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            const label = r.name === 'jail' ? 'CREATURE WING' : r.name.toUpperCase();
            ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);

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
        ctx.fillStyle = '#4a4540';
        this.walls.forEach(w => {
            ctx.fillRect(w.x, w.y, w.w, w.h);
            ctx.strokeStyle = '#2a2520';
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
            } else if (a.type === 'MEMORY') {
                ctx.save();
                ctx.translate(a.x, a.y);

                // Shard color — ensure visibility on dark backgrounds
                const shardColor = (a.color === '#000' || a.color === '#2c3e50')
                    ? (a.color === '#000' ? '#888' : '#5a7a90') : a.color;

                const bobY = Math.sin(Date.now() * 0.0018 + a.x * 0.01) * 4;

                // --- Pedestal ---
                ctx.fillStyle = '#2e2b26';
                ctx.strokeStyle = 'rgba(255,255,255,0.14)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.roundRect(-24, 8, 48, 30, 4); ctx.fill(); ctx.stroke();
                // Pedestal top lip
                ctx.fillStyle = '#3a3732';
                ctx.beginPath(); ctx.roundRect(-20, 4, 40, 8, 2); ctx.fill();

                // --- Floating shard ---
                ctx.save();
                ctx.translate(0, bobY - 20);
                ctx.shadowBlur = 18;
                ctx.shadowColor = shardColor;
                ctx.fillStyle = shardColor;
                ctx.globalAlpha = 0.92;
                ctx.beginPath();
                ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
                ctx.closePath(); ctx.fill();
                // Inner gleam
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.38)';
                ctx.beginPath();
                ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0);
                ctx.closePath(); ctx.fill();
                ctx.globalAlpha = 1;
                ctx.restore();

                // --- Hero name on pedestal ---
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255,255,255,0.88)';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(a.hero.toUpperCase(), 0, 23);

                // --- Count badge ---
                const countText = (a.count !== undefined && a.total !== undefined)
                    ? `${a.count} / ${a.total}` : (a.text ? a.text.match(/\d+/)?.[0] : '');
                if (countText) {
                    ctx.fillStyle = 'rgba(212,175,55,0.80)';
                    ctx.font = '8px Arial';
                    ctx.fillText(countText, 0, 34);
                }

                // --- Near-proximity name + prompt above pedestal ---
                if (Math.hypot(this.player.x - a.x, this.player.y - a.y) < 90) {
                    ctx.font = 'bold 13px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.70)';
                    ctx.fillText(a.hero.toUpperCase(), 0, -58);
                    ctx.font = 'bold 11px Arial';
                    ctx.fillStyle = 'rgba(255,255,255,0.90)';
                    ctx.fillText("PRESS E OR (A) TO VIEW", 0, -44);
                }

                ctx.restore();
            }
        });

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
            } else if (d.type === 'JAIL_BAR') {
                // Vertical iron bar at jail entrance
                ctx.strokeStyle = '#3a3530';
                ctx.lineWidth = 7;
                ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y + 60); ctx.stroke();
                // Highlight edge
                ctx.strokeStyle = 'rgba(255,255,255,0.10)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(d.x - 2, d.y); ctx.lineTo(d.x - 2, d.y + 60); ctx.stroke();
                // Horizontal crossbar
                ctx.strokeStyle = '#3a3530';
                ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(d.x - 55, d.y + 28); ctx.lineTo(d.x + 55, d.y + 28); ctx.stroke();
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
        if (this.player.type === 'lightning') color = '#ffeb3b'; // Yellow/Orange
        if (this.player.type === 'void') color = '#2c3e50'; // Cyan
        if (this.player.type === 'gravity') color = '#8e44ad'; // Purple
        if (this.player.type === 'air') color = '#40e0d0'; // Turquoise
        if (this.player.type === 'spirit') color = '#F0D080'; // Soft Amber / Ivory-Gold
        if (this.player.type === 'chance') color = '#ff00ff'; // Magenta
        if (this.player.type === 'sound') color = '#4fc3f7';  // Light Blue
        if (this.player.type === 'poison') color = '#76ff03'; // Toxic Green

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

    _getHeroColor(h) {
        const map = {
            fire: '#e74c3c', water: '#3498db', ice: '#aac8d8', plant: '#2ecc71',
            metal: '#95a5a6', earth: '#8d6e63', lightning: '#f1c40f', air: '#40e0d0',
            spirit: '#F0D080', chance: '#e040fb', gravity: '#8e44ad', void: '#5a7a90',
            sound: '#4fc3f7', poison: '#76ff03', black: '#999', makuta: '#9b59b6',
        };
        return map[h] || '#d4af37';
    }

    _hexToRgb(hex) {
        const h = hex.replace('#', '');
        return [
            parseInt(h.substring(0, 2), 16),
            parseInt(h.substring(2, 4), 16),
            parseInt(h.substring(4, 6), 16)
        ].join(',');
    }

    drawStory(ctx) {
        const W = canvas.width;
        const H = canvas.height;
        const hero = this.viewingStory;
        const stories = MEMORY_STORIES[hero] || [];
        const unlocked = saveData.memories[hero];

        let collected = 0;
        if (Array.isArray(unlocked)) collected = unlocked.length;
        else if (typeof unlocked === 'number') collected = unlocked;
        const total = stories.length;

        const heroColor = this._getHeroColor(hero);
        const heroRgb = this._hexToRgb(heroColor);

        // --- Background ---
        ctx.fillStyle = '#07060f';
        ctx.fillRect(0, 0, W, H);

        // Top ambient glow
        const topGlow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 280);
        topGlow.addColorStop(0, `rgba(${heroRgb},0.18)`);
        topGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = topGlow;
        ctx.fillRect(0, 0, W, 200);

        // --- Header ---
        const HEADER_H = 108;

        // Thin hero-color strip at very top
        ctx.fillStyle = heroColor;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(0, 0, W, 3);
        ctx.globalAlpha = 1;

        // Eyebrow
        ctx.fillStyle = `rgba(${heroRgb},0.55)`;
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('✦  MEMORY ARCHIVE  ✦', W / 2, 28);

        // Hero name
        ctx.shadowBlur = 28;
        ctx.shadowColor = heroColor;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px Arial';
        ctx.fillText(hero.toUpperCase(), W / 2, 60);
        ctx.shadowBlur = 0;

        // Progress bar
        const barW = Math.min(380, W - 100);
        const barX = W / 2 - barW / 2;
        const barY = 72;
        // Track
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, 3, 2); ctx.fill();
        // Fill
        const pct = total > 0 ? Math.min(collected / total, 1) : 0;
        ctx.fillStyle = heroColor;
        ctx.globalAlpha = 0.65;
        if (pct > 0) { ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, 3, 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        // Progress text
        ctx.font = '10px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.40)';
        ctx.fillText(`${collected} / ${total}  memories`, W / 2, barY + 16);

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, HEADER_H); ctx.lineTo(W - 40, HEADER_H); ctx.stroke();

        // --- Story list ---
        const ENTRY_H = 52;
        const LIST_TOP = HEADER_H + 8;
        const LIST_BTM = H - 52;
        const PAD = Math.max(36, (W - 660) / 2);

        ctx.save();
        ctx.beginPath(); ctx.rect(0, LIST_TOP, W, LIST_BTM - LIST_TOP); ctx.clip();

        for (let i = 0; i < stories.length; i++) {
            const ey = LIST_TOP + i * ENTRY_H + this.scrollY;
            if (ey < LIST_TOP - ENTRY_H || ey > LIST_BTM) continue;

            let text = '???';
            let isOwned = false;
            if (saveData.debug) isOwned = true;
            if (Array.isArray(unlocked) && unlocked.includes(i)) { text = stories[i]; isOwned = true; }
            else if (typeof unlocked === 'number' && i < unlocked) { text = stories[i]; isOwned = true; }

            const isSel = (i === this.selectedStoryIndex);
            const rowX = PAD;
            const rowW = W - PAD * 2;

            // Row card background
            if (isSel) {
                ctx.fillStyle = `rgba(${heroRgb},0.11)`;
                ctx.beginPath(); ctx.roundRect(rowX, ey + 3, rowW, ENTRY_H - 6, 6); ctx.fill();
                ctx.strokeStyle = `rgba(${heroRgb},0.48)`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.roundRect(rowX, ey + 3, rowW, ENTRY_H - 6, 6); ctx.stroke();
            } else {
                ctx.fillStyle = isOwned ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)';
                ctx.beginPath(); ctx.roundRect(rowX, ey + 3, rowW, ENTRY_H - 6, 6); ctx.fill();
            }

            // Number badge
            ctx.font = isSel ? 'bold 10px Arial' : '10px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isOwned
                ? (isSel ? heroColor : 'rgba(255,255,255,0.30)')
                : 'rgba(255,255,255,0.12)';
            ctx.fillText(String(i + 1).padStart(2, '0'), rowX + 14, ey + ENTRY_H / 2);

            // Story text
            if (text === '???') {
                ctx.fillStyle = 'rgba(255,255,255,0.16)';
                ctx.font = 'italic 13px Arial';
                ctx.fillText('🔒  ???', rowX + 42, ey + ENTRY_H / 2);
            } else {
                // Clip text to fit row
                ctx.font = isSel ? 'bold 13px Arial' : '13px Arial';
                ctx.fillStyle = isSel ? '#fff' : 'rgba(255,255,255,0.72)';
                const maxW = rowW - 100;
                let disp = text;
                while (ctx.measureText(disp).width > maxW && disp.length > 8) disp = disp.slice(0, -1);
                if (disp !== text) disp += '…';
                ctx.fillText(disp, rowX + 42, ey + ENTRY_H / 2);
            }

            // Audio icon
            if (isOwned && audioManager.hasVoice(hero, i)) {
                ctx.font = '14px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('🔊', rowX + rowW - 12, ey + ENTRY_H / 2);
                if (isSel) {
                    ctx.fillStyle = `rgba(${heroRgb},0.65)`;
                    ctx.font = 'bold 9px Arial';
                    ctx.fillText('E / (A)  PLAY', rowX + rowW - 32, ey + ENTRY_H / 2);
                }
            }
        }
        ctx.restore();

        // --- Footer bar ---
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, H - 50, W, 50);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H - 50); ctx.lineTo(W, H - 50); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ESC / (B)  CLOSE    ·    ↑ ↓  NAVIGATE    ·    E / (A)  PLAY VOICE', W / 2, H - 26);
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
        if (nextX < 0 || nextX > 2400 || nextY < 0 || nextY > 2200) hitWall = true;

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
