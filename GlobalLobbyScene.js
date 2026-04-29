// GlobalLobbyScene — persistent social hub built on top of the Museum map.
// All currently online players can walk around, see each other, use emotes,
// and challenge each other to a match via proximity invite.

const GLOBAL_EMOTES = [
    { key: '1', label: 'Wave',  emoji: '👋' },
    { key: '2', label: 'Dance', emoji: '💃' },
    { key: '3', label: 'Laugh', emoji: '😂' },
    { key: '4', label: 'Cheer', emoji: '🎉' },
    { key: '5', label: 'Shrug', emoji: '🤷' },
];

const HERO_COLORS = {
    fire: '#e74c3c', water: '#3498db', ice: '#ecf0f1', plant: '#2ecc71',
    metal: '#95a5a6', earth: '#8d6e63', lightning: '#ffeb3b', void: '#2c3e50',
    gravity: '#8e44ad', air: '#40e0d0', spirit: '#F0D080', chance: '#ff00ff',
    sound: '#4fc3f7', poison: '#76ff03', time: '#c8aa6e', love: '#ff6b9d',
};

function getHeroColor(type) {
    return HERO_COLORS[type] || '#f1c40f';
}

// Hero list for the in-scene selector (mirrors the hidden-set in OnlineLobby)
const _HIDDEN_HEROES = new Set(['black', 'green_goblin', 'makuta']);

class GlobalLobbyScene {
    constructor(heroType) {
        this.museum = new Museum({ noInteraction: true });
        this.museum.player.type = heroType || window.selectedHeroType || 'fire';

        // Remote player state: userId → { userId, username, x, y, angle, hero, emote, emoteTimer, emoteY }
        this.remotePlayers = {};

        this.pendingInvite  = null;  // { fromUserId, fromUsername, inviteId }
        this.nearbyPlayer   = null;  // { userId, username } — within invite range
        this.inviteFlash    = null;  // { text, timer } — brief declined/sent feedback

        // Emote display for local player
        this.localEmote     = null;  // { emoji, timer, y }

        // Hero selector
        this._heroSelectorOpen = false;
        this._heroList = Object.keys(window.BASE_HERO_STATS || HERO_COLORS).filter(h => {
            if (_HIDDEN_HEROES.has(h)) return false;
            if (h === 'love' && !window.saveData?.love?.unlocked) return false;
            return true;
        });
        this._heroSelectorIndex = Math.max(0, this._heroList.indexOf(this.museum.player.type));

        // Gamepad state tracking (edge detection)
        this._gpPrev = {};

        this._unsubscribe = [];
        this._setupNetworking();

        const nm = window.networkManager;
        if (nm.connected) {
            nm.joinGlobalLobby(this.museum.player.type);
        } else {
            // Wait for connection then join
            const unsub = nm.on('CONNECTED', () => {
                nm.joinGlobalLobby(this.museum.player.type);
                unsub();
            });
        }
    }

    // ── Networking ────────────────────────────────────────────────────────────

    _setupNetworking() {
        const nm = window.networkManager;
        const add = (type, fn) => {
            const unsub = nm.on(type, fn.bind(this));
            this._unsubscribe.push(unsub);
        };

        add('GLOBAL_LOBBY_STATE', msg => {
            this.remotePlayers = {};
            (msg.players || []).forEach(p => { this.remotePlayers[p.userId] = { ...p, emote: null, emoteTimer: 0, emoteY: 0 }; });
        });

        add('GLOBAL_PLAYER_JOINED', msg => {
            this.remotePlayers[msg.userId] = { userId: msg.userId, username: msg.username, x: msg.x, y: msg.y, angle: msg.angle, hero: msg.hero, emote: null, emoteTimer: 0, emoteY: 0 };
        });

        add('GLOBAL_PLAYER_LEFT', msg => {
            delete this.remotePlayers[msg.userId];
            if (this.nearbyPlayer?.userId === msg.userId) this.nearbyPlayer = null;
            if (this.pendingInvite?.fromUserId === msg.userId) this.pendingInvite = null;
        });

        add('GLOBAL_PLAYER_UPDATE', msg => {
            const p = this.remotePlayers[msg.userId];
            if (p) { p.x = msg.x; p.y = msg.y; p.angle = msg.angle; p.hero = msg.hero; }
        });

        add('GLOBAL_EMOTE', msg => {
            const p = this.remotePlayers[msg.userId];
            if (!p) return;
            const emoteObj = GLOBAL_EMOTES.find(e => e.key === String(msg.emoteType) || e.label === msg.emoteType);
            if (emoteObj) { p.emote = emoteObj.emoji; p.emoteTimer = 120; p.emoteY = 0; }
        });

        add('GAME_INVITE_INCOMING', msg => {
            this.pendingInvite = { fromUserId: msg.fromUserId, fromUsername: msg.fromUsername, inviteId: msg.inviteId };
        });

        add('GAME_INVITE_DECLINED', () => {
            this.inviteFlash = { text: 'Invite declined.', timer: 120 };
        });

        add('GAME_START', msg => {
            this._cleanup();
            if (typeof window.startOnlineGame === 'function') window.startOnlineGame(msg);
        });
    }

