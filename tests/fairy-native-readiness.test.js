import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getNativeReadinessReport,
    getStateChangingRuleReadiness
} from '../src/fairy/FairyNativeReadiness.js';

test('promotion suffix is native-ready while remaining state-changing rules stay blocked', () => {
    const report = getNativeReadinessReport();

    assert.deepEqual(
        report.nativeAuthoritativeRules.map((rule) => rule.ruleId).sort(),
        [
            'fifty_move_draw',
            'giraffe_movement',
            'picket_minimum_distance',
            'promotion_suffix',
            'stalemate_win',
            'threefold_repetition'
        ].sort()
    );

    assert.deepEqual(
        report.stateChangingRules.map((rule) => rule.ruleId),
        [
            'pawn_of_pawns_cycle',
            'citadel_draw',
            'citadel_exchange',
            'royal_swap'
        ]
    );

    for (const rule of report.stateChangingRules) {
        assert.equal(rule.parityCovered, true, `${rule.ruleId} should have parity coverage`);
        assert.equal(rule.ready, false, `${rule.ruleId} should not be native-ready yet`);
        assert.equal(rule.controlledPromotion, true);
        assert.deepEqual(rule.blockers, [
            'native_source_marker_missing',
            'wasm_rebuild_missing'
        ]);
    }
});

test('pawn-cycle readiness becomes controlled-promotion ready after all native evidence gates pass', () => {
    const pawnCycle = getStateChangingRuleReadiness('pawn_of_pawns_cycle', {
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeStageEncoding: true,
        nativeRepatriationSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(pawnCycle.ready, true);
    assert.equal(pawnCycle.controlledPromotion, true);
    assert.equal(pawnCycle.wrapperReason, 'promotion_suffix_requires_wrapper');
    assert.deepEqual(pawnCycle.blockers, []);
});

test('readiness can be queried for a single rule', () => {
    const royalSwap = getStateChangingRuleReadiness('royal_swap');

    assert.equal(royalSwap.ruleId, 'royal_swap');
    assert.equal(royalSwap.parityCovered, true);
    assert.equal(royalSwap.ready, false);
    assert.equal(royalSwap.controlledPromotion, true);
    assert.equal(royalSwap.wrapperReason, 'royal_swap_requires_wrapper');
});

test('royal swap readiness becomes controlled-promotion ready after all native evidence gates pass', () => {
    const royalSwap = getStateChangingRuleReadiness('royal_swap', {
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeCheckEscapeSemantics: true,
        nativeRoyalSwapSemantics: true,
        nativeOneTimeFlagSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(royalSwap.ready, true);
    assert.equal(royalSwap.controlledPromotion, true);
    assert.equal(royalSwap.wrapperReason, 'royal_swap_requires_wrapper');
    assert.deepEqual(royalSwap.blockers, []);
});

test('citadel draw readiness stays blocked after source and WASM proof until semantic proof exists', () => {
    const citadelDraw = getStateChangingRuleReadiness('citadel_draw', {
        nativeSourceMarker: true,
        wasmRebuilt: true
    });

    assert.equal(citadelDraw.ready, false);
    assert.equal(citadelDraw.blockers.includes('wasm_rebuild_missing'), false);
    assert.equal(citadelDraw.blockers.includes('native_source_marker_missing'), false);
    assert.deepEqual(citadelDraw.blockers, [
        'native_offboard_citadel_semantics_missing',
        'native_game_result_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
    assert.equal(citadelDraw.controlledPromotion, true);
    assert.equal(citadelDraw.wrapperReason, 'citadel_requires_wrapper');
});

test('citadel draw readiness becomes controlled-promotion ready after all native evidence gates pass', () => {
    const citadelDraw = getStateChangingRuleReadiness('citadel_draw', {
        nativeSourceMarker: true,
        wasmRebuilt: true,
        nativeOffboardCitadelSemantics: true,
        nativeGameResultSemantics: true,
        nativeApplyRevertParity: true,
        nativeEngineSmoke: true
    });

    assert.equal(citadelDraw.ready, true);
    assert.equal(citadelDraw.controlledPromotion, true);
    assert.equal(citadelDraw.wrapperReason, 'citadel_requires_wrapper');
    assert.deepEqual(citadelDraw.blockers, []);
});
