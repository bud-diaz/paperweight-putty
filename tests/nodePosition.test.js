import test from 'node:test';
import assert from 'node:assert/strict';
import {
    clampPosition, toNormalized, fromNormalized, computePanelPlacement,
    computeNodeGeometry, preserveCenterForResize, PANEL_WIDTH, PANEL_HEIGHT,
} from '../nodePosition.js';

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

test('node geometry keeps a native visual and a minimum 64px wrapper', () => {
    assert.deepEqual(computeNodeGeometry(0.85), {
        scale: 0.85,
        visualWidth: 54.4,
        visualHeight: 51,
        wrapperWidth: 64,
        wrapperHeight: 64,
        visualX: 0,
        visualY: 2,
    });
    assert.equal(computeNodeGeometry(1.5).wrapperWidth, 96);
    assert.equal(computeNodeGeometry(1.5).wrapperHeight, 90);
});

test('node geometry rejects invalid and out-of-range scales', () => {
    assert.equal(computeNodeGeometry(Number.NaN).scale, 1);
    assert.equal(computeNodeGeometry(0).scale, 0.85);
    assert.equal(computeNodeGeometry(3).scale, 1.5);
});

test('resizing the wrapper preserves its center', () => {
    assert.deepEqual(preserveCenterForResize({
        x: 100, y: 200, oldWidth: 64, oldHeight: 64, newWidth: 96, newHeight: 90,
    }), {x: 84, y: 187});
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
    assert.equal(placement.bridge.x, placement.x + 240 - 10);
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

test('panel placement stays in bounds at every supported node scale', () => {
    for (const scale of [0.85, 1, 1.25, 1.5]) {
        const node = computeNodeGeometry(scale);
        for (const [x, y] of [[0, 0], [1850, 0], [0, 1000], [1850, 1000]]) {
            const placement = computePanelPlacement({
                nodeRect: {x, y, width: node.wrapperWidth, height: node.wrapperHeight},
                panelSize: {width: PANEL_WIDTH, height: PANEL_HEIGHT},
                workArea,
            });
            assert.ok(placement.x >= workArea.x);
            assert.ok(placement.y >= workArea.y);
            assert.ok(placement.x + PANEL_WIDTH <= workArea.x + workArea.width);
            assert.ok(placement.y + PANEL_HEIGHT <= workArea.y + workArea.height);
            assert.ok(['left', 'right', 'above', 'below'].includes(placement.side));
        }
    }
});

test('bridge orientation and attachment geometry follow all panel sides', () => {
    const cases = [
        [{x: 10, y: 400}, 'right'],
        [{x: 1840, y: 400}, 'left'],
        [{x: 900, y: 10}, 'below'],
        [{x: 900, y: 1000}, 'above'],
    ];
    for (const [position, expectedSide] of cases) {
        const placement = computePanelPlacement({
            nodeRect: {...position, width: 64, height: 64},
            panelSize: {width: PANEL_WIDTH, height: PANEL_HEIGHT},
            workArea,
        });
        assert.equal(placement.side, expectedSide);
        if (expectedSide === 'left' || expectedSide === 'right')
            assert.ok(placement.bridge.width < placement.bridge.height);
        else
            assert.ok(placement.bridge.height < placement.bridge.width);
    }
});
