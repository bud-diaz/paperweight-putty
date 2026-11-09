import test from 'node:test';
import assert from 'node:assert/strict';
import {
    PALETTES, normalizePaletteName, getPalette, contrastRatio, validatedTextColor,
} from '../theme.js';

test('unknown palettes fall back to Plum', () => {
    assert.equal(normalizePaletteName('neon'), 'plum');
    assert.equal(getPalette('neon'), PALETTES.plum);
});

test('every palette resolves a readable primary text color', () => {
    for (const palette of Object.values(PALETTES)) {
        assert.ok(contrastRatio(palette.primaryText, palette.base) >= 4.5);
        assert.ok(contrastRatio(validatedTextColor(palette), palette.base) >= 4.5);
        assert.equal(validatedTextColor(palette), palette.primaryText);
    }
});
