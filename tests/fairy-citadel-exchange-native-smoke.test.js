import test from 'node:test';
import assert from 'node:assert/strict';

import {
    evaluateCitadelExchangeNativeSmoke,
    getCitadelExchangeNativeSmokeCases
} from '../src/fairy/FairyCitadelExchangeNativeSmoke.js';
import { getCitadelExchangeNativeEvidenceReport } from '../src/fairy/FairyCitadelExchangeNativeEvidence.js';
import { COLORS } from '../src/utils/constants.js';

test('citadel exchange smoke covers both off-board exchange directions', () => {
    const cases = getCitadelExchangeNativeSmokeCases();

    assert.equal(cases.length, 2);
    assert.deepEqual(
        cases.map((entry) => `${entry.color}:${entry.nativeOffboardToken}:${entry.nativeExchangeToken}:${entry.nativeWiredToMovegen}`),
        [
            `${COLORS.WHITE}:a10@blackcitadel:citadel_exchange:a10:f5@blackcitadel:false`,
            `${COLORS.BLACK}:k1@whitecitadel:citadel_exchange:k1:f6@whitecitadel:false`
        ]
    );
    assert.deepEqual(
        cases.map((entry) => entry.expectedStateEffects),
        [
            [
                'offboard_citadel_square',
                'dual_royal_relocation',
                'citadel_exchange_flag_consumption',
                'apply_revert_required'
            ],
            [
                'offboard_citadel_square',
                'dual_royal_relocation',
                'citadel_exchange_flag_consumption',
                'apply_revert_required'
            ]
        ]
    );
});

test('citadel exchange smoke validates JS bridge semantics but keeps native engine smoke blocked', () => {
    const cases = getCitadelExchangeNativeSmokeCases();
    const report = evaluateCitadelExchangeNativeSmoke(cases.map((smokeCase) => ({
        id: smokeCase.id,
        nativeSourceMarker: true,
        nativePositionSkeleton: true,
        nativeApplyRevertSkeleton: true,
        nativeRootMoves: [],
        jsDualRelocationMatches: true,
        jsOneTimeFlagSemantics: true,
        jsApplyRevertParity: true
    })));

    assert.equal(report.nativeOffboardCitadelSemantics, true);
    assert.equal(report.nativeDualRelocationSemantics, true);
    assert.equal(report.nativeOneTimeFlagSemantics, true);
    assert.equal(report.nativeApplyRevertParity, true);
    assert.equal(report.nativeEngineSmoke, false);
    assert.deepEqual(report.blockers, ['native_engine_smoke_missing']);
});

test('citadel exchange smoke does not treat simple citadel-entry tokens as exchange engine proof', () => {
    const cases = getCitadelExchangeNativeSmokeCases();
    const report = evaluateCitadelExchangeNativeSmoke(cases.map((smokeCase) => ({
        id: smokeCase.id,
        nativeSourceMarker: true,
        nativePositionSkeleton: true,
        nativeApplyRevertSkeleton: true,
        nativeRootMoves: [smokeCase.nativeOffboardToken],
        jsDualRelocationMatches: true,
        jsOneTimeFlagSemantics: true,
        jsApplyRevertParity: true
    })));

    assert.equal(report.cases.every((entry) => entry.nativeOffboardMovePresent), true);
    assert.equal(report.cases.every((entry) => entry.nativeExchangeMovePresent), false);
    assert.equal(report.nativeEngineSmoke, false);
    assert.deepEqual(report.blockers, ['native_engine_smoke_missing']);
});

test('citadel exchange smoke feeds evidence report without falsely promoting the rule', () => {
    const cases = getCitadelExchangeNativeSmokeCases();
    const exchangeSmoke = evaluateCitadelExchangeNativeSmoke(cases.map((smokeCase) => ({
        id: smokeCase.id,
        nativeSourceMarker: true,
        nativePositionSkeleton: true,
        nativeApplyRevertSkeleton: true,
        nativeRootMoves: [],
        jsDualRelocationMatches: true,
        jsOneTimeFlagSemantics: true,
        jsApplyRevertParity: true
    })));

    const evidence = getCitadelExchangeNativeEvidenceReport({
        nativeSourceMarker: true,
        wasmRebuilt: true,
        exchangeSmoke
    });

    assert.equal(evidence.ready, false);
    assert.equal(evidence.jsAuthoritative, true);
    assert.deepEqual(evidence.blockers, ['native_engine_smoke_missing']);
    assert.equal(evidence.exchangeSmoke.nativeEngineSmoke, false);
});

test('citadel exchange smoke reports semantic blockers independently', () => {
    const cases = getCitadelExchangeNativeSmokeCases();
    const report = evaluateCitadelExchangeNativeSmoke(cases.map((smokeCase, index) => ({
        id: smokeCase.id,
        nativeSourceMarker: true,
        nativePositionSkeleton: true,
        nativeApplyRevertSkeleton: true,
        nativeRootMoves: [],
        jsDualRelocationMatches: index !== 0,
        jsOneTimeFlagSemantics: true,
        jsApplyRevertParity: true
    })));

    assert.equal(report.nativeOffboardCitadelSemantics, true);
    assert.equal(report.nativeDualRelocationSemantics, false);
    assert.equal(report.nativeOneTimeFlagSemantics, true);
    assert.equal(report.nativeApplyRevertParity, true);
    assert.equal(report.nativeEngineSmoke, false);
    assert.deepEqual(report.blockers, [
        'native_dual_relocation_semantics_missing',
        'native_engine_smoke_missing'
    ]);
});
