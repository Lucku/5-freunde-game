class AchievementsUI {
    openAchievements() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('achievements-screen').style.display = 'flex';

        const list = document.getElementById('achievements-list');
        if (!list) return;
        list.innerHTML = '';

        const achievementsList = window.ACHIEVEMENTS || [];
        const unlockedSet = new Set(window.saveData.global.unlockedAchievements || []);

        // Update counter
        const total = achievementsList.length;
        const unlockedCount = achievementsList.filter(a => unlockedSet.has(a.id)).length;
        const counter = document.getElementById('ach-counter');
        if (counter) counter.innerHTML = `<span>${unlockedCount}</span> / ${total} Unlocked`;

        // Category assignment by ID prefix
        const categoryFor = (id) => {
            if (/^(kill_|gold_|wave_|boss_|dmg_|combo_)/.test(id)) return 'PROGRESSION';
            if (/^(skill_|prestige_|games_|death_)/.test(id)) return 'MASTERY';
            if (/^(STORY_|MAKUTA_SLAYER|MAKUTA_HM_)/.test(id)) return 'STORY';
            if (/^(DAILY_|WEEKLY_|void_)/.test(id)) return 'CHALLENGES';
            if (/^rock_/.test(id)) return 'DLC: RISE OF THE ROCK';
            if (/^thunder_/.test(id)) return 'DLC: TOURNAMENT OF THUNDER';
            if (/^(GRAVITY_|GALAXY_|ENTROPY_)/.test(id)) return 'DLC: CHAMPIONS OF CHAOS';
            if (/^(AIR_|wind_|TEMPEST_)/.test(id)) return 'DLC: WAKER OF WINDS';
            if (/^faith_/.test(id)) return 'DLC: FAITH OF FORTUNE';
            if (/^sickness_/.test(id)) return 'DLC: SYMPHONY OF SICKNESS';
            return 'CORE';
        };

        const groupOrder = [
            'PROGRESSION', 'MASTERY', 'STORY', 'CHALLENGES',
            'DLC: RISE OF THE ROCK', 'DLC: TOURNAMENT OF THUNDER',
            'DLC: CHAMPIONS OF CHAOS', 'DLC: WAKER OF WINDS',
            'DLC: FAITH OF FORTUNE', 'DLC: SYMPHONY OF SICKNESS', 'CORE'
        ];

        const groups = {};
        groupOrder.forEach(g => groups[g] = []);
        achievementsList.forEach(a => {
            const cat = categoryFor(a.id);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(a);
        });

        groupOrder.forEach((cat, catIdx) => {
            const catAchs = groups[cat];
            if (!catAchs || catAchs.length === 0) return;

            const header = document.createElement('div');
            header.className = 'ach-section-header';
            if (catIdx === 0) header.style.paddingTop = '4px';
            header.textContent = cat;
            list.appendChild(header);

            catAchs.forEach(ach => {
                const unlocked = unlockedSet.has(ach.id);
                const div = document.createElement('div');
                div.className = `achievement-row${unlocked ? ' unlocked' : ''}`;
                div.innerHTML = `
                    <div class="ach-icon">${unlocked ? '🏆' : '🔒'}</div>
                    <div class="ach-info">
                        <h3>${ach.title}</h3>
                        <p>${ach.desc}</p>
                    </div>
                    <div class="ach-reward">${ach.bonus.text}</div>
                `;
                list.appendChild(div);
            });
        });

        if (window.setUIState) window.setUIState('ACHIEVEMENTS');
    }

    closeAchievements() {
        document.getElementById('achievements-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }
}
const achievementsUI = new AchievementsUI();
window.openAchievements = () => achievementsUI.openAchievements();
window.closeAchievements = () => achievementsUI.closeAchievements();
