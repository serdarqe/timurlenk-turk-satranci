import { getCitadelExchangeParityCases } from './FairyCitadelExchangeParity.js';

const CITADEL_EXCHANGE_EXPECTED_STATE_EFFECTS = Object.freeze([
    'offboard_citadel_square',
    'dual_royal_relocation',
    'citadel_exchange_flag_consumption',
    'apply_revert_required'
]);

export function getCitadelExchangeNativeSmokeCases() {
    return getCitadelExchangeParityCases().map((entry) => ({
        ...entry,
        royalFrom: { ...entry.royalFrom },
        targetRoyalFrom: { ...entry.targetRoyalFrom },
        citadel: { ...entry.citadel },
        nativeOffboardToken: getNativeOffboardToken(entry),
        nativeExchangeToken: getNativeExchangeToken(entry),
        nativeWiredToMovegen: false,
        expectedStateEffects: [...CITADEL_EXCHANGE_EXPECTED_STATE_EFFECTS]
    }));
}

export function evaluateCitadelExchangeNativeSmoke(results = []) {
    const resultById = new Map(results.map((entry) => [entry.id, entry]));
    const cases = getCitadelExchangeNativeSmokeCases().map((smokeCase) => {
        const result = resultById.get(smokeCase.id) || {};
        const nativeRootMoves = normalizeMoves(result.nativeRootMoves);
        const nativeOffboardMovePresent = nativeRootMoves.includes(smokeCase.nativeOffboardToken);
        const nativeExchangeMovePresent = nativeRootMoves.includes(smokeCase.nativeExchangeToken);

        return {
            ...smokeCase,
            nativeRootMoves,
            nativeOffboardMovePresent,
            nativeExchangeMovePresent,
            nativeSourceMarker: result.nativeSourceMarker === true,
            nativePositionSkeleton: result.nativePositionSkeleton === true,
            nativeApplyRevertSkeleton: result.nativeApplyRevertSkeleton === true,
            jsDualRelocationMatches: result.jsDualRelocationMatches === true,
            jsOneTimeFlagSemantics: result.jsOneTimeFlagSemantics === true,
            jsApplyRevertParity: result.jsApplyRevertParity === true,
            beforeSnapshot: result.beforeSnapshot ?? null,
            afterExchangeSnapshot: result.afterExchangeSnapshot ?? null,
            revertedSnapshot: result.revertedSnapshot ?? null
        };
    });

    const nativeOffboardCitadelSemantics = cases.every((entry) => (
        entry.nativeSourceMarker && entry.nativePositionSkeleton
    ));
    const nativeDualRelocationSemantics = cases.every((entry) => (
        entry.nativePositionSkeleton && entry.jsDualRelocationMatches
    ));
    const nativeOneTimeFlagSemantics = cases.every((entry) => (
        entry.nativePositionSkeleton && entry.jsOneTimeFlagSemantics
    ));
    const nativeApplyRevertParity = cases.every((entry) => (
        entry.nativeApplyRevertSkeleton && entry.jsApplyRevertParity
    ));
    const nativeEngineSmoke = cases.every((entry) => entry.nativeExchangeMovePresent);
    const blockers = [];

    if (!nativeOffboardCitadelSemantics) blockers.push('native_offboard_citadel_semantics_missing');
    if (!nativeDualRelocationSemantics) blockers.push('native_dual_relocation_semantics_missing');
    if (!nativeOneTimeFlagSemantics) blockers.push('native_one_time_flag_semantics_missing');
    if (!nativeApplyRevertParity) blockers.push('native_apply_revert_parity_missing');
    if (!nativeEngineSmoke) blockers.push('native_engine_smoke_missing');

    return {
        ruleId: 'citadel_exchange',
        evidence: 'native_exchange_semantics_smoke',
        nativeOffboardCitadelSemantics,
        nativeDualRelocationSemantics,
        nativeOneTimeFlagSemantics,
        nativeApplyRevertParity,
        nativeEngineSmoke,
        cases,
        blockers,
        note: 'This smoke validates the JS bridge and native skeleton semantics for citadel exchange while keeping real native movegen/engine smoke as the final promotion gate.'
    };
}

function getNativeOffboardToken(entry) {
    return entry.citadel.col < 0 ? 'a10@blackcitadel' : 'k1@whitecitadel';
}

function getNativeExchangeToken(entry) {
    const royalSquare = toFairySquare(entry.royalFrom);
    const targetSquare = toFairySquare(entry.targetRoyalFrom);
    const citadelToken = entry.citadel.col < 0 ? 'blackcitadel' : 'whitecitadel';
    return `citadel_exchange:${royalSquare}:${targetSquare}@${citadelToken}`;
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
