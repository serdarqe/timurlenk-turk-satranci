import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { getRoyalSwapParityCases } from '../src/fairy/FairyRoyalSwapParity.js';

function buildRoyalSwapState(parityCase) {
    const state = new GameState();
    state.currentTurn = parityCase.color;

    const king = new King(parityCase.color, parityCase.kingFrom.row, parityCase.kingFrom.col);
    const target = new Rook(parityCase.color, parityCase.targetFrom.row, parityCase.targetFrom.col);
    const checker = new Rook(parityCase.enemyColor, parityCase.checkerFrom.row, parityCase.checkerFrom.col);
    const enemyKing = new King(parityCase.enemyColor, parityCase.enemyKingFrom.row, parityCase.enemyKingFrom.col);

    state.board.setPiece(king.row, king.col, king);
    state.board.setPiece(target.row, target.col, target);
    state.board.setPiece(checker.row, checker.col, checker);
    state.board.setPiece(enemyKing.row, enemyKing.col, enemyKing);

    return { state, king, target };
}

test('royal swap parity appears as a legal one-time special move for both colors', () => {
    for (const parityCase of getRoyalSwapParityCases()) {
        const { state } = buildRoyalSwapState(parityCase);
        const legalMoves = new MoveValidator(state).getLegalMoves(parityCase.kingFrom.row, parityCase.kingFrom.col);
        const royalSwap = legalMoves.find((move) => (
            move.specialMove === 'royal_swap'
            && move.row === parityCase.targetFrom.row
            && move.col === parityCase.targetFrom.col
        ));

        assert.ok(royalSwap, parityCase.id);
    }
});

test('royal swap parity swaps king and target piece, consumes ransom flag, and keeps game open', () => {
    for (const parityCase of getRoyalSwapParityCases()) {
        const { state, king, target } = buildRoyalSwapState(parityCase);
        const effects = GameRules.applyRoyalSwap(state, king, target);

        assert.equal(effects.kind, 'royal_swap', parityCase.id);
        assert.equal(effects.activePiece, king, parityCase.id);
        assert.equal(state.ransomMoveUsed[parityCase.color], true, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.targetFrom.row, parityCase.targetFrom.col), king, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.kingFrom.row, parityCase.kingFrom.col), target, parityCase.id);
        assert.equal(state.status, parityCase.expectedStatus, parityCase.id);
        assert.equal(state.winner, parityCase.expectedWinner, parityCase.id);
    }
});

test('royal swap parity is one-time per color and reversible', () => {
    for (const parityCase of getRoyalSwapParityCases()) {
        const { state, king, target } = buildRoyalSwapState(parityCase);
        const effects = GameRules.applyRoyalSwap(state, king, target);

        assert.equal(GameRules.applyRoyalSwap(state, king, target), null, parityCase.id);

        GameRules.revertRoyalSwap(state, effects);

        assert.equal(state.ransomMoveUsed[parityCase.color], false, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.kingFrom.row, parityCase.kingFrom.col), king, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.targetFrom.row, parityCase.targetFrom.col), target, parityCase.id);
        assert.equal(state.status, null, parityCase.id);
        assert.equal(state.winner, null, parityCase.id);
    }
});
