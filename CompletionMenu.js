class CompletionMenu {
    constructor() {
        this.container = document.getElementById('completion-content');
    }

    calculateProgress() {
        const progress = {
            memories: {
                current: 0, total: 0, percent: 0,
                subs: {} // hero -> { current, total, percent, missing: [] }
            },
            achievements: {
                current: 0, total: 0, percent: 0,
                subs: {
                    'Story': { current: 0, total: 0, percent: 0, missing: [] },
                    'Combat': { current: 0, total: 0, percent: 0, missing: [] },
                    'Collection': { current: 0, total: 0, percent: 0, missing: [] },
                    'Progression': { current: 0, total: 0, percent: 0, missing: [] },
                    'Challenges': { current: 0, total: 0, percent: 0, missing: [] }
                }
            },
            story: {
                current: 0, total: 0, percent: 0,
                subs: {
                    'Act 1 (1-20)': { current: 0, total: 0, percent: 0, missing: [] },
                    'Act 2 (21-40)': { current: 0, total: 0, percent: 0, missing: [] },
                    'Act 3 (41-60)': { current: 0, total: 0, percent: 0, missing: [] },
                    'Act 4 (61-80)': { current: 0, total: 0, percent: 0, missing: [] },
                    'Act 5 (81-100)': { current: 0, total: 0, percent: 0, missing: [] }
                }
            },
            cards: {
                current: 0, total: 0, percent: 0,
                subs: {} // type -> { current, total, percent, missing: [] }
            },
            altar: {
                current: 0, total: 0, percent: 0,
                subs: {} // hero -> { current, total, percent, missing: [] }
            },
            chaos: {
                current: 0, total: 0, percent: 0,
                subs: { 'Shop Items': { current: 0, total: 0, percent: 0, missing: [] } }
            },
            dlc: {
                current: 0, total: 0, percent: 0,
                subs: {} // Dynamic: "DLC Name: Type"
            },
            total: { current: 0, total: 0, percent: 0 }
        };

        // Helper to add to DLC
        const addToDLC = (dlcName, type, isUnlocked, name) => {
            const key = `${dlcName}: ${type}`;
            if (!progress.dlc.subs[key]) {
                progress.dlc.subs[key] = { current: 0, total: 0, percent: 0, missing: [] };
            }
            const sub = progress.dlc.subs[key];
            sub.total++;
            if (isUnlocked) {
                sub.current++;
                progress.dlc.current++;
            } else {
                sub.missing.push(name);
            }
        };

        // 1. Memories
        for (const hero in MEMORY_STORIES) {
            if (hero === 'earth') {
                const stories = MEMORY_STORIES[hero];
                const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
                let unlockedIndices = Array.isArray(unlocked) ? unlocked : [];
                if (!Array.isArray(unlocked)) { // Legacy count support
                    for (let i = 0; i < unlocked; i++) unlockedIndices.push(i);
                }

                stories.forEach((story, i) => {
                    addToDLC('Rise of the Rock', 'Memories', unlockedIndices.includes(i), `Shard #${i + 1}`);
                });
                continue;
            }

            if (hero === 'lightning') { // Tournament of Thunder DLC
                const stories = MEMORY_STORIES[hero];
                const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
                let unlockedIndices = Array.isArray(unlocked) ? unlocked : [];
                if (!Array.isArray(unlocked)) {
                    for (let i = 0; i < unlocked; i++) unlockedIndices.push(i);
                }

                stories.forEach((story, i) => {
                    addToDLC('Tournament of Thunder', 'Memories', unlockedIndices.includes(i), `Shard #${i + 1}`);
                });
                continue;
            }

            if (hero === 'air') { // The Wind Waker DLC
                const stories = MEMORY_STORIES[hero];
                const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
                let unlockedIndices = Array.isArray(unlocked) ? unlocked : [];
                if (!Array.isArray(unlocked)) {
                    for (let i = 0; i < unlocked; i++) unlockedIndices.push(i);
                }

                stories.forEach((story, i) => {
                    addToDLC('The Wind Waker', 'Memories', unlockedIndices.includes(i), `Shard #${i + 1}`);
                });
                continue;
            }

            if (hero === 'gravity' || hero === 'void') { // Champions of Chaos DLC
                const stories = MEMORY_STORIES[hero];
                // Champions of Chaos shares one DLC entry but separate memory tracks or just grouped?
                // Grouping them under "Champions of Chaos"
                const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
                let unlockedIndices = Array.isArray(unlocked) ? unlocked : [];
                if (!Array.isArray(unlocked)) {
                    for (let i = 0; i < unlocked; i++) unlockedIndices.push(i);
                }

                stories.forEach((story, i) => {
                    addToDLC('Champions of Chaos', 'Memories', unlockedIndices.includes(i), `${hero.charAt(0).toUpperCase() + hero.slice(1)} Shard #${i + 1}`);
                });
                continue;
            }

            if (hero === 'spirit' || hero === 'chance') { // Faith of Fortune DLC
                const stories = MEMORY_STORIES[hero];
                const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
                let unlockedIndices = Array.isArray(unlocked) ? unlocked : [];
                if (!Array.isArray(unlocked)) {
                    for (let i = 0; i < unlocked; i++) unlockedIndices.push(i);
                }

                stories.forEach((story, i) => {
                    addToDLC('Faith of Fortune', 'Memories', unlockedIndices.includes(i), `${hero.charAt(0).toUpperCase() + hero.slice(1)} Shard #${i + 1}`);
                });
                continue;
            }

            const stories = MEMORY_STORIES[hero];
            const heroName = hero.charAt(0).toUpperCase() + hero.slice(1);

            const sub = { current: 0, total: stories.length, percent: 0, missing: [] };

            const unlocked = saveData.memories && saveData.memories[hero] ? saveData.memories[hero] : [];
            let unlockedIndices = [];
            if (Array.isArray(unlocked)) {
                unlockedIndices = unlocked;
                sub.current = unlocked.length;
            } else {
                const count = unlocked;
                sub.current = count;
                for (let i = 0; i < count; i++) unlockedIndices.push(i);
            }

            for (let i = 0; i < stories.length; i++) {
                if (!unlockedIndices.includes(i)) {
                    sub.missing.push(`Shard #${i + 1}`);
                }
            }
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;

            progress.memories.subs[heroName] = sub;
            progress.memories.total += sub.total;
            progress.memories.current += sub.current;
        }
        progress.memories.percent = progress.memories.total > 0 ? (progress.memories.current / progress.memories.total) * 100 : 0;

        // 2. Achievements
        const achievementsList = window.ACHIEVEMENTS || ACHIEVEMENTS;
        achievementsList.forEach(ach => {
            // DLC Check
            if (ach.id.startsWith('rock_')) {
                addToDLC('Rise of the Rock', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }
            if (ach.id.startsWith('thunder_')) {
                addToDLC('Tournament of Thunder', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }
            if (ach.id.startsWith('wind_') || ach.id === 'AIR_UNLOCK' || ach.id === 'TEMPEST_KING') {
                addToDLC('The Wind Waker', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }
            if (ach.id.startsWith('chaos_') || ach.id.includes('gravity') || ach.id.includes('void') || ach.id === 'ENTROPY_LORD' || ach.id === 'GALAXY_S') {
                addToDLC('Champions of Chaos', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }
            if (ach.id.startsWith('fortune_') || ach.id.includes('spirit') || ach.id.includes('chance')) {
                addToDLC('Faith of Fortune', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }
            if (ach.id.startsWith('thunder_')) {
                addToDLC('Tournament of Thunder', 'Achievements', saveData.global.unlockedAchievements.includes(ach.id), ach.title);
                return;
            }

            let cat = 'Combat';
            if (ach.id.startsWith('story') || ach.id.startsWith('MAKUTA')) cat = 'Story';
            else if (ach.id.startsWith('gold') || ach.id.startsWith('void')) cat = 'Collection';
            else if (ach.id.startsWith('wave') || ach.id.startsWith('skill') || ach.id.startsWith('prestige') || ach.id.startsWith('games')) cat = 'Progression';
            else if (ach.id.includes('CHALLENGE')) cat = 'Challenges';

            const sub = progress.achievements.subs[cat];
            sub.total++;

            if (saveData.global.unlockedAchievements.includes(ach.id)) {
                sub.current++;
                progress.achievements.current++;
            } else {
                sub.missing.push(`${ach.title}: ${ach.desc}`); // Changed ach.name to ach.title to match Constants.js
            }
        });

        for (const cat in progress.achievements.subs) {
            const sub = progress.achievements.subs[cat];
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.achievements.total += sub.total;
        }
        progress.achievements.percent = progress.achievements.total > 0 ? (progress.achievements.current / progress.achievements.total) * 100 : 0;

        // 3. Story Mode
        const events = window.STORY_EVENTS || STORY_EVENTS;

        // FIX: Ensure DLC Story Chapters are present if DLC is active
        // We check both the manager and the registry to be safe
        const isRockActive = (window.dlcManager && window.dlcManager.isDLCActive('rise_of_the_rock')) ||
            (window.DLC_REGISTRY && window.DLC_REGISTRY['rise_of_the_rock']);

        const isThunderActive = (window.dlcManager && window.dlcManager.isDLCActive('tournament_of_thunder')) ||
            (window.DLC_REGISTRY && window.DLC_REGISTRY['tournament_of_thunder']);

        if (isRockActive) {
            const hasDLC = events.some(e => e.id && e.id.startsWith('rock_'));
            if (!hasDLC) {
                console.warn("Rock DLC Story Chapters missing! Injecting fallback...");
                for (let i = 1; i <= 40; i++) {
                    events.push({
                        id: `rock_${i}`,
                        wave: i * 2,
                        hero: "EARTH",
                        type: "NARRATIVE",
                        title: `Chapter ${i}: The Ascent`,
                        text: `The earth rumbles as you climb higher. (Wave ${i * 2})`
                    });
                }
            }
        }

        if (isThunderActive) {
            // For Tournament of Thunder, we assume index.js injected them reliably.
        }

        events.forEach(evt => {
            if (evt.id && evt.id.startsWith('rock_')) {
                // DLC Chapters must be unlocked by ID to avoid conflict with base game waves
                const isUnlocked = saveData.story.unlockedChapters.includes(evt.id);
                addToDLC('Rise of the Rock', 'Story Chapters', isUnlocked, `Wave ${evt.wave}: ${evt.title}`);
                return;
            }
            if (evt.id && evt.id.startsWith('thunder_')) {
                const isUnlocked = saveData.story.unlockedChapters.includes(evt.id);
                addToDLC('Tournament of Thunder', 'Story Chapters', isUnlocked, `Wave ${evt.wave}: ${evt.title}`);
                return;
            }
            if (evt.id && evt.id.startsWith('wind_')) {
                const isUnlocked = saveData.story.unlockedChapters.includes(evt.id);
                addToDLC('The Wind Waker', 'Story Chapters', isUnlocked, `Wave ${evt.wave}: ${evt.title}`);
                return;
            }
            if (evt.id && evt.id.startsWith('chaos_')) {
                const isUnlocked = saveData.story.unlockedChapters.includes(evt.id);
                addToDLC('Champions of Chaos', 'Story Chapters', isUnlocked, `Wave ${evt.wave}: ${evt.title}`);
                return;
            }
            if (evt.id && evt.id.startsWith('fortune_')) {
                const isUnlocked = saveData.story.unlockedChapters.includes(evt.id);
                addToDLC('Faith of Fortune', 'Story Chapters', isUnlocked, `Wave ${evt.wave}: ${evt.title}`);
                return;
            }

            let cat = 'Act 5 (81-100)';
            if (evt.wave <= 20) cat = 'Act 1 (1-20)';
            else if (evt.wave <= 40) cat = 'Act 2 (21-40)';
            else if (evt.wave <= 60) cat = 'Act 3 (41-60)';
            else if (evt.wave <= 80) cat = 'Act 4 (61-80)';

            const sub = progress.story.subs[cat];
            sub.total++;

            // Check for ID (new format) or Wave Number (legacy format)
            if (saveData.story.unlockedChapters.includes(evt.id) || saveData.story.unlockedChapters.includes(evt.wave)) {
                sub.current++;
                progress.story.current++;
            } else {
                sub.missing.push(`Wave ${evt.wave}: ${evt.title}`);
            }
        });

        for (const cat in progress.story.subs) {
            const sub = progress.story.subs[cat];
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.story.total += sub.total;
        }
        progress.story.percent = progress.story.total > 0 ? (progress.story.current / progress.story.total) * 100 : 0;

        // 4. Collector Cards
        Object.keys(COLLECTOR_CARDS).forEach(id => {
            const card = COLLECTOR_CARDS[id];
            // Extract type from ID (e.g., BASIC_1 -> BASIC)
            const type = id.split('_')[0];

            if (['HARPY', 'AERO'].includes(type) || id.includes('CLOUD_MANTA')) {
                addToDLC('The Wind Waker', 'Cards', saveData.collection.includes(id), card.name);
                return;
            }

            if (['GOLEM', 'BURROWER'].includes(type)) {
                addToDLC('Rise of the Rock', 'Cards', saveData.collection.includes(id), card.name);
                return;
            }

            if (['CLOUD', 'STORM', 'ZEUS'].includes(type) || ['CLOUD_BAT', 'STORM_ELEMENTAL', 'ZEUS_BOT'].includes(type)) { // Handle split on underscore potentially leaving CLOUD/STORM
                addToDLC('Tournament of Thunder', 'Cards', saveData.collection.includes(id), card.name);
                return;
            }

            if (['VOID', 'ENTROPY'].includes(type) || ['VOID_WALKER', 'ENTROPY_MAGE'].includes(type)) {
                addToDLC('Champions of Chaos', 'Cards', saveData.collection.includes(id), card.name);
                return;
            }

            if (['GLITCH', 'TURRET', 'GUARDIAN', 'MONK'].includes(type)) {
                addToDLC('Faith of Fortune', 'Cards', saveData.collection.includes(id), card.name);
                return;
            }

            // Map type to nice name if needed, or just use type
            const typeName = type.charAt(0) + type.slice(1).toLowerCase();

            if (!progress.cards.subs[typeName]) {
                progress.cards.subs[typeName] = { current: 0, total: 0, percent: 0, missing: [] };
            }

            const sub = progress.cards.subs[typeName];
            sub.total++;

            if (saveData.collection.includes(id)) {
                sub.current++;
                progress.cards.current++;
            } else {
                sub.missing.push(card.name);
            }
        });

        for (const cat in progress.cards.subs) {
            const sub = progress.cards.subs[cat];
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.cards.total += sub.total;
        }
        progress.cards.percent = progress.cards.total > 0 ? (progress.cards.current / progress.cards.total) * 100 : 0;

        // 5. Altar of Mastery
        // Check for Earth Altar (DLC)
        if (ALTAR_TREE['earth']) {
            const nodes = ALTAR_TREE['earth'];
            const prestige = saveData['earth'] ? (saveData['earth'].prestige || 0) : 0;
            nodes.forEach(node => {
                addToDLC('Rise of the Rock', 'Altar', prestige >= node.req, `${node.name} (Req: Lv ${node.req})`);
            });
        }

        // Tournament of Thunder Altar (DLC)
        if (ALTAR_TREE['lightning']) {
            const nodes = ALTAR_TREE['lightning'];
            const prestige = saveData['lightning'] ? (saveData['lightning'].prestige || 0) : 0;
            nodes.forEach(node => {
                addToDLC('Tournament of Thunder', 'Altar', prestige >= node.req, `${node.name} (Req: Lv ${node.req})`);
            });
        }

        // Champions of Chaos Altar (DLC)
        ['gravity', 'void'].forEach(hero => {
            if (ALTAR_TREE[hero]) {
                const nodes = ALTAR_TREE[hero];
                const prestige = saveData[hero] ? (saveData[hero].prestige || 0) : 0;
                nodes.forEach(node => {
                    addToDLC('Champions of Chaos', 'Altar', prestige >= node.req, `${node.name} (Req: Lv ${node.req})`);
                });
            }
        });

        ['fire', 'water', 'ice', 'plant', 'metal'].forEach(hero => {
            const heroName = hero.charAt(0).toUpperCase() + hero.slice(1);
            const nodes = ALTAR_TREE[hero];
            const sub = { current: 0, total: nodes.length, percent: 0, missing: [] };
            const prestige = saveData[hero].prestige || 0;

            nodes.forEach(node => {
                if (prestige >= node.req) {
                    sub.current++;
                } else {
                    sub.missing.push(`${node.name} (Req: Lv ${node.req})`);
                }
            });

            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.altar.subs[heroName] = sub;
            progress.altar.total += sub.total;
            progress.altar.current += sub.current;
        });

        // Convergence
        if (ALTAR_TREE.convergence) {
            const sub = { current: 0, total: ALTAR_TREE.convergence.length, percent: 0, missing: [] };
            ALTAR_TREE.convergence.forEach(node => {
                const reqs = Object.keys(node.req);
                const isUnlocked = reqs.every(h => (saveData[h].prestige || 0) >= node.req[h]);
                if (isUnlocked) {
                    sub.current++;
                } else {
                    const reqStr = reqs.map(h => `${h} ${node.req[h]}`).join(', ');
                    sub.missing.push(`${node.name} (Req: ${reqStr})`);
                }
            });
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.altar.subs['Convergence'] = sub;
            progress.altar.total += sub.total;
            progress.altar.current += sub.current;
        }
        progress.altar.percent = progress.altar.total > 0 ? (progress.altar.current / progress.altar.total) * 100 : 0;

        // 6. Chaos Shop
        const chaosSub = progress.chaos.subs['Shop Items'];
        chaosSub.total = CHAOS_EFFECTS.length;
        chaosSub.current = saveData.chaos.unlocked.length;

        CHAOS_EFFECTS.forEach(effect => {
            if (!saveData.chaos.unlocked.includes(effect.id)) {
                chaosSub.missing.push(`${effect.name} (${effect.cost} shards)`);
            }
        });

        chaosSub.percent = chaosSub.total > 0 ? (chaosSub.current / chaosSub.total) * 100 : 0;
        progress.chaos.total = chaosSub.total;
        progress.chaos.current = chaosSub.current;
        progress.chaos.percent = chaosSub.percent;

        // Calculate DLC Percentages
        for (const key in progress.dlc.subs) {
            const sub = progress.dlc.subs[key];
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.dlc.total += sub.total;
        }
        progress.dlc.percent = progress.dlc.total > 0 ? (progress.dlc.current / progress.dlc.total) * 100 : 0;

        // Overall Total
        // Exclude DLC from the main game completion percentage so activation doesn't affect 100% trophy logic
        const grandTotal = progress.memories.total + progress.achievements.total + progress.story.total + progress.cards.total + progress.altar.total + progress.chaos.total;
        const grandCurrent = progress.memories.current + progress.achievements.current + progress.story.current + progress.cards.current + progress.altar.current + progress.chaos.current;

        progress.total.total = grandTotal;
        progress.total.current = grandCurrent;
        progress.total.percent = grandTotal > 0 ? (grandCurrent / grandTotal) * 100 : 0;

        return progress;
    }

    render() {
        const progress = this.calculateProgress();
        const container = document.getElementById('completion-grid');
        container.innerHTML = '';

        // Overall Progress Circle
        const overallContainer = document.createElement('div');
        overallContainer.className = 'completion-overall';
        overallContainer.innerHTML = `
            <div class="overall-circle" style="background: conic-gradient(#f1c40f ${progress.total.percent}%, #333 0%);">
                <div class="inner-circle">
                    <div class="percent-text">${progress.total.percent.toFixed(1)}%</div>
                    <div class="label-text">TOTAL COMPLETION</div>
                </div>
            </div>
        `;
        container.appendChild(overallContainer);

        // Categories
        const categories = [
            { id: 'memories', name: 'Memory Shards', color: '#3498db', icon: '🧩' },
            { id: 'achievements', name: 'Achievements', color: '#f1c40f', icon: '🏆' },
            { id: 'story', name: 'Story Chapters', color: '#e74c3c', icon: '📖' },
            { id: 'cards', name: 'Collector Cards', color: '#9b59b6', icon: '🃏' },
            { id: 'altar', name: 'Altar Mutations', color: '#2ecc71', icon: '⚡' },
            { id: 'chaos', name: 'Chaos Items', color: '#e67e22', icon: '🌀' },
            { id: 'dlc', name: 'DLC Content', color: '#7f8c8d', icon: '📦' }
        ];

        const listContainer = document.createElement('div');
        listContainer.className = 'completion-list';

        categories.forEach(cat => {
            const p = progress[cat.id];
            const el = document.createElement('div');
            // DLC card spans both columns since it has many sub-entries
            el.className = cat.id === 'dlc' ? 'completion-item completion-item--wide' : 'completion-item';

            // Main Header (Button for focus)
            const header = document.createElement('button');
            header.className = 'completion-header-btn';
            header.innerHTML = `
                <div class="completion-title">
                    <span class="icon">${cat.icon}</span> ${cat.name}
                </div>
                <div class="completion-val">${p.current} / ${p.total}</div>
            `;

            // Main Progress Bar
            const barBg = document.createElement('div');
            barBg.className = 'progress-bar-bg';
            barBg.innerHTML = `<div class="progress-bar-fill" style="width: ${p.percent}%; background: ${cat.color};"></div>`;

            // Sub-Categories Container (Hidden by default)
            const subContainer = document.createElement('div');
            subContainer.className = 'completion-subs';
            subContainer.style.display = 'none';

            // Render Sub-Categories
            if (p.subs) {
                for (const subName in p.subs) {
                    const sub = p.subs[subName];
                    const subEl = document.createElement('div');
                    subEl.className = 'completion-sub-item';

                    const subHeader = document.createElement('div');
                    subHeader.className = 'completion-sub-header-btn';
                    subHeader.innerHTML = `
                        <div class="sub-title">${subName}</div>
                        <div class="sub-val">${sub.current} / ${sub.total}</div>
                    `;

                    const subBarBg = document.createElement('div');
                    subBarBg.className = 'progress-bar-bg sub-bar';
                    subBarBg.innerHTML = `<div class="progress-bar-fill" style="width: ${sub.percent}%; background: ${cat.color}; opacity: 0.8;"></div>`;

                    // Removed detailed missing items list to avoid spoilers and clutter

                    subEl.appendChild(subHeader);
                    subEl.appendChild(subBarBg);
                    subContainer.appendChild(subEl);
                }
            }

            // Toggle Main Category
            header.onclick = () => {
                const isHidden = subContainer.style.display === 'none';
                subContainer.style.display = isHidden ? 'block' : 'none';
                header.classList.toggle('active', isHidden);
            };

            el.appendChild(header);
            el.appendChild(barBg);
            el.appendChild(subContainer);
            listContainer.appendChild(el);
        });

        container.appendChild(listContainer);
    }
}
