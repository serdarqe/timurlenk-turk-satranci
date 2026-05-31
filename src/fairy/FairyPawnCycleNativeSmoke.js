import { getPawnOfPawnsCycleParity } from './FairyPromotionParity.js';
import { COLORS } from '../utils/constants.js';

const PAWN_CYCLE_EXPECTED_STATE_EFFECTS = Object.freeze([
    'stage_mutation',
    'repatriation_to_start_row',
    'occupied_return_file_scan',
    'adventitious_king_creation',
    'apply_revert_required'
]);

export function getPawnCycleNativeSmokeCases() {
    return getPawnOfPawnsCycleParity().map((entry) => {
        const id = getSmokeCaseId(entry);
        const config = getSmokeCaseConfig(id);
        return {
            ...entry,
            ...config,
            id,
            nativePawnCycleToken: getNativePawnCycleToken(id),
            nativeWiredToMovegen: false,
            expectedStateEffects: [...PAWN_CYCLE_EXPECTED_STATE_EFFECTS]
        };
    });
}

function getSmokeCaseConfig(id) {
    if (id === 'white_pawn_of_pawns_initial_repatriates_to_stage_2') {
        return {
            color: COLORS.WHITE,
            pawnStart: { row: 0, col: 4 },
            expectedTarget: { row: 7, col: 4 },
            expectedStageAfter: 2,
            expectedKind: 'pawn_cycle'
        };
    }
    if (id === 'black_pawn_of_pawns_stage_2_repatriates_to_stage_3') {
        return {
            color: COLORS.BLACK,
            pawnStart: { row: 9, col: 4 },
            expectedTarget: { row: 2, col: 4 },
            expectedStageAfter: 3,
            expectedKind: 'pawn_cycle'
        };
    }
    return {
        color: COLORS.WHITE,
        pawnStart: { row: 0, col: 5 },
        expectedTarget: { row: 0, col: 5 },
        expectedStageAfter: 3,
        expectedKind: 'promotion'
    };
}

export function evaluatePawnCycleNativeSmoke(results = []) {
    const resultById = new Map(results.map((entry) => [entry.id, entry]));
    const cases = getPawnCycleNativeSmokeCases().map((smokeCase) => {
        const result = resultById.get(smokeCase.id) || {};
        const nativeRootMoves = normalizeMoves(result.nativeRootMoves);
        const nativePawnCycleMovePresent = nativeRootMoves.includes(smokeCase.nativePawnCycleToken);

        return {
            ...smokeCase,
            nativeRootMoves,
            nativePawnCycleMovePresent,
            nativeSourceMarker: result.nativeSourceMarker === true,
            nativePositionSkeleton: result.nativePositionSkeleton === true,
            nativeApplyRevertSkeleton: result.nativeApplyRevertSkeleton === true,
            jsStageEncoding: result.jsStageEncoding === true,
            jsRepatriationSemantics: result.jsRepatriationSemantics === true,
            jsApplyRevertParity: result.jsApplyRevertParity === true,
            beforeSnapshot: result.beforeSnapshot ?? null,
            afterCycleSnapshot: result.afterCycleSnapshot ?? null,
            revertedSnapshot: result.revertedSnapshot ?? null
        };
    });

    const nativeStageEncoding = cases.every((entry) => (
        entry.nativeSourceMarker && entry.nativePositionSkeleton && entry.jsStageEncoding
    ));
    const nativeRepatriationSemantics = cases.every((entry) => (
        entry.nativePositionSkeleton && entry.jsRepatriationSemantics
    ));
    const nativeApplyRevertParity = cases.every((entry) => (
        entry.nativeApplyRevertSkeleton && entry.jsApplyRevertParity
    ));
    const nativeEngineSmoke = cases.every((entry) => entry.nativePawnCycleMovePresent);
    const blockers = [];

    if (!nativeStageEncoding) blockers.push('native_stage_encoding_missing');
    if (!nativeRepatriationSemantics) blockers.push('native_repatriation_semantics_missing');
    if (!nativeApplyRevertParity) blockers.push('native_apply_revert_parity_missing');
    if (!nativeEngineSmoke) blockers.push('native_engine_smoke_missing');

    return {
        ruleId: 'pawn_of_pawns_cycle',
        evidence: 'native_pawn_cycle_semantics_smoke',
        nativeStageEncoding,
        nativeRepatriationSemantics,
        nativeApplyRevertParity,
        nativeEngineSmoke,
        cases,
        blockers,
        note: 'This smoke validates pawn-of-pawns stage/repatriation/apply-revert semantics while keeping real native movegen/engine use wrapper-guarded.'
    };
}

function getSmokeCaseId(entry) {
    if (entry.kind === 'pawn_cycle' && entry.stageBefore === null) {
        return 'white_pawn_of_pawns_initial_repatriates_to_stage_2';
    }
    if (entry.kind === 'pawn_cycle' && entry.stageBefore === 2) {
        return 'black_pawn_of_pawns_stage_2_repatriates_to_stage_3';
    }
    return 'white_pawn_of_pawns_stage_3_promotes_to_adventitious_king';
}

function getNativePawnCycleToken(id) {
    if (id === 'white_pawn_of_pawns_initial_repatriates_to_stage_2') {
        return 'pawn_cycle:e10:e3@stage2';
    }
    if (id === 'black_pawn_of_pawns_stage_2_repatriates_to_stage_3') {
        return 'pawn_cycle:e1:e8@stage3';
    }
    return 'pawn_cycle:f10:f10@adventitious';
}

function normalizeMoves(moves) {
    return [...new Set((moves || [])
        .map((move) => String(move || '').trim().toLowerCase())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
