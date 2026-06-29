import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, Prince, AdventitiousKing, Rook } from '../src/game/PieceFactory.js';
import { serializeGameStateSnapshot } from '../src/analysis/AnalysisSerialization.js';
import { COLORS } from '../src/utils/constants.js';

test('birden fazla kraliyet tasi varken sah durumu oyunu bitirmez', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 6, new Prince(COLORS.WHITE, 8, 6));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const validator = new MoveValidator(state);

    assert.equal(validator.isCheck(COLORS.WHITE), false);
    assert.equal(validator.isCheckmate(COLORS.WHITE), false);
    assert.equal(validator.isStalemate(COLORS.WHITE), false);
});

test('yalnizca en yuksek kraliyet tasi rakip hisara girebilir', () => {
    const princeOnly = new GameState();
    princeOnly.currentTurn = COLORS.WHITE;
    princeOnly.board.setPiece(0, 0, new Prince(COLORS.WHITE, 0, 0));
    princeOnly.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const withKing = new GameState();
    withKing.currentTurn = COLORS.WHITE;
    withKing.board.setPiece(0, 0, new Prince(COLORS.WHITE, 0, 0));
    withKing.board.setPiece(5, 5, new King(COLORS.WHITE, 5, 5));
    withKing.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const princeOnlyMoves = new MoveValidator(princeOnly).getLegalMoves(0, 0);
    const withKingMoves = new MoveValidator(withKing).getLegalMoves(0, 0);

    assert.ok(princeOnlyMoves.some((move) => move.row === 0 && move.col === -1));
    assert.equal(withKingMoves.some((move) => move.row === 0 && move.col === -1), false);
});

test('egreti sah kendi hisarina girebilir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new AdventitiousKing(COLORS.BLACK, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.WHITE, 9, 10));

    const legalMoves = new MoveValidator(state).getLegalMoves(0, 0);

    assert.ok(legalMoves.some((move) => move.row === 0 && move.col === -1));
});

test('sah rakip hisar eşiğindeyken prens ile hisar degisimi secenegi gorebilir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(5, 5, new Prince(COLORS.WHITE, 5, 5));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const legalMoves = new MoveValidator(state).getLegalMoves(0, 0);
    const citadelExchange = legalMoves.find((move) => move.specialMove === 'citadel_exchange');

    assert.ok(citadelExchange);
    assert.equal(citadelExchange.row, 5);
    assert.equal(citadelExchange.col, 5);
});

test('hisar degisimi princei hisara tasir ve hakki kaydeder', () => {
    const state = new GameState();
    const king = new King(COLORS.WHITE, 0, 0);
    const prince = new Prince(COLORS.WHITE, 5, 5);
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, king);
    state.board.setPiece(5, 5, prince);
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const effects = GameRules.applyCitadelExchange(state, king, prince);

    assert.ok(effects);
    assert.equal(state.board.getPieceAt(0, -1), prince);
    assert.equal(state.board.getPieceAt(5, 5), king);
    assert.equal(state.citadelExchangeUsed[COLORS.WHITE], true);

    GameRules.revertCitadelExchange(state, effects);

    assert.equal(state.board.getPieceAt(0, 0), king);
    assert.equal(state.board.getPieceAt(5, 5), prince);
    assert.equal(state.board.getPieceAt(0, -1), null);
    assert.equal(state.citadelExchangeUsed[COLORS.WHITE], false);
});

test('snapshot hisar degisim hakkini da tasir', () => {
    const state = new GameState();
    state.citadelExchangeUsed[COLORS.WHITE] = true;
    state.citadelExchangeUsed[COLORS.BLACK] = false;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const snapshot = serializeGameStateSnapshot(state);

    assert.deepEqual(snapshot.citadelExchangeUsed, {
        [COLORS.WHITE]: true,
        [COLORS.BLACK]: false
    });
});

test('son kraliyet tasi dusunce dogrudan zafer olusur', () => {
    const state = new GameState();
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(0, 1, new Rook(COLORS.BLACK, 0, 1));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    state.board.movePiece(0, 1, 0, 0);
    const outcome = GameRules.resolveRoyalElimination(state, COLORS.WHITE);

    assert.equal(outcome, 'royal_capture');
    assert.equal(state.status, 'game_over');
    assert.equal(state.winner, COLORS.BLACK);
});
