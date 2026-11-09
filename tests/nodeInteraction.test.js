import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDirectionalPose, nextInteractionState} from '../nodeInteraction.js';

test('pointer vectors select all eight directional poses', () => {
    const vectors = [
        [10, 0, 'east'], [10, 10, 'south-east'], [0, 10, 'south'],
        [-10, 10, 'south-west'], [-10, 0, 'west'], [-10, -10, 'north-west'],
        [0, -10, 'north'], [10, -10, 'north-east'],
    ];
    for (const [dx, dy, expected] of vectors)
        assert.equal(selectDirectionalPose({dx, dy}), expected);
});

test('distance and angular hysteresis prevent pose flicker', () => {
    assert.equal(selectDirectionalPose({dx: 2, dy: 2, previousPose: 'east'}), 'neutral');
    assert.equal(selectDirectionalPose({dx: 10, dy: 5, previousPose: 'east'}), 'east');
});

test('interaction transitions survive an interrupted plop', () => {
    let state = 'rest';
    state = nextInteractionState(state, 'press');
    assert.equal(state, 'pressed');
    state = nextInteractionState(state, 'drag-start');
    assert.equal(state, 'dragging');
    state = nextInteractionState(state, 'release');
    assert.equal(state, 'plopping');
    state = nextInteractionState(state, 'press');
    assert.equal(state, 'pressed');
    state = nextInteractionState(state, 'settle');
    assert.equal(state, 'rest');
});
