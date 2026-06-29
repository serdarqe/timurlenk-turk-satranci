import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import {
    buildFairyProbeDecision,
    resolveFairySearchDepth
} from '../src/fairy/FairyDebugEngine.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';

function makeMove(fromRow, fromCol, toRow, toCol) {
    return { fromRow, fromCol, toRow, toCol, specialMove: null };
}

function makeProbe(bestmove) {
    return {
        ok: true,
        bestmove,
        thinkMs: 28,
        artifact: 'singlethread',
        variant: 'timur',
        depth: 4
    };
}

test('hybrid disabled keeps Fairy as shadow metadata only', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'hard';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove e3e4'),
        { allowHybrid: false }
    );

    assert.equal(result.appliedMove, null);
    assert.equal(result.metadata.mode, 'shadow');
    assert.equal(result.metadata.shadowOnly, true);
    assert.equal(result.metadata.appliedToGame, false);
    assert.equal(result.metadata.hybridApplied, false);
    assert.equal(result.metadata.hybridRejectedReason, 'hybrid_disabled');
});

test('hard profile can apply an accepted Fairy move through hybrid gate', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'hard';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove e3e4'),
        { allowHybrid: true }
    );

    assert.deepEqual(result.appliedMove, makeMove(7, 4, 6, 4));
    assert.equal(result.metadata.mode, 'hybrid');
    assert.equal(result.metadata.shadowOnly, false);
    assert.equal(result.metadata.appliedToGame, true);
    assert.equal(result.metadata.hybridEligible, true);
    assert.equal(result.metadata.hybridApplied, true);
    assert.equal(result.metadata.fairySelectedMove, 'e3e4');
});

test('easy profile records accepted Fairy move but does not apply it', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'easy';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove e3e4'),
        { allowHybrid: true }
    );

    assert.equal(result.appliedMove, null);
    assert.equal(result.metadata.mode, 'hybrid');
    assert.equal(result.metadata.fairyAccepted, true);
    assert.equal(result.metadata.hybridApplied, false);
    assert.equal(result.metadata.hybridRejectedReason, 'profile_not_eligible');
});

test('forceHybrid can apply accepted Fairy move outside hard profile', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'easy';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove e3e4'),
        { allowHybrid: true, forceHybrid: true }
    );

    assert.deepEqual(result.appliedMove, makeMove(7, 4, 6, 4));
    assert.equal(result.metadata.hybridApplied, true);
});

test('illegal Fairy move cannot be applied even in hybrid mode', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'hard';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove c2d1'),
        { allowHybrid: true }
    );

    assert.equal(result.appliedMove, null);
    assert.equal(result.metadata.fairyAccepted, false);
    assert.equal(result.metadata.hybridApplied, false);
    assert.equal(result.metadata.hybridRejectedReason, 'picket_minimum_distance_rule');
});

test('matching Fairy and JS move is eligible but does not override', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'hard';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove d3d4'),
        { allowHybrid: true }
    );

    assert.equal(result.appliedMove, null);
    assert.equal(result.metadata.fairyMatchesJsMove, true);
    assert.equal(result.metadata.hybridEligible, true);
    assert.equal(result.metadata.hybridApplied, false);
    assert.equal(result.metadata.hybridRejectedReason, 'matches_js_ai_move');
});

test('fairy fork mode applies accepted Fairy move even on easy profile', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'easy';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove e3e4'),
        { allowHybrid: true, fairyPrimary: true }
    );

    assert.deepEqual(result.appliedMove, makeMove(7, 4, 6, 4));
    assert.equal(result.metadata.mode, 'fairy_fork');
    assert.equal(result.metadata.fairyForkEnabled, true);
    assert.equal(result.metadata.hybridApplied, true);
    assert.equal(result.metadata.hybridRejectedReason, null);
});

test('fairy fork mode falls back safely when Fairy move is rejected', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.difficulty = 'hard';

    const result = buildFairyProbeDecision(
        state,
        makeMove(7, 3, 6, 3),
        makeProbe('bestmove c2d1'),
        { allowHybrid: true, fairyPrimary: true }
    );

    assert.equal(result.appliedMove, null);
    assert.equal(result.metadata.mode, 'fairy_fork');
    assert.equal(result.metadata.fairyAccepted, false);
    assert.equal(result.metadata.fallbackUsed, true);
    assert.equal(result.metadata.hybridApplied, false);
    assert.equal(result.metadata.hybridRejectedReason, 'picket_minimum_distance_rule');
});

test('fairy fork search depth scales by difficulty and bot level', async () => {
    const easy = { difficulty: 'easy', timeControl: '15' };
    const medium = { difficulty: 'medium', timeControl: '15' };
    const hard = { difficulty: 'hard', timeControl: '30' };
    const lowBot = { aiBotId: 'bot_3', timeControl: '15' };
    const highBot = { aiBotId: 'bot_15', timeControl: 'none' };

    assert.equal(resolveFairySearchDepth(easy, { fairyPrimary: true }), 2);
    assert.equal(resolveFairySearchDepth(medium, { fairyPrimary: true }), 4);
    assert.equal(resolveFairySearchDepth(hard, { fairyPrimary: true }), 7);
    assert.equal(resolveFairySearchDepth(lowBot, { fairyPrimary: true }), 2);
    assert.equal(resolveFairySearchDepth(highBot, { fairyPrimary: true }), 8);
});
