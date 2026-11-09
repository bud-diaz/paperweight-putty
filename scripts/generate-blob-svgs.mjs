#!/usr/bin/env node
// Deterministically generates every pre-rendered material texture. GNOME
// Shell only loads the resulting files; there is no runtime SVG generation.

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {PALETTES, validatedTextColor} from '../theme.js';
import {
    NODE_WIDTH, NODE_HEIGHT, PANEL_WIDTH, PANEL_HEIGHT, PANEL_MARGIN,
    BRIDGE_OVERLAP, BRIDGE_THICKNESS,
} from '../nodePosition.js';

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const CHECK = process.argv.includes('--check');
const outputs = new Map();

function renderBlob({width, height, circles, depressions = [], gradient, palette}) {
    const circleEls = circles.map(c =>
        `<ellipse cx="${c.x}" cy="${c.y}" rx="${c.rx ?? c.r}" ry="${c.ry ?? c.r}"/>`).join('');
    const depressionEls = depressions.map(d =>
        `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.rx}" ry="${d.ry}"/>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="goo" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${gradient.gooBlur}" result="blur"/>
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo"/>
    </filter>
    <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="${gradient.shadowDy}" stdDeviation="${gradient.shadowBlur}" flood-color="#000000" flood-opacity="${gradient.shadowOpacity ?? 0.4}"/>
    </filter>
    <radialGradient id="puttyGradient" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}">
      <stop offset="0%" stop-color="${palette.highlight}"/>
      <stop offset="55%" stop-color="${palette.base}"/>
      <stop offset="100%" stop-color="${palette.shadow}"/>
    </radialGradient>
  </defs>
  <g filter="url(#dropshadow)"><g filter="url(#goo)" fill="url(#puttyGradient)">${circleEls}</g></g>
  <g opacity="0.16" fill="${palette.deepShadow}">${depressionEls}</g>
</svg>
`;
}

const DIRECTION_VECTORS = {
    east: [1, 0],
    'south-east': [0.7, 0.7],
    south: [0, 1],
    'south-west': [-0.7, 0.7],
    west: [-1, 0],
    'north-west': [-0.7, -0.7],
    north: [0, -1],
    'north-east': [0.7, -0.7],
};

const NODE_POSES = [
    'neutral', ...Object.keys(DIRECTION_VECTORS), 'pressed', 'lifted', 'impact', 'rebound',
];

function nodeShape(pose) {
    let sx = 1;
    let sy = 1;
    let shiftX = 0;
    let shiftY = 0;
    let shadowDy = 3;
    let shadowBlur = 3;
    if (DIRECTION_VECTORS[pose]) {
        [shiftX, shiftY] = DIRECTION_VECTORS[pose].map(value => value * 2.2);
        sx = 1 + Math.abs(shiftX) * 0.012;
        sy = 1 + Math.abs(shiftY) * 0.012;
    } else if (pose === 'pressed') {
        sx = 1.045; sy = 0.94; shiftY = 2;
    } else if (pose === 'lifted') {
        sx = 1.035; sy = 1.025; shiftY = -1; shadowDy = 5; shadowBlur = 4.5;
    } else if (pose === 'impact') {
        sx = 1.08; sy = 0.89; shiftY = 3;
    } else if (pose === 'rebound') {
        sx = 0.98; sy = 1.055; shiftY = -1;
    }

    const transform = ({x, y, r}) => ({
        x: 32 + (x - 32) * sx + shiftX,
        y: 31 + (y - 31) * sy + shiftY,
        rx: r * sx,
        ry: r * sy,
    });
    return {
        circles: [
            {x: 32, y: 31, r: 21},
            {x: 20, y: 38, r: 13},
            {x: 45, y: 24, r: 11},
        ].map(transform),
        depressions: [
            {x: 39 + shiftX * 0.4, y: 38 + shiftY * 0.4, rx: 6 * sx, ry: 4 * sy},
            {x: 24 + shiftX * 0.4, y: 21 + shiftY * 0.4, rx: 4 * sx, ry: 3 * sy},
        ],
        shadowDy,
        shadowBlur,
    };
}

function renderNode(palette, pose) {
    const shape = nodeShape(pose);
    return renderBlob({
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        palette,
        circles: shape.circles,
        depressions: shape.depressions,
        gradient: {
            cx: '38%', cy: '32%', r: '75%', gooBlur: 4,
            shadowDy: shape.shadowDy, shadowBlur: shape.shadowBlur,
        },
    });
}

function renderPanel(palette) {
    return renderBlob({
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        palette,
        gradient: {cx: '32%', cy: '22%', r: '90%', gooBlur: 10, shadowDy: 5, shadowBlur: 6},
        circles: [
            {x: 95, y: 120, r: 100}, {x: 225, y: 110, r: 108}, {x: 355, y: 120, r: 100},
            {x: 55, y: 65, r: 42}, {x: 145, y: 55, r: 40}, {x: 225, y: 60, r: 38},
            {x: 305, y: 55, r: 40}, {x: 395, y: 65, r: 42},
        ],
        depressions: [{x: 150, y: 135, rx: 12, ry: 6}, {x: 300, y: 140, rx: 10, ry: 5}],
    });
}

function renderBridge(palette, side) {
    const horizontal = side === 'left' || side === 'right';
    const longSize = PANEL_MARGIN + BRIDGE_OVERLAP * 2;
    const width = horizontal ? longSize : BRIDGE_THICKNESS;
    const height = horizontal ? BRIDGE_THICKNESS : longSize;
    const circles = horizontal
        ? [{x: 7, y: height / 2, rx: 10, ry: 12}, {x: width / 2, y: height / 2 - 1, rx: 11, ry: 13}, {x: width - 7, y: height / 2, rx: 10, ry: 12}]
        : [{x: width / 2, y: 7, rx: 12, ry: 10}, {x: width / 2 + 1, y: height / 2, rx: 13, ry: 11}, {x: width / 2, y: height - 7, rx: 12, ry: 10}];
    return renderBlob({
        width, height, palette, circles,
        gradient: {cx: '35%', cy: '30%', r: '90%', gooBlur: 3, shadowDy: 2, shadowBlur: 2, shadowOpacity: 0.25},
    });
}

for (const [name, palette] of Object.entries(PALETTES)) {
    // Fail generation early if a palette author accidentally ships unreadable
    // text without allowing the declared fallback to be calculated.
    validatedTextColor(palette);
    for (const pose of NODE_POSES)
        outputs.set(`node-${name}-${pose}.svg`, renderNode(palette, pose));
    outputs.set(`panel-${name}.svg`, renderPanel(palette));
    for (const side of ['left', 'right', 'above', 'below'])
        outputs.set(`bridge-${name}-${side}.svg`, renderBridge(palette, side));
}

outputs.set('node-default.svg', outputs.get('node-plum-neutral.svg'));
outputs.set('panel-default.svg', outputs.get('panel-plum.svg'));

if (CHECK) {
    const changed = [];
    for (const [name, contents] of outputs) {
        const path = join(ASSETS_DIR, name);
        if (!existsSync(path) || readFileSync(path, 'utf8') !== contents)
            changed.push(name);
    }
    if (changed.length > 0) {
        console.error(`Generated assets are stale: ${changed.join(', ')}`);
        process.exitCode = 1;
    } else {
        console.log(`Verified ${outputs.size} generated assets`);
    }
} else {
    mkdirSync(ASSETS_DIR, {recursive: true});
    for (const [name, contents] of outputs)
        writeFileSync(join(ASSETS_DIR, name), contents);
    console.log(`Wrote ${outputs.size} generated assets`);
}
