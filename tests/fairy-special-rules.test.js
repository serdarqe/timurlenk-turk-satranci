import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, Prince, AdventitiousKing, Rook, TimurPawn } from '../src/game/PieceFactory.js';
import {
    collectTimurLegalMoves,
    reconcileFairyMovesWithTimurRules,
    selectSafeTimurMoveFromFairyBestMove
} from '../src/fairy/FairyTimurAdapter.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import { COLORS, FORMATIONS, PAWN_TYPES, PIECE_TYPES } from '../src/utils/constants.js';

function supportedUciMovesExcept(moves, excludedUci) {
    return moves
        .filter((move) => !move.unsupported && move.uci !== excludedUci)
        .map((move) => move.uci);
}

test('giraffe JS-only moves are marked as wrapper-required differences', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const jsMoves = collectTimurLegalMoves(state);
    const fairyMoves = supportedUciMovesExcept(jsMoves, 'd2h1');
    const summary = reconcileFairyMovesWithTimurRules(state, fairyMoves, { jsMoves });

    assert.equal(summary.missingWrapperMoves.some((move) => (
        move.uci === 'd2h1' && move.reason === 'giraffe_requires_wrapper'
    )), true);
});

test('picket one-square diagonal bestmove is rejected by Timur gate', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const fallbackMove = collectTimurLegalMoves(state).find((move) => move.uci === 'd3d4');

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove c2d1', { fallbackMove });

    assert.equal(decision.accepted, false);
    assert.equal(decision.source, 'fallback');
    assert.equal(decision.reason, 'picket_minimum_distance_rule');
    assert.equal(decision.selectedMove.uci, 'd3d4');
});

test('promotion suffix from Fairy is rejected until Timur promotion wrapper handles it', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const fallbackMove = collectTimurLegalMoves(state).find((move) => move.uci === 'd3d4');

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove d3d4q', { fallbackMove });

    assert.equal(decision.accepted, false);
    assert.equal(decision.source, 'fallback');
    assert.equal(decision.reason, 'promotion_suffix_requires_wrapper');
});

test('royal swap stays visible as a wrapper-required special move', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

    const jsMoves = collectTimurLegalMoves(state);
    const royalSwap = jsMoves.find((move) => move.specialMove === 'royal_swap');
    const summary = reconcileFairyMovesWithTimurRules(
        state,
        supportedUciMovesExcept(jsMoves, royalSwap.uci),
        { jsMoves }
    );

    assert.ok(royalSwap);
    assert.equal(
        summary.missingWrapperMoves.some((move) => (
            move.uci === royalSwap.uci && move.reason === 'royal_swap_requires_wrapper'
        )),
        true
    );
});

test('citadel exchange stays visible as a wrapper-required special move', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(5, 5, new Prince(COLORS.WHITE, 5, 5));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const jsMoves = collectTimurLegalMoves(state);
    const citadelExchange = jsMoves.find((move) => move.specialMove === 'citadel_exchange');
    const summary = reconcileFairyMovesWithTimurRules(
        state,
        supportedUciMovesExcept(jsMoves, citadelExchange.uci),
        { jsMoves }
    );

    assert.ok(citadelExchange);
    assert.equal(
        summary.missingWrapperMoves.some((move) => (
            move.uci === citadelExchange.uci && move.reason === 'citadel_exchange_requires_wrapper'
        )),
        true
    );
});

test('offboard citadel entry is not silently dropped by the adapter', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const jsMoves = collectTimurLegalMoves(state);
    const citadelMove = jsMoves.find((move) => move.toRow === 0 && move.toCol === -1);
    const summary = reconcileFairyMovesWithTimurRules(
        state,
        jsMoves.filter((move) => !move.unsupported).map((move) => move.uci),
        { jsMoves }
    );

    assert.ok(citadelMove);
    assert.equal(citadelMove.unsupported, true);
    assert.equal(citadelMove.uci, 'a10->citadel:black');
    assert.equal(
        summary.missingWrapperMoves.some((move) => (
            move.uci === 'a10->citadel:black' && move.reason === 'citadel_requires_wrapper'
        )),
        true
    );
});

test('unsupported pseudo moves are never selected as fallback moves', () => {
    const state = new GameState();
    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove 0000', {
        jsMoves: [{
            uci: 'a10->citadel:black',
            unsupported: true,
            toRow: 0,
            toCol: -1
        }]
    });

    assert.equal(decision.accepted, false);
    assert.equal(decision.source, 'none');
    assert.equal(decision.selectedMove, null);
    assert.equal(decision.fallbackMove, null);
});

test('citadel entry still resolves to a JS rule draw', () => {
    const state = new GameState();
    const king = new King(COLORS.WHITE, 0, 0);
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, king);
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    state.board.movePiece(0, 0, 0, -1);
    const activeKing = state.board.getPieceAt(0, -1);
    GameRules.applyPostMoveEffects(state, activeKing, 0, -1);

    assert.equal(state.status, 'game_over');
    assert.equal(state.winner, 'Draw (Hisar)');
});

test('pawn-of-pawns cycle and adventitious king promotion remain JS-side effects', () => {
    const cycleState = new GameState();
    const cyclingPawn = new TimurPawn(COLORS.WHITE, 0, 4, PAWN_TYPES.PAWN_OF_PAWNS);
    cycleState.board.setPiece(0, 4, cyclingPawn);

    const cycle = GameRules.checkPawnPromotion(cycleState, cyclingPawn);

    assert.equal(cycle.kind, 'pawn_cycle');
    assert.equal(cyclingPawn.row, 7);
    assert.equal(cyclingPawn.stage, 2);

    const promotionState = new GameState();
    const promotionPawn = new TimurPawn(COLORS.WHITE, 0, 4, PAWN_TYPES.PAWN_OF_PAWNS);
    promotionPawn.stage = 3;
    promotionState.board.setPiece(0, 4, promotionPawn);

    const promotion = GameRules.checkPawnPromotion(promotionState, promotionPawn);

    assert.equal(promotion.kind, 'promotion');
    assert.equal(promotion.promotedPiece.type, PIECE_TYPES.ADVENTITIOUS_KING);
    assert.equal(promotion.promotedPiece.isPromoted, true);
});

test('prince and adventitious king are mapped in Fairy FEN only while on board', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(5, 5, new Prince(COLORS.WHITE, 5, 5));
    state.board.setPiece(6, 6, new AdventitiousKing(COLORS.WHITE, 6, 6));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const fen = stateToFairyFen(state);

    assert.match(fen, /Q/);
    assert.match(fen, /A/);

    state.board.movePiece(5, 5, 0, -1);

    assert.throws(() => stateToFairyFen(state), /fairy_fen_unsupported_offboard_piece/);
});

test('royal capture remains authoritative JS game-over logic', () => {
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
