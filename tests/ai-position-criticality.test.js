import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateAIPositionCriticality } from '../src/ai/AIPositionCriticality.js';
import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';

function createBaseState() {
    const state = new GameState('hard');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    return state;
}

test('pozisyon kritiklik hesabı sakin sah konumunu quiet tutar', () => {
    const state = createBaseState();

    const criticality = calculateAIPositionCriticality(state, { id: 'hard', baseId: 'hard' });

    assert.equal(criticality.level, 'quiet');
    assert.ok(criticality.score < 28);
    assert.equal(criticality.aiInCheck, false);
    assert.equal(criticality.opponentInCheck, false);
});

test('pozisyon kritiklik hesabı sah ve kraliyet alma firsatini decisive gorur', () => {
    const state = createBaseState();
    state.board.setPiece(0, 5, new Rook(COLORS.BLACK, 0, 5));

    const criticality = calculateAIPositionCriticality(state, { id: 'hard', baseId: 'hard' });

    assert.equal(criticality.opponentInCheck, true);
    assert.equal(criticality.level, 'decisive');
    assert.ok(criticality.reasons.includes('opponent-in-check'));
    assert.ok(criticality.reasons.includes('royal-capture-available'));
});

test('pozisyon kritiklik hesabı askida materyali sharp sinyaline cevirir', () => {
    const state = createBaseState();
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    state.board.setPiece(4, 8, new Rook(COLORS.WHITE, 4, 8));

    const criticality = calculateAIPositionCriticality(state, { id: 'medium', baseId: 'medium' });

    assert.ok(criticality.ownHangingValue >= 100);
    assert.ok(criticality.enemyHangingValue >= 100);
    assert.ok(['sharp', 'critical', 'decisive'].includes(criticality.level));
    assert.ok(criticality.reasons.includes('own-hanging-material'));
    assert.ok(criticality.reasons.includes('enemy-hanging-material'));
});
