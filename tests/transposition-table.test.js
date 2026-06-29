import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TRANSPOSITION_BOUNDS,
    createTranspositionEntry,
    probeTranspositionEntry,
    storeTranspositionEntry
} from '../src/ai/TranspositionTable.js';

test('transposition table exact entry yeterli derinlikte dogrudan kullanilir', () => {
    const table = new Map();
    storeTranspositionEntry(table, 'pos-a', createTranspositionEntry({
        depth: 5,
        score: 42,
        bound: TRANSPOSITION_BOUNDS.EXACT,
        move: { fromRow: 1, fromCol: 1, toRow: 2, toCol: 2 },
        age: 3
    }));

    const hit = probeTranspositionEntry(table, 'pos-a', { depth: 3, alpha: -100, beta: 100 });

    assert.equal(hit.usable, true);
    assert.equal(hit.score, 42);
    assert.equal(hit.entry.depth, 5);
});

test('transposition table sig entry daha derin aramada skor olarak kullanilmaz', () => {
    const table = new Map();
    storeTranspositionEntry(table, 'pos-a', createTranspositionEntry({
        depth: 2,
        score: 42,
        bound: TRANSPOSITION_BOUNDS.EXACT
    }));

    const hit = probeTranspositionEntry(table, 'pos-a', { depth: 4, alpha: -100, beta: 100 });

    assert.equal(hit.usable, false);
    assert.equal(hit.entry.score, 42);
});

test('transposition table lower ve upper bound sadece pencereyi kesiyorsa kullanilir', () => {
    const table = new Map();
    storeTranspositionEntry(table, 'lower', createTranspositionEntry({
        depth: 4,
        score: 120,
        bound: TRANSPOSITION_BOUNDS.LOWER
    }));
    storeTranspositionEntry(table, 'upper', createTranspositionEntry({
        depth: 4,
        score: -80,
        bound: TRANSPOSITION_BOUNDS.UPPER
    }));

    assert.equal(probeTranspositionEntry(table, 'lower', { depth: 3, alpha: 0, beta: 100 }).usable, true);
    assert.equal(probeTranspositionEntry(table, 'lower', { depth: 3, alpha: 0, beta: 150 }).usable, false);
    assert.equal(probeTranspositionEntry(table, 'upper', { depth: 3, alpha: -50, beta: 100 }).usable, true);
    assert.equal(probeTranspositionEntry(table, 'upper', { depth: 3, alpha: -120, beta: 100 }).usable, false);
});

test('transposition table daha derin entry uzerine sig entry yazmaz ve yasli entryleri budar', () => {
    const table = new Map();
    storeTranspositionEntry(table, 'keep-deep', createTranspositionEntry({
        depth: 6,
        score: 10,
        bound: TRANSPOSITION_BOUNDS.EXACT,
        age: 1
    }), { maxSize: 3 });
    storeTranspositionEntry(table, 'keep-deep', createTranspositionEntry({
        depth: 2,
        score: 99,
        bound: TRANSPOSITION_BOUNDS.EXACT,
        age: 9
    }), { maxSize: 3 });
    storeTranspositionEntry(table, 'old-shallow', createTranspositionEntry({ depth: 1, score: 1, age: 0 }), { maxSize: 3 });
    storeTranspositionEntry(table, 'new-mid', createTranspositionEntry({ depth: 3, score: 2, age: 8 }), { maxSize: 3 });
    storeTranspositionEntry(table, 'new-deep', createTranspositionEntry({ depth: 5, score: 3, age: 8 }), { maxSize: 3 });

    assert.equal(table.get('keep-deep').score, 10);
    assert.equal(table.has('old-shallow'), false);
    assert.equal(table.size, 3);
});

