import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import {
    collectTimurLegalMoves,
    normalizeFairyBestMove,
    selectSafeTimurMoveFromFairyBestMove
} from '../src/fairy/FairyTimurAdapter.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';

test('fairy bestmove satirini normalize eder', () => {
    assert.equal(normalizeFairyBestMove('bestmove d3d4 ponder a8a7'), 'd3d4');
    assert.equal(normalizeFairyBestMove('D3D4'), 'd3d4');
    assert.equal(normalizeFairyBestMove('bestmove 0000'), null);
    assert.equal(normalizeFairyBestMove('bestmove (none)'), null);
});

test('legal Fairy bestmove JS Timur hamlesi olarak kabul edilir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove d3d4');

    assert.equal(decision.accepted, true);
    assert.equal(decision.source, 'fairy');
    assert.equal(decision.reason, 'fairy_bestmove_is_timur_legal');
    assert.equal(decision.selectedMove.uci, 'd3d4');
});

test('illegal Fairy bestmove reddedilir ve fallback kullanilir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const fallbackMove = collectTimurLegalMoves(state).find((move) => move.uci === 'd3d4');

    const decision = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove c2d1', { fallbackMove });

    assert.equal(decision.accepted, false);
    assert.equal(decision.source, 'fallback');
    assert.equal(decision.reason, 'picket_minimum_distance_rule');
    assert.equal(decision.selectedMove.uci, 'd3d4');
});

test('gecersiz veya bos Fairy bestmove fallback ile kapanir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const fallbackMove = collectTimurLegalMoves(state)[0];

    const invalid = selectSafeTimurMoveFromFairyBestMove(state, 'not-a-move', { fallbackMove });
    const empty = selectSafeTimurMoveFromFairyBestMove(state, 'bestmove 0000', { fallbackMove });

    assert.equal(invalid.accepted, false);
    assert.equal(invalid.reason, 'invalid_fairy_bestmove');
    assert.equal(invalid.selectedMove, fallbackMove);
    assert.equal(empty.accepted, false);
    assert.equal(empty.reason, 'empty_or_none_fairy_bestmove');
    assert.equal(empty.selectedMove, fallbackMove);
});
