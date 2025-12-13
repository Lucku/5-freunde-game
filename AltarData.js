// --- ALTAR OF MASTERY CONFIGURATION ---
const ALTAR_TREE = {
    fire: [
        { id: 'f1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Inferno Cooldown -10%' },
        { id: 'f2', req: 3, type: 'stat', stat: 'radius', val: 1.2, desc: 'Inferno Radius +20%' },
        { id: 'f3', req: 5, type: 'unique', desc: 'Lingering Flame: Inferno leaves burning ground' }
    ],
    water: [
        { id: 'w1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Tidal Wave Cooldown -10%' },
        { id: 'w2', req: 3, type: 'stat', stat: 'pushback', val: 1.3, desc: 'Tidal Wave Pushback +30%' },
        { id: 'w3', req: 5, type: 'unique', desc: 'Tsunami: Tidal Wave width increased by 50%' }
    ],
    ice: [
        { id: 'i1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Deep Freeze Cooldown -10%' },
        { id: 'i2', req: 3, type: 'stat', stat: 'duration', val: 1.5, desc: 'Freeze Duration +50%' },
        { id: 'i3', req: 5, type: 'unique', desc: 'Shatter: Frozen enemies take 2x damage' }
    ],
    plant: [
        { id: 'p1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Overgrowth Cooldown -10%' },
        { id: 'p2', req: 3, type: 'stat', stat: 'heal', val: 1.2, desc: 'Overgrowth Heal +20%' },
        { id: 'p3', req: 5, type: 'unique', desc: 'Thornmail: Overgrowth reflects damage for 5s' }
    ],
    metal: [
        { id: 'm1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Iron Will Cooldown -10%' },
        { id: 'm2', req: 3, type: 'stat', stat: 'duration', val: 1.5, desc: 'Invincibility Duration +50%' },
        { id: 'm3', req: 5, type: 'unique', desc: 'Magnetic Field: Pulls enemies in while active' }
    ],
    black: [
        { id: 'b1', req: 1, type: 'stat', stat: 'cooldown', val: 0.9, desc: 'Void Eruption Cooldown -10%' },
        { id: 'b2', req: 3, type: 'stat', stat: 'radius', val: 1.25, desc: 'Void Eruption Radius +25%' },
        { id: 'b3', req: 5, type: 'unique', desc: 'Event Horizon: Void Eruption pulls enemies before exploding' }
    ],
    convergence: [
        { id: 'c1', req: { fire: 5, water: 5 }, type: 'mutation', desc: 'Boiling Wave: Tidal Wave applies Fire DoT' },
        { id: 'c2', req: { ice: 5, metal: 5 }, type: 'mutation', desc: 'Frostbite Armor: Iron Will freezes attackers' },
        { id: 'c3', req: { plant: 5, black: 5 }, type: 'mutation', desc: 'Corrupted Growth: Overgrowth drains enemy life' }
    ]
};
