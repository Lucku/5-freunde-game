class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, leftDown: false, rightDown: false };
        this.lastInputType = 'MOUSE';

        // Expose to window for backward compatibility with Player.js and game.js
        window.keys = this.keys;
        window.mouse = this.mouse;

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            if (this.onKeyDown) this.onKeyDown(e);
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
            if (this.onKeyUp) this.onKeyUp(e);
        });

        window.addEventListener('mousemove', e => {
            this.lastInputType = 'MOUSE';
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;

            // If mouse moves, switch back to mouse aiming
            if (window.player) window.player.usingGamepad = false;
        });

        // Mouse Listeners
        window.addEventListener('mousedown', e => {
            this.lastInputType = 'MOUSE';
            // Check global game states - Ideally these should be checked by the consumer, 
            // but for preserving behavior we check them here or we just track the mouse state 
            // and let the game loop check it. 
            // The original code set `mouse.leftDown = true` ONLY if game conditions met?
            // Let's check the original code. 
            // Original: if (!gameRunning || gamePaused || isLevelingUp || isShopping) return;
            // This implies mouse clicks don't register if paused.

            if (typeof gameRunning !== 'undefined' && (!gameRunning || gamePaused || isLevelingUp || isShopping)) return;

            if (e.button === 0) this.mouse.leftDown = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        window.addEventListener('mouseup', e => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', e => e.preventDefault());
    }
}
