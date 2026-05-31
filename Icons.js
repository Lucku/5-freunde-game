// Cross-platform vector icons for DOM UI.
//
// Emoji render differently (or as tofu) across Windows / Linux / Steam Deck.
// `iconHTML(emoji)` maps the small set of gameplay emoji (CHAOS_REWARDS +
// UPGRADE_POOL, Constants.js) to inline SVG that renders identically on every
// platform. Unmapped emoji fall back to the raw glyph, so this is a safe
// drop-in at any `${icon}` template site — wire sites incrementally.
//
// SVGs use `fill="currentColor"` so they inherit the surrounding text color
// (e.g. the gold chaos-HUD / level-up card styling). 24×24 viewBox.

// Keyed WITHOUT the U+FE0F variation selector (stripped on lookup) so a glyph
// matches whether or not the source string carries the emoji-presentation VS.
const _ICON_PATHS = {
    // ⚔ damage — sword
    '⚔': '<path d="M12 2 L14.2 5 V14 H9.8 V5 Z"/><rect x="7" y="14" width="10" height="2.4" rx="0.6"/><rect x="11" y="16.4" width="2" height="5"/>',
    // ❤ health — heart
    '❤': '<path d="M12 21 C3 14 4 5.5 9 5.5 C11 5.5 12 7.6 12 7.6 C12 7.6 13 5.5 15 5.5 C20 5.5 21 14 12 21 Z"/>',
    // 👟 speed — fast-forward double chevron
    '\u{1F45F}': '<path d="M3 5 L11 12 L3 19 Z"/><path d="M12 5 L20 12 L12 19 Z"/>',
    // 🛡 defense — shield
    '\u{1F6E1}': '<path d="M12 2 L20 5 V11 C20 16 16.2 20 12 22 C7.8 20 4 16 4 11 V5 Z"/>',
    // 💰 gold — coin with $
    '\u{1F4B0}': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6.5 V17.5 M9.6 9.2 C9.6 7.9 14.4 7.9 14.4 10.1 C14.4 12.3 9.6 11.9 9.6 14.1 C9.6 16.3 14.4 16.3 14.4 14.8" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    // 🍀 luck — four-leaf clover
    '\u{1F340}': '<circle cx="12" cy="8" r="3.2"/><circle cx="8" cy="12" r="3.2"/><circle cx="16" cy="12" r="3.2"/><circle cx="12" cy="16" r="3.2"/><path d="M12 14 C12 17.5 11 20 9 22" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    // 🧠 xp — lightbulb (learning / idea)
    '\u{1F9E0}': '<path d="M12 2 C7.6 2 5 5 5 8.5 C5 11 6.6 12.6 8 14 V16 H16 V14 C17.4 12.6 19 11 19 8.5 C19 5 16.4 2 12 2 Z"/><rect x="9" y="16.8" width="6" height="2"/><rect x="9.6" y="19.4" width="4.8" height="1.7"/>',
    // ⏳ cooldown — hourglass (U+23F3, matches Constants.js)
    '⏳': '<path d="M6 3 H18 V6 L13 12 L18 18 V21 H6 V18 L11 12 L6 6 Z"/>',
    // 💥 radius — burst / explosion
    '\u{1F4A5}': '<path d="M12 2 L14 9 L21 7 L16 12 L21 17 L14 15 L12 22 L10 15 L3 17 L8 12 L3 7 L10 9 Z"/>',
    // 🎯 crit — target
    '\u{1F3AF}': '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.9"/>',
    // 🏹 projectile — bow & arrow
    '\u{1F3F9}': '<path d="M5 19 L19 5 M19 5 H13 M19 5 V11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19 l3.4 -1 -2.4 -2.4 z"/>',
};

/**
 * Inline-SVG markup for a known gameplay emoji, sized for a DOM `${...}` site.
 * Falls back to the original glyph when the emoji isn't in the icon set, so it
 * is always safe to wrap an existing `${icon}` interpolation.
 *
 * @param {string} emoji  the source glyph (with or without the FE0F selector)
 * @param {number} [size] pixel box (width = height), default 20
 * @returns {string} `<svg>…</svg>` markup, or the original emoji string
 */
export function iconHTML(emoji, size = 20) {
    if (!emoji) return '';
    const key = String(emoji).replace(/️/g, ''); // strip emoji variation selector
    const inner = _ICON_PATHS[key];
    if (!inner) return String(emoji);
    return `<svg class="game-icon" viewBox="0 0 24 24" width="${size}" height="${size}" `
        + `fill="currentColor" aria-hidden="true" focusable="false" `
        + `style="display:inline-block;vertical-align:-0.15em">${inner}</svg>`;
}

if (typeof window !== 'undefined') window.iconHTML = iconHTML;

export default iconHTML;
