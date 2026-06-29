import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { King, Rook, Vizier } from '../src/game/PieceFactory.js';
import { serializeGameStateSnapshot } from '../src/analysis/AnalysisSerialization.js';
import { COLORS } from '../src/utils/constants.js';

test('kral sah altindayken bir kezlik takas hamlesi gorebilir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const validator = new MoveValidator(state);
    const legalMoves = validator.getLegalMoves(9, 5);
    const royalSwap = legalMoves.find((move) => move.specialMove === 'royal_swap');

    assert.ok(royalSwap);
    assert.equal(royalSwap.row, 8);
    assert.equal(royalSwap.col, 4);
});

test('bir kezlik takas hakki kullanildiysa tekrar sunulmaz', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.ransomMoveUsed[COLORS.WHITE] = true;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const validator = new MoveValidator(state);
    const legalMoves = validator.getLegalMoves(9, 5);

    assert.equal(legalMoves.some((move) => move.specialMove === 'royal_swap'), false);
});

test('guvensiz kareye yapilan kral takasi legal sayilmaz', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 4, new Rook(COLORS.BLACK, 0, 4));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const validator = new MoveValidator(state);
    const legalMoves = validator.getLegalMoves(9, 5);

    assert.equal(legalMoves.some((move) => move.specialMove === 'royal_swap' && move.row === 8 && move.col === 4), false);
});

test('snapshot fidye hakkini da tasir', () => {
    const state = new GameState();
    state.ransomMoveUsed[COLORS.WHITE] = true;
    state.ransomMoveUsed[COLORS.BLACK] = false;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));
    state.board.setPiece(8, 4, new Vizier(COLORS.WHITE, 8, 4));

    const snapshot = serializeGameStateSnapshot(state);

    assert.deepEqual(snapshot.ransomMoveUsed, {
        [COLORS.WHITE]: true,
        [COLORS.BLACK]: false
    });
});
