import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMotionStyle, resolveMotionPolicy, motionDuration} from '../motion.js';

test('motion policy follows GNOME animations on Shell 50', () => {
    assert.equal(resolveMotionPolicy('system', true), 'full');
    assert.equal(resolveMotionPolicy('system', false), 'off');
    assert.equal(resolveMotionPolicy('reduced', true), 'reduced');
    assert.equal(resolveMotionPolicy('off', true), 'off');
});

test('invalid motion values fall back to system', () => {
    assert.equal(normalizeMotionStyle('elastic'), 'system');
    assert.equal(resolveMotionPolicy('elastic', false), 'off');
});

test('motion duration selects full, reduced, and immediate paths', () => {
    assert.equal(motionDuration('full', 280, 80), 280);
    assert.equal(motionDuration('reduced', 280, 80), 80);
    assert.equal(motionDuration('off', 280, 80), 0);
});
