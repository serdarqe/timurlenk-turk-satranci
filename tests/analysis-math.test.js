import test from 'node:test';
import assert from 'node:assert/strict';

import { COLORS } from '../src/utils/constants.js';
import {
    MOVE_QUALITY,
    calculateAccuracy,
    classifyMoveQuality,
    getMovePhase,
    normalizeAnalysisAccuracyForOutcome,
    normalizeScoreForColor
} from '../src/analysis/AnalysisMath.js';

test('normalizeScoreForColor beyaz icin skoru ters cevirir', () => {
    assert.equal(normalizeScoreForColor(42, COLORS.WHITE), -42);
    assert.equal(normalizeScoreForColor(-15, COLORS.WHITE), 15);
});

test('normalizeScoreForColor siyah icin skoru oldugu gibi korur', () => {
    assert.equal(normalizeScoreForColor(42, COLORS.BLACK), 42);
});

test('calculateAccuracy bos listede 100 dondurur', () => {
    assert.equal(calculateAccuracy([]), 100);
});

test('calculateAccuracy kayip arttikca dusen bir oran uretir', () => {
    const lowLoss = calculateAccuracy([0, 4, 8]);
    const highLoss = calculateAccuracy([60, 90, 120]);

    assert.ok(lowLoss > highLoss);
    assert.ok(lowLoss <= 100);
    assert.ok(highLoss >= 0);
});

test('classifyMoveQuality belirleyici hamleleri onceliklendirir', () => {
    const quality = classifyMoveQuality(120, 200, ['stalemate']);
    assert.equal(quality, MOVE_QUALITY.DECISIVE);

    const royalCaptureQuality = classifyMoveQuality(140, 220, ['royal_capture']);
    assert.equal(royalCaptureQuality, MOVE_QUALITY.DECISIVE);
});

test('classifyMoveQuality kayip boyutuna gore siniflandirir', () => {
    assert.equal(classifyMoveQuality(6, 24, []), MOVE_QUALITY.STRONG);
    assert.equal(classifyMoveQuality(12, 2, []), MOVE_QUALITY.GOOD);
    assert.equal(classifyMoveQuality(24, -10, []), MOVE_QUALITY.SLIP);
    assert.equal(classifyMoveQuality(64, -40, []), MOVE_QUALITY.MISTAKE);
    assert.equal(classifyMoveQuality(120, -90, []), MOVE_QUALITY.BLUNDER);
});

test('getMovePhase oyunu uc faza ayirir', () => {
    assert.equal(getMovePhase(3, 20), 'opening');
    assert.equal(getMovePhase(10, 20), 'middlegame');
    assert.equal(getMovePhase(18, 20), 'endgame');
});

test('normalizeAnalysisAccuracyForOutcome kazananin isabetini sonuc ile celismeyecek sekilde duzeltir', () => {
    const summary = normalizeAnalysisAccuracyForOutcome({
        winner: COLORS.BLACK,
        resultType: 'checkmate',
        whiteAccuracy: 82,
        blackAccuracy: 61
    });

    assert.equal(summary.blackAccuracy, 83);
    assert.equal(summary.whiteAccuracy, 82);
    assert.equal(summary.outcomeAdjusted, true);
    assert.deepEqual(summary.rawAccuracy, { white: 82, black: 61 });
});

test('normalizeAnalysisAccuracyForOutcome beraberlik ve sure sonucunda yapay duzeltme yapmaz', () => {
    const drawSummary = normalizeAnalysisAccuracyForOutcome({
        winner: 'draw',
        resultType: 'draw',
        whiteAccuracy: 72,
        blackAccuracy: 78
    });
    assert.equal(drawSummary.outcomeAdjusted, undefined);
    assert.equal(drawSummary.whiteAccuracy, 72);
    assert.equal(drawSummary.blackAccuracy, 78);

    const timeoutSummary = normalizeAnalysisAccuracyForOutcome({
        winner: COLORS.WHITE,
        resultType: 'timeout_win',
        whiteAccuracy: 48,
        blackAccuracy: 84
    });
    assert.equal(timeoutSummary.outcomeAdjusted, undefined);
    assert.equal(timeoutSummary.whiteAccuracy, 48);
    assert.equal(timeoutSummary.blackAccuracy, 84);
});
