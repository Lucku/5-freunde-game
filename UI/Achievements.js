class AchievementsUI {
    openAchievements() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('achievements-screen').style.display = 'flex';

        const list = document.getElementById('achievements-list');
        if (!list) return;
        list.innerHTML = '';

        const achievementsList = window.ACHIEVEMENTS || [];

        achievementsList.forEach(ach => {
            const unlocked = window.saveData.global.unlockedAchievements.includes(ach.id);
            const div = document.createElement('div');
            div.className = `achievement-row ${unlocked ? 'unlocked' : ''}`;
            div.innerHTML = `
                <div class="ach-info">
                    <h3>${ach.title} ${unlocked ? '✅' : '🔒'}</h3>
                    <p>${ach.desc}</p>
                </div>
                <div class="ach-reward">${ach.bonus.text}</div>
            `;
            list.appendChild(div);
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
