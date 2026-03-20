const TestingGrounds = {
    spawnMenuOpen: false,

    init() {
        this.spawnMenuOpen = false;
        this.buildSpawnMenu();
        document.getElementById('testing-spawn-menu').style.display = 'none';
        showNotification('[TAB] Spawn Menu  [C] Clear All');
    },

    buildSpawnMenu() {
        const container = document.getElementById('testing-enemy-list');
        if (!container) return;

        const baseTypes = Array.isArray(ENEMY_TYPES) ? [...ENEMY_TYPES] : [];
        const allTypes = Array.isArray(window.ENEMY_TYPES) ? [...window.ENEMY_TYPES] : baseTypes;
        const dlcTypes = allTypes.filter(t => !baseTypes.includes(t));

        let html = '';

        // Base enemies
        html += '<div class="tg-group">';
        html += '<div class="tg-group-title">Base Enemies</div>';
        html += '<div class="tg-btn-grid">';
        baseTypes.forEach(t => {
            const label = t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');
            html += `<button class="tg-btn" onclick="TestingGrounds.spawnEnemy('${t}')">${label}</button>`;
        });
        html += '</div></div>';

        // Elite enemies
        const elites = Array.isArray(window.ELITE_TYPES) ? window.ELITE_TYPES : ELITE_TYPES;
        html += '<div class="tg-group">';
        html += '<div class="tg-group-title">Elites</div>';
        html += '<div class="tg-btn-grid">';
        elites.forEach(et => {
            html += `<button class="tg-btn tg-btn-elite" style="border-color:${et.color}; color:${et.color};" onclick="TestingGrounds.spawnElite('${et.id}')">${et.name}</button>`;
        });
        html += '</div></div>';

        // DLC enemies
        if (dlcTypes.length > 0) {
            html += '<div class="tg-group">';
            html += '<div class="tg-group-title">DLC Enemies</div>';
            html += '<div class="tg-btn-grid">';
            dlcTypes.forEach(t => {
                const label = t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');
                html += `<button class="tg-btn tg-btn-dlc" onclick="TestingGrounds.spawnEnemy('${t}')">${label}</button>`;
            });
            html += '</div></div>';
        }

        // Base bosses
        const baseBosses = [
            { id: 'TANK',         name: 'Tank',         color: '#95a5a6' },
            { id: 'SPEEDSTER',    name: 'Speedster',    color: '#e67e22' },
            { id: 'SUMMONER',     name: 'Summoner',     color: '#9b59b6' },
            { id: 'NOVA',         name: 'Nova',         color: '#8e44ad' },
            { id: 'RHINO',        name: 'Rhino',        color: '#7f8c8d' },
            { id: 'HYDRA',        name: 'Hydra',        color: '#27ae60' },
            { id: 'MAKUTA',       name: 'Makuta',       color: '#ecf0f1' },
            { id: 'GREEN_GOBLIN', name: 'Green Goblin', color: '#2ecc71' },
        ];
        html += '<div class="tg-group">';
        html += '<div class="tg-group-title">Bosses</div>';
        html += '<div class="tg-btn-grid">';
        baseBosses.forEach(b => {
            html += `<button class="tg-btn tg-btn-boss" style="border-color:${b.color}; color:${b.color};" onclick="TestingGrounds.spawnBoss('${b.id}')">${b.name}</button>`;
        });
        html += '</div></div>';

        // DLC bosses
        const dlcBosses = [];
        if (typeof EarthHero !== 'undefined') {
            dlcBosses.push(
                { id: 'DARK_GOLEM', name: 'Dark Golem', color: '#546e7a' },
            );
        }
        if (typeof WindBosses !== 'undefined') {
            dlcBosses.push(
                { id: 'ZEUS',            name: 'Zeus',            color: '#f1c40f' },
                { id: 'CLOUD_GOLEM',     name: 'Cloud Golem',     color: '#87ceeb' },
                { id: 'STORM_CROW',      name: 'Storm Crow',      color: '#4fc3f7' },
                { id: 'TORNADO_MACHINA', name: 'Tornado Machina', color: '#00bcd4' },
                { id: 'AIR_CLONE',       name: 'Air Clone',       color: '#90caf9' },
                { id: 'TEMPEST',         name: 'Tempest',         color: '#1565c0' },
            );
        }
        if (typeof SoundHero !== 'undefined') {
            dlcBosses.push(
                { id: 'SHADOW_CLONE', name: 'Shadow Clone', color: '#6c3483' },
            );
        }
        if (typeof GravityHero !== 'undefined') {
            dlcBosses.push(
                { id: 'VOID_WALKER_BOSS', name: 'Void Walker',  color: '#6c3483' },
                { id: 'GLITCH_BOSS',      name: 'Glitch Boss',  color: '#9b59b6' },
                { id: 'ENTROPY_LORD',     name: 'Entropy Lord', color: '#4a235a' },
            );
        }
        if (typeof ChanceHero !== 'undefined') {
            dlcBosses.push(
                { id: 'MIMIC_KING', name: 'Mimic King', color: '#f39c12' },
            );
        }
        if (dlcBosses.length > 0) {
            html += '<div class="tg-group">';
            html += '<div class="tg-group-title">DLC Bosses</div>';
            html += '<div class="tg-btn-grid">';
            dlcBosses.forEach(b => {
                html += `<button class="tg-btn tg-btn-boss" style="border-color:${b.color}; color:${b.color};" onclick="TestingGrounds.spawnBoss('${b.id}')">${b.name}</button>`;
            });
            html += '</div></div>';
        }

        container.innerHTML = html;
    },

    toggleSpawnMenu() {
        this.spawnMenuOpen = !this.spawnMenuOpen;
        const el = document.getElementById('testing-spawn-menu');
        if (!el) return;
        if (this.spawnMenuOpen) {
            // Rebuild in case DLC enemies registered after init
            this.buildSpawnMenu();
            el.style.display = 'flex';
            gamePaused = true;
            setUIState('PAUSE');
        } else {
            el.style.display = 'none';
            gamePaused = false;
            setUIState('GAME');
        }
    },

    spawnEnemy(typeId) {
        const e = new Enemy(false, typeId);
        e.x = arena.width / 2 + (Math.random() - 0.5) * 300;
        e.y = arena.height / 2 + (Math.random() - 0.5) * 300;
        enemies.push(e);
        showNotification(`Spawned: ${typeId}`);
    },

    spawnElite(eliteTypeId) {
        const elites = Array.isArray(window.ELITE_TYPES) ? window.ELITE_TYPES : ELITE_TYPES;
        const eliteType = elites.find(et => et.id === eliteTypeId);
        if (!eliteType) return;

        const e = new Enemy(false, 'BASIC');
        e.x = arena.width / 2 + (Math.random() - 0.5) * 300;
        e.y = arena.height / 2 + (Math.random() - 0.5) * 300;
        e.isElite = true;
        e.eliteType = eliteType;
        e.hp *= 3;
        e.maxHp = e.hp;
        e.radius *= 1.2;
        if (eliteTypeId === 'TANK') {
            e.hp *= 2;
            e.maxHp = e.hp;
            e.radius *= 1.5;
            e.speed *= 0.7;
        } else if (eliteTypeId === 'EXPLODER') {
            e.speed *= 1.3;
        }
        enemies.push(e);
        showNotification(`Spawned Elite: ${eliteType.name}`);
    },

    spawnBoss(typeId) {
        bossActive = true;
        bossDeathTimer = 0;
        const b = new Boss(typeId);
        enemies.unshift(b);
        showNotification(`Spawned Boss: ${typeId}`);
    },

    clearAll() {
        enemies = [];
        projectiles = [];
        bossActive = false;
        showNotification('All enemies cleared');
    },

    drawHUD(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        roundRect(ctx, 10, 10, 360, 36, 6);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[TAB] Spawn Menu    [C] Clear    [N] Skip Wave', 20, 33);
        ctx.restore();
    }
};

// Helper if roundRect not in scope
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

window.TestingGrounds = TestingGrounds;
