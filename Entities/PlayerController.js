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

        // Find specific gamepad index OR first connected one if index is 0 and we want default behavior?
        // To support multiplayer, we must respect this.gamepadIndex
        if (gamepads[this.gamepadIndex] && gamepads[this.gamepadIndex].connected) {
            gp = gamepads[this.gamepadIndex];
        } else if (this.gamepadIndex === 0) {
            // Fallback for Player 1: Grab first available if index 0 is missing? 
            // Or strict mapping? Strict mapping is better for fixed slots, 
            // but original logic just grabbed "any". Let's stick to original logic for P1 (index 0).
            for (let g of gamepads) { if (g && g.connected) { gp = g; break; } }
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
            if (gp.buttons[7].pressed || gp.buttons[5].pressed) shoot = true;

            // Melee: LT (Button 6) or X (Button 2)
            if (gp.buttons[6].pressed || gp.buttons[2].pressed) melee = true;

            // Dash: B (Button 1) or LB (Button 4) or A (Button 0)
            if ((gp.buttons[1].pressed || gp.buttons[4].pressed || gp.buttons[0].pressed)) dash = true;

            // Special: Y (Button 3)
            if (gp.buttons[3].pressed) special = true;

            // Pause: Start (Button 9)
            if (gp.buttons[9].pressed) pause = true;
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
            return player.getAIInput(player, this, this.target);
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
