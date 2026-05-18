import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAdvantageMeter, calculateMoveImpact } from '../src/ui/AdvantageMeter.js';
import { COLORS } from '../src/utils/constants.js';

test('avantaj bari dengeli pozisyonu ortada tutar', () => {
    const model = calculateAdvantageMeter(0);

    assert.equal(model.leader, 'balanced');
    assert.equal(model.tier, 'balanced');
    assert.equal(model.blackShare, 50);
    assert.equal(model.whiteShare, 50);
});

test('avantaj bari siyah pozitif skoru siyah lehine cevirir', () => {
    const model = calculateAdvantageMeter(180);

    assert.equal(model.leader, COLORS.BLACK);
    assert.equal(model.tier, 'clear');
    assert.ok(model.blackShare > 50);
    assert.ok(model.whiteShare < 50);
    assert.equal(model.displayScore, 1.8);
});

test('avantaj bari beyaz negatif skoru beyaz lehine cevirir', () => {
    const model = calculateAdvantageMeter(-360);

    assert.equal(model.leader, COLORS.WHITE);
    assert.equal(model.tier, 'winning');
    assert.ok(model.whiteShare > 50);
    assert.ok(model.blackShare < 50);
    assert.equal(model.displayScore, 3.6);
});

test('son hamle etkisi siyah icin skor artisina iyi der', () => {
    const impact = calculateMoveImpact(40, 180, COLORS.BLACK);

    assert.equal(impact.direction, 'good');
    assert.equal(impact.displayValue, 1.4);
});

test('son hamle etkisi beyaz icin siyah skor artisina kotu der', () => {
    const impact = calculateMoveImpact(40, 180, COLORS.WHITE);

    assert.equal(impact.direction, 'bad');
    assert.equal(impact.displayValue, 1.4);
});

test('son hamle etkisi kucuk salinimi notr tutar', () => {
    const impact = calculateMoveImpact(40, 47, COLORS.WHITE);

    assert.equal(impact.direction, 'neutral');
    assert.equal(impact.displayValue, 0.07);
});
