class InfoDialogueManager {
    constructor() {
        this._queue = [];
        this._current = null;
        this._dontShowAgain = false;
    }

    // Register a dialogue to show at menu launch. Skipped if already dismissed.
    // dialogue: { id, title, body (HTML string), checkboxLabel (optional) }
    register(dialogue) {
        if (!gameConfig.dismissedDialogues) gameConfig.dismissedDialogues = [];
        if (!gameConfig.dismissedDialogues.includes(dialogue.id)) {
            this._queue.push(dialogue);
        }
    }

    // Call at end of initMenu() — shows first queued dialogue, or falls through to tutorial check.
    startQueue() {
        if (this._queue.length > 0) {
            this._showNext();
        } else {
            this._onQueueEmpty();
        }
    }

    _showNext() {
        this._current = this._queue.shift();
        this._dontShowAgain = false;
        this._render();
        document.getElementById('info-dialogue-screen').style.display = 'flex';
        setUIState('INFO_DIALOGUE');
    }

    _render() {
        document.getElementById('info-dialogue-title').textContent = this._current.title;
        document.getElementById('info-dialogue-body').innerHTML = this._current.body;
        const checkboxRow = document.getElementById('info-dialogue-checkbox-row');
        if (this._current.checkboxLabel) {
            checkboxRow.style.display = 'flex';
            document.getElementById('info-dialogue-checkbox-label').textContent = this._current.checkboxLabel;
        } else {
            checkboxRow.style.display = 'none';
        }
        this._updateCheckbox();
    }

    toggleCheckbox() {
        this._dontShowAgain = !this._dontShowAgain;
        this._updateCheckbox();
    }

    _updateCheckbox() {
        const btn = document.getElementById('info-dialogue-checkbox-btn');
        if (!btn) return;
        const checked = this._dontShowAgain;
        btn.textContent = checked ? '☑' : '☐';
        btn.style.borderColor = checked ? '#f1c40f' : '#666';
        btn.style.color = checked ? '#f1c40f' : '#888';
    }

    close() {
        if (!this._current) return;
        if (this._dontShowAgain) {
            if (!gameConfig.dismissedDialogues) gameConfig.dismissedDialogues = [];
            if (!gameConfig.dismissedDialogues.includes(this._current.id)) {
                gameConfig.dismissedDialogues.push(this._current.id);
                saveConfig();
            }
        }
        document.getElementById('info-dialogue-screen').style.display = 'none';
        this._current = null;
        setUIState('MENU');

        if (this._queue.length > 0) {
            setTimeout(() => this._showNext(), 80);
        } else {
            this._onQueueEmpty();
        }
    }

    // Runs when the queue is exhausted — hands off to the tutorial prompt if needed.
    _onQueueEmpty() {
        if (typeof saveData !== 'undefined' && saveData.tutorial && !saveData.tutorial.seen) {
            const overlay = document.getElementById('tutorial-welcome-overlay');
            if (overlay) overlay.style.display = 'flex';
            setUIState('TUTORIAL_PROMPT');
            setTimeout(() => {
                const btn = document.getElementById('tutorial-accept-btn');
                if (btn) btn.focus();
            }, 50);
        }
    }
}

window.infoDialogueManager = new InfoDialogueManager();

// ── Built-in dialogues ────────────────────────────────────────────────────────

