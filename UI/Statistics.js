class StatisticsUI {
    openStatistics() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('highscore-screen').style.display = 'flex';

        const labels = {
            missilesFired: "Missiles Fired",
            timeSurvived: "Longest Run",
            wavesCleared: "Max Waves",
            damageTaken: "Damage Taken",
            damageDealt: "Damage Dealt",
            levelReached: "Max Level",
            moneyGained: "Max Gold (Run)",
            moneySpent: "Max Spent (Run)",
            enemiesKilled: "Max Kills (Run)",
            bossesKilled: "Max Bosses (Run)",
            maxCombo: "Max Combo"
        };

        let html = `
        <h2 style="color:#f1c40f;">BEST RUN RECORDS</h2>
        <table class="stats-table">
            <thead><tr><th>Statistic</th><th style="text-align:right">Best Record</th></tr></thead>
            <tbody>`;

        // 1. Best Run Stats
        for (let key in labels) {
            let val = window.saveData.stats[key] || 0;
            if (key === 'timeSurvived') {
                val = `${Math.floor(val / 60)}:${(val % 60).toString().padStart(2, '0')}`;
            }
            html += `<tr class="stat-row"><td>${labels[key]}</td><td class="stats-val">${val}</td></tr>`;
        }
        html += `</tbody></table>`;

        // 2. Lifetime Totals
        const timeAndHero = this.calculateTotalTimeAndHeroes();

        html += `
        <h2 style="color:#3498db;">LIFETIME TOTALS</h2>
        <table class="stats-table">
            <thead><tr><th>Statistic</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>
                <tr class="stat-row"><td>Total Play Time</td><td class="stats-val" style="color:#2ecc71">${timeAndHero.formattedTime}</td></tr>
                <tr class="stat-row"><td>Most Favorite Hero</td><td class="stats-val" style="color:#f1c40f">${timeAndHero.mostPlayed}</td></tr>
                <tr class="stat-row"><td>Least Favorite Hero</td><td class="stats-val" style="color:#e74c3c">${timeAndHero.leastPlayed}</td></tr>
                <tr class="stat-row"><td>Total Games Played</td><td class="stats-val" style="color:#fff">${window.saveData.global.totalGames || 0}</td></tr>
                <tr class="stat-row"><td>Total Kills</td><td class="stats-val" style="color:#3498db">${window.saveData.global.totalKills}</td></tr>
                <tr class="stat-row"><td>Total Gold Collected</td><td class="stats-val" style="color:#f1c40f">${window.saveData.global.totalGold}</td></tr>
                <tr class="stat-row"><td>Total Bosses Slain</td><td class="stats-val" style="color:#e74c3c">${window.saveData.global.totalBosses}</td></tr>
                <tr class="stat-row"><td>Total Damage Dealt</td><td class="stats-val" style="color:#9b59b6">${(window.saveData.global.totalDamage / 1000000).toFixed(2)}M</td></tr>
                <tr class="stat-row"><td>Highest Wave Ever</td><td class="stats-val" style="color:#2ecc71">${window.saveData.global.maxWave}</td></tr>
            </tbody>
        </table>`;

        document.getElementById('highscore-content').innerHTML = html;
        if (window.setUIState) window.setUIState('HIGHSCORE');
    }

    closeStatistics() {
        document.getElementById('highscore-screen').style.display = 'none';
        if (window.initMenu) window.initMenu();
    }

    calculateTotalTimeAndHeroes() {
        // Time
        const totalSeconds = window.saveData.global.totalTimePlayed || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const formattedTime = `${hours}h ${minutes}m`;

        // Heroes
        const runs = window.saveData.global.heroRuns || {};
        const allStats = window.saveData; // To check unlocked heroes

        let maxVal = -1;
        let minVal = Infinity;
        let maxHero = "None";
        let minHero = "None";

        // Filter heroes to those that exist in saveData root (excluding global, etc.)
        const heroKeys = Object.keys(allStats).filter(k => 
            allStats[k] && typeof allStats[k] === 'object' && 'unlocked' in allStats[k]
        );

        if (heroKeys.length > 0) {
            // Find Most Played
            let hasRuns = false;
            for (let h of heroKeys) {
                const count = runs[h] || 0;
                if (count > maxVal) {
                    maxVal = count;
                    maxHero = h;
                    hasRuns = true;
                }
            }
            if (!hasRuns) maxHero = "None";

            // Find Least Played (only among unlocked heroes)
            const unlockedHeroes = heroKeys.filter(h => allStats[h].unlocked);
            
            if (unlockedHeroes.length > 0) {
                for (let h of unlockedHeroes) {
                    const count = runs[h] || 0;
                    if (count < minVal) {
                        minVal = count;
                        minHero = h;
                    }
                }
            } else {
                minHero = "None";
            }
            
            // Format Names
            const fmt = (s) => s === 'None' ? s : s.charAt(0).toUpperCase() + s.slice(1);
            maxHero = fmt(maxHero);
            minHero = fmt(minHero);
        }

        return { formattedTime, mostPlayed: maxHero, leastPlayed: minHero };
    }
}

const statisticsUI = new StatisticsUI();
// Bind Global
window.openStatistics = () => statisticsUI.openStatistics();
window.closeStatistics = () => statisticsUI.closeStatistics();

// Backward Compatibility
window.openHighScores = () => statisticsUI.openStatistics();
window.closeHighScores = () => statisticsUI.closeStatistics();
