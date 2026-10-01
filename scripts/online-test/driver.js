// Online test driver — injected into each game window by
// scripts/online-test/electron-main.js (see scripts/online-test/run.js).
//
// Walks the real menus into an online match through the same UI objects a
// player clicks (onlineLobby → versusMenu), then optionally plays the hero
// ("autopilot") and prints a status line every 2 s. Every line starting with
// "[OT]" is forwarded to the terminal.
//
// window.__OT__  = { role: 'host'|'guest', hero, mode, autopilot }
// window.__OT_code = lobby code, set by the Electron main for the guest window
(() => {
    const ot = window.__OT__;
    if (!ot || window.__OT_running) return;
    window.__OT_running = true;

    const log = msg => console.log(`[OT] ${msg}`);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const shown = el => !!el && el.getClientRects().length > 0;
    const nm = () => window.networkManager;

    async function until(check, what, timeoutMs) {
        const t0 = Date.now();
        for (;;) {
            const v = check();
            if (v) return v;
            if (Date.now() - t0 > timeoutMs) throw new Error(`timed out waiting for ${what}`);
            await sleep(100);
        }
    }

    // Subscribe before triggering the action that causes the message.
    function nextMsg(type, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { off(); reject(new Error(`no ${type} within ${timeoutMs / 1000}s`)); }, timeoutMs);
            const off = nm().on(type, msg => { clearTimeout(timer); off(); resolve(msg); });
        });
    }

    async function reachMenu() {
        // The loading screen is removed right before initMenu() runs.
        await until(() => !document.getElementById('loading-screen'), 'the main menu', 120000);
        // A fresh save shows the tutorial prompt first; info dialogues (DLC news)
        // queue behind it. Clear them until the menu stays up.
        let calm = 0;
        for (let i = 0; i < 100 && calm < 5; i++) {
            if (window.uiState === 'TUTORIAL_PROMPT') { window.skipTutorialPrompt(); calm = 0; }
            else if (window.uiState === 'INFO_DIALOGUE') { window.infoDialogueManager.close(); calm = 0; }
            else if (window.uiState === 'MENU') calm++;
            await sleep(150);
        }
    }

    async function enterMatch() {
        window.selectedHeroType = ot.hero; // onlineLobby.open() picks it up as "my hero"
        await window.onlineLobby.open();
        await until(() => nm().connected, 'the server connection', 15000);
        nm().on('ERROR', m => log(`server ERROR: ${m.message}`));

        const preGame = nextMsg('PRE_GAME', 180000);
        const gameStart = nextMsg('GAME_START', 190000);
        if (ot.role === 'host') {
            const created = nextMsg('LOBBY_CREATED', 10000);
            const guestJoined = nextMsg('GUEST_JOINED', 180000);
            window.onlineLobby.createGame();
            log(`CODE ${(await created).code}`);
            const g = await guestJoined;
            log(`${g.guestUsername} joined`);
            window.onlineLobby.confirmReady();
        } else {
            const code = await until(() => window.__OT_code, 'the lobby code from the host', 180000);
            const joined = nextMsg('LOBBY_JOINED', 10000);
            document.getElementById('ol-join-code').value = code;
            window.onlineLobby.joinGame();
            await joined;
            log(`joined lobby ${code}`);
            window.onlineLobby.confirmReady();
        }
        await preGame; // onlineLobby has already opened the pre-game screen
        if (ot.role === 'host') {
            window.versusMenu.selectOnlineMode(ot.mode);
            window.versusMenu.startOnlineGame();
        }
        await gameStart;
        log(`IN_GAME as ${ot.role} (${ot.hero}), mode ${ot.mode}`);
        nm().on('GAME_OVER', () => log('GAME_OVER'));
        nm().on('PARTNER_DISCONNECTED', () => log('partner disconnected'));
        nm().on('PARTNER_RECONNECTED', () => log('partner reconnected'));
    }

    function startStatus() {
        const pos = p => (p ? `(${Math.round(p.x)},${Math.round(p.y)}) hp=${Math.round(p.hp)}` : '-');
        setInterval(() => {
            const rs = window.runState;
            if (!rs || !rs.gameRunning) return;
            const enemies = window.enemies ? window.enemies.length : '?';
            const me = rs.player ? ` lvl=${rs.player.level} xp=${Math.round(rs.player.xp)}` : '';
            log(`wave=${rs.wave} kills=${rs.enemiesKilledInWave} enemies=${enemies} me=${pos(rs.player)}${me} partner=${pos(rs.player2)} rtt=${Math.round(nm().latencyMs)}ms`);
        }, 2000);
    }

    // Plays through real key/mouse events, so input goes through InputManager
    // and the client's prediction path exactly like a person's.
    function startAutopilot() {
        // The game's own aim assist at full strength snaps aim to the nearest
        // enemy, so waves actually get cleared. Runtime only, not saved.
        window.gameConfig.aimAssist = 1;
        const DIRS = [['d'], ['d', 's'], ['s'], ['s', 'a'], ['a'], ['a', 'w'], ['w'], ['w', 'd']];
        const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k }));
        let step = 0;
        let held = [];
        // Walk an octagon (returns to the start) while holding shoot.
        setInterval(() => {
            held.forEach(k => key('keyup', k));
            held = DIRS[step++ % DIRS.length];
            [...held, ' '].forEach(k => key('keydown', k));
        }, 1200);

        let angle = 0;
        setInterval(() => {
            angle += 0.12;
            window.dispatchEvent(new MouseEvent('mousemove', {
                clientX: window.innerWidth / 2 + Math.cos(angle) * 200,
                clientY: window.innerHeight / 2 + Math.sin(angle) * 200,
            }));
        }, 50);

        // Level-ups pause the whole session until the chooser picks, and story
        // chapters wait for both players — answer both after a visible beat.
        let seenAt = 0;
        setInterval(() => {
            const levelUp = document.getElementById('levelup-screen');
            const story = document.getElementById('story-screen');
            const open = shown(levelUp) ? 'levelup' : shown(story) ? 'story' : null;
            if (!open) { seenAt = 0; return; }
            if (!seenAt) { seenAt = Date.now(); return; }
            if (Date.now() - seenAt < 1200) return;
            seenAt = Date.now() + 3000; // don't click again for a while
            if (open === 'levelup') {
                const card = levelUp.querySelector('.upgrade-card');
                if (card) { log(`autopilot picks "${card.querySelector('.upgrade-title')?.textContent}"`); card.click(); }
            } else {
                const btn = story.querySelector('#story-choices button') || document.getElementById('story-continue-btn');
                if (shown(btn)) { log('autopilot continues story'); btn.click(); }
            }
        }, 200);
    }

    (async () => {
        try {
            await reachMenu();
            await enterMatch();
            startStatus();
            if (ot.autopilot) startAutopilot();
        } catch (e) {
            log(`FAILED: ${e.message}`);
        }
    })();
})();
