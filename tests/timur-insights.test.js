import test from 'node:test';
import assert from 'node:assert/strict';

import { COLORS, PIECE_TYPES } from '../src/utils/constants.js';
import {
    buildRecommendationKeys,
    getDistanceToOpponentCitadel,
    getMinRoyalCitadelDistance,
    isRoyalType
} from '../src/analysis/TimurInsights.js';

test('isRoyalType sadece kraliyet taslarini royal sayar', () => {
    assert.equal(isRoyalType(PIECE_TYPES.KING), true);
    assert.equal(isRoyalType(PIECE_TYPES.PRINCE), true);
    assert.equal(isRoyalType(PIECE_TYPES.ADVENTITIOUS_KING), true);
    assert.equal(isRoyalType(PIECE_TYPES.ROOK), false);
});

test('getDistanceToOpponentCitadel rakip hisara uzakligi hesaplar', () => {
    assert.equal(getDistanceToOpponentCitadel(COLORS.WHITE, 1, 0), 2);
    assert.equal(getDistanceToOpponentCitadel(COLORS.BLACK, 8, 10), 2);
});

test('getMinRoyalCitadelDistance kraliyet taslari icin en yakin mesafeyi bulur', () => {
    const pieces = [
        { type: PIECE_TYPES.KING, color: COLORS.WHITE, row: 3, col: 1 },
        { type: PIECE_TYPES.PRINCE, color: COLORS.WHITE, row: 1, col: 0 },
        { type: PIECE_TYPES.ROOK, color: COLORS.WHITE, row: 4, col: 4 }
    ];

    assert.equal(getMinRoyalCitadelDistance(pieces, COLORS.WHITE), 2);
    assert.equal(getMinRoyalCitadelDistance(pieces, COLORS.BLACK), null);
});

test('buildRecommendationKeys timurlenk odakli onerileri secerek dondurur', () => {
    const keys = buildRecommendationKeys({
        missedStalemateWins: 1,
        minCitadelDistance: 3,
        royalPeak: 3,
        pawnCycleCount: 0,
        pawnAdvanceScore: 10,
        signatureActivity: 1
    });

    assert.deepEqual(keys, [
        'analysis.recommendation.stalemate',
        'analysis.recommendation.citadel',
        'analysis.recommendation.royal'
    ]);
});
