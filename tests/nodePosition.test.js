import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clampPosition, toNormalized, fromNormalized, computePanelPlacement} from '../nodePosition.js';

const workArea = {x: 0, y: 0, width: 1920, height: 1080};

test('clampPosition leaves an in-bounds rect untouched', () => {
    const result = clampPosition({x: 100, y: 100, width: 56, height: 56, workArea});
    assert.deepEqual(result, {x: 100, y: 100});
});

test('clampPosition pulls an off-screen rect back onto the work area', () => {
    const result = clampPosition({x: 5000, y: 5000, width: 56, height: 56, workArea});
    assert.deepEqual(result, {x: 1864, y: 1024});
});

test('toNormalized/fromNormalized round-trip', () => {
    const normalized = toNormalized({x: 960, y: 540, workArea});
    assert.deepEqual(normalized, {fx: 0.5, fy: 0.5});
    const restored = fromNormalized({...normalized, workArea});
    assert.deepEqual(restored, {x: 960, y: 540});
});

test('app content uses child alignment inside the panel bin', () => {
    const panelSource = readFileSync(new URL('../panel.js', import.meta.url), 'utf8');

    // St.Bin reads alignment from its child (the panel box), not itself.
    assert.match(panelSource, /const box = new St\.BoxLayout\(\{\s*vertical: true,\s*style_class: 'putty-panel',\s*x_align: Clutter\.ActorAlign\.CENTER,\s*y_align: Clutter\.ActorAlign\.CENTER,\s*\}\)/);
});

test('shorter app rows center themselves inside their full-width wrappers', () => {
    const panelSource = readFileSync(new URL('../panel.js', import.meta.url), 'utf8');

    assert.match(panelSource, /row\.x_align\s*=\s*Clutter\.ActorAlign\.CENTER/);
    assert.match(panelSource, /x_expand:\s*true/);
});

test('panel placement flips left+clamped when Node is near the top-right corner', () => {
    const placement = computePanelPlacement({
        nodeRect: {x: 1850, y: 20, width: 56, height: 56},
        panelSize: {width: 240, height: 300},
        workArea,
    });
    assert.equal(placement.side, 'left');
    assert.equal(placement.y, 0);
    assert.ok(placement.x + 240 <= workArea.width);
});

test('panel placement flips right+clamped when Node is near the bottom-left corner', () => {
    const placement = computePanelPlacement({
        nodeRect: {x: 20, y: 1000, width: 56, height: 56},
        panelSize: {width: 240, height: 300},
        workArea,
    });
    assert.equal(placement.side, 'right');
    assert.ok(placement.y + 300 <= workArea.height);
    assert.ok(placement.x >= 0);
});
