import test from 'node:test';
import assert from 'node:assert/strict';
import {planEnableAction, planDisableAction} from '../dockOwnership.js';

test('enabling while Ubuntu Dock is on claims ownership and disables it', () => {
    assert.deepEqual(planEnableAction(true), {shouldDisableUbuntuDock: true, newMarkerValue: true});
});

test('enabling while Ubuntu Dock is already off does not claim ownership', () => {
    assert.deepEqual(planEnableAction(false), {shouldDisableUbuntuDock: false, newMarkerValue: false});
});

test('disabling restores Ubuntu Dock when we own the prior disable', () => {
    assert.deepEqual(planDisableAction(true), {shouldEnableUbuntuDock: true, newMarkerValue: false});
});

test('disabling does not touch Ubuntu Dock when we never owned it', () => {
    assert.deepEqual(planDisableAction(false), {shouldEnableUbuntuDock: false, newMarkerValue: false});
});