infoDialogueManager.register({
    id: 'patch_notes_1_1_0',
    title: '✦ VERSION 1.1.0 — PATCH NOTES ✦',
    body: `
        <div style="line-height:1.7; font-size:13px;">
            <div style="color:#f1c40f; font-size:11px; letter-spacing:0.12em; margin-bottom:10px;">APRIL 2026</div>

            <div style="color:#e0c97f; font-weight:bold; margin-bottom:4px;">ULTIMATE FORMS</div>
            <div style="color:rgba(255,255,255,0.75); margin-bottom:12px;">
                Every hero now has a unique <strong>Level 10 Ultimate</strong>. When you reach level 10, pick the transform card to unleash it:
                <br>🔥 Fire — <em>Inferno Incarnate</em> &nbsp;|&nbsp; 💧 Water — <em>Ocean Form</em> &nbsp;|&nbsp; ❄️ Ice — <em>Absolute Zero</em>
                <br>🌿 Plant — <em>Ancient Grove</em> &nbsp;|&nbsp; ⚙️ Metal — <em>Iron Fortress</em> &nbsp;|&nbsp; ⚡ Lightning — <em>Absolute Discharge</em>
                <br>🌀 Gravity — <em>Dark Star</em> &nbsp;|&nbsp; ☯️ Void — <em>System Collapse</em> &nbsp;|&nbsp; ✨ Spirit — <em>Divine Radiance</em>
                <br>🎲 Chance — <em>All In</em> &nbsp;|&nbsp; 🌪️ Air — <em>Storm Incarnate</em> &nbsp;|&nbsp; 🎵 Sound — <em>Grand Finale</em>
                <br>☠️ Poison — <em>Pandemic Protocol</em>
            </div>

            <div style="color:#e0c97f; font-weight:bold; margin-bottom:4px;">GAME FEEL</div>
            <div style="color:rgba(255,255,255,0.75); margin-bottom:12px;">
                • Hit flash on every enemy hit &nbsp;·&nbsp; directional death burst on kill<br>
                • Hit stop on heavy melee &amp; crits for satisfying impact<br>
                • Combo milestone animation at ×10 / ×25 / ×50 / ×100<br>
                • Low-HP heartbeat pulse on health bar &amp; screen vignette<br>
                • Poison-stacked enemies now show a visible toxic glow
            </div>

            <div style="color:#e0c97f; font-weight:bold; margin-bottom:4px;">BUG FIXES</div>
            <div style="color:rgba(255,255,255,0.75);">
                • Void Hero ultimate (ENTROPY) now works correctly<br>
                • Void biome obstacles now render with the correct cyberpunk style<br>
                • Void special icon now shows 👻 as intended<br>
                • Memory shards now glow in each hero's correct color<br>
                • Time &amp; Love heroes now appear in correct colors in the Museum<br>
                • Hero voice lines are now clearly audible over music<br>
                • DLC menu no longer plays the battle theme
            </div>
        </div>
    `,
    checkboxLabel: "Don't show this again"
});

infoDialogueManager.register({
    id: 'dlc_available_v1',
    title: '✦ DLCS AVAILABLE ✦',
    body: 'New DLC expansions are waiting in the <strong>DLCs</strong> section of the main menu.<br><br>Each expansion adds a new hero, biome, enemies, and story chapter. Head to <strong>DLCs</strong> to enable them.',
    checkboxLabel: "Don't show this again"
});

infoDialogueManager.register({
    id: 'cloud_save_v1',
    title: '☁ CLOUD SAVE',
    body: `
        <div style="line-height:1.75; font-size:13px; color:rgba(255,255,255,0.78);">
            Your progress can now be synced across devices using a personal cloud save server.
            <br><br>
            <div style="color:#5dade2; font-weight:bold; margin-bottom:4px;">HOW IT WORKS</div>
            Run the included server on any machine on your network — a Raspberry Pi works great.
            Once it's up, head to <strong>Options → Cloud Save</strong>, enter the server address,
            create an account, and turn on <strong>Cloud Sync</strong>.
            <br><br>
            From that point on your save is uploaded automatically after every game and loaded
            fresh each time you start — on any device that can reach the server.
            <br><br>
            <div style="color:#5dade2; font-weight:bold; margin-bottom:4px;">CONFLICT HANDLING</div>
            If saves on two devices have diverged, the game will ask you which version to keep
            before the menu loads. The other copy is overwritten, so you're always in control.
            <br><br>
            <div style="color:rgba(255,255,255,0.4); font-size:11px;">
                The server files are in the <em>server/</em> folder of the game directory.
                See <em>server/README.md</em> for setup instructions.
            </div>
        </div>
    `,
    checkboxLabel: "Don't show this again"
});
