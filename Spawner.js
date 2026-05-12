// Spawner.js — extracted from game.js (improvement #1 phase B).
//
// Owns the cookie-cutter spawn / FX-burst helpers that were sprinkled across
// game.js. Functions reach into the shared entity arrays via `window.*`
// (game.js mirrors `particles`, `enemies`, `projectiles`, `floatingTexts`
// onto window so all modules see the same live reference).
//
// Public surface (also mirrored on `window.*` for DLC back-compat):
//   createExplosion(x, y, color, count?)   — particle burst at a point
//   spawnLevelUpAura(x, y, color)          — staggered upward aura
//   spawnEnemy(elite?, forcedType?)        — push Enemy onto live array
//   spawnBoss(id?)                         — unshift Boss (front of array)
//
// `spawnEnemy` / `spawnBoss` are thin wrappers around `new Enemy`/`new Boss`
// — they exist so callers can stay agnostic about which array the entity
// goes into, and so Wave.js + DLCs share a single chokepoint.

import { Particle } from './Entities/Particle.js';
import { Enemy } from './Enemy.js';
import { Boss } from './Boss.js';
import { GAMEPLAY } from './Constants.js';

const MAX_PARTICLES = GAMEPLAY.MAX_PARTICLES;

export function createExplosion(x, y, color, count = 10) {
    const particles = window.particles;
    if (!particles || particles.length >= MAX_PARTICLES) return;
    for (let i = 0; i < 8; i++) { particles.push(Particle.acquire(x, y, color)); } // #20
}

export function spawnLevelUpAura(x, y, color) {
    const particles = window.particles;
    if (!particles) return;
    // Upward-rising aura particles — staggered with setTimeout for a flowing effect
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            if (!window.particles) return;
            const ox = (Math.random() - 0.5) * 28;
            const oy = (Math.random() - 0.5) * 10;
            const p = Particle.acquire(x + ox, y + oy, color); // #20
            p.velocity.x = (Math.random() - 0.5) * 1.8;
            p.velocity.y = -(Math.random() * 3.2 + 1.2);
            p.life = Math.random() * 0.008 + 0.005;
            window.particles.push(p);
        }, i * 28);
    }
    // Burst ring at moment of level-up
    const ringCount = 18;
    for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        const speed = Math.random() * 1.5 + 1.5;
        const p = Particle.acquire(x, y, color); // #20
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.y = Math.sin(angle) * speed;
        p.life = 0.025;
        particles.push(p);
    }
}

export function spawnEnemy(elite = false, forcedType = null) {
    const enemies = window.enemies;
    if (!enemies) return null;
    const e = new Enemy(elite, forcedType);
    enemies.push(e);
    return e;
}

export function spawnBoss(id = undefined) {
    const enemies = window.enemies;
    if (!enemies) return null;
    const b = (id !== undefined) ? new Boss(id) : new Boss();
    enemies.unshift(b);
    return b;
}

window.createExplosion   = createExplosion;
window.spawnLevelUpAura  = spawnLevelUpAura;
window.spawnEnemy        = spawnEnemy;
window.spawnBoss         = spawnBoss;
