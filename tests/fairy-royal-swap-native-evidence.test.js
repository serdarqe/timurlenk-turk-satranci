import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getRoyalSwapNativeEvidenceReport,
    getRoyalSwapNativeEvidenceVerdict
} from '../src/fairy/FairyRoyalSwapNativeEvidence.js';

test('royal swap native evidence report describes check-escape and one-time-state proof before promotion', () => {
    const report = getRoyalSwapNativeEvidenceReport();

    assert.equal(report.ruleId, 'royal_swap');
    assert.equal(report.evidencePhase, 'native_preparation');
    assert.equal(report.ready, false);
    assert.equal(report.jsAuthoritative, true);
    assert.deepEqual(report.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_check_escape_semantics',
        'native_royal_swap_semantics',
        'native_one_time_flag_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.deepEqual(report.blockers, [
        'native_source_marker_missing',
        'wasm_rebuild_missing',
        'native_check_escape_semantics_missing',
        'native_royal_swap_semantics_missing',
        'native_one_time_flag_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
    assert.deepEqual(report.swapSemanticsCases.map((entry) => entry.id), [
        'white_king_ransom_swaps_with_rook_while_in_check',
        'black_king_ransom_swaps_with_rook_while_in_check'
    ]);
});

test('royal swap native evidence report merges smoke evidence into the final verdict', () => {
    const report = getRoyalSwapNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        swapSmoke: {
            nativeCheckEscapeSemantics: true,
            nativeRoyalSwapSemantics: true,
            nativeOneTimeFlagSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    });

    assert.equal(report.ready, true);
    assert.deepEqual(report.blockers, []);
});

test('royal swap native evidence verdict only passes when all native proof is explicit', () => {
    const verdict = getRoyalSwapNativeEvidenceVerdict({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeCheckEscapeSemantics: true,
        nativeRoyalSwapSemantics: true,
        nativeOneTimeFlagSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.blockers, []);
});
