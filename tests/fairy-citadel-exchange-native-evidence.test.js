import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, Prince } from '../src/game/PieceFactory.js';
import {
    getCitadelExchangeNativeEvidenceReport,
    getCitadelExchangeNativeEvidenceVerdict
} from '../src/fairy/FairyCitadelExchangeNativeEvidence.js';
import { COLORS } from '../src/utils/constants.js';

function buildExchangeState(exchangeCase) {
    const state = new GameState();
    const royal = new King(exchangeCase.color, exchangeCase.royalFrom.row, exchangeCase.royalFrom.col);
    const targetRoyal = new Prince(exchangeCase.color, exchangeCase.targetRoyalFrom.row, exchangeCase.targetRoyalFrom.col);

    state.board.setPiece(royal.row, royal.col, royal);
    state.board.setPiece(targetRoyal.row, targetRoyal.col, targetRoyal);

    return { state, royal, targetRoyal };
}

test('citadel exchange native evidence report describes relocation and one-time-state proof before native promotion', () => {
    const report = getCitadelExchangeNativeEvidenceReport();

    assert.equal(report.ruleId, 'citadel_exchange');
    assert.equal(report.evidencePhase, 'native_preparation');
    assert.equal(report.ready, false);
    assert.equal(report.jsAuthoritative, true);
    assert.deepEqual(report.offboardCitadels, [
        {
            id: 'black_citadel',
            owner: COLORS.BLACK,
            enteredBy: COLORS.WHITE,
            row: 0,
            col: -1,
            fairySquare: 'citadel:black'
        },
        {
            id: 'white_citadel',
            owner: COLORS.WHITE,
            enteredBy: COLORS.BLACK,
            row: 9,
            col: 11,
            fairySquare: 'citadel:white'
        }
    ]);
    assert.deepEqual(report.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_offboard_citadel_semantics',
        'native_dual_relocation_semantics',
        'native_one_time_flag_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.deepEqual(report.blockers, [
        'native_source_marker_missing',
        'wasm_rebuild_missing',
        'native_offboard_citadel_semantics_missing',
        'native_dual_relocation_semantics_missing',
        'native_one_time_flag_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
    assert.equal(report.exchangeSemanticsCases.length, 2);
    assert.deepEqual(report.exchangeSemanticsCases.map((entry) => entry.id), [
        'white_king_exchanges_prince_through_black_citadel',
        'black_king_exchanges_prince_through_white_citadel'
    ]);
});

test('citadel exchange native evidence report exposes explicit WASM rebuild evidence', () => {
    const report = getCitadelExchangeNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        wasmRebuildEvidence: {
            sourceSha256: 'source-hash',
            sourceLastModifiedAt: '2026-05-19T10:00:00.000Z',
            bundles: [
                {
                    bundle: 'singlethread',
                    ok: true,
                    sourceHashMatches: true,
                    manifestGeneratedAfterSource: true,
                    wasmModifiedAfterSource: true
                }
            ]
        }
    });

    assert.equal(report.wasmRebuildEvidence.sourceSha256, 'source-hash');
    assert.equal(report.wasmRebuildEvidence.bundles[0].bundle, 'singlethread');
    assert.equal(report.blockers.includes('wasm_rebuild_missing'), false);
});

test('citadel exchange semantics cases match JS apply and revert behavior', () => {
    const report = getCitadelExchangeNativeEvidenceReport();

    for (const exchangeCase of report.exchangeSemanticsCases) {
        const { state, royal, targetRoyal } = buildExchangeState(exchangeCase);
        const effects = GameRules.applyCitadelExchange(state, royal, targetRoyal);

        assert.equal(effects.kind, 'citadel_exchange', exchangeCase.id);
        assert.equal(state.citadelExchangeUsed[exchangeCase.color], true, exchangeCase.id);
        assert.equal(state.board.getPieceAt(exchangeCase.citadel.row, exchangeCase.citadel.col), targetRoyal, exchangeCase.id);
        assert.equal(state.board.getPieceAt(exchangeCase.targetRoyalFrom.row, exchangeCase.targetRoyalFrom.col), royal, exchangeCase.id);
        assert.equal(state.status, exchangeCase.expectedStatus, exchangeCase.id);
        assert.equal(state.winner, exchangeCase.expectedWinner, exchangeCase.id);

        GameRules.revertCitadelExchange(state, effects);

        assert.equal(state.citadelExchangeUsed[exchangeCase.color], false, exchangeCase.id);
        assert.equal(state.board.getPieceAt(exchangeCase.royalFrom.row, exchangeCase.royalFrom.col), royal, exchangeCase.id);
        assert.equal(state.board.getPieceAt(exchangeCase.targetRoyalFrom.row, exchangeCase.targetRoyalFrom.col), targetRoyal, exchangeCase.id);
        assert.equal(state.board.getPieceAt(exchangeCase.citadel.row, exchangeCase.citadel.col), null, exchangeCase.id);
    }
});

test('citadel exchange native evidence verdict only passes when all native proof is explicit', () => {
    const verdict = getCitadelExchangeNativeEvidenceVerdict({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeOffboardCitadelSemantics: true,
        nativeDualRelocationSemantics: true,
        nativeOneTimeFlagSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.blockers, []);
});
