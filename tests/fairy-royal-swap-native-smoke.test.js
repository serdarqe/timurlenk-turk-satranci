import test from 'node:test';
import assert from 'node:assert/strict';

import {
    evaluateRoyalSwapNativeSmoke,
    getRoyalSwapNativeSmokeCases
} from '../src/fairy/FairyRoyalSwapNativeSmoke.js';

test('royal swap smoke covers both ransom swap directions', () => {
    const cases = getRoyalSwapNativeSmokeCases();

    assert.deepEqual(cases.map((entry) => entry.id), [
        'white_king_ransom_swaps_with_rook_while_in_check',
        'black_king_ransom_swaps_with_rook_while_in_check'
    ]);
    assert.deepEqual(cases.map((entry) => entry.nativeRoyalSwapToken), [
        'royal_swap:f1:e2@ransom',
        'royal_swap:f10:e9@ransom'
    ]);
    assert.equal(cases.every((entry) => entry.nativeWiredToMovegen === false), true);
});

test('royal swap smoke blocks native promotion until every semantic gate passes', () => {
    const report = evaluateRoyalSwapNativeSmoke([
        {
            id: 'white_king_ransom_swaps_with_rook_while_in_check',
            nativeRootMoves: ['f1e2'],
            nativeSourceMarker: true,
            nativePositionSkeleton: true,
            nativeApplyRevertSkeleton: true,
            jsCheckEscapeSemantics: true,
            jsRoyalSwapSemantics: true,
            jsOneTimeFlagSemantics: true,
            jsApplyRevertParity: true
        },
        {
            id: 'black_king_ransom_swaps_with_rook_while_in_check',
            nativeRootMoves: ['f10e9'],
            nativeSourceMarker: true,
            nativePositionSkeleton: true,
            nativeApplyRevertSkeleton: true,
            jsCheckEscapeSemantics: true,
            jsRoyalSwapSemantics: true,
            jsOneTimeFlagSemantics: true,
            jsApplyRevertParity: true
        }
    ]);

    assert.equal(report.nativeCheckEscapeSemantics, true);
    assert.equal(report.nativeRoyalSwapSemantics, true);
    assert.equal(report.nativeOneTimeFlagSemantics, true);
    assert.equal(report.nativeApplyRevertParity, true);
    assert.equal(report.nativeEngineSmoke, false);
    assert.deepEqual(report.blockers, ['native_engine_smoke_missing']);
});

test('royal swap smoke passes only when native perft exposes explicit royal-swap tokens', () => {
    const report = evaluateRoyalSwapNativeSmoke([
        {
            id: 'white_king_ransom_swaps_with_rook_while_in_check',
            nativeRootMoves: ['royal_swap:f1:e2@ransom'],
            nativeSourceMarker: true,
            nativePositionSkeleton: true,
            nativeApplyRevertSkeleton: true,
            jsCheckEscapeSemantics: true,
            jsRoyalSwapSemantics: true,
            jsOneTimeFlagSemantics: true,
            jsApplyRevertParity: true
        },
        {
            id: 'black_king_ransom_swaps_with_rook_while_in_check',
            nativeRootMoves: ['royal_swap:f10:e9@ransom'],
            nativeSourceMarker: true,
            nativePositionSkeleton: true,
            nativeApplyRevertSkeleton: true,
            jsCheckEscapeSemantics: true,
            jsRoyalSwapSemantics: true,
            jsOneTimeFlagSemantics: true,
            jsApplyRevertParity: true
        }
    ]);

    assert.equal(report.nativeEngineSmoke, true);
    assert.deepEqual(report.blockers, []);
});
