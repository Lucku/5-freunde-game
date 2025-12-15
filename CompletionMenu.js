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
            total: { current: 0, total: 0, percent: 0 }
        };

        // 1. Memories
        for (const hero in MEMORY_STORIES) {
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
        ACHIEVEMENTS.forEach(ach => {
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
                sub.missing.push(`${ach.name}: ${ach.desc}`);
            }
        });

        for (const cat in progress.achievements.subs) {
            const sub = progress.achievements.subs[cat];
            sub.percent = sub.total > 0 ? (sub.current / sub.total) * 100 : 0;
            progress.achievements.total += sub.total;
        }
        progress.achievements.percent = progress.achievements.total > 0 ? (progress.achievements.current / progress.achievements.total) * 100 : 0;

        // 3. Story Mode
        STORY_EVENTS.forEach(evt => {
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

        // Overall Total
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
            { id: 'chaos', name: 'Chaos Items', color: '#e67e22', icon: '🌀' }
        ];

        const listContainer = document.createElement('div');
        listContainer.className = 'completion-list';

        categories.forEach(cat => {
            const p = progress[cat.id];
            const el = document.createElement('div');
            el.className = 'completion-item';

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
