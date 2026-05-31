import { COLORS, GAME_STATES, PIECE_TYPES } from '../utils/constants.js';

const ROYAL_CITADEL_ENTRY_CASES = Object.freeze([
    {
        id: 'white_king_enters_black_citadel_native_result',
        color: COLORS.WHITE,
        pieceType: PIECE_TYPES.KING,
        from: { row: 0, col: 0, square: 'a10' },
        to: { row: 0, col: -1, label: 'citadel:black' },
        nativeOffboardToken: 'a10@blackcitadel'
    },
    {
        id: 'white_prince_enters_black_citadel_native_result',
        color: COLORS.WHITE,
        pieceType: PIECE_TYPES.PRINCE,
        from: { row: 0, col: 0, square: 'a10' },
        to: { row: 0, col: -1, label: 'citadel:black' },
        nativeOffboardToken: 'a10@blackcitadel'
    },
    {
        id: 'white_adventitious_king_enters_black_citadel_native_result',
        color: COLORS.WHITE,
        pieceType: PIECE_TYPES.ADVENTITIOUS_KING,
        from: { row: 0, col: 0, square: 'a10' },
        to: { row: 0, col: -1, label: 'citadel:black' },
        nativeOffboardToken: 'a10@blackcitadel'
    },
    {
        id: 'black_king_enters_white_citadel_native_result',
        color: COLORS.BLACK,
        pieceType: PIECE_TYPES.KING,
        from: { row: 9, col: 10, square: 'k1' },
        to: { row: 9, col: 11, label: 'citadel:white' },
        nativeOffboardToken: 'k1@whitecitadel'
    },
    {
        id: 'black_prince_enters_white_citadel_native_result',
        color: COLORS.BLACK,
        pieceType: PIECE_TYPES.PRINCE,
        from: { row: 9, col: 10, square: 'k1' },
        to: { row: 9, col: 11, label: 'citadel:white' },
        nativeOffboardToken: 'k1@whitecitadel'
    },
    {
        id: 'black_adventitious_king_enters_white_citadel_native_result',
        color: COLORS.BLACK,
        pieceType: PIECE_TYPES.ADVENTITIOUS_KING,
        from: { row: 9, col: 10, square: 'k1' },
        to: { row: 9, col: 11, label: 'citadel:white' },
        nativeOffboardToken: 'k1@whitecitadel'
    }
]);

export function getCitadelGameResultNativeSmokeCases() {
    return ROYAL_CITADEL_ENTRY_CASES.map((entry) => ({
        ...entry,
        from: { ...entry.from },
        to: { ...entry.to },
        expectedStatus: GAME_STATES.GAME_OVER,
        expectedWinner: 'Draw (Hisar)'
    }));
}

export function evaluateCitadelGameResultNativeSmoke(results = []) {
    const resultById = new Map(results.map((entry) => [entry.id, entry]));
    const cases = getCitadelGameResultNativeSmokeCases().map((smokeCase) => {
        const result = resultById.get(smokeCase.id) || {};
        const nativeRootMoves = normalizeMoves(result.nativeRootMoves);
        const nativeOffboardMovePresent = nativeRootMoves.includes(smokeCase.nativeOffboardToken);
        const jsResultMatches = result.jsStatus === smokeCase.expectedStatus
            && result.jsWinner === smokeCase.expectedWinner;
        const engineSmokePass = nativeRootMoves.length > 0 && nativeOffboardMovePresent;
        const applyRevertParity = result.applyRevertParity === true;

        return {
            ...smokeCase,
            nativeRootMoves,
            nativeOffboardMovePresent,
            jsStatus: result.jsStatus ?? null,
            jsWinner: result.jsWinner ?? null,
            jsResultMatches,
            applyRevertParity,
            engineSmokePass,
            beforeSnapshot: result.beforeSnapshot ?? null,
            revertedSnapshot: result.revertedSnapshot ?? null
        };
    });
    const nativeGameResultSemantics = cases.every((entry) => (
        entry.nativeOffboardMovePresent && entry.jsResultMatches
    ));
    const nativeApplyRevertParity = cases.every((entry) => (
        entry.nativeOffboardMovePresent && entry.applyRevertParity
    ));
    const nativeEngineSmoke = cases.every((entry) => entry.engineSmokePass);
    const blockers = [];
    if (!nativeGameResultSemantics) blockers.push('native_game_result_semantics_missing');
    if (!nativeApplyRevertParity) blockers.push('native_apply_revert_parity_missing');
    if (!nativeEngineSmoke) blockers.push('native_engine_smoke_missing');

    return {
        ruleId: 'citadel_draw',
        evidence: 'native_game_result_semantics',
        nativeGameResultSemantics,
        nativeApplyRevertParity,
        nativeEngineSmoke,
        cases,
        blockers,
        note: 'This smoke proves native royal citadel-entry tokens can be bridged to JS result, apply/revert parity and engine-response gates.'
    };
}

function normalizeMoves(moves) {
    return [...new Set((moves || [])
        .map((move) => String(move || '').trim().toLowerCase())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
