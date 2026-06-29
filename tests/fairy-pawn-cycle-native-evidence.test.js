import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getPawnCycleNativeEvidenceReport,
    getPawnCycleNativeEvidenceVerdict
} from '../src/fairy/FairyPawnCycleNativeEvidence.js';

test('pawn-cycle native evidence report describes all required proof before promotion', () => {
    const report = getPawnCycleNativeEvidenceReport();

    assert.equal(report.ruleId, 'pawn_of_pawns_cycle');
    assert.equal(report.evidencePhase, 'native_preparation');
    assert.equal(report.ready, false);
    assert.equal(report.jsAuthoritative, true);
    assert.deepEqual(report.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_stage_encoding',
        'native_repatriation_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.deepEqual(report.blockers, [
        'native_source_marker_missing',
        'wasm_rebuild_missing',
        'native_stage_encoding_missing',
        'native_repatriation_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
    assert.deepEqual(report.cycleSemanticsCases.map((entry) => entry.id), [
        'white_pawn_of_pawns_initial_repatriates_to_stage_2',
        'black_pawn_of_pawns_stage_2_repatriates_to_stage_3',
        'white_pawn_of_pawns_stage_3_promotes_to_adventitious_king'
    ]);
});

test('pawn-cycle native evidence report merges smoke evidence into final verdict', () => {
    const report = getPawnCycleNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        pawnCycleSmoke: {
            nativeStageEncoding: true,
            nativeRepatriationSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    });

    assert.equal(report.ready, true);
    assert.deepEqual(report.blockers, []);
});

test('pawn-cycle native evidence verdict only passes when every native proof is explicit', () => {
    const verdict = getPawnCycleNativeEvidenceVerdict({
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
