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

    clearAll() {
        enemies = [];
        projectiles = [];
        bossActive = false;
        showNotification('All enemies cleared');
    },

    drawHUD(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        roundRect(ctx, 10, 10, 260, 36, 6);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[TAB] Spawn Menu    [C] Clear All', 20, 33);
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
