'use strict';

/**
 * NetworkInputController
 *
 * Plugs into Player.controller so that Player.update() dispatches movement and
 * actions from network-received input instead of keyboard/gamepad.
 *
 * GameSession sets player.moveInput.x/y from applyInput() each network frame.
 * Pending one-shot actions (_pendingShoot, etc.) are latched by applyInput()
 * and cleared here when consumed by Player.update().
 */
class NetworkInputController {
    constructor() {
        this.gamepadIndex = -1; // not a real gamepad
    }

    getInput(player) {
        const shoot   = player._pendingShoot   ?? false;
        const melee   = player._pendingMelee   ?? false;
        const dash    = player._pendingDash    ?? false;
        const special = player._pendingSpecial ?? false;

        // Clear one-shot flags so they don't fire twice
        player._pendingShoot   = false;
        player._pendingMelee   = false;
        player._pendingDash    = false;
        player._pendingSpecial = false;

        return {
            x:          player.moveInput?.x ?? 0,
            y:          player.moveInput?.y ?? 0,
            aimAngle:   player.aimAngle ?? 0,
            usingGamepad: false,
            shoot,
            melee,
            dash,
            special,
            pause: false,
        };
    }
}

module.exports = NetworkInputController;
