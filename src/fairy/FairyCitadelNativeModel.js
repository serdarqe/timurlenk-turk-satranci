import { COLORS } from '../utils/constants.js';

export const CITADEL_NATIVE_MODEL_SOURCE_MARKERS = Object.freeze([
    'TIMUR_CITADEL_NATIVE_MODEL_CONTRACT',
    'TIMUR_CITADEL_OFFBOARD_NOT_BITBOARD',
    'TIMUR_CITADEL_SPECIAL_MOVE_CHANNEL_REQUIRED',
    'TIMUR_CITADEL_PIPELINE_generate_apply_result_revert'
]);

export function getCitadelNativeModelContract() {
    return {
        ruleId: 'citadel_draw',
        modelPhase: 'source_contract_before_behavior',
        normalBoardEncoding: '11x10_bitboard_only',
        offboardEncoding: 'special_move_channel',
        offboardSquares: [
            {
                id: 'black_citadel',
                owner: COLORS.BLACK,
                enteredBy: COLORS.WHITE,
                anchorSquare: 'a10',
                jsCoordinate: { row: 0, col: -1 },
                nativeToken: 'a10@blackcitadel'
            },
            {
                id: 'white_citadel',
                owner: COLORS.WHITE,
                enteredBy: COLORS.BLACK,
                anchorSquare: 'k1',
                jsCoordinate: { row: 9, col: 11 },
                nativeToken: 'k1@whitecitadel'
            }
        ],
        requiredNativePipeline: [
            'generate_special_citadel_move',
            'apply_special_citadel_move',
            'resolve_draw_result',
            'revert_special_citadel_move'
        ],
        specialMoveSkeleton: {
            nativeStruct: 'TimurCitadelSpecialMove',
            tryMakeHelper: 'timur_try_make_citadel_special_move',
            targetEnum: 'TimurCitadelTarget',
            wiredToMovegen: false
        },
        applyResultRevertSkeleton: {
            snapshotStruct: 'TimurCitadelStateSnapshot',
            resultEnum: 'TimurCitadelResolution',
            applyHelper: 'timur_apply_citadel_special_move_skeleton',
            resultHelper: 'timur_resolve_citadel_special_result',
            revertHelper: 'timur_revert_citadel_special_move_skeleton',
            mutatesPositionState: false
        },
        offboardTokenStrategy: {
            blackCitadelToken: 'a10@blackcitadel',
            whiteCitadelToken: 'k1@whitecitadel',
            nativeHelper: 'timur_citadel_native_token',
            adapterParsesTokens: true,
            wiredToNativeUciOutput: false
        },
        safetyNotes: [
            'Citadel squares are outside the 11x10 board and must not be forced into the normal bitboard.',
            'Native promotion is blocked until the special move channel, result semantics and apply/revert smoke tests pass.'
        ]
    };
}
