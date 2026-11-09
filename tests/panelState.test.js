import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPanelState, panelPressDisposition} from '../panelState.js';

test('panel follows explicit closed, opening, open, and closing states', () => {
    let state = nextPanelState('closed', 'open');
    assert.equal(state, 'opening');
    state = nextPanelState(state, 'finish');
    assert.equal(state, 'open');
    state = nextPanelState(state, 'close');
    assert.equal(state, 'closing');
    state = nextPanelState(state, 'force-close');
    assert.equal(state, 'closed');
});

test('interrupted opening and closing settle deterministically', () => {
    assert.equal(nextPanelState('opening', 'close'), 'closing');
    assert.equal(nextPanelState('opening', 'force-close'), 'closed');
    assert.equal(nextPanelState('closing', 'finish'), 'closing');
    assert.equal(nextPanelState('closing', 'force-close'), 'closed');
});

test('only a press outside the visible panel subtree dismisses it', () => {
    assert.equal(panelPressDisposition(true), 'propagate');
    assert.equal(panelPressDisposition(false), 'dismiss');
});
