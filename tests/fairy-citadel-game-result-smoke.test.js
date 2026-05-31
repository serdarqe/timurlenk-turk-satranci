import test from 'node:test';
import assert from 'node:assert/strict';

import {
    evaluateCitadelGameResultNativeSmoke,
    getCitadelGameResultNativeSmokeCases
} from '../src/fairy/FairyCitadelGameResultNativeSmoke.js';
import { COLORS, GAME_STATES, PIECE_TYPES } from '../src/utils/constants.js';

test('citadel game-result smoke covers every royal entry into the opponent citadel', () => {
    const cases = getCitadelGameResultNativeSmokeCases();

    assert.equal(cases.length, 6);
    assert.deepEqual(
        cases.map((entry) => `${entry.color}:${entry.pieceType}:${entry.nativeOffboardToken}`),
        [
            `${COLORS.WHITE}:${PIECE_TYPES.KING}:a10@blackcitadel`,
            `${COLORS.WHITE}:${PIECE_TYPES.PRINCE}:a10@blackcitadel`,
            `${COLORS.WHITE}:${PIECE_TYPES.ADVENTITIOUS_KING}:a10@blackcitadel`,
            `${COLORS.BLACK}:${PIECE_TYPES.KING}:k1@whitecitadel`,
            `${COLORS.BLACK}:${PIECE_TYPES.PRINCE}:k1@whitecitadel`,
            `${COLORS.BLACK}:${PIECE_TYPES.ADVENTITIOUS_KING}:k1@whitecitadel`
        ]
    );

    for (const smokeCase of cases) {
        assert.equal(smokeCase.expectedStatus, GAME_STATES.GAME_OVER);
        assert.equal(smokeCase.expectedWinner, 'Draw (Hisar)');
    }
});

test('citadel game-result smoke only passes when native token and JS draw result both match', () => {
    const cases = getCitadelGameResultNativeSmokeCases();
    const passingResults = cases.map((smokeCase) => ({
        id: smokeCase.id,
        nativeRootMoves: [smokeCase.nativeOffboardToken],
        jsStatus: GAME_STATES.GAME_OVER,
        jsWinner: 'Draw (Hisar)',
        applyRevertParity: true
    }));
    const report = evaluateCitadelGameResultNativeSmoke(passingResults);

    assert.equal(report.nativeGameResultSemantics, true);
    assert.equal(report.nativeApplyRevertParity, true);
    assert.equal(report.nativeEngineSmoke, true);
    assert.deepEqual(report.blockers, []);

    const failingReport = evaluateCitadelGameResultNativeSmoke([
        ...passingResults.slice(0, -1),
        {
            id: cases.at(-1).id,
            nativeRootMoves: [],
            jsStatus: GAME_STATES.GAME_OVER,
            jsWinner: 'Draw (Hisar)',
            applyRevertParity: true
        }
    ]);

    assert.equal(failingReport.nativeGameResultSemantics, false);
    assert.equal(failingReport.nativeApplyRevertParity, false);
    assert.equal(failingReport.nativeEngineSmoke, false);
    assert.deepEqual(failingReport.blockers, [
        'native_game_result_semantics_missing',
        'native_apply_revert_parity_missing',
        'native_engine_smoke_missing'
    ]);
});

test('citadel game-result smoke blocks native promotion when apply/revert parity fails', () => {
    const cases = getCitadelGameResultNativeSmokeCases();
    const report = evaluateCitadelGameResultNativeSmoke(cases.map((smokeCase, index) => ({
        id: smokeCase.id,
        nativeRootMoves: [smokeCase.nativeOffboardToken],
        jsStatus: GAME_STATES.GAME_OVER,
        jsWinner: 'Draw (Hisar)',
        applyRevertParity: index !== 0
    })));

    assert.equal(report.nativeGameResultSemantics, true);
    assert.equal(report.nativeEngineSmoke, true);
    assert.equal(report.nativeApplyRevertParity, false);
    assert.deepEqual(report.blockers, ['native_apply_revert_parity_missing']);
});
