import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook, TimurPawn, Vizier } from '../src/game/PieceFactory.js';
import { COLORS, PAWN_TYPES } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import { buildBoardThreatMap } from '../src/ai/AiEvaluation.js';
import {
    buildAttackMap,
    summarizeAttackMapForColor
} from '../src/ai/AttackMap.js';

test('attack map v2 kare bazli saldiran ve savunan listelerini ayri tutar', () => {
    const state = new GameState('hard');
    const blackRook = new Rook(COLORS.BLACK, 4, 4);
    const whiteTarget = new Rook(COLORS.WHITE, 4, 6);
    const whiteRookDefender = new Rook(COLORS.WHITE, 4, 8);
    const whiteVizierDefender = new Vizier(COLORS.WHITE, 3, 6);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    state.board.setPiece(4, 4, blackRook);
    state.board.setPiece(4, 6, whiteTarget);
    state.board.setPiece(4, 8, whiteRookDefender);
    state.board.setPiece(3, 6, whiteVizierDefender);

    const attackMap = buildAttackMap(state);
    const targetSquare = attackMap.getSquare(4, 6);
    const blackPseudoAttackers = targetSquare.pseudoAttackers[COLORS.BLACK].map((piece) => piece.type);
    const blackLegalAttackers = targetSquare.legalAttackers[COLORS.BLACK].map((piece) => piece.type);
    const whiteDefenders = targetSquare.defenders[COLORS.WHITE].map((piece) => piece.type).sort();
    const summary = summarizeAttackMapForColor(attackMap, COLORS.BLACK);

    assert.equal(targetSquare.occupant, whiteTarget);
    assert.deepEqual(blackPseudoAttackers, ['rook']);
    assert.deepEqual(blackLegalAttackers, ['rook']);
    assert.deepEqual(whiteDefenders, ['rook', 'vizier']);
    assert.ok(summary.enemyContestedValue > 0);
    assert.equal(summary.enemyHangingValue, 0);
});

test('attack map v2 overloaded defender hedeflerini tek merkezden raporlar', () => {
    const state = new GameState('hard');
    const whiteDefender = new Vizier(COLORS.WHITE, 4, 5);
    const firstTarget = new Rook(COLORS.WHITE, 4, 4);
    const secondTarget = new TimurPawn(COLORS.WHITE, 5, 5, PAWN_TYPES.PAWN_OF_KINGS);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 0, new Rook(COLORS.BLACK, 4, 0));
    state.board.setPiece(5, 0, new Rook(COLORS.BLACK, 5, 0));
    state.board.setPiece(4, 5, whiteDefender);
    state.board.setPiece(4, 4, firstTarget);
    state.board.setPiece(5, 5, secondTarget);

    const attackMap = buildAttackMap(state);
    const summary = summarizeAttackMapForColor(attackMap, COLORS.WHITE);
    const evaluationThreatMap = buildBoardThreatMap(state, COLORS.WHITE, getAIProfile('hard'));

    assert.equal(summary.overloadedDefenders.length, 1);
    assert.equal(summary.overloadedDefenders[0].type, 'vizier');
    assert.equal(summary.overloadedDefenders[0].targetCount, 2);
    assert.ok(summary.overloadedDefenderValue >= 100);
    assert.equal(evaluationThreatMap.attackMapVersion, 2);
    assert.ok(evaluationThreatMap.overloadedOwnDefenderValue >= 100);
});

test('attack map v2 royal guvenlik karelerini ve kacis kalitesini hesaplar', () => {
    const state = new GameState('hard');
    const blackKing = new King(COLORS.BLACK, 5, 5);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(5, 0, new Rook(COLORS.WHITE, 5, 0));
    state.board.setPiece(5, 5, blackKing);

    const attackMap = buildAttackMap(state);
    const [blackRoyalSafety] = attackMap.royalSafety[COLORS.BLACK];

    assert.equal(blackRoyalSafety.attacked, true);
    assert.ok(blackRoyalSafety.escapeCount > 0);
    assert.ok(blackRoyalSafety.safeEscapeCount < blackRoyalSafety.escapeCount);
    assert.ok(blackRoyalSafety.unsafeEscapeSquares.some((square) => square.row === 5));
});
