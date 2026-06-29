import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { TimurPawn } from '../src/game/PieceFactory.js';
import { FAIRY_PIECE_TO_FEN } from '../src/fairy/FairyFen.js';
import {
    getPawnOfPawnsCycleParity,
    getPromotionParityCase,
    getPromotionParityCases
} from '../src/fairy/FairyPromotionParity.js';
import { COLORS, PAWN_TYPES, PIECE_TYPES } from '../src/utils/constants.js';

function promotePawn(color, pawnType, stage = null) {
    const state = new GameState();
    const row = color === COLORS.WHITE ? 0 : 9;
    const pawn = new TimurPawn(color, row, 4, pawnType);
    pawn.stage = stage;
    state.board.setPiece(row, 4, pawn);
    return { state, pawn, result: GameRules.checkPawnPromotion(state, pawn) };
}

test('all Timur pawn promotion parity cases match JS GameRules and Fairy FEN pieces', () => {
    const cases = getPromotionParityCases();
    const pawnTypes = cases.map((item) => item.pawnType).sort();

    assert.deepEqual(pawnTypes, [
        PAWN_TYPES.PAWN_OF_BULLS,
        PAWN_TYPES.PAWN_OF_CAMELS,
        PAWN_TYPES.PAWN_OF_DABBABAS,
        PAWN_TYPES.PAWN_OF_ELEPHANTS,
        PAWN_TYPES.PAWN_OF_GENERALS,
        PAWN_TYPES.PAWN_OF_GIRAFFES,
        PAWN_TYPES.PAWN_OF_KINGS,
        PAWN_TYPES.PAWN_OF_KNIGHTS,
        PAWN_TYPES.PAWN_OF_LIONS,
        PAWN_TYPES.PAWN_OF_PICKETS,
        PAWN_TYPES.PAWN_OF_REVEALERS,
        PAWN_TYPES.PAWN_OF_ROOKS,
        PAWN_TYPES.PAWN_OF_SEA_MONSTERS,
        PAWN_TYPES.PAWN_OF_VIZIERS
    ].sort());

    for (const color of [COLORS.WHITE, COLORS.BLACK]) {
        for (const parityCase of cases) {
            const { result, state } = promotePawn(color, parityCase.pawnType);
            const promoted = state.board.getPieceAt(color === COLORS.WHITE ? 0 : 9, 4);

            assert.equal(result.kind, 'promotion', parityCase.pawnType);
            assert.equal(result.promotedPiece.type, parityCase.promotedPieceType, parityCase.pawnType);
            assert.equal(promoted.type, parityCase.promotedPieceType, parityCase.pawnType);
            assert.equal(promoted.isPromoted, true, parityCase.pawnType);
            assert.equal(FAIRY_PIECE_TO_FEN[promoted.type], parityCase.fairyFen.toLowerCase(), parityCase.pawnType);
        }
    }
});

test('pawn-of-pawns parity preserves two repatriation stages before adventitious king promotion', () => {
    const parity = getPawnOfPawnsCycleParity();

    assert.deepEqual(parity.map((step) => step.stageBefore), [null, 2, 3]);
    assert.deepEqual(parity.map((step) => step.kind), ['pawn_cycle', 'pawn_cycle', 'promotion']);
    assert.equal(getPromotionParityCase(PAWN_TYPES.PAWN_OF_PAWNS), null);

    const first = promotePawn(COLORS.WHITE, PAWN_TYPES.PAWN_OF_PAWNS, null);
    assert.equal(first.result.kind, 'pawn_cycle');
    assert.equal(first.result.piece.stage, 2);
    assert.equal(first.result.piece.row, 7);

    const second = promotePawn(COLORS.BLACK, PAWN_TYPES.PAWN_OF_PAWNS, 2);
    assert.equal(second.result.kind, 'pawn_cycle');
    assert.equal(second.result.piece.stage, 3);
    assert.equal(second.result.piece.row, 2);

    const third = promotePawn(COLORS.WHITE, PAWN_TYPES.PAWN_OF_PAWNS, 3);
    assert.equal(third.result.kind, 'promotion');
    assert.equal(third.result.promotedPiece.type, PIECE_TYPES.ADVENTITIOUS_KING);
    assert.equal(FAIRY_PIECE_TO_FEN[third.result.promotedPiece.type], 'a');
});
