class PlayerController {
    constructor() {
        this.type = 'BASE';
    }

    getInput(player) {
        // Return default "no input" state
        return {
            x: 0,
            y: 0,
            aimAngle: player.aimAngle || 0,
            shoot: false,
            melee: false,
            dash: false,
            special: false,
            pause: false,
            usingGamepad: false
        };
    }
}

class HumanController extends PlayerController {
    constructor(gamepadIndex = 0) {
        super();
        this.type = 'HUMAN';
        this.gamepadIndex = gamepadIndex;
    }

    getInput(player) {
        let dx = 0;
        let dy = 0;
        let shoot = false;
        let melee = false;
        let dash = false;
        let special = false;
        let pause = false;
        let usingGamepad = player.usingGamepad;
        let aimAngle = player.aimAngle;

        // 1. Keyboard Input
        // Note: We access the global 'keys' object from InputManager logic
        if (typeof keys !== 'undefined') {
            if (keys['w'] || keys['arrowup']) dy = -1;
            if (keys['s'] || keys['arrowdown']) dy = 1;
            if (keys['a'] || keys['arrowleft']) dx = -1;
            if (keys['d'] || keys['arrowright']) dx = 1;

            if (keys[' '] || keys['enter']) shoot = true; // Fallback shoot key? Usually auto or mouse.
        }

        // 2. Gamepad Input
        const gamepads = navigator.getGamepads();
        let gp = null;

        // Always scan for the first *real* controller so that USB receivers and
        // other low-button-count HID devices sitting at index 0 are skipped.
        // isRealGamepad() is defined in game.js and available during gameplay.
        if (typeof window.isRealGamepad === 'function') {
            for (let g of gamepads) { if (g && g.connected && window.isRealGamepad(g)) { gp = g; break; } }
        } else {
            if (gamepads[this.gamepadIndex] && gamepads[this.gamepadIndex].connected) {
                gp = gamepads[this.gamepadIndex];
            } else if (this.gamepadIndex === 0) {
                for (let g of gamepads) { if (g && g.connected) { gp = g; break; } }
            }
        }

        if (gp) {
            // Movement (Left Stick)
            if (Math.abs(gp.axes[0]) > 0.1) dx = gp.axes[0];
            if (Math.abs(gp.axes[1]) > 0.1) dy = gp.axes[1];

            // Aiming (Right Stick)
            if (Math.abs(gp.axes[2]) > 0.1 || Math.abs(gp.axes[3]) > 0.1) {
                aimAngle = Math.atan2(gp.axes[3], gp.axes[2]);
                usingGamepad = true;
            }

            // Actions
            // Shoot: RT (Button 7) or R1 (Button 5)
            if (gp.buttons[7]?.pressed || gp.buttons[5]?.pressed) shoot = true;

            // Melee: LT (Button 6) or X (Button 2)
            if (gp.buttons[6]?.pressed || gp.buttons[2]?.pressed) melee = true;

            // Dash: B (Button 1) or LB (Button 4) or A (Button 0)
            if (gp.buttons[1]?.pressed || gp.buttons[4]?.pressed || gp.buttons[0]?.pressed) dash = true;

            // Special: Y (Button 3)
            if (gp.buttons[3]?.pressed) special = true;

            // Pause: Start (Button 9)
            if (gp.buttons[9]?.pressed) pause = true;
        }

        // 3. Mouse Input (Only for Player 1 / Default Controller)
        // Only if not using gamepad
        if (!usingGamepad && this.gamepadIndex === 0 && typeof mouse !== 'undefined') {
            const arenaRef = (typeof arena !== 'undefined') ? arena : window.arena; // Try global scope first, then window
            const camX = arenaRef ? arenaRef.camera.x : 0;
            const camY = arenaRef ? arenaRef.camera.y : 0;

            // Calculate aim angle based on mouse pos relative to player
            aimAngle = Math.atan2((mouse.y + camY) - player.y, (mouse.x + camX) - player.x);

            if (mouse.leftDown) shoot = true;
            if (mouse.rightDown) melee = true;
        }

        return { x: dx, y: dy, aimAngle, shoot, melee, dash, special, pause, usingGamepad };
    }
}

class AIController extends PlayerController {
    constructor(targetPlayer) {
        super();
        this.type = 'AI';
        this.target = targetPlayer; // The Player instance to fight
        this.changeDirTimer = 0;
        this.moveDir = { x: 0, y: 0 };
    }

