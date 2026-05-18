import test from 'node:test';
import assert from 'node:assert/strict';

import * as PracticeUtils from '../src/analysis/PracticeUtils.js';

test('getPracticeExplanationDetails mat ve buyuk kirilmayi oncelikli neden olarak cikarir', () => {
    const result = PracticeUtils.getPracticeExplanationDetails?.({
        loss: 186.4,
        delta: -92.2,
        capturedPiece: null,
        specialTags: [],
        bestMove: {
            tags: ['checkmate']
        }
    });

    assert.deepEqual(
        result?.reasons?.map((reason) => reason.key),
        [
            'analysis.explanation.reason.checkmate',
            'analysis.explanation.reason.swing',
            'analysis.explanation.reason.balance'
        ]
    );
});

test('getPracticeExplanationDetails pat firsati ve esirden guclu secenegi ayirt eder', () => {
    const result = PracticeUtils.getPracticeExplanationDetails?.({
        loss: 74.8,
        delta: -18.5,
        capturedPiece: { type: 'rook' },
        specialTags: ['capture'],
        bestMove: {
            tags: ['stalemate']
        }
    });

    assert.deepEqual(
        result?.reasons?.map((reason) => reason.key),
        [
            'analysis.explanation.reason.stalemate',
            'analysis.explanation.reason.stronger_than_capture',
            'analysis.explanation.reason.swing'
        ]
    );
});
