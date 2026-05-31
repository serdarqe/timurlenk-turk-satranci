import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getNativeTransitionRule,
    getWrapperReasons,
    isRuleControlledNativePromotion,
    isRuleNativeAuthoritative,
    validateNativeRulePromotion
} from '../src/fairy/FairyNativeTransition.js';

test('state-changing Timur rules cannot replace JS wrappers without evidence', () => {
    const guardedRules = [];

    for (const ruleId of guardedRules) {
        const verdict = validateNativeRulePromotion(ruleId);

        assert.equal(verdict.allowed, false, ruleId);
        assert.deepEqual(verdict.blockers, [
            'native_source_marker_missing',
            'js_native_parity_test_missing',
            'wasm_rebuild_missing'
        ]);
    }
});

test('pure native rules are marked as native authoritative', () => {
    assert.equal(isRuleNativeAuthoritative('giraffe_movement'), true);
    assert.equal(isRuleNativeAuthoritative('picket_minimum_distance'), true);
    assert.equal(isRuleNativeAuthoritative('promotion_suffix'), true);
    assert.equal(isRuleNativeAuthoritative('threefold_repetition'), true);
    assert.equal(isRuleNativeAuthoritative('fifty_move_draw'), true);
});

test('wrapper reasons stay tied to explicit transition rules', () => {
    const wrapperReasons = getWrapperReasons();

    assert.equal(wrapperReasons.includes('royal_swap_requires_wrapper'), true);
    assert.equal(wrapperReasons.includes('citadel_exchange_requires_wrapper'), true);
    assert.equal(wrapperReasons.includes('promotion_suffix_requires_wrapper'), true);
    assert.equal(getNativeTransitionRule('royal_swap').wrapperReason, 'royal_swap_requires_wrapper');
    assert.equal(getNativeTransitionRule('promotion_suffix').wrapperReason, null);
    assert.equal(getNativeTransitionRule('pawn_of_pawns_cycle').wrapperReason, 'promotion_suffix_requires_wrapper');
});

test('unknown native transition rules are never promoted silently', () => {
    const verdict = validateNativeRulePromotion('unknown_rule', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true
    });

    assert.equal(verdict.allowed, false);
    assert.deepEqual(verdict.blockers, ['unknown_rule']);
});

test('promotion suffix is promoted to native-authoritative after parity and source rebuild evidence', () => {
    const verdict = validateNativeRulePromotion('promotion_suffix');

    assert.equal(verdict.allowed, true);
    assert.deepEqual(verdict.blockers, []);
});

test('citadel draw native promotion requires the citadel parity matrix', () => {
    const incomplete = validateNativeRulePromotion('citadel_draw', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true
    });

    assert.equal(incomplete.allowed, false);
    assert.deepEqual(incomplete.blockers, ['citadel_parity_matrix_missing']);

    const complete = validateNativeRulePromotion('citadel_draw', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true,
        citadelParityMatrix: true
    });

    assert.equal(complete.allowed, true);
    assert.deepEqual(complete.blockers, []);
});

test('citadel draw is a controlled native promotion with JS wrapper guard retained', () => {
    const rule = getNativeTransitionRule('citadel_draw');

    assert.equal(rule.status, 'native_ready_wrapper_guarded');
    assert.equal(rule.wrapperReason, 'citadel_requires_wrapper');
    assert.equal(isRuleControlledNativePromotion('citadel_draw'), true);
    assert.equal(isRuleNativeAuthoritative('citadel_draw'), false);

    const complete = validateNativeRulePromotion('citadel_draw', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true,
        citadelParityMatrix: true
    });

    assert.equal(complete.allowed, true);
    assert.deepEqual(complete.blockers, []);
});

test('pawn-of-pawns cycle is a controlled native promotion with JS wrapper guard retained', () => {
    const rule = getNativeTransitionRule('pawn_of_pawns_cycle');

    assert.equal(rule.status, 'native_ready_wrapper_guarded');
    assert.equal(rule.wrapperReason, 'promotion_suffix_requires_wrapper');
    assert.equal(isRuleControlledNativePromotion('pawn_of_pawns_cycle'), true);
    assert.equal(isRuleNativeAuthoritative('pawn_of_pawns_cycle'), false);
});

test('citadel exchange is a controlled native promotion with JS wrapper guard retained', () => {
    const rule = getNativeTransitionRule('citadel_exchange');

    assert.equal(rule.status, 'native_ready_wrapper_guarded');
    assert.equal(rule.wrapperReason, 'citadel_exchange_requires_wrapper');
    assert.equal(isRuleControlledNativePromotion('citadel_exchange'), true);
    assert.equal(isRuleNativeAuthoritative('citadel_exchange'), false);
});

test('citadel exchange native promotion requires the citadel exchange parity matrix', () => {
    const incomplete = validateNativeRulePromotion('citadel_exchange', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true
    });

    assert.equal(incomplete.allowed, false);
    assert.deepEqual(incomplete.blockers, ['citadel_exchange_parity_matrix_missing']);

    const complete = validateNativeRulePromotion('citadel_exchange', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true,
        citadelExchangeParityMatrix: true
    });

    assert.equal(complete.allowed, true);
    assert.deepEqual(complete.blockers, []);
});

test('royal swap native promotion requires the royal swap parity matrix', () => {
    const incomplete = validateNativeRulePromotion('royal_swap', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true
    });

    assert.equal(incomplete.allowed, false);
    assert.deepEqual(incomplete.blockers, ['royal_swap_parity_matrix_missing']);

    const complete = validateNativeRulePromotion('royal_swap', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true,
        royalSwapParityMatrix: true
    });

    assert.equal(complete.allowed, true);
    assert.deepEqual(complete.blockers, []);
});

test('royal swap is a controlled native promotion with JS wrapper guard retained', () => {
    const rule = getNativeTransitionRule('royal_swap');

    assert.equal(rule.status, 'native_ready_wrapper_guarded');
    assert.equal(rule.wrapperReason, 'royal_swap_requires_wrapper');
    assert.equal(isRuleControlledNativePromotion('royal_swap'), true);
    assert.equal(isRuleNativeAuthoritative('royal_swap'), false);
});

test('pawn-of-pawns cycle native promotion requires the pawn cycle parity matrix', () => {
    const incomplete = validateNativeRulePromotion('pawn_of_pawns_cycle', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true
    });

    assert.equal(incomplete.allowed, false);
    assert.deepEqual(incomplete.blockers, ['pawn_of_pawns_cycle_matrix_missing']);

    const complete = validateNativeRulePromotion('pawn_of_pawns_cycle', {
        nativeSourceMarker: true,
        parityTest: true,
        wasmRebuilt: true,
        pawnOfPawnsCycleMatrix: true
    });

    assert.equal(complete.allowed, true);
    assert.deepEqual(complete.blockers, []);
});