    getInput(player) {
        let dx = 0;
        let dy = 0;
        let shoot = false;
        let melee = false;
        let dash = false;
        let special = false;
        let aimAngle = player.aimAngle || 0;

        if (!this.target) {
            // Idle or acquire target
            // In versus, target is global 'player' potentially, or we pass it in.
            if (typeof window.player !== 'undefined' && window.player !== player) {
                this.target = window.player;
            }
        }

        // Custom AI Hook for specific Heroes (DLCs)
        if (player.getAIInput) {
            const customInput = player.getAIInput(player, this, this.target);
            if (customInput) return customInput;
            // null/undefined means "fall through to default AI"
        }

        if (this.target) {
            const dist = Math.hypot(this.target.x - player.x, this.target.y - player.y);

            // Aim at target
            aimAngle = Math.atan2(this.target.y - player.y, this.target.x - player.x);

            // Movement Logic
            // 1. If too far, close in
            // 2. If too close, back off (kite)
            // 3. Strafe

            if (dist > 400) {
                // Close in
                dx = Math.cos(aimAngle);
                dy = Math.sin(aimAngle);
            } else if (dist < 200) {
                // Back off
                dx = -Math.cos(aimAngle);
                dy = -Math.sin(aimAngle);
            } else {
                // Strafe
                this.changeDirTimer--;
                if (this.changeDirTimer <= 0) {
                    this.changeDirTimer = 60;
                    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
                }
                dx = Math.cos(aimAngle + (Math.PI / 2 * this.strafeDir));
                dy = Math.sin(aimAngle + (Math.PI / 2 * this.strafeDir));
            }

            // Attack Logic
            if (dist < 600) shoot = true; // Always shoot if in range
            if (dist < 150) melee = true; // Melee if close

            // Random Dash
            if (Math.random() < 0.01) dash = true;

            // Random Special
            if (Math.random() < 0.001) special = true;
        }

        return { x: dx, y: dy, aimAngle, shoot, melee, dash, special, pause: false, usingGamepad: false };
    }
}

/**
 * CompanionAIController — drives a story companion hero.
 * Targets enemies (not the player), supports the player like a co-op partner.
 */
class CompanionAIController extends PlayerController {
    constructor() {
        super();
        this.type = 'COMPANION_AI';
        this._shootTimer  = 0;
        this._meleeTimer  = 0;
        this._specialTimer = 180;
        this._dashTimer   = 0;
        this._stuckTimer  = 0;
        this._lastX = null;
        this._lastY = null;
    }

    getInput(player) {
        // Find nearest alive enemy
        let nearest = null;
        let minDist  = Infinity;
        if (typeof enemies !== 'undefined') {
            enemies.forEach(e => {
                if (e.hp <= 0) return;
                const d = Math.hypot(e.x - player.x, e.y - player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            });
        }

        const p1 = (typeof window !== 'undefined' && window.player && window.player !== player)
            ? window.player : null;

        // ── Revival priority: walk to P1's marker if P1 is down ─────────────
        const reviveMarker = (typeof p1RevivalMarker !== 'undefined') ? p1RevivalMarker : null;
        if (reviveMarker && p1 && p1.isDead) {
            const dx = reviveMarker.x - player.x;
            const dy = reviveMarker.y - player.y;
            const d  = Math.hypot(dx, dy);
            // Move toward marker; stand still once inside activation radius
            const mx = d > 35 ? dx / d : 0;
            const my = d > 35 ? dy / d : 0;
            const aimAngle = d > 5
                ? Math.atan2(dy, dx)
                : player.aimAngle;
            return { x: mx, y: my, aimAngle, usingGamepad: true,
                shoot: false, melee: false, dash: false, special: false, pause: false };
        }

        // Movement
        const ENGAGE_RANGE = 220;
        const FLEE_RANGE   = 90;
        const LOW_HP_RATIO = 0.28;
        const P1_LEASH     = 800;

        let mx = 0, my = 0;
        const lowHp = player.hp < player.maxHp * LOW_HP_RATIO;

        if (nearest) {
            const dx  = nearest.x - player.x;
            const dy  = nearest.y - player.y;
            const len = Math.max(minDist, 1);

            if (lowHp || minDist < FLEE_RANGE) {
                mx = -(dx / len);
                my = -(dy / len);
            } else if (minDist > ENGAGE_RANGE) {
                mx = dx / len;
                my = dy / len;
            }
        } else if (p1) {
            // No enemies — drift back toward P1
            const dx = p1.x - player.x;
            const dy = p1.y - player.y;
            const d  = Math.hypot(dx, dy);
            if (d > P1_LEASH) { mx = dx / d; my = dy / d; }
        }

        // Stuck detection
        this._stuckTimer--;
        if (this._lastX !== null) {
            const moved = Math.hypot(player.x - this._lastX, player.y - this._lastY);
            if (moved < 1.5 && (mx !== 0 || my !== 0) && this._stuckTimer <= 0) {
                const a = Math.random() * Math.PI * 2;
                mx = Math.cos(a);
                my = Math.sin(a);
                this._stuckTimer = 40;
            }
        }
        if (this._stuckTimer <= -90) {
            this._lastX = player.x;
            this._lastY = player.y;
            this._stuckTimer = 0;
        }

        // Aim
        const aimAngle = nearest
            ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
            : player.aimAngle;

        // Shoot
        this._shootTimer--;
        const shoot = nearest !== null && minDist < 520 && this._shootTimer <= 0;
        if (shoot) this._shootTimer = 6;

        // Melee
        this._meleeTimer--;
        const melee = nearest !== null && minDist < 95 && this._meleeTimer <= 0;
        if (melee) this._meleeTimer = 55;

        // Dash away when low HP and cornered
        this._dashTimer--;
        let dash = false;
        if (this._dashTimer <= 0 && lowHp && nearest && minDist < 120) {
            dash = true;
            this._dashTimer = 120;
        }

        // Special
        this._specialTimer--;
        const special = nearest !== null && this._specialTimer <= 0 && !lowHp;
        if (special) this._specialTimer = 420;

        return { x: mx, y: my, aimAngle, usingGamepad: true, shoot, melee, dash, special, pause: false };
    }
}
