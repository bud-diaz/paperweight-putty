// Curated material palettes shared by the asset generator, preferences, and
// Shell actors. Runtime code only selects pre-rendered assets; it never writes
// or parses SVG data in GNOME Shell.

export const DEFAULT_PALETTE = 'plum';

export const PALETTES = Object.freeze({
    plum: Object.freeze({
        label: 'Plum',
        base: '#A878C8',
        highlight: '#C9A2E1',
        shadow: '#76518F',
        deepShadow: '#563A6B',
        primaryText: '#000000',
        secondaryText: '#30203C',
        focus: '#000000',
        runningIndicator: '#FFFFFF',
    }),
    terracotta: Object.freeze({
        label: 'Terracotta',
        base: '#B96850',
        highlight: '#E0A087',
        shadow: '#7D4436',
        deepShadow: '#512B24',
        primaryText: '#000000',
        secondaryText: '#351C17',
        focus: '#000000',
        runningIndicator: '#FFFFFF',
    }),
    moss: Object.freeze({
        label: 'Moss',
        base: '#668466',
        highlight: '#A5BCA1',
        shadow: '#425B45',
        deepShadow: '#2D3D30',
        primaryText: '#000000',
        secondaryText: '#1D2A1E',
        focus: '#000000',
        runningIndicator: '#FFFFFF',
    }),
    ocean: Object.freeze({
        label: 'Ocean',
        base: '#477DA6',
        highlight: '#89B7D8',
        shadow: '#315874',
        deepShadow: '#223C50',
        primaryText: '#000000',
        secondaryText: '#152A39',
        focus: '#000000',
        runningIndicator: '#FFFFFF',
    }),
    'high-contrast': Object.freeze({
        label: 'High Contrast',
        base: '#F2C94C',
        highlight: '#FFF2A8',
        shadow: '#8A7000',
        deepShadow: '#2B2300',
        primaryText: '#171300',
        secondaryText: '#2B2300',
        focus: '#005FCC',
        runningIndicator: '#171300',
    }),
});

export const PALETTE_NAMES = Object.freeze(Object.keys(PALETTES));

export function normalizePaletteName(name) {
    return Object.hasOwn(PALETTES, name) ? name : DEFAULT_PALETTE;
}

export function getPalette(name) {
    return PALETTES[normalizePaletteName(name)];
}

function relativeLuminance(hex) {
    const channels = hex.slice(1).match(/.{2}/g).map(value => {
        const channel = Number.parseInt(value, 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
    const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
    const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
    return (light + 0.05) / (dark + 0.05);
}

export function validatedTextColor(palette) {
    if (contrastRatio(palette.primaryText, palette.base) >= 4.5)
        return palette.primaryText;
    const blackRatio = contrastRatio('#000000', palette.base);
    const whiteRatio = contrastRatio('#FFFFFF', palette.base);
    return blackRatio >= whiteRatio ? '#000000' : '#FFFFFF';
}

// Compatibility exports for consumers of the first static palette version.
export const PUTTY_BASE = PALETTES.plum.base;
export const PUTTY_HIGHLIGHT = PALETTES.plum.highlight;
export const PUTTY_SHADOW = PALETTES.plum.shadow;
export const PUTTY_DEEP_SHADOW = PALETTES.plum.deepShadow;
export const TEXT_PRIMARY = PALETTES.plum.primaryText;
export const TEXT_SECONDARY = PALETTES.plum.secondaryText;
export const RUNNING_INDICATOR = PALETTES.plum.runningIndicator;
