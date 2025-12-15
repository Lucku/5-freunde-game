class CompletionMenu {
    constructor() {
        this.container = document.getElementById('completion-content');
    }

    calculateProgress() {
        const progress = {
            memories: { current: 0, total: 0, percent: 0 },
            achievements: { current: 0, total: 0, percent: 0 },
            story: { current: 0, total: 0, percent: 0 },
            cards: { current: 0, total: 0, percent: 0 },
            altar: { current: 0, total: 0, percent: 0 },
            chaos: { current: 0, total: 0, percent: 0 },
            total: { current: 0, total: 0, percent: 0 } // Overall completion
        };

        // 1. Memories
        // Iterate all hero types in MEMORY_STORIES
        for (const hero in MEMORY_STORIES) {
            const stories = MEMORY_STORIES[hero];
            progress.memories.total += stories.length;

            if (saveData.memories && saveData.memories[hero]) {
                if (Array.isArray(saveData.memories[hero])) {
                    progress.memories.current += saveData.memories[hero].length;
                } else {
                    // Legacy number support
                    progress.memories.current += saveData.memories[hero];
                }
            }
        }
        progress.memories.percent = progress.memories.total > 0 ? (progress.memories.current / progress.memories.total) * 100 : 0;

        // 2. Achievements
        progress.achievements.total = ACHIEVEMENTS.length;
        progress.achievements.current = saveData.global.unlockedAchievements.length;
        progress.achievements.percent = progress.achievements.total > 0 ? (progress.achievements.current / progress.achievements.total) * 100 : 0;

        // 3. Story Mode
        progress.story.total = STORY_EVENTS.length;
        progress.story.current = saveData.story.unlockedChapters.length;
        progress.story.percent = progress.story.total > 0 ? (progress.story.current / progress.story.total) * 100 : 0;

        // 4. Collector Cards
        progress.cards.total = Object.keys(COLLECTOR_CARDS).length;
        progress.cards.current = saveData.collection.length;
        progress.cards.percent = progress.cards.total > 0 ? (progress.cards.current / progress.cards.total) * 100 : 0;

        // 5. Altar of Mastery
        // Count all nodes in ALTAR_TREE
        let altarTotal = 0;
        let altarUnlocked = 0;

        // Hero Trees
        ['fire', 'water', 'ice', 'plant', 'metal'].forEach(hero => {
            const nodes = ALTAR_TREE[hero];
            altarTotal += nodes.length;
            const prestige = saveData[hero].prestige || 0;
            nodes.forEach(node => {
                if (prestige >= node.req) altarUnlocked++;
            });
        });

        // Convergence Tree
        if (ALTAR_TREE.convergence) {
            altarTotal += ALTAR_TREE.convergence.length;
            ALTAR_TREE.convergence.forEach(node => {
                const reqs = Object.keys(node.req);
                const isUnlocked = reqs.every(h => (saveData[h].prestige || 0) >= node.req[h]);
                if (isUnlocked) altarUnlocked++;
            });
        }

        progress.altar.total = altarTotal;
        progress.altar.current = altarUnlocked;
        progress.altar.percent = progress.altar.total > 0 ? (progress.altar.current / progress.altar.total) * 100 : 0;

        // 6. Chaos Shop
        progress.chaos.total = CHAOS_EFFECTS.length;
        progress.chaos.current = saveData.chaos.unlocked.length;
        progress.chaos.percent = progress.chaos.total > 0 ? (progress.chaos.current / progress.chaos.total) * 100 : 0;

        // Overall Total
        // We can average the percentages or sum up all items. Averaging percentages gives equal weight to categories.
        // Let's sum up all items for a "true" completion percentage.
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
            el.innerHTML = `
                <div class="completion-header">
                    <div class="completion-title">
                        <span class="icon">${cat.icon}</span> ${cat.name}
                    </div>
                    <div class="completion-val">${p.current} / ${p.total}</div>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${p.percent}%; background: ${cat.color};"></div>
                </div>
            `;
            listContainer.appendChild(el);
        });

        container.appendChild(listContainer);
    }
}
