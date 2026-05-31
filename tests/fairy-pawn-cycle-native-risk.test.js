import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getPawnOfPawnsNativeRiskReport,
    getPawnOfPawnsNativeTransitionVerdict
} from '../src/fairy/FairyPawnCycleNativeRisk.js';

test('pawn-of-pawns native risk report keeps the rule blocked until all state evidence exists', () => {
    const report = getPawnOfPawnsNativeRiskReport();

    assert.equal(report.ruleId, 'pawn_of_pawns_cycle');
    assert.equal(report.severity, 'high');
    assert.equal(report.ready, false);
    assert.equal(report.jsAuthoritative, true);
    assert.deepEqual(report.stageFlow, [
        'initial_to_stage_2',
        'stage_2_to_stage_3',
        'stage_3_to_adventitious_king'
    ]);
    assert.deepEqual(report.stateEffects, [
        'stage_mutation',
        'repatriation_to_start_row',
        'occupied_return_file_scan',
        'adventitious_king_creation',
        'apply_revert_required'
    ]);
    assert.deepEqual(report.blockers, [
        'native_source_marker_missing',
        'wasm_rebuild_missing',
        'native_stage_encoding_missing',
        'native_repatriation_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
});

test('pawn-of-pawns native verdict only passes with explicit state-changing evidence', () => {
    const verdict = getPawnOfPawnsNativeTransitionVerdict({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeStageEncoding: true,
        nativeRepatriationSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.blockers, []);
});
