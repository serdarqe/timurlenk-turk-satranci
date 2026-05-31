import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CITADEL_NATIVE_MODEL_SOURCE_MARKERS,
    getCitadelNativeModelContract
} from '../src/fairy/FairyCitadelNativeModel.js';

test('citadel native model contract keeps off-board citadels outside normal bitboards', () => {
    const contract = getCitadelNativeModelContract();

    assert.equal(contract.ruleId, 'citadel_draw');
    assert.equal(contract.modelPhase, 'source_contract_before_behavior');
    assert.equal(contract.normalBoardEncoding, '11x10_bitboard_only');
    assert.equal(contract.offboardEncoding, 'special_move_channel');
    assert.deepEqual(contract.offboardSquares.map((entry) => entry.id), [
        'black_citadel',
        'white_citadel'
    ]);
    assert.deepEqual(contract.requiredNativePipeline, [
        'generate_special_citadel_move',
        'apply_special_citadel_move',
        'resolve_draw_result',
        'revert_special_citadel_move'
    ]);
    assert.deepEqual(contract.specialMoveSkeleton, {
        nativeStruct: 'TimurCitadelSpecialMove',
        tryMakeHelper: 'timur_try_make_citadel_special_move',
        targetEnum: 'TimurCitadelTarget',
        wiredToMovegen: false
    });
    assert.deepEqual(contract.applyResultRevertSkeleton, {
        snapshotStruct: 'TimurCitadelStateSnapshot',
        resultEnum: 'TimurCitadelResolution',
        applyHelper: 'timur_apply_citadel_special_move_skeleton',
        resultHelper: 'timur_resolve_citadel_special_result',
        revertHelper: 'timur_revert_citadel_special_move_skeleton',
        mutatesPositionState: false
    });
    assert.deepEqual(contract.offboardTokenStrategy, {
        blackCitadelToken: 'a10@blackcitadel',
        whiteCitadelToken: 'k1@whitecitadel',
        nativeHelper: 'timur_citadel_native_token',
        adapterParsesTokens: true,
        wiredToNativeUciOutput: false
    });
});

test('citadel native model source markers are explicit and stable', () => {
    assert.deepEqual(CITADEL_NATIVE_MODEL_SOURCE_MARKERS, [
        'TIMUR_CITADEL_NATIVE_MODEL_CONTRACT',
        'TIMUR_CITADEL_OFFBOARD_NOT_BITBOARD',
        'TIMUR_CITADEL_SPECIAL_MOVE_CHANNEL_REQUIRED',
        'TIMUR_CITADEL_PIPELINE_generate_apply_result_revert'
    ]);
});
