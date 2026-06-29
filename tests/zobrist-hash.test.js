import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';
import { buildPositionHash } from '../src/ai/AiStrategy.js';
import {
    buildZobristHash,
    buildZobristHashValue,
    formatZobristHash,
    xorZobristPiece,
    xorZobristTurn
} from '../src/game/ZobristHash.js';

test('zobrist hash tas sirasi degisse de ayni pozisyon anahtarini uretir', () => {
    const stateA = {
        currentTurn: COLORS.BLACK,
        formation: 'test',
        board: {
            pieces: [
                { type: 'rook', color: COLORS.BLACK, row: 1, col: 1, hasMoved: true },
                { type: 'king', color: COLORS.WHITE, row: 0, col: 0, hasMoved: false }
            ]
        }
    };
    const stateB = {
        currentTurn: COLORS.BLACK,
        formation: 'test',
        board: {
            pieces: [...stateA.board.pieces].reverse()
        }
    };

    assert.equal(buildZobristHash(stateA), buildZobristHash(stateB));
    assert.equal(buildPositionHash(stateA), buildZobristHash(stateA));
});

test('zobrist hash sira ve ozel hak degisimlerini pozisyondan ayirir', () => {
    const baseState = {
        currentTurn: COLORS.WHITE,
        formation: 'masculine',
        ransomMoveUsed: { [COLORS.WHITE]: false, [COLORS.BLACK]: false },
        citadelExchangeUsed: { [COLORS.WHITE]: false, [COLORS.BLACK]: false },
        board: {
            pieces: [
                { type: 'king', color: COLORS.WHITE, row: 9, col: 5, hasMoved: false },
                { type: 'king', color: COLORS.BLACK, row: 0, col: 5, hasMoved: false }
            ]
        }
    };

    assert.notEqual(buildZobristHash(baseState), buildZobristHash({ ...baseState, currentTurn: COLORS.BLACK }));
    assert.notEqual(
        buildZobristHash(baseState),
        buildZobristHash({
            ...baseState,
            ransomMoveUsed: { [COLORS.WHITE]: true, [COLORS.BLACK]: false }
        })
    );
    assert.notEqual(
        buildZobristHash(baseState),
        buildZobristHash({
            ...baseState,
            citadelExchangeUsed: { [COLORS.WHITE]: false, [COLORS.BLACK]: true }
        })
    );
});

test('zobrist incremental normal hamle guncellemesi tam yeniden hesapla ile ayni sonucu verir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    const rook = new Rook(COLORS.WHITE, 5, 5);
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(0, 5, new King(COLORS.BLACK, 0, 5));
    state.board.setPiece(5, 5, rook);

    const beforeHash = buildZobristHashValue(state);
    const rookBefore = { ...rook };
    state.board.movePiece(5, 5, 5, 7);
    state.currentTurn = COLORS.BLACK;

    const incremental = xorZobristTurn(
        xorZobristTurn(
            xorZobristPiece(
                xorZobristPiece(beforeHash, rookBefore),
                { ...rookBefore, row: 5, col: 7, hasMoved: true }
            ),
            COLORS.WHITE
        ),
        COLORS.BLACK
    );

    assert.equal(formatZobristHash(incremental), buildZobristHash(state));
});

