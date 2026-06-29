import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SPECIAL_NATIVE_RISK_RULE_IDS,
    getSpecialRuleNativeRiskReport,
    getSpecialRuleNativeTransitionVerdict
} from '../src/fairy/FairySpecialRuleNativeRisk.js';

const EXPECTED_RISK = Object.freeze({
    citadel_draw: {
        stateEffects: [
            'offboard_citadel_square',
            'opponent_citadel_entry',
            'game_result_mutation',
            'draw_winner_label',
            'apply_revert_required'
        ],
        blockers: [
            'native_source_marker_missing',
            'wasm_rebuild_missing',
            'native_offboard_citadel_semantics_missing',
            'native_game_result_semantics_missing',
            'native_apply_revert_parity_missing',
            'native_engine_smoke_missing'
        ],
        evidence: {
            nativeOffboardCitadelSemantics: true,
            nativeGameResultSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    },
    citadel_exchange: {
        stateEffects: [
            'offboard_citadel_square',
            'dual_royal_relocation',
            'citadel_exchange_flag_consumption',
            'target_royal_square_replacement',
            'apply_revert_required'
        ],
        blockers: [
            'native_source_marker_missing',
            'wasm_rebuild_missing',
            'native_offboard_citadel_semantics_missing',
            'native_dual_relocation_semantics_missing',
            'native_one_time_flag_semantics_missing',
            'native_apply_revert_parity_missing',
            'native_engine_smoke_missing'
        ],
        evidence: {
            nativeOffboardCitadelSemantics: true,
            nativeDualRelocationSemantics: true,
            nativeOneTimeFlagSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    },
    royal_swap: {
        stateEffects: [
            'check_escape_only',
            'king_target_square_swap',
            'ransom_flag_consumption',
            'one_time_right_tracking',
            'apply_revert_required'
        ],
        blockers: [
            'native_source_marker_missing',
            'wasm_rebuild_missing',
            'native_check_escape_semantics_missing',
            'native_royal_swap_semantics_missing',
            'native_one_time_flag_semantics_missing',
            'native_apply_revert_parity_missing',
            'native_engine_smoke_missing'
        ],
        evidence: {
            nativeCheckEscapeSemantics: true,
            nativeRoyalSwapSemantics: true,
            nativeOneTimeFlagSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    }
});

test('state-changing special rules stay JS-authoritative until explicit native state evidence exists', () => {
    assert.deepEqual(SPECIAL_NATIVE_RISK_RULE_IDS, [
        'citadel_draw',
        'citadel_exchange',
        'royal_swap'
    ]);

    for (const ruleId of SPECIAL_NATIVE_RISK_RULE_IDS) {
        const report = getSpecialRuleNativeRiskReport(ruleId);
        const expected = EXPECTED_RISK[ruleId];

        assert.equal(report.ruleId, ruleId);
        assert.equal(report.severity, 'high');
        assert.equal(report.ready, false);
        assert.equal(report.jsAuthoritative, true);
        assert.equal(report.parityCovered, true);
        assert.ok(report.coverageCases.length >= 2);
        assert.deepEqual(report.stateEffects, expected.stateEffects);
        assert.deepEqual(report.blockers, expected.blockers);
    }
});

test('state-changing special rule native verdicts only pass with full state-changing evidence', () => {
    for (const ruleId of SPECIAL_NATIVE_RISK_RULE_IDS) {
        const verdict = getSpecialRuleNativeTransitionVerdict(ruleId, {
            nativeSourceMarker: true,
            wasmRebuilt: true,
            ...EXPECTED_RISK[ruleId].evidence
        });

        assert.equal(verdict.ruleId, ruleId);
        assert.equal(verdict.allowed, true);
        assert.deepEqual(verdict.blockers, []);
    }
});

test('unknown special rule risk reports fail closed', () => {
    assert.throws(
        () => getSpecialRuleNativeRiskReport('unknown_rule'),
        /Unknown special native risk rule/
    );
});
