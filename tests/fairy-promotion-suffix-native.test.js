import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, TimurPawn } from '../src/game/PieceFactory.js';
import {
    collectTimurLegalMoves,
    reconcileFairyMovesWithTimurRules,
    selectSafeTimurMoveFromFairyBestMove
} from '../src/fairy/FairyTimurAdapter.js';
import { COLORS, PAWN_TYPES } from '../src/utils/constants.js';

function createPromotionState(pawnType = PAWN_TYPES.PAWN_OF_VIZIERS) {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(0, 10, new King(COLORS.BLACK, 0, 10));
    state.board.setPiece(1, 4, new TimurPawn(COLORS.WHITE, 1, 4, pawnType));
    return state;
}

test('native promotion suffix is accepted when it matches the Timur pawn subtype', () => {
    const state = createPromotionState();
    const jsMoves = collectTimurLegalMoves(state);
    const fallbackMove = jsMoves.find((move) => move.uci === 'f1e1');

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove e9e10v', {
        jsMoves,
        fallbackMove
    });

    assert.equal(decision.accepted, true);
    assert.equal(decision.source, 'fairy');
    assert.equal(decision.reason, 'fairy_promotion_suffix_is_timur_legal');
    assert.equal(decision.selectedMove.uci, 'e9e10');
    assert.equal(decision.selectedMove.fairyPromotionSuffix, 'v');
});

test('native promotion suffix reconciles to the base Timur legal move', () => {
    const state = createPromotionState();
    const jsMoves = collectTimurLegalMoves(state);

    const summary = reconcileFairyMovesWithTimurRules(state, ['e9e10v'], { jsMoves });

    assert.equal(summary.acceptedMoves.length, 1);
    assert.equal(summary.acceptedMoves[0].uci, 'e9e10');
    assert.equal(summary.acceptedMoves[0].fairyPromotionSuffix, 'v');
    assert.equal(summary.rejectedFairyMoves.length, 0);
});

test('promotion suffix is rejected when it does not match the pawn subtype', () => {
    const state = createPromotionState();
    const jsMoves = collectTimurLegalMoves(state);
    const fallbackMove = jsMoves.find((move) => move.uci === 'f1e1');

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove e9e10q', {
        jsMoves,
        fallbackMove
    });

    assert.equal(decision.accepted, false);
    assert.equal(decision.source, 'fallback');
    assert.equal(decision.reason, 'promotion_suffix_mismatch');
    assert.equal(decision.selectedMove.uci, 'f1e1');
});
