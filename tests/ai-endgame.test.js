import test from 'node:test';
import assert from 'node:assert/strict';

import {
    analyzeEndgameMoveOutcome,
    analyzeEndgameWdl,
    clearEndgameWdlCache,
    getEndgameWdlCacheStats
} from '../src/ai/AIEndgame.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function applyAndAnalyze(state, fromRow, fromCol, toRow, toCol, profile = getAIProfile('hard', 'timur')) {
    const piece = state.board.getPieceAt(fromRow, fromCol);
    const moveObj = {
        piece,
        move: { row: toRow, col: toCol }
    };

    state.board.movePiece(fromRow, fromCol, toRow, toCol);
    state.currentTurn = getOppositeColor(piece.color);

    return analyzeEndgameMoveOutcome(state, moveObj, profile);
}

test('oyun sonu motoru sah veren mat agini sessiz oyalanmadan cok daha degerli gorur', () => {
    const checkingState = new GameState('hard');
    checkingState.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    checkingState.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    checkingState.board.setPiece(3, 0, new Rook(COLORS.BLACK, 3, 0));

    const quietState = new GameState('hard');
    quietState.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    quietState.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    quietState.board.setPiece(3, 0, new Rook(COLORS.BLACK, 3, 0));

    const checkingPlan = applyAndAnalyze(checkingState, 3, 0, 1, 0);
    const quietPlan = applyAndAnalyze(quietState, 3, 0, 4, 0);

    assert.ok(checkingPlan.score > quietPlan.score + 1500);
    assert.ok(checkingPlan.components.checkPressure > quietPlan.components.checkPressure);
    assert.ok(checkingPlan.reasons.includes('check-pressure'));
});

test('oyun sonu motoru rakip kraliyetin hisar kacisini ciddi risk sayar', () => {
    const state = new GameState('hard');
    state.board.setPiece(1, 0, new King(COLORS.WHITE, 1, 0));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(5, 5, new Rook(COLORS.BLACK, 5, 5));

    const plan = applyAndAnalyze(state, 5, 5, 5, 6);

    assert.ok(plan.score < 0);
    assert.ok(plan.components.citadelRisk < -1000);
    assert.ok(plan.reasons.includes('citadel-risk'));
});

test('oyun sonu solver son kraliyeti alma hamlesini kesin kazanc olarak okur', () => {
    const state = new GameState('hard');
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(1, 4, new Rook(COLORS.BLACK, 1, 4));

    const plan = applyAndAnalyze(state, 1, 4, 1, 1);

    assert.ok(plan.components.exactSolver > 80000);
    assert.ok(plan.reasons.includes('exact-win'));
});

test('oyun sonu solver rakibin bir hamlede hisar beraberligini bulacagini cezalandirir', () => {
    const state = new GameState('hard');
    state.board.setPiece(1, 0, new King(COLORS.WHITE, 1, 0));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(5, 5, new Rook(COLORS.BLACK, 5, 5));

    const plan = applyAndAnalyze(state, 5, 5, 5, 6);

    assert.ok(plan.components.exactSolver < -30000);
    assert.ok(plan.reasons.includes('exact-draw-risk'));
});

test('faz 10 WDL cache az tasli oyun sonu sonucunu tekrar hesaplamadan tasir', () => {
    clearEndgameWdlCache();

    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(1, 4, new Rook(COLORS.BLACK, 1, 4));

    const first = analyzeEndgameWdl(state, COLORS.BLACK, getAIProfile('hard', 'timur'));
    const second = analyzeEndgameWdl(state, COLORS.BLACK, getAIProfile('hard', 'timur'));
    const stats = getEndgameWdlCacheStats();

    assert.equal(first.cacheHit, false);
    assert.equal(second.cacheHit, true);
    assert.equal(second.outcome, 'win');
    assert.ok(stats.entries >= 1);
    assert.ok(stats.hits >= 1);
});

test('faz 10 oyun sonu WDL plani kazanana donusum kaybedene direnc yolu verir', () => {
    clearEndgameWdlCache();

    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(1, 4, new Rook(COLORS.BLACK, 1, 4));

    const conversion = analyzeEndgameWdl(state, COLORS.BLACK, getAIProfile('hard', 'timur'));
    const resistance = analyzeEndgameWdl(state, COLORS.WHITE, getAIProfile('hard', 'timur'));

    assert.equal(conversion.plan.role, 'conversion');
    assert.ok(conversion.plan.steps.includes('force-royal-capture'));
    assert.ok(conversion.metrics.royalHuntDistance <= 3);
    assert.equal(resistance.plan.role, 'resistance');
    assert.ok(resistance.plan.steps.includes('seek-citadel-draw'));
    assert.ok(resistance.plan.resistanceScore > 0);
});
