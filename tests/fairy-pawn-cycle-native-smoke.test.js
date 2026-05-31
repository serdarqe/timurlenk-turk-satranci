import test from 'node:test';
import assert from 'node:assert/strict';

import {
    evaluatePawnCycleNativeSmoke,
    getPawnCycleNativeSmokeCases
} from '../src/fairy/FairyPawnCycleNativeSmoke.js';

test('pawn-cycle smoke covers two repatriation stages and final adventitious promotion', () => {
    const cases = getPawnCycleNativeSmokeCases();

    assert.deepEqual(cases.map((entry) => entry.id), [
        'white_pawn_of_pawns_initial_repatriates_to_stage_2',
        'black_pawn_of_pawns_stage_2_repatriates_to_stage_3',
        'white_pawn_of_pawns_stage_3_promotes_to_adventitious_king'
    ]);
    assert.deepEqual(cases.map((entry) => entry.nativePawnCycleToken), [
        'pawn_cycle:e10:e3@stage2',
        'pawn_cycle:e1:e8@stage3',
        'pawn_cycle:f10:f10@adventitious'
    ]);
    assert.equal(cases.every((entry) => entry.nativeWiredToMovegen === false), true);
});

test('pawn-cycle smoke blocks native promotion until native engine token proof exists', () => {
    const report = evaluatePawnCycleNativeSmoke([
        buildPassingCase('white_pawn_of_pawns_initial_repatriates_to_stage_2', []),
        buildPassingCase('black_pawn_of_pawns_stage_2_repatriates_to_stage_3', []),
        buildPassingCase('white_pawn_of_pawns_stage_3_promotes_to_adventitious_king', [])
    ]);

    assert.equal(report.nativeStageEncoding, true);
    assert.equal(report.nativeRepatriationSemantics, true);
    assert.equal(report.nativeApplyRevertParity, true);
    assert.equal(report.nativeEngineSmoke, false);
    assert.deepEqual(report.blockers, ['native_engine_smoke_missing']);
});

test('pawn-cycle smoke passes only when native perft exposes explicit pawn-cycle tokens', () => {
    const report = evaluatePawnCycleNativeSmoke([
        buildPassingCase('white_pawn_of_pawns_initial_repatriates_to_stage_2', [
            'pawn_cycle:e10:e3@stage2'
        ]),
        buildPassingCase('black_pawn_of_pawns_stage_2_repatriates_to_stage_3', [
            'pawn_cycle:e1:e8@stage3'
        ]),
        buildPassingCase('white_pawn_of_pawns_stage_3_promotes_to_adventitious_king', [
            'pawn_cycle:f10:f10@adventitious'
        ])
    ]);

    assert.equal(report.nativeEngineSmoke, true);
    assert.deepEqual(report.blockers, []);
});

function buildPassingCase(id, nativeRootMoves) {
    return {
        id,
        nativeRootMoves,
        nativeSourceMarker: true,
        nativePositionSkeleton: true,
        nativeApplyRevertSkeleton: true,
        jsStageEncoding: true,
        jsRepatriationSemantics: true,
        jsApplyRevertParity: true
    };
}
