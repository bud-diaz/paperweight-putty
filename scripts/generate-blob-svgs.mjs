#!/usr/bin/env node
// Generates the organic putty blob SVGs (node + panel) from the centralized
// palette in theme.js. Re-run this after editing theme.js to regenerate
// assets for a new theme. Not a runtime dependency of the extension --
// GNOME Shell only ever loads the resulting assets/*.svg files.
//
// Technique: a "goo" filter (feGaussianBlur + feColorMatrix alpha
// threshold) merges several overlapping circles into one smooth,
// organically-lobed silhouette -- the standard SVG metaball/blob-connector
// trick -- rather than hand-computing tangent-arc bezier paths.

import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {
    PUTTY_BASE, PUTTY_HIGHLIGHT, PUTTY_SHADOW, PUTTY_DEEP_SHADOW,
} from '../theme.js';
import {NODE_WIDTH, NODE_HEIGHT, PANEL_WIDTH, PANEL_HEIGHT} from '../nodePosition.js';

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function renderBlob({width, height, circles, depressions = [], gradient}) {
    const circleEls = circles
        .map(c => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}"/>`)
        .join('');
    const depressionEls = depressions
        .map(d => `<ellipse cx="${d.x}" cy="${d.y}" rx="${d.rx}" ry="${d.ry}"/>`)
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="goo" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${gradient.gooBlur}" result="blur"/>
      <feColorMatrix in="blur" mode="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo"/>
    </filter>
    <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="${gradient.shadowDy}" stdDeviation="${gradient.shadowBlur}"
        flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <radialGradient id="puttyGradient" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}">
      <stop offset="0%" stop-color="${PUTTY_HIGHLIGHT}"/>
      <stop offset="55%" stop-color="${PUTTY_BASE}"/>
      <stop offset="100%" stop-color="${PUTTY_SHADOW}"/>
    </radialGradient>
  </defs>
  <g filter="url(#dropshadow)">
    <g filter="url(#goo)" fill="url(#puttyGradient)">
      ${circleEls}
    </g>
  </g>
  <g opacity="0.16" fill="${PUTTY_DEEP_SHADOW}">
    ${depressionEls}
  </g>
</svg>
`;
}

const node = renderBlob({
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    gradient: {cx: '38%', cy: '32%', r: '75%', gooBlur: 4, shadowDy: 3, shadowBlur: 3},
    circles: [
        {x: 32, y: 31, r: 21},
        {x: 20, y: 38, r: 13},
        {x: 45, y: 24, r: 11},
    ],
    depressions: [
        {x: 39, y: 38, rx: 6, ry: 4},
        {x: 24, y: 21, rx: 4, ry: 3},
    ],
});

const panel = renderBlob({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    gradient: {cx: '32%', cy: '22%', r: '90%', gooBlur: 10, shadowDy: 5, shadowBlur: 6},
    circles: [
        // Wide, flat base capsule covering the full content area. Shifted
        // up from the first pass so the shape doesn't hard-clip against
        // the canvas bottom with zero padding while the top has ~45px --
        // that asymmetry was making centered content look top-anchored
        // relative to the visible blob, not the canvas.
        {x: 95, y: 120, r: 100},
        {x: 225, y: 110, r: 108},
        {x: 355, y: 120, r: 100},
        // Gentle lobes along the top edge -- small radius, mostly
        // overlapping the base, so they read as subtle waves rather
        // than distinct domes.
        {x: 55, y: 65, r: 42},
        {x: 145, y: 55, r: 40},
        {x: 225, y: 60, r: 38},
        {x: 305, y: 55, r: 40},
        {x: 395, y: 65, r: 42},
    ],
    depressions: [
        {x: 150, y: 135, rx: 12, ry: 6},
        {x: 300, y: 140, rx: 10, ry: 5},
    ],
});

writeFileSync(join(ASSETS_DIR, 'node-default.svg'), node);
writeFileSync(join(ASSETS_DIR, 'panel-default.svg'), panel);
console.log('Wrote assets/node-default.svg and assets/panel-default.svg');
