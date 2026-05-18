import test from 'node:test';
import assert from 'node:assert/strict';

import { canPracticeAnalysisEntry, isMatchingExpectedMove } from '../src/analysis/PracticeUtils.js';

test('canPracticeAnalysisEntry sadece tam bestMove verisinde true doner', () => {
    assert.equal(canPracticeAnalysisEntry(null), false);
    assert.equal(canPracticeAnalysisEntry({}), false);
    assert.equal(canPracticeAnalysisEntry({
        bestMove: { fromRow: 1, fromCol: 2, toRow: 3 }
    }), false);
    assert.equal(canPracticeAnalysisEntry({
        bestMove: { fromRow: 1, fromCol: 2, toRow: 3, toCol: 4 }
    }), true);
});

test('isMatchingExpectedMove koordinatlari birebir karsilastirir', () => {
    const moveRecord = {
        from: { row: 7, col: 4 },
        to: { row: 6, col: 4 }
    };

    assert.equal(isMatchingExpectedMove(moveRecord, {
        fromRow: 7,
        fromCol: 4,
        toRow: 6,
        toCol: 4
    }), true);

    assert.equal(isMatchingExpectedMove(moveRecord, {
        fromRow: 7,
        fromCol: 4,
        toRow: 5,
        toCol: 4
    }), false);
});
