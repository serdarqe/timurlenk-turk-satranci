import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import {
    buildFairyShadowModeReport,
    selectJsAuthoritativeMoveWithFairyShadow
} from '../src/fairy/FairyShadowMode.js';
import { collectTimurLegalMoves } from '../src/fairy/FairyTimurAdapter.js';
import { COLORS } from '../src/utils/constants.js';

function buildSimpleState() {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(0, 5, new King(COLORS.BLACK, 0, 5));
    return state;
}

test('shadow mode reports a legal native bestmove but keeps JS authoritative', () => {
    const state = buildSimpleState();
    const jsMoves = collectTimurLegalMoves(state);
    const fallbackMove = jsMoves.find((move) => move.uci === 'e2e3');
    const reports = [];

    const decision = selectJsAuthoritativeMoveWithFairyShadow(state, 'bestmove e2e3', {
        jsMoves,
        fallbackMove,
        nativeRootMoves: jsMoves.filter((move) => !move.unsupported).map((move) => move.uci),
        onShadowReport: (report) => reports.push(report)
    });

    assert.equal(decision.source, 'js_shadow');
    assert.equal(decision.selectedMove.uci, 'e2e3');
    assert.equal(decision.nativeDecision.accepted, true);
    assert.equal(decision.shadowReport.status, 'in_sync');
    assert.equal(decision.shadowReport.authoritativeSource, 'js');
    assert.equal(reports.length, 1);
    assert.equal(reports[0].safeToLog, true);
});

test('shadow mode records native mismatch while still returning the JS fallback move', () => {
    const state = buildSimpleState();
    const jsMoves = collectTimurLegalMoves(state);
    const fallbackMove = jsMoves.find((move) => move.uci === 'e2e3');

    const decision = selectJsAuthoritativeMoveWithFairyShadow(state, 'bestmove e2f3', {
        jsMoves,
        fallbackMove,
        nativeRootMoves: ['e2f3']
    });

    assert.equal(decision.source, 'js_shadow');
    assert.equal(decision.selectedMove.uci, 'e2e3');
    assert.equal(decision.nativeDecision.accepted, false);
    assert.equal(decision.nativeDecision.reason, 'unclassified_fairy_only_move');
    assert.equal(decision.shadowReport.status, 'mismatch');
    assert.equal(decision.shadowReport.nativeBestMove.status, 'rejected');
    assert.equal(decision.shadowReport.stats.unexpectedFairyOnlyCount, 1);
});

test('shadow report marks expected wrapper differences without treating them as unsafe', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    const jsMoves = collectTimurLegalMoves(state);

    const report = buildFairyShadowModeReport(state, {
        jsMoves,
        nativeRootMoves: jsMoves.filter((move) => !move.unsupported).map((move) => move.uci),
        nativeBestMove: 'bestmove a10@blackcitadel'
    });

    assert.equal(report.status, 'expected_differences');
    assert.equal(report.onlyExpectedDiffs, true);
    assert.equal(report.nativeBestMove.status, 'accepted');
    assert.equal(report.nativeBestMove.normalizedBestMove, 'a10@blackcitadel');
    assert.equal(report.stats.unexpectedJsOnlyCount, 0);
    assert.equal(report.stats.unexpectedFairyOnlyCount, 0);
});
