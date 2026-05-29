// #48 — cross-platform vector icon helper.
import { describe, it, expect } from 'vitest';
import { iconHTML } from '../Icons.js';

describe('iconHTML (#48)', () => {
    it('returns inline SVG for a mapped emoji', () => {
        const html = iconHTML('⚔️');
        expect(html).toContain('<svg');
        expect(html).toContain('</svg>');
        expect(html).toContain('currentColor');
    });

    it('matches whether or not the FE0F variation selector is present', () => {
        expect(iconHTML('⚔️')).toContain('<svg'); // with selector
        expect(iconHTML('⚔')).toContain('<svg');   // without selector
    });

    it('falls back to the raw glyph for an unmapped emoji (non-breaking)', () => {
        expect(iconHTML('🦄')).toBe('🦄');
    });

    it('returns empty string for empty input', () => {
        expect(iconHTML('')).toBe('');
        expect(iconHTML(undefined)).toBe('');
    });

    it('honors the size argument', () => {
        expect(iconHTML('🎯', 34)).toContain('width="34"');
        expect(iconHTML('🎯', 34)).toContain('height="34"');
    });

    it('covers the full CHAOS_REWARDS / UPGRADE_POOL emoji vocabulary', () => {
        for (const e of ['⚔️', '❤️', '👟', '🛡️', '💰', '🍀', '🧠', '⏳', '💥', '🎯', '🏹']) {
            expect(iconHTML(e), `${e} should map to an SVG`).toContain('<svg');
        }
    });
});