    _cleanup() {
        this._unsubscribe.forEach(fn => fn());
        this._unsubscribe = [];
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update() {
        const nm  = window.networkManager;
        const p   = this.museum.player;
        const gp  = navigator.getGamepads?.()[0] || null;

        // ── Lobby menu blocks all player input ────────────────────────────────
        if (window.uiState === 'GLOBAL_LOBBY_MENU') return;

        // ── Hero selector input ────────────────────────────────────────────────
        const tabPressed    = keys['tab'] && !this._gpPrev.tab;
        const gpYPressed    = gp && gp.buttons[3]?.pressed && !this._gpPrev.gpY;
        if (tabPressed || gpYPressed) this._heroSelectorOpen = !this._heroSelectorOpen;

        if (this._heroSelectorOpen) {
            this._handleHeroSelector(gp);
            // Block movement + other input while selector is open
            this._gpPrev = { tab: keys['tab'], gpY: gp?.buttons[3]?.pressed };
            return;
        }

        // ── Museum handles movement, camera, wall collision ────────────────────
        this.museum.update();

        // ── Sync position to server ────────────────────────────────────────────
        nm.sendPlayerMove(p.x, p.y, p.angle, p.type);

        // ── Proximity check ────────────────────────────────────────────────────
        this.nearbyPlayer = null;
        for (const rp of Object.values(this.remotePlayers)) {
            if (Math.hypot(p.x - rp.x, p.y - rp.y) < 80) {
                this.nearbyPlayer = rp;
                break;
            }
        }

        // ── Emote input: keys 1–5 (keyboard) or LB/RB/LT/RT/X (gamepad) ──────
        // Gamepad mapping: LB=4 RB=5 LT=6 RT=7 X=2
        const GP_EMOTE_BUTTONS = [4, 5, 6, 7, 2];
        for (let i = 0; i < GLOBAL_EMOTES.length; i++) {
            const emote = GLOBAL_EMOTES[i];
            const keyPressed = keys[emote.key] && !this._gpPrev['emote' + i];
            const gpBtnIdx   = GP_EMOTE_BUTTONS[i];
            const gpPressed  = gp && gp.buttons[gpBtnIdx]?.pressed && !this._gpPrev['gpEmote' + i];
            if (keyPressed || gpPressed) {
                this.localEmote = { emoji: emote.emoji, timer: 120, y: 0 };
                nm.sendEmote(emote.key);
            }
        }

        // ── Invite: E or gamepad A (when nearby and no pending invite) ─────────
        const ePressed  = keys['e'] && !this._gpPrev.e;
        const gpAPressed = gp && gp.buttons[0]?.pressed && !this._gpPrev.gpA;
        if ((ePressed || gpAPressed) && this.nearbyPlayer && !this.pendingInvite) {
            nm.sendGameInvite(this.nearbyPlayer.userId);
            this.inviteFlash = { text: `Challenge sent to ${this.nearbyPlayer.username}!`, timer: 180 };
            keys['e'] = false;
        }

        // ── Accept/decline incoming invite ─────────────────────────────────────
        if (this.pendingInvite) {
            const acceptPressed  = keys['enter'] && !this._gpPrev.enter;
            const declinePressed = (keys['escape'] || keys['Escape']) && !this._gpPrev.escape;
            const gpAccept  = gp && gp.buttons[0]?.pressed && !this._gpPrev.gpA;
            const gpDecline = gp && gp.buttons[1]?.pressed && !this._gpPrev.gpB;
            if (acceptPressed || gpAccept) {
                nm.respondToInvite(this.pendingInvite.inviteId, true);
                this.pendingInvite = null;
                keys['enter'] = false;
            } else if (declinePressed || gpDecline) {
                nm.respondToInvite(this.pendingInvite.inviteId, false);
                this.pendingInvite = null;
                keys['escape'] = false;
                keys['Escape'] = false;
            }
        }

        // ── Lobby menu: Start button or B when no pending invite ──────────────
        const startPressed = gp && gp.buttons[9]?.pressed && !this._gpPrev.start;
        const bForMenu     = !this.pendingInvite && gp && gp.buttons[1]?.pressed && !this._gpPrev.gpB;
        if (startPressed || bForMenu) {
            if (typeof window.toggleLobbyMenu === 'function') window.toggleLobbyMenu();
        }

        // ── Exit: Escape (when no modal open) ─────────────────────────────────
        if (!this.pendingInvite && (keys['escape'] || keys['Escape'])) {
            nm.leaveGlobalLobby();
            this._cleanup();
            window.globalLobbyScene = null;
            if (window.initMenu) window.initMenu();
            else { window.setUIState('MENU'); document.getElementById('menu-overlay').style.display = 'flex'; }
            return;
        }

        // ── Tick emote timers ─────────────────────────────────────────────────
        if (this.localEmote) {
            this.localEmote.timer--;
            this.localEmote.y -= 0.4;
            if (this.localEmote.timer <= 0) this.localEmote = null;
        }
        for (const rp of Object.values(this.remotePlayers)) {
            if (rp.emoteTimer > 0) { rp.emoteTimer--; rp.emoteY -= 0.4; }
            else { rp.emote = null; }
        }

        // ── Tick flash message ────────────────────────────────────────────────
        if (this.inviteFlash) {
            this.inviteFlash.timer--;
            if (this.inviteFlash.timer <= 0) this.inviteFlash = null;
        }

        // Track gamepad state for edge detection
        this._gpPrev = {
            tab:    keys['tab'],
            gpY:    gp?.buttons[3]?.pressed,
            gpA:    gp?.buttons[0]?.pressed,
            gpB:    gp?.buttons[1]?.pressed,
            start:  gp?.buttons[9]?.pressed,
            e:      keys['e'],
            enter:  keys['enter'],
            escape: keys['escape'] || keys['Escape'],
            emote0: keys['1'], emote1: keys['2'], emote2: keys['3'], emote3: keys['4'], emote4: keys['5'],
            gpEmote0: gp?.buttons[4]?.pressed,
            gpEmote1: gp?.buttons[5]?.pressed,
            gpEmote2: gp?.buttons[6]?.pressed,
            gpEmote3: gp?.buttons[7]?.pressed,
            gpEmote4: gp?.buttons[2]?.pressed,
        };
    }

    _handleHeroSelector(gp) {
        const rightPressed = (keys['ArrowRight'] || keys['d']) && !this._gpPrev.right;
        const leftPressed  = (keys['ArrowLeft']  || keys['a']) && !this._gpPrev.left;
        const gpRight = gp && gp.buttons[15]?.pressed && !this._gpPrev.gpDRight;
        const gpLeft  = gp && gp.buttons[14]?.pressed && !this._gpPrev.gpDLeft;
        const confirmPressed = (keys['enter'] || keys['e']) && !this._gpPrev.enter;
        const gpConfirm = gp && gp.buttons[0]?.pressed && !this._gpPrev.gpA;
        const cancelPressed = (keys['escape'] || keys['Escape'] || keys['tab']) && !this._gpPrev.escape;
        const gpCancel  = gp && (gp.buttons[1]?.pressed || gp.buttons[3]?.pressed) && !this._gpPrev.gpB;

        if (rightPressed || gpRight) this._heroSelectorIndex = (this._heroSelectorIndex + 1) % this._heroList.length;
        if (leftPressed  || gpLeft)  this._heroSelectorIndex = (this._heroSelectorIndex - 1 + this._heroList.length) % this._heroList.length;

        if (confirmPressed || gpConfirm) {
            const newHero = this._heroList[this._heroSelectorIndex];
            this.museum.player.type = newHero;
            window.networkManager.sendPlayerMove(this.museum.player.x, this.museum.player.y, this.museum.player.angle, newHero);
            this._heroSelectorOpen = false;
            keys['enter'] = false; keys['e'] = false;
        }
        if (cancelPressed || gpCancel) {
            this._heroSelectorOpen = false;
            keys['escape'] = false; keys['Escape'] = false; keys['tab'] = false;
        }

        this._gpPrev = {
            right: keys['ArrowRight'] || keys['d'],
            left:  keys['ArrowLeft']  || keys['a'],
            gpDRight: gp?.buttons[15]?.pressed,
            gpDLeft:  gp?.buttons[14]?.pressed,
            enter:  keys['enter'] || keys['e'],
            escape: keys['escape'] || keys['Escape'] || keys['tab'],
            gpA:    gp?.buttons[0]?.pressed,
            gpB:    gp?.buttons[1]?.pressed || gp?.buttons[3]?.pressed,
        };
    }

    // ── Draw ──────────────────────────────────────────────────────────────────

    draw(ctx) {
        // 1. Full museum map + local player
        this.museum.draw(ctx);

        const cam = this.museum.camera;

        ctx.save();
        ctx.translate(-cam.x, -cam.y);

        // 2. Remote players
        this._drawRemotePlayers(ctx);

        // 3. Local player emote (in world space, above local player)
        if (this.localEmote) {
            this._drawEmotePopup(ctx, this.museum.player.x, this.museum.player.y - 30 + this.localEmote.y, this.localEmote.emoji, this.localEmote.timer, 120);
        }

        ctx.restore();

        // HUD (screen-space)
        this._drawEmoteBar(ctx);
        this._drawHeroSelectorBtn(ctx);
        this._drawOnlineCount(ctx);
        if (this.nearbyPlayer && !this.pendingInvite) this._drawNearbyPrompt(ctx);
        if (this.pendingInvite) this._drawInvitePrompt(ctx);
        if (this.inviteFlash)   this._drawFlashMsg(ctx);
        if (this._heroSelectorOpen) this._drawHeroSelector(ctx);
    }

    _drawRemotePlayers(ctx) {
        for (const rp of Object.values(this.remotePlayers)) {
            ctx.save();
            ctx.translate(rp.x, rp.y);

            // Glow ring for nearby players
            if (this.nearbyPlayer?.userId === rp.userId) {
                ctx.beginPath();
                ctx.arc(0, 0, 22, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,220,50,0.7)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.rotate(rp.angle || 0);
            drawHeroSprite(ctx, getHeroColor(rp.hero), 15);
            ctx.restore();

            // Username label (no camera transform needed — already translated)
            ctx.save();
            ctx.translate(rp.x, rp.y);
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(rp.username, 1, -27);
            ctx.fillStyle = '#fff';
            ctx.fillText(rp.username, 0, -28);
            ctx.restore();

            // Emote popup
            if (rp.emote && rp.emoteTimer > 0) {
                ctx.save();
                ctx.translate(rp.x, rp.y);
                this._drawEmotePopup(ctx, 0, -30 + rp.emoteY, rp.emote, rp.emoteTimer, 120);
                ctx.restore();
            }
        }
    }

    _drawEmotePopup(ctx, x, y, emoji, timer, maxTimer) {
        const alpha = Math.min(1, timer / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        // Burst ring (expanding)
        const progress = 1 - timer / maxTimer;
        const burstR = 15 + progress * 45;
        const burstAlpha = (1 - progress) * 0.5;
        if (burstAlpha > 0) {
            ctx.beginPath();
            ctx.arc(x, y, burstR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,200,${burstAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
        ctx.globalAlpha = 1;
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    _drawEmoteBar(ctx) {
        const W = canvas.width;
        const H = canvas.height;
        const slotW = 56;
        const slotH = 52;
        const gap = 8;
        const totalW = GLOBAL_EMOTES.length * slotW + (GLOBAL_EMOTES.length - 1) * gap;
        const startX = (W - totalW) / 2;
        const startY = H - slotH - 16;

        const useGamepad = window.inputManager?.lastInputType === 'GAMEPAD';
        const GP_LABELS = ['LB', 'RB', 'LT', 'RT', 'X'];

        GLOBAL_EMOTES.forEach((emote, i) => {
            const x = startX + i * (slotW + gap);
            const isActive = this.localEmote?.emoji === emote.emoji && (this.localEmote?.timer || 0) > 100;
            ctx.save();
            ctx.fillStyle = isActive ? 'rgba(255,220,50,0.25)' : 'rgba(0,0,0,0.55)';
            ctx.strokeStyle = isActive ? 'rgba(255,220,50,0.8)' : 'rgba(255,255,255,0.18)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, startY, slotW, slotH, 8);
            ctx.fill(); ctx.stroke();
            ctx.font = '22px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(emote.emoji, x + slotW / 2, startY + 27);
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            const label = useGamepad ? GP_LABELS[i] : `[${emote.key}]`;
            ctx.fillText(label, x + slotW / 2, startY + 44);
            ctx.restore();
        });
    }

    _drawHeroSelectorBtn(ctx) {
        const W = canvas.width;
        const hero = this.museum.player.type;
        const color = getHeroColor(hero);
        const x = W - 70; const y = 16;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.strokeStyle = color + '88';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(x, y, 54, 40, 8); ctx.fill(); ctx.stroke();
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        const emoji = (typeof _HERO_EMOJI !== 'undefined' && _HERO_EMOJI[hero]) || '⚔️';
        ctx.fillText(emoji, x + 27, y + 25);
        ctx.font = 'bold 9px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        const heroHint = window.inputManager?.lastInputType === 'GAMEPAD' ? '[Y]' : '[TAB]';
        ctx.fillText(heroHint, x + 27, y + 36);
        ctx.restore();
    }

    _drawOnlineCount(ctx) {
        const count = Object.keys(this.remotePlayers).length + 1;
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.textAlign = 'right';
        const text = `🌍 ${count} online`;
        ctx.fillText(text, canvas.width - 14, 14);
        ctx.fillStyle = '#adf';
        ctx.fillText(text, canvas.width - 15, 13);
        ctx.restore();
    }

    _drawNearbyPrompt(ctx) {
        const name = this.nearbyPlayer.username;
        const useGamepad = window.inputManager?.lastInputType === 'GAMEPAD';
        const hint = useGamepad ? '[A]' : '[E] / [A]';
        this._drawCenteredHUD(ctx, `${hint}  ·  Challenge ${name}`, canvas.height / 2 + 120, 'rgba(255,220,50,0.9)');
    }

    _drawInvitePrompt(ctx) {
        const name = this.pendingInvite.fromUsername;
        const line1 = `${name} wants to play!`;
        const line2 = '[Enter / A]  Accept       [Esc / B]  Decline';
        const H = canvas.height;
        const W = canvas.width;
        const bW = 380; const bH = 76;
        const bX = (W - bW) / 2; const bY = H / 2 + 80;
        ctx.save();
        ctx.fillStyle = 'rgba(10,20,40,0.92)';
        ctx.strokeStyle = 'rgba(90,180,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 12); ctx.fill(); ctx.stroke();
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(line1, W / 2, bY + 26);
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(line2, W / 2, bY + 56);
        ctx.restore();
    }

    _drawFlashMsg(ctx) {
        const alpha = Math.min(1, this.inviteFlash.timer / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        this._drawCenteredHUD(ctx, this.inviteFlash.text, canvas.height / 2 + 160, 'rgba(180,230,180,0.95)');
        ctx.restore();
    }

    _drawCenteredHUD(ctx, text, y, color) {
        ctx.save();
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(text).width;
        const pad = 14;
        const bW = tw + pad * 2; const bH = 30;
        const bX = (canvas.width - bW) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.roundRect(bX, y - 20, bW, bH, 8); ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(text, canvas.width / 2, y);
        ctx.restore();
    }

    _drawHeroSelector(ctx) {
        const W = canvas.width;
        const H = canvas.height;
        // Overlay
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('CHANGE HERO', W / 2, H / 2 - 80);
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('[← →] Navigate   [Enter / A] Confirm   [Esc / B] Cancel', W / 2, H / 2 - 58);

        // Hero slots — show 5 at a time centered on selection
        const visible = 5;
        const slotW = 70; const slotH = 80; const gap = 12;
        const totalW = visible * slotW + (visible - 1) * gap;
        const startX = (W - totalW) / 2;
        const startY = H / 2 - 40;
        const start = Math.max(0, Math.min(this._heroSelectorIndex - Math.floor(visible / 2), this._heroList.length - visible));
        for (let i = 0; i < visible; i++) {
            const idx = start + i;
            if (idx >= this._heroList.length) break;
            const h = this._heroList[idx];
            const x = startX + i * (slotW + gap);
            const isSelected = idx === this._heroSelectorIndex;
            const color = getHeroColor(h);
            ctx.fillStyle = isSelected ? color + '33' : 'rgba(255,255,255,0.07)';
            ctx.strokeStyle = isSelected ? color : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = isSelected ? 2.5 : 1;
            ctx.beginPath(); ctx.roundRect(x, startY, slotW, slotH, 10); ctx.fill(); ctx.stroke();

            const emoji = (typeof _HERO_EMOJI !== 'undefined' && _HERO_EMOJI[h]) || '⚔️';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(emoji, x + slotW / 2, startY + 36);
            ctx.font = isSelected ? 'bold 10px Arial' : '10px Arial';
            ctx.fillStyle = isSelected ? color : 'rgba(255,255,255,0.6)';
            ctx.fillText(h.toUpperCase(), x + slotW / 2, startY + 56);
            if (isSelected) {
                // Arrow indicator
                ctx.font = '14px Arial';
                ctx.fillStyle = '#fff';
                ctx.fillText('▲', x + slotW / 2, startY + 74);
            }
        }

        ctx.restore();
    }
}
