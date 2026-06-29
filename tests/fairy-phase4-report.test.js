import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildFairyPhase4Report,
    formatFairyPhase4Report
} from '../src/fairy/FairyPhase4Report.js';

test('phase 4 report summarizes native-ready and JS-authoritative Timur rules', () => {
    const report = buildFairyPhase4Report();

    assert.equal(report.phase, 'phase4_native_transition');
    assert.deepEqual(report.summary, {
        nativeAuthoritativeCount: 6,
        stateChangingCandidateCount: 4,
        highRiskBlockedCount: 4,
        readyStateChangingCount: 0,
        controlledPromotionCount: 0
    });

    assert.deepEqual(
        report.nativeAuthoritativeRules.map((entry) => entry.ruleId),
        [
            'giraffe_movement',
            'picket_minimum_distance',
            'promotion_suffix',
            'threefold_repetition',
            'fifty_move_draw',
            'stalemate_win'
        ]
    );

    assert.deepEqual(
        report.jsAuthoritativeRules.map((entry) => entry.ruleId),
        [
            'pawn_of_pawns_cycle',
            'citadel_draw',
            'citadel_exchange',
            'royal_swap'
        ]
    );

    for (const entry of report.jsAuthoritativeRules) {
        assert.equal(entry.ready, false);
        assert.equal(entry.jsAuthoritative, true);
        assert.equal(entry.severity, 'high');
        assert.ok(entry.blockers.length > 0);
        assert.ok(entry.stateEffects.length > 0);
    }

    assert.equal(report.nextSafeStep.ruleId, 'citadel_draw');
    assert.equal(report.nextSafeStep.evidencePhase, 'native_preparation');
    assert.equal(report.nextSafeStep.resultSemanticsCaseCount, 6);
    assert.deepEqual(report.nextSafeStep.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_offboard_citadel_semantics',
        'native_game_result_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.match(report.nextSafeStep.reason, /smallest state-changing/);
});

test('phase 4 report formats a readable one-page console summary', () => {
    const formatted = formatFairyPhase4Report(buildFairyPhase4Report());

    assert.match(formatted, /Fairy Phase 4 Native Transition Report/);
    assert.match(formatted, /Native authoritative \(6\)/);
    assert.match(formatted, /JS authoritative high-risk rules \(4\)/);
    assert.match(formatted, /Controlled promotions: none/);
    assert.match(formatted, /promotion_suffix/);
    assert.match(formatted, /pawn_of_pawns_cycle: BLOCKED/);
    assert.match(formatted, /Next safe step: citadel_draw/);
    assert.match(formatted, /Evidence phase: native_preparation/);
    assert.match(formatted, /Result semantics cases: 6/);
});

test('phase 4 report exposes citadel draw as a controlled promotion when all evidence passes', () => {
    const report = buildFairyPhase4Report({
        citadel_draw: {
            nativeSourceMarker: true,
            nativeModelContract: true,
            wasmRebuilt: true,
            nativeOffboardCitadelSemantics: true,
            nativeGameResultSemantics: true,
            nativeApplyRevertParity: true,
            nativeEngineSmoke: true
        }
    });

    assert.deepEqual(report.summary, {
        nativeAuthoritativeCount: 6,
        stateChangingCandidateCount: 4,
        highRiskBlockedCount: 3,
        readyStateChangingCount: 1,
        controlledPromotionCount: 1
    });
    assert.deepEqual(
        report.controlledPromotionRules.map((entry) => entry.ruleId),
        ['citadel_draw']
    );
    assert.equal(report.controlledPromotionRules[0].wrapperGuardRetained, true);
    assert.equal(report.controlledPromotionRules[0].wrapperReason, 'citadel_requires_wrapper');
    assert.equal(report.nextSafeStep.ruleId, 'citadel_exchange');
    assert.deepEqual(report.nextSafeStep.requiredNativeEvidence, [
        'wasm_rebuild_after_native_source',
        'native_offboard_citadel_semantics',
        'native_dual_relocation_semantics',
        'native_one_time_flag_semantics',
        'native_apply_revert_parity',
        'native_engine_smoke'
    ]);
    assert.equal(report.nextSafeStep.resultSemanticsCaseCount, 2);
    assert.match(formatFairyPhase4Report(report), /Controlled promotions: citadel_draw/);
    assert.match(formatFairyPhase4Report(report), /Next safe step: citadel_exchange/);
    assert.match(formatFairyPhase4Report(report), /Required evidence: wasm_rebuild_after_native_source, native_offboard_citadel_semantics, native_dual_relocation_semantics/);
});

test('phase 4 report can consume native source-marker evidence for citadel draw', () => {
    const report = buildFairyPhase4Report({
        citadel_draw: {
            nativeSourceMarker: true,
            nativeModelContract: true
        }
    });
    const citadelDraw = report.jsAuthoritativeRules.find((entry) => entry.ruleId === 'citadel_draw');

    assert.ok(citadelDraw);
    assert.equal(citadelDraw.ready, false);
    assert.equal(citadelDraw.blockers.includes('native_source_marker_missing'), false);
    assert.equal(report.nextSafeStep.blockers.includes('native_source_marker_missing'), false);
    assert.equal(report.nextSafeStep.sourceMarkerPresent, true);
    assert.equal(report.nextSafeStep.nativeModelContractPresent, true);
});

test('phase 4 report can consume WASM rebuild evidence without promoting citadel draw too early', () => {
    const report = buildFairyPhase4Report({
        citadel_draw: {
            nativeSourceMarker: true,
            wasmRebuilt: true,
            wasmRebuildEvidence: {
                bundles: [
                    {
                        bundle: 'singlethread',
                        ok: true
                    }
                ]
            }
        }
    });
    const citadelDraw = report.jsAuthoritativeRules.find((entry) => entry.ruleId === 'citadel_draw');

    assert.ok(citadelDraw);
    assert.equal(citadelDraw.ready, false);
    assert.equal(citadelDraw.blockers.includes('wasm_rebuild_missing'), false);
    assert.equal(report.nextSafeStep.blockers.includes('wasm_rebuild_missing'), false);
    assert.equal(report.nextSafeStep.wasmRebuilt, true);
    assert.deepEqual(report.nextSafeStep.wasmRebuildBundles, ['singlethread']);
});
