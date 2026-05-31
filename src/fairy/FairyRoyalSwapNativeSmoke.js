import { getRoyalSwapParityCases } from './FairyRoyalSwapParity.js';

const ROYAL_SWAP_EXPECTED_STATE_EFFECTS = Object.freeze([
    'check_escape_only',
    'king_target_square_swap',
    'ransom_flag_consumption',
    'apply_revert_required'
]);

export function getRoyalSwapNativeSmokeCases() {
    return getRoyalSwapParityCases().map((entry) => ({
        ...entry,
        kingFrom: { ...entry.kingFrom },
        targetFrom: { ...entry.targetFrom },
        checkerFrom: { ...entry.checkerFrom },
        enemyKingFrom: { ...entry.enemyKingFrom },
        nativeRoyalSwapToken: getNativeRoyalSwapToken(entry),
        nativeWiredToMovegen: false,
        expectedStateEffects: [...ROYAL_SWAP_EXPECTED_STATE_EFFECTS]
    }));
}

export function evaluateRoyalSwapNativeSmoke(results = []) {
    const resultById = new Map(results.map((entry) => [entry.id, entry]));
    const cases = getRoyalSwapNativeSmokeCases().map((smokeCase) => {
        const result = resultById.get(smokeCase.id) || {};
        const nativeRootMoves = normalizeMoves(result.nativeRootMoves);
        const nativeRoyalSwapMovePresent = nativeRootMoves.includes(smokeCase.nativeRoyalSwapToken);

        return {
            ...smokeCase,
            nativeRootMoves,
            nativeRoyalSwapMovePresent,
            nativeSourceMarker: result.nativeSourceMarker === true,
            nativePositionSkeleton: result.nativePositionSkeleton === true,
            nativeApplyRevertSkeleton: result.nativeApplyRevertSkeleton === true,
            jsCheckEscapeSemantics: result.jsCheckEscapeSemantics === true,
            jsRoyalSwapSemantics: result.jsRoyalSwapSemantics === true,
            jsOneTimeFlagSemantics: result.jsOneTimeFlagSemantics === true,
            jsApplyRevertParity: result.jsApplyRevertParity === true,
            beforeSnapshot: result.beforeSnapshot ?? null,
            afterSwapSnapshot: result.afterSwapSnapshot ?? null,
            revertedSnapshot: result.revertedSnapshot ?? null
        };
    });

    const nativeCheckEscapeSemantics = cases.every((entry) => (
        entry.nativeSourceMarker && entry.nativePositionSkeleton && entry.jsCheckEscapeSemantics
    ));
    const nativeRoyalSwapSemantics = cases.every((entry) => (
        entry.nativePositionSkeleton && entry.jsRoyalSwapSemantics
    ));
    const nativeOneTimeFlagSemantics = cases.every((entry) => (
        entry.nativePositionSkeleton && entry.jsOneTimeFlagSemantics
    ));
    const nativeApplyRevertParity = cases.every((entry) => (
        entry.nativeApplyRevertSkeleton && entry.jsApplyRevertParity
    ));
    const nativeEngineSmoke = cases.every((entry) => entry.nativeRoyalSwapMovePresent);
    const blockers = [];

    if (!nativeCheckEscapeSemantics) blockers.push('native_check_escape_semantics_missing');
    if (!nativeRoyalSwapSemantics) blockers.push('native_royal_swap_semantics_missing');
    if (!nativeOneTimeFlagSemantics) blockers.push('native_one_time_flag_semantics_missing');
    if (!nativeApplyRevertParity) blockers.push('native_apply_revert_parity_missing');
    if (!nativeEngineSmoke) blockers.push('native_engine_smoke_missing');

    return {
        ruleId: 'royal_swap',
        evidence: 'native_royal_swap_semantics_smoke',
        nativeCheckEscapeSemantics,
        nativeRoyalSwapSemantics,
        nativeOneTimeFlagSemantics,
        nativeApplyRevertParity,
        nativeEngineSmoke,
        cases,
        blockers,
        note: 'This smoke validates the JS bridge and native skeleton semantics for royal swap while keeping real native movegen/engine use wrapper-guarded.'
    };
}

function getNativeRoyalSwapToken(entry) {
    const kingSquare = toFairySquare(entry.kingFrom);
    const targetSquare = toFairySquare(entry.targetFrom);
    return `royal_swap:${kingSquare}:${targetSquare}@ransom`;
}

function toFairySquare(square) {
    const file = String.fromCharCode(97 + square.col);
    const rank = 10 - square.row;
    return `${file}${rank}`;
}

function normalizeMoves(moves) {
    return [...new Set((moves || [])
        .map((move) => String(move || '').trim().toLowerCase())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
