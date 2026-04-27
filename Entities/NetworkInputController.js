/**
 * NetworkInputController — assigned to player2 on the host.
 * Receives input messages from the guest via NetworkManager and feeds them
 * into the standard Player.update() input interface.
 */
class NetworkInputController {
    constructor() {
        this._current = { x: 0, y: 0, aimAngle: 0 };
        this._pending = { shoot: false, melee: false, dash: false, special: false };
    }

    /** Called by NetworkManager when a RELAY { type:'INPUT', … } arrives on the host. */
    receive(input) {
        this._current.x        = input.x        ?? this._current.x;
        this._current.y        = input.y        ?? this._current.y;
        this._current.aimAngle = input.aimAngle ?? this._current.aimAngle;
        // Latch actions so they aren't dropped between 20fps network ticks
        if (input.shoot)   this._pending.shoot   = true;
        if (input.melee)   this._pending.melee   = true;
        if (input.dash)    this._pending.dash     = true;
        if (input.special) this._pending.special  = true;
    }

    /** Called by Player.update() every frame via this.controller.getInput(). */
    getInput(_player) {
        const out = {
            x:        this._current.x,
            y:        this._current.y,
            aimAngle: this._current.aimAngle,
            shoot:    this._pending.shoot,
            melee:    this._pending.melee,
            dash:     this._pending.dash,
            special:  this._pending.special,
            pause:    false,
        };
        // Clear one-shot actions after consumption
        this._pending = { shoot: false, melee: false, dash: false, special: false };
        return out;
    }
}

/**
 * RecordingInputController — wraps any existing controller on the guest's player.
 * Passes inputs through normally AND forwards them to NetworkManager for relay.
 */
class RecordingInputController {
    constructor(inner) {
        this._inner = inner;
    }

    getInput(player) {
        const input = this._inner.getInput(player);
        if (window.networkManager) window.networkManager.latchInput(input);
        return input;
    }
}

window.NetworkInputController    = NetworkInputController;
window.RecordingInputController  = RecordingInputController;
