import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeFavoriteIds, addFavorite, removeFavorite, moveFavorite, deduplicateRunning,
} from '../favorites.js';

test('favorite ordering operations are atomic and deduplicated', () => {
    assert.deepEqual(normalizeFavoriteIds(['a.desktop', 'b.desktop', 'a.desktop', '']),
        ['a.desktop', 'b.desktop']);
    assert.deepEqual(addFavorite(['a.desktop'], 'b.desktop'), ['a.desktop', 'b.desktop']);
    assert.deepEqual(addFavorite(['a.desktop'], 'a.desktop'), ['a.desktop']);
    assert.deepEqual(removeFavorite(['a.desktop', 'b.desktop'], 'a.desktop'), ['b.desktop']);
    assert.deepEqual(moveFavorite(['a.desktop', 'b.desktop', 'c.desktop'], 2, 0),
        ['c.desktop', 'a.desktop', 'b.desktop']);
});

test('running apps are deduplicated against favorites and themselves', () => {
    const apps = [{id: 'a'}, {id: 'b'}, {id: 'b'}, {id: 'c'}];
    assert.deepEqual(deduplicateRunning(['a'], apps, app => app.id), [apps[1], apps[3]]);
});
