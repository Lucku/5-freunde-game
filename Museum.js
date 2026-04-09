// Room-aware dialogue: MUSEUM_DIALOGUES[heroType][roomName] or [heroType].generic
const MUSEUM_DIALOGUES = {
    fire: {
        generic:  ["Is it hot in here, or is it just me?", "Chaos is just energy in disguise.", "My flames will never be extinguished!"],
        fire:     ["Home sweet furnace.", "I lit that trophy myself, you know.", "The warmth here feeds my soul."],
        water:    ["Ugh, so damp. I hate this room.", "Don't let these puddles fool you — water's weak.", "I could evaporate all of this."],
        ice:      ["Brr. My least favorite place.", "Even I feel the cold here.", "One good spark and this all melts."],
        plant:    ["All this green is making me hungry.", "One wrong move and this place is kindling.", "Nature and fire have always been close."],
        metal:    ["Metal conducts heat beautifully.", "These artifacts could ignite.", "Admiring the competition?"],
        gallery:  ["Impressive collection. Half of it is mine.", "You know, I was the first hero.", "The gallery doesn't have enough fire exhibits."],
        jail:     ["They're not so scary behind bars.", "I could melt these doors open if I wanted.", "Stay back — they bite."],
    },
    water: {
        generic:  ["The flow of time is like a river...", "Stay hydrated.", "Water adapts to any vessel."],
        fire:     ["The heat in here is unbearable.", "Everything is at risk of burning.", "I feel weakened just being here."],
        water:    ["The fountain speaks to me.", "I could stay here forever.", "Every droplet has a memory."],
        ice:      ["Ice is just water with commitment.", "I recognize some of these crystals.", "The cold and I are old friends."],
        plant:    ["Plants and water — a perfect bond.", "I keep these gardens alive.", "Can you hear the roots growing?"],
        metal:    ["Water rusts metal over time.", "Even these walls cannot hold a river back.", "Rust never sleeps."],
        gallery:  ["The gallery holds what rivers carry away.", "So many stories, so little time.", "I've been in every room at least once."],
        jail:     ["Even creatures deserve water.", "The river flows to every shore.", "They look calmer near water."],
    },
    ice: {
        generic:  ["Cool it.", "The cold never bothered me anyway.", "Time freezes for no one."],
        fire:     ["I'll need to thaw out after this.", "One room and already sweating.", "I hate fire. Always have."],
        water:    ["Water is just ice that gave up.", "I remember when this fountain was frozen.", "A slower version of me."],
        ice:      ["Finally. Room temperature.", "I froze most of these exhibits myself.", "Perfect preservation — just like me."],
        plant:    ["Plants die in frost. Nature's irony.", "I once encased a whole forest.", "Still... it's kind of beautiful."],
        metal:    ["Cold metal is the strongest.", "These relics are well-preserved in here.", "Brittleness is a myth in the cold."],
        gallery:  ["The gallery is at least cool enough.", "History is best kept frozen.", "Every era has its ice age."],
        jail:     ["A frozen cell is a silent cell.", "They can't escape what they can't melt.", "In ice, even predators are harmless."],
    },
    plant: {
        generic:  ["Nature always finds a way.", "Let's put down some roots.", "I speak for the trees."],
        fire:     ["Everything here is flammable. Stay calm.", "I feel the smoke from here.", "My kind is not welcome in fire rooms."],
        water:    ["Water nourishes everything.", "The plants near the fountain look happiest.", "I could grow an entire forest with this water."],
        ice:      ["Cold slows growth, but never stops it.", "Even under ice, seeds wait.", "There's life in frozen soil."],
        plant:    ["Home. Finally.", "Every leaf has a story.", "Growth requires patience... and sunlight."],
        metal:    ["Metal is just minerals the earth gave up.", "Mining wounds the land.", "Even these walls were once part of the earth."],
        gallery:  ["The gallery could use more plants.", "Living history, not just relics.", "I've been trying to grow something in here."],
        jail:     ["Even the creatures deserve green.", "Vines could break these bars given time.", "Nature finds a way into every prison."],
    },
    metal: {
        generic:  ["Efficiency is my middle name.", "I am unbreakable.", "Upgrade complete."],
        fire:     ["Heat treatment — my specialty.", "I was forged in places hotter than this.", "Fire is how I was made."],
        water:    ["Moisture is the enemy of steel.", "I will not rust.", "These walls are holding up well. Mostly."],
        ice:      ["Cold makes metal brittle. Not me.", "Subzero temperatures suit my core.", "I am tempest-hardened."],
        plant:    ["Interesting. Organic and inorganic coexisting.", "Nature inspires some of my best designs.", "Even roots can't crack reinforced alloy."],
        metal:    ["Now THIS is craftsmanship.", "I helped build half of this.", "Precision. Every joint, every seam."],
        gallery:  ["The gallery has good structural integrity.", "I inspected these foundations myself.", "Architecture is just applied force."],
        jail:     ["The bars are rated for 10 tons. Trust me.", "I designed this wing.", "Nobody escapes a metal cage."],
    },
    bg: {
        generic: ["Welcome to the Hall of Memories.", "Silence is golden.", "Don't touch the artifacts!", "Admire the history.", "Shh..."]
    }
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
            } else if (room.name === 'ice') {
                // Crystal clusters along the walls
                const iceClusters = [
                    { x: room.x + 180,          y: room.y + 80  },
                    { x: room.x + room.w - 180,  y: room.y + 80  },
                    { x: room.x + room.w / 2,    y: room.y + 80  },
                    { x: room.x + 80,            y: room.y + 280 },
                    { x: room.x + room.w - 80,   y: room.y + 280 },
                    { x: room.x + 180,           y: room.y + room.h - 80 },
                    { x: room.x + room.w - 180,  y: room.y + room.h - 80 },
                ];
                iceClusters.forEach(c => this.decorations.push({ type: 'ICE_CRYSTAL', x: c.x, y: c.y }));
            } else if (room.name === 'metal') {
                // Wall-mounted gears and pipes
                this.decorations.push({ type: 'GEAR', x: room.x + 160, y: room.y + 120, r: 55, teeth: 10 });
                this.decorations.push({ type: 'GEAR', x: room.x + room.w - 160, y: room.y + 120, r: 55, teeth: 10 });
                this.decorations.push({ type: 'GEAR', x: room.x + 160, y: room.y + room.h - 120, r: 45, teeth: 8 });
                this.decorations.push({ type: 'GEAR', x: room.x + room.w - 160, y: room.y + room.h - 120, r: 45, teeth: 8 });
                this.decorations.push({ type: 'GEAR', x: room.x + room.w / 2, y: room.y + 90, r: 38, teeth: 7 });
                // Horizontal pipe runs
                this.decorations.push({ type: 'PIPE', x: room.x + 80, y: room.y + 220, w: room.w - 160 });
                this.decorations.push({ type: 'PIPE', x: room.x + 80, y: room.y + room.h - 220, w: room.w - 160 });
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
        const seenTrophies = saveData.global.seenTrophies || [];

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
                const key = `${h}_STORY`;
                this.artifacts.push({
                    type: 'TROPHY', subtype: 'STORY',
                    x: trophyX, y: trophyY,
                    text: 'Story Conqueror', color: '#e67e22',
                    hero: h, seenKey: key,
                    isNew: !seenTrophies.includes(key)
                });
            }
            trophyX += 100;

            // 2. High Score Trophy (Unique to one hero)
            if (h === highScoreHero) {
                const key = `${h}_HIGHSCORE`;
                this.artifacts.push({
                    type: 'TROPHY', subtype: 'HIGHSCORE',
                    x: trophyX, y: trophyY,
                    text: 'Champion', color: '#f1c40f',
                    hero: h, seenKey: key,
                    isNew: !seenTrophies.includes(key)
                });
            }
            trophyX += 100;

            // 3. Ultimate Trophy (All Altar Items)
            if (typeof ALTAR_TREE !== 'undefined' && ALTAR_TREE[h]) {
                const totalItems = ALTAR_TREE[h].length;
                const unlockedItems = saveData.altar.active.filter(id => ALTAR_TREE[h].find(item => item.id === id)).length;

                if (unlockedItems >= totalItems) {
                    const key = `${h}_ULTIMATE`;
                    this.artifacts.push({
                        type: 'TROPHY', subtype: 'ULTIMATE',
                        x: trophyX, y: trophyY,
                        text: 'Master of Elements', color: '#9b59b6',
                        hero: h, seenKey: key,
                        isNew: !seenTrophies.includes(key)
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
                const jailEntity = new MuseumEntity(jx, jy, type, false);
                if (jailRoom) jailEntity.jailBounds = { x: jailRoom.x, y: jailRoom.y, w: jailRoom.w, h: jailRoom.h };
                this.entities.push(jailEntity);
            }
        });

        // Spawn Memory Displays
        if (saveData.memories) {
            const getTotal = h => (typeof MEMORY_STORIES !== 'undefined' && MEMORY_STORIES[h]) ? MEMORY_STORIES[h].length : '?';
            const getCount = h => Array.isArray(saveData.memories[h]) ? saveData.memories[h].length : (saveData.memories[h] || 0);
            const seenCounts = saveData.global.seenMemoryCounts || {};

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
                            count, total: getTotal(h),
                            isNew: count > (seenCounts[h] || 0)
                        });
                    }
                }
            });

            // Gallery DLC / special memories — evenly spaced 2-column grid
            const galleryRoom = this.rooms.find(r => r.name === 'gallery');
            if (galleryRoom) {
                const gx = galleryRoom.x;
                const gy = galleryRoom.y;

                // Row positions inside gallery — 6 rows, ~155px spacing, all within gallery bounds
                const gallerySlots = [
                    // Row 1: black hero (center)
                    { hero: 'black',     x: gx + 550, y: gy +  80,  color: '#888888' },
                    // Row 2: earth & lightning (DLC base-world heroes)
                    { hero: 'earth',     x: gx + 350, y: gy + 230,  color: '#8d6e63' },
                    { hero: 'lightning', x: gx + 750, y: gy + 230,  color: '#f1c40f' },
                    // Row 3: air & void
                    { hero: 'air',       x: gx + 350, y: gy + 380,  color: '#40e0d0' },
                    { hero: 'void',      x: gx + 750, y: gy + 380,  color: '#5a7a90' },
                    // Row 4: gravity, spirit, chance
                    { hero: 'gravity',   x: gx + 250, y: gy + 530,  color: '#8e44ad' },
                    { hero: 'spirit',    x: gx + 550, y: gy + 530,  color: '#F0D080' },
                    { hero: 'chance',    x: gx + 850, y: gy + 530,  color: '#e040fb' },
                    // Row 5: sound, poison, makuta
                    { hero: 'sound',     x: gx + 250, y: gy + 680,  color: '#4fc3f7' },
                    { hero: 'poison',    x: gx + 550, y: gy + 680,  color: '#76ff03' },
                    { hero: 'makuta',    x: gx + 850, y: gy + 680,  color: '#8e44ad' },
                    // Row 6: time, love, goblin
                    { hero: 'time',      x: gx + 250, y: gy + 830,  color: '#a0c8ff' },
                    { hero: 'love',      x: gx + 550, y: gy + 830,  color: '#ff6699' },
                    { hero: 'goblin',    x: gx + 850, y: gy + 830,  color: '#27ae60' },
                ];
                gallerySlots.forEach(slot => {
                    const count = getCount(slot.hero);
                    if (count > 0 && Array.isArray(saveData.memories[slot.hero])) {
                        this.artifacts.push({
                            x: slot.x, y: slot.y,
                            text: `${slot.hero}: ${count}`,
                            color: slot.color,
                            type: 'MEMORY', hero: slot.hero,
                            count, total: getTotal(slot.hero),
                            isNew: count > (seenCounts[slot.hero] || 0)
                        });
                    }
                });
            }
        }
    }

    update() {
        if (this.viewingRunHistory) {
            const gp = navigator.getGamepads()[0];
            if (keys['escape']) { this.viewingRunHistory = false; keys['escape'] = false; return; }
            if (gp && gp.buttons[1].pressed) { this.viewingRunHistory = false; return; }
            return;
        }

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
            if (window.initMenu) window.initMenu();
            else { setUIState('MENU'); document.getElementById('menu-overlay').style.display = 'flex'; }
        }

        // Gamepad
        const gp = navigator.getGamepads()[0];
        if (gp) {
            if (Math.abs(gp.axes[0]) > 0.1) dx = gp.axes[0] * this.player.speed;
            if (Math.abs(gp.axes[1]) > 0.1) dy = gp.axes[1] * this.player.speed;

            // Exit with B
            if (gp.buttons[1].pressed) {
                if (window.initMenu) window.initMenu();
                else { setUIState('MENU'); document.getElementById('menu-overlay').style.display = 'flex'; }
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
                const heroDialogue = MUSEUM_DIALOGUES[closestEntity.type] || MUSEUM_DIALOGUES['bg'];
                // Pick room-aware lines if available, fall back to generic
                const currentRoom = this._getRoomForPos(closestEntity.x, closestEntity.y);
                const roomLines = heroDialogue[currentRoom] || heroDialogue.generic || Object.values(heroDialogue).flat();
                const text = roomLines[Math.floor(Math.random() * roomLines.length)];
                this.activeDialogue = {
                    text: text,
                    x: closestEntity.x,
                    y: closestEntity.y - 40,
                    timer: 240
                };
                this.dialogueCooldown = 600;
            }
        }

        // Mark nearby artifacts as seen
        this.artifacts.forEach(a => {
            if (!a.isNew) return;
            const dist = Math.hypot(this.player.x - a.x, this.player.y - a.y);
            if (dist < 80) {
                a.isNew = false;
                if (a.type === 'TROPHY' && a.seenKey) {
                    if (!saveData.global.seenTrophies) saveData.global.seenTrophies = [];
                    if (!saveData.global.seenTrophies.includes(a.seenKey)) {
                        saveData.global.seenTrophies.push(a.seenKey);
                    }
                } else if (a.type === 'MEMORY' && a.hero) {
                    if (!saveData.global.seenMemoryCounts) saveData.global.seenMemoryCounts = {};
                    saveData.global.seenMemoryCounts[a.hero] = a.count || 0;
                }
            }
        });

        // Check Interaction
        let interact = keys['e'];
        if (gp && gp.buttons[0].pressed) interact = true; // Button A

        if (interact) {
            // Run History Billboard
            const history = saveData.global.runHistory;
            if (history && history.length > 0) {
                const gallery = this.rooms.find(r => r.name === 'gallery');
                if (gallery) {
                    const boardCX = gallery.x + gallery.w - 190;
                    const boardCY = gallery.y + 175;
                    if (Math.hypot(this.player.x - boardCX, this.player.y - boardCY) < 100) {
                        this.viewingRunHistory = true;
                        keys['e'] = false;
                        return;
                    }
                }
            }

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

    _getRoomForPos(x, y) {
        const room = this.rooms.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
        return room ? room.name : 'gallery';
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
        if (this.viewingRunHistory) {
            this.drawRunHistoryScreen(ctx);
            return;
        }

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

        // Draw Run History Board (gallery room)
        this.drawRunHistoryBoard(ctx);

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

                // "NEW" badge
                if (a.isNew) {
                    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath(); ctx.arc(14, -14, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 7px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('NEW', 14, -14);
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

                // "NEW" badge — pulsing dot above shard
                if (a.isNew) {
                    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath(); ctx.arc(12, -30, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 7px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('NEW', 12, -30);
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

            } else if (d.type === 'ICE_CRYSTAL') {
                // A cluster of 4–5 hexagonal prism shards of varying heights
                const t = Date.now() * 0.0008;
                const shards = [
                    { ox: -18, h: 44, w: 11, delay: 0    },
                    { ox:  -5, h: 62, w: 14, delay: 0.6  },
                    { ox:  10, h: 50, w: 12, delay: 1.2  },
                    { ox:  22, h: 36, w:  9, delay: 1.8  },
                    { ox:   2, h: 28, w:  8, delay: 2.4  },
                ];
                shards.forEach(s => {
                    const glow = 0.55 + 0.18 * Math.sin(t + s.delay);
                    // Shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.18)';
                    ctx.beginPath();
                    ctx.ellipse(d.x + s.ox + 3, d.y + 4, s.w * 0.6, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Shard body — tapered hexagonal column drawn as trapezoid
                    const bw = s.w, tw = s.w * 0.45, h = s.h;
                    ctx.fillStyle = `rgba(180,220,245,${glow})`;
                    ctx.beginPath();
                    ctx.moveTo(d.x + s.ox - bw / 2, d.y);
                    ctx.lineTo(d.x + s.ox + bw / 2, d.y);
                    ctx.lineTo(d.x + s.ox + tw / 2, d.y - h);
                    ctx.lineTo(d.x + s.ox - tw / 2, d.y - h);
                    ctx.closePath();
                    ctx.fill();
                    // Highlight facet
                    ctx.fillStyle = `rgba(255,255,255,${glow * 0.55})`;
                    ctx.beginPath();
                    ctx.moveTo(d.x + s.ox - bw * 0.05, d.y);
                    ctx.lineTo(d.x + s.ox + bw * 0.28, d.y);
                    ctx.lineTo(d.x + s.ox + tw * 0.28, d.y - h);
                    ctx.lineTo(d.x + s.ox - tw * 0.05, d.y - h);
                    ctx.closePath();
                    ctx.fill();
                    // Tip cap
                    ctx.fillStyle = `rgba(220,240,255,${glow})`;
                    ctx.beginPath();
                    ctx.moveTo(d.x + s.ox - tw / 2, d.y - h);
                    ctx.lineTo(d.x + s.ox + tw / 2, d.y - h);
                    ctx.lineTo(d.x + s.ox, d.y - h - s.w * 0.9);
                    ctx.closePath();
                    ctx.fill();
                    // Outer edge
                    ctx.strokeStyle = `rgba(160,210,240,0.5)`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(d.x + s.ox - bw / 2, d.y);
                    ctx.lineTo(d.x + s.ox - tw / 2, d.y - h);
                    ctx.lineTo(d.x + s.ox, d.y - h - s.w * 0.9);
                    ctx.lineTo(d.x + s.ox + tw / 2, d.y - h);
                    ctx.lineTo(d.x + s.ox + bw / 2, d.y);
                    ctx.stroke();
                });
                // Ambient floor glow
                const glowAlpha = 0.07 + 0.04 * Math.sin(t);
                const rg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 38);
                rg.addColorStop(0, `rgba(160,220,255,${glowAlpha * 3})`);
                rg.addColorStop(1, 'rgba(160,220,255,0)');
                ctx.fillStyle = rg;
                ctx.beginPath(); ctx.ellipse(d.x, d.y, 38, 14, 0, 0, Math.PI * 2); ctx.fill();

            } else if (d.type === 'GEAR') {
                const r = d.r, teeth = d.teeth;
                const rot = (Date.now() * 0.00025) % (Math.PI * 2);
                // Drop shadow
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                ctx.beginPath(); ctx.arc(d.x + 4, d.y + 4, r + 6, 0, Math.PI * 2); ctx.fill();
                // Gear body
                ctx.fillStyle = '#6b6b6b';
                ctx.strokeStyle = '#3a3a3a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < teeth; i++) {
                    const a1 = rot + (i / teeth) * Math.PI * 2;
                    const a2 = rot + ((i + 0.4) / teeth) * Math.PI * 2;
                    const a3 = rot + ((i + 0.6) / teeth) * Math.PI * 2;
                    const a4 = rot + ((i + 1.0) / teeth) * Math.PI * 2;
                    if (i === 0) ctx.moveTo(d.x + Math.cos(a1) * r, d.y + Math.sin(a1) * r);
                    else         ctx.lineTo(d.x + Math.cos(a1) * r, d.y + Math.sin(a1) * r);
                    ctx.lineTo(d.x + Math.cos(a1) * (r + 10), d.y + Math.sin(a1) * (r + 10));
                    ctx.lineTo(d.x + Math.cos(a2) * (r + 10), d.y + Math.sin(a2) * (r + 10));
                    ctx.lineTo(d.x + Math.cos(a2) * r, d.y + Math.sin(a2) * r);
                    ctx.lineTo(d.x + Math.cos(a3) * r, d.y + Math.sin(a3) * r);
                    ctx.lineTo(d.x + Math.cos(a3) * (r + 10), d.y + Math.sin(a3) * (r + 10));
                    ctx.lineTo(d.x + Math.cos(a4) * (r + 10), d.y + Math.sin(a4) * (r + 10));
                    ctx.lineTo(d.x + Math.cos(a4) * r, d.y + Math.sin(a4) * r);
                }
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Inner highlight ring
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(d.x, d.y, r * 0.72, 0, Math.PI * 2); ctx.stroke();
                // Bolt holes (3 evenly spaced)
                [0, 1, 2].forEach(i => {
                    const ba = rot + (i / 3) * Math.PI * 2;
                    const bx = d.x + Math.cos(ba) * r * 0.48;
                    const by = d.y + Math.sin(ba) * r * 0.48;
                    ctx.fillStyle = '#2e2e2e';
                    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
                });
                // Centre hub
                ctx.fillStyle = '#555';
                ctx.strokeStyle = '#3a3a3a';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(d.x, d.y, r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            } else if (d.type === 'PIPE') {
                const pw = d.w, ph = 18;
                // Pipe body
                const pg = ctx.createLinearGradient(d.x, d.y - ph / 2, d.x, d.y + ph / 2);
                pg.addColorStop(0,   '#888');
                pg.addColorStop(0.3, '#bbb');
                pg.addColorStop(0.7, '#777');
                pg.addColorStop(1,   '#444');
                ctx.fillStyle = pg;
                ctx.beginPath(); ctx.roundRect(d.x, d.y - ph / 2, pw, ph, 4); ctx.fill();
                // Top highlight stripe
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.beginPath(); ctx.roundRect(d.x + 4, d.y - ph / 2 + 2, pw - 8, 4, 2); ctx.fill();
                // Flanges (joining rings every ~120px)
                ctx.fillStyle = '#555';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                for (let fx = d.x + 60; fx < d.x + pw - 30; fx += 120) {
                    ctx.beginPath(); ctx.roundRect(fx, d.y - ph / 2 - 4, 14, ph + 8, 2); ctx.fill(); ctx.stroke();
                }
                // End caps
                [d.x, d.x + pw - 14].forEach(ex => {
                    ctx.fillStyle = '#4a4a4a';
                    ctx.beginPath(); ctx.roundRect(ex, d.y - ph / 2 - 4, 14, ph + 8, 2); ctx.fill(); ctx.stroke();
                });
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

        drawHeroSprite(ctx, color, 15);
        ctx.restore();
    }

    drawRunHistoryBoard(ctx) {
        const gallery = this.rooms.find(r => r.name === 'gallery');
        if (!gallery) return;

        // Billboard center — same coords used by the interaction check
        const boardCX = gallery.x + gallery.w - 190;
        const boardCY = gallery.y + 175;

        ctx.save();
        ctx.translate(boardCX, boardCY);

        // ── Post ──────────────────────────────────────────────────
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(4, -60, 14, 100);
        // Post body
        const postGrad = ctx.createLinearGradient(-6, 0, 6, 0);
        postGrad.addColorStop(0, '#4a3828');
        postGrad.addColorStop(0.4, '#6b5a3e');
        postGrad.addColorStop(1, '#3a2e1e');
        ctx.fillStyle = postGrad;
        ctx.fillRect(-6, -60, 12, 100);
        // Post cap
        ctx.fillStyle = '#8c7050';
        ctx.fillRect(-8, -62, 16, 6);

        // ── Board face ───────────────────────────────────────────
        const bw = 120, bh = 80;
        const bx = -bw / 2, by = -bh - 30;

        // Board shadow
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.beginPath();
        ctx.roundRect(bx + 5, by + 5, bw, bh, 4);
        ctx.fill();

        // Board frame
        ctx.fillStyle = '#5a4428';
        ctx.strokeStyle = '#8c7050';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 4);
        ctx.fill();
        ctx.stroke();

        // Board surface
        ctx.fillStyle = '#1c1a14';
        ctx.beginPath();
        ctx.roundRect(bx + 6, by + 6, bw - 12, bh - 12, 2);
        ctx.fill();

        // Header bar inside board
        ctx.fillStyle = 'rgba(212,175,55,0.15)';
        ctx.fillRect(bx + 6, by + 6, bw - 12, 20);

        // Title text
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RUN HISTORY', 0, by + 20);

        // Divider line
        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 10, by + 28);
        ctx.lineTo(bx + bw - 10, by + 28);
        ctx.stroke();

        // Mini run entries (just colored dots + outcome icons, no text)
        const history = saveData.global.runHistory || [];
        const entryY0 = by + 36;
        const entryH = (bh - 44) / Math.max(history.length, 1);
        history.slice(0, 5).forEach((run, i) => {
            const ey = entryY0 + i * entryH + entryH / 2;
            const heroColor = this._getHeroColor(run.hero);
            // Color dot
            ctx.fillStyle = heroColor;
            ctx.beginPath();
            ctx.arc(bx + 16, ey, 4, 0, Math.PI * 2);
            ctx.fill();
            // Outcome mark
            ctx.font = '8px Arial';
            ctx.fillStyle = run.outcome === 'victory' ? '#f1c40f' : '#e74c3c';
            ctx.textAlign = 'left';
            ctx.fillText(run.outcome === 'victory' ? '✓' : '✗', bx + 25, ey + 3);
            // Hero name
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = '8px Arial';
            ctx.fillText(run.hero.toUpperCase(), bx + 38, ey + 3);
            // Wave
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.textAlign = 'right';
            ctx.fillText(`W${run.wave}`, bx + bw - 10, ey + 3);
        });

        if (history.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.28)';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No runs yet', 0, by + 52);
        }

        ctx.restore();

        // ── Proximity interaction prompt ─────────────────────────
        const dist = Math.hypot(this.player.x - boardCX, this.player.y - boardCY);
        if (dist < 100) {
            ctx.save();
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.90)';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS E OR (A) TO VIEW', boardCX, boardCY - bh - 45);
            ctx.restore();
        }
    }

    drawRunHistoryScreen(ctx) {
        const W = canvas.width;
        const H = canvas.height;
        const history = (saveData.global.runHistory || []);
        const fmtTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

        // Darkened backdrop
        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, W, H);

        // Panel
        const pw = Math.min(700, W - 60);
        const ph = Math.min(560, H - 80);
        const px = (W - pw) / 2;
        const py = (H - ph) / 2;

        ctx.fillStyle = '#18140f';
        ctx.strokeStyle = '#6b5a3e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, 10);
        ctx.fill();
        ctx.stroke();

        // Header bar
        ctx.fillStyle = '#2a2218';
        ctx.beginPath();
        ctx.roundRect(px, py, pw, 50, [10, 10, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📋  RUN HISTORY', W / 2, py + 32);

        // Divider
        ctx.strokeStyle = '#6b5a3e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 20, py + 52);
        ctx.lineTo(px + pw - 20, py + 52);
        ctx.stroke();

        if (history.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No runs recorded yet.', W / 2, py + ph / 2);
        } else {
            const rowH = (ph - 70) / history.length;
            history.forEach((run, i) => {
                const ry = py + 62 + i * rowH;
                const heroColor = this._getHeroColor(run.hero);
                const isVictory = run.outcome === 'victory';

                // Row bg
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)';
                ctx.fillRect(px + 10, ry, pw - 20, rowH - 4);

                // Left color bar
                ctx.fillStyle = heroColor;
                ctx.fillRect(px + 10, ry, 5, rowH - 4);

                // Run number badge
                ctx.font = 'bold 10px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.textAlign = 'left';
                ctx.fillText(`#${i + 1}`, px + 22, ry + 14);

                // Hero name
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = heroColor;
                ctx.fillText(run.hero.toUpperCase(), px + 45, ry + 16);

                // Mode label
                const modeLabel = { standard: 'Standard', story: 'Story', shuffle: 'Chaos Shuffle',
                    daily: 'Daily', weekly: 'Weekly', versus: 'Versus', '2p_versus': '2P Versus',
                    tutorial: 'Tutorial' }[run.mode] || 'Standard';
                ctx.font = '10px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.38)';
                ctx.textAlign = 'left';
                ctx.fillText(modeLabel, px + 45, ry + 28);

                // Outcome
                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = isVictory ? '#f1c40f' : '#e74c3c';
                ctx.textAlign = 'right';
                ctx.fillText(isVictory ? '✓ VICTORY' : '✗ DEATH', px + pw - 20, ry + 16);

                // Stats line 1
                ctx.font = '12px Arial';
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.textAlign = 'left';
                ctx.fillText(`Wave ${run.wave}`, px + 45, ry + 40);
                ctx.fillText(`Score: ${run.score.toLocaleString()}`, px + 130, ry + 40);
                ctx.fillText(`Time: ${fmtTime(run.timeSec)}`, px + 290, ry + 40);

                // Stats line 2
                ctx.fillStyle = 'rgba(255,255,255,0.50)';
                ctx.fillText(`Kills: ${run.enemiesKilled}`, px + 45, ry + 55);
                ctx.fillText(`Damage: ${run.damageDealt.toLocaleString()}`, px + 130, ry + 55);
                ctx.fillText(`Max Combo: ${run.maxCombo}`, px + 290, ry + 55);

                // Row divider
                if (i < history.length - 1) {
                    ctx.strokeStyle = 'rgba(107,90,62,0.35)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px + 20, ry + rowH - 2);
                    ctx.lineTo(px + pw - 20, ry + rowH - 2);
                    ctx.stroke();
                }
            });
        }

        // Footer hint
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.textAlign = 'center';
        ctx.fillText('Press ESC or (B) to close', W / 2, py + ph - 14);
    }

    _getHeroColor(h) {
        const map = {
            fire: '#e74c3c', water: '#3498db', ice: '#aac8d8', plant: '#2ecc71',
            metal: '#95a5a6', earth: '#8d6e63', lightning: '#f1c40f', air: '#40e0d0',
            spirit: '#F0D080', chance: '#e040fb', gravity: '#8e44ad', void: '#5a7a90',
            sound: '#4fc3f7', poison: '#76ff03', black: '#999', makuta: '#9b59b6',
            time: '#a0c8ff', love: '#ff6699', goblin: '#27ae60',
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

        // Jail boundary — jail entities cannot leave their cell
        if (!hitWall && this.jailBounds) {
            const b = this.jailBounds;
            const r = this.radius || 15;
            if (nextX < b.x + r || nextX > b.x + b.w - r || nextY < b.y + r || nextY > b.y + b.h - r) {
                hitWall = true;
            }
        }

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
            drawHeroSprite(ctx, this.color, 15);
        } else {
            // Draw Enemy Style (Matching Enemy.js)
            ctx.globalAlpha = this.alpha;
            const _mLight = shadeColor(this.color, +55);
            const _mDark  = shadeColor(this.color, -60);
            const _mrg = ctx.createRadialGradient(
                -this.radius * 0.28, -this.radius * 0.28, this.radius * 0.04,
                 0, 0, this.radius
            );
            _mrg.addColorStop(0,    _mLight);
            _mrg.addColorStop(0.50, this.color);
            _mrg.addColorStop(1,    _mDark);
            ctx.fillStyle = _mrg;
            ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
            ctx.beginPath();
            if (this.sides === 0) {
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            } else {
                ctx.moveTo(this.radius, 0);
                for (let i = 1; i <= this.sides; i++) {
                    ctx.lineTo(this.radius * Math.cos(i * 2 * Math.PI / this.sides), this.radius * Math.sin(i * 2 * Math.PI / this.sides));
                }
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();

            // Evil glowing eye slits
            const _mr = this.radius;
            ctx.save();
            ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 7;
            ctx.strokeStyle = '#ff4400'; ctx.lineWidth = Math.max(1.5, _mr * 0.09); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(_mr * 0.20, -_mr * 0.12); ctx.lineTo(_mr * 0.48, -_mr * 0.30); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(_mr * 0.20,  _mr * 0.12); ctx.lineTo(_mr * 0.48,  _mr * 0.30); ctx.stroke();
            ctx.restore();

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
    if (typeof MenuBackground !== 'undefined') MenuBackground.stop();
    document.getElementById('menu-overlay').style.display = 'none';
    window.museum = new Museum();
    if (window.setUIState) window.setUIState('MUSEUM');
};
