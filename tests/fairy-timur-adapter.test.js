import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import {
    collectTimurLegalMoves,
    coordToFairySquare,
    fairySquareToCoord,
    parseFairyUciMove,
    reconcileFairyMovesWithTimurRules
} from '../src/fairy/FairyTimurAdapter.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';

test('fairy adapter koordinatlari Timur tahtasina gore cevirir', () => {
    assert.equal(coordToFairySquare(9, 0), 'a1');
    assert.equal(coordToFairySquare(0, 10), 'k10');
    assert.deepEqual(fairySquareToCoord('f2'), { row: 8, col: 5 });
    assert.deepEqual(fairySquareToCoord('k10'), { row: 0, col: 10 });
    assert.deepEqual(parseFairyUciMove('d2h1'), {
        uci: 'd2h1',
        from: { row: 8, col: 3 },
        to: { row: 9, col: 7 },
        suffix: ''
    });
});

test('fairy adapter baslangic POC farklarini beklenen wrapper sebeplerine ayirir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const jsMoves = collectTimurLegalMoves(state);
    const fairyPocMoves = jsMoves
        .filter((move) => !['d2h1', 'h2d1'].includes(move.uci))
        .map((move) => move.uci);
    fairyPocMoves.push('c2d1', 'i2h1');

    const summary = reconcileFairyMovesWithTimurRules(state, fairyPocMoves, { jsMoves });

    assert.equal(summary.stats.jsMoveCount, 31);
    assert.equal(summary.stats.fairyMoveCount, 31);
    assert.equal(summary.stats.acceptedMoveCount, 29);
    assert.equal(summary.exactMatch, false);
    assert.equal(summary.onlyExpectedPocDiffs, true);
    assert.deepEqual(summary.missingWrapperMoves.map((move) => move.reason), [
        'giraffe_requires_wrapper',
        'giraffe_requires_wrapper'
    ]);
    assert.deepEqual(summary.rejectedFairyMoves.map((move) => move.reason), [
        'picket_minimum_distance_rule',
        'picket_minimum_distance_rule'
    ]);
});
