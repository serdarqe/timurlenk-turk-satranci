import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, TimurPawn } from '../src/game/PieceFactory.js';
import { COLORS, GAME_STATES, PAWN_TYPES, PIECE_TYPES } from '../src/utils/constants.js';

test('Pawn of Kings terfisi geri alinabilir', () => {
    const state = new GameState();
    const pawn = new TimurPawn(COLORS.WHITE, 0, 5, PAWN_TYPES.PAWN_OF_KINGS);
    pawn.hasMoved = true;
    state.board.setPiece(0, 5, pawn);

    const effects = GameRules.applyPostMoveEffects(state, pawn, 0, 5);

    assert.equal(state.board.getPieceAt(0, 5).type, PIECE_TYPES.PRINCE);
    assert.equal(effects.activePiece.type, PIECE_TYPES.PRINCE);

    GameRules.revertPostMoveEffects(state, effects);

    assert.equal(state.board.getPieceAt(0, 5), pawn);
    assert.equal(state.board.getPieceAt(0, 5).type, PIECE_TYPES.PAWN);
    assert.equal(pawn.hasMoved, true);
});

test('Piyonlarin Piyonu dongusu geri alinabilir', () => {
    const state = new GameState();
    const pawn = new TimurPawn(COLORS.WHITE, 0, 4, PAWN_TYPES.PAWN_OF_PAWNS);
    state.board.setPiece(0, 4, pawn);

    const effects = GameRules.applyPostMoveEffects(state, pawn, 0, 4);

    assert.equal(pawn.row, 7);
    assert.equal(pawn.col, 4);
    assert.equal(pawn.stage, 2);

    GameRules.revertPostMoveEffects(state, effects);

    assert.equal(pawn.row, 0);
    assert.equal(pawn.col, 4);
    assert.equal(pawn.stage, null);
});

test('Hisar beraberligi durumu geri alinabilir', () => {
    const state = new GameState();
    const king = new King(COLORS.WHITE, 0, -1);
    state.board.setPiece(0, -1, king);

    const effects = GameRules.applyPostMoveEffects(state, king, 0, -1);

    assert.equal(state.status, 'game_over');
    assert.equal(state.winner, 'Draw (Hisar)');

    GameRules.revertPostMoveEffects(state, effects);

    assert.equal(state.status, null);
    assert.equal(state.winner, null);
});

test('Uc kez ayni pozisyon tekrar ederse beraberlik kuralini tanir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 4, new King(COLORS.BLACK, 0, 4));
    state.board.setPiece(9, 4, new King(COLORS.WHITE, 9, 4));

    const repeatedSnapshot = {
        currentTurn: state.currentTurn,
        ransomMoveUsed: state.ransomMoveUsed,
        citadelExchangeUsed: state.citadelExchangeUsed,
        board: {
            pieces: state.board.pieces.map((piece) => ({
                type: piece.type,
                color: piece.color,
                row: piece.row,
                col: piece.col,
                pawnType: piece.pawnType || null,
                hasMoved: Boolean(piece.hasMoved),
                stage: piece.stage ?? null,
                isPromoted: Boolean(piece.isPromoted)
            }))
        }
    };

    state.moveHistory = [
        { snapshots: { after: repeatedSnapshot } },
        { snapshots: { after: repeatedSnapshot } }
    ];

    assert.equal(GameRules.checkThreefoldRepetition(state), true);
    assert.equal(GameRules.resolveRuleDraw(state), 'threefold_repetition');
    assert.equal(state.status, GAME_STATES.GAME_OVER);
    assert.equal(state.winner, 'draw');
    assert.equal(state.resultType, 'threefold_repetition');
});

test('Elli hamle kuralinda son 100 yarim hamlede piyon ve tas alma yoksa beraberlik olur', () => {
    const state = new GameState();
    state.moveHistory = Array.from({ length: 99 }, (_, index) => ({
        index: index + 1,
        piece: { typeBefore: PIECE_TYPES.ROOK },
        capturedPiece: null
    }));

    assert.equal(GameRules.checkFiftyMoveDraw(state), false);
    assert.equal(GameRules.checkFiftyMoveDraw(state, {
        pendingMove: {
            piece: { typeBefore: PIECE_TYPES.ROOK },
            capturedPiece: null
        }
    }), true);

    state.moveHistory[25] = {
        index: 26,
        piece: { typeBefore: PIECE_TYPES.PAWN },
        capturedPiece: null
    };

    assert.equal(GameRules.checkFiftyMoveDraw(state, {
        pendingMove: {
            piece: { typeBefore: PIECE_TYPES.ROOK },
            capturedPiece: null
        }
    }), false);
});
