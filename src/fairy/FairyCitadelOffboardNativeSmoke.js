import { COLORS } from '../utils/constants.js';

const FAIRY_FILES = 'abcdefghijk';

export const CITADEL_OFFBOARD_NATIVE_SMOKE_CASES = Object.freeze([
    {
        id: 'white_king_to_black_offboard_citadel',
        color: COLORS.WHITE,
        from: { row: 0, col: 0, square: 'a10' },
        to: { row: 0, col: -1, label: 'citadel:black' },
        jsMoveId: 'a10->citadel:black',
        nativeOffboardToken: 'a10@blackcitadel'
    },
    {
        id: 'black_king_to_white_offboard_citadel',
        color: COLORS.BLACK,
        from: { row: 9, col: 10, square: 'k1' },
        to: { row: 9, col: 11, label: 'citadel:white' },
        jsMoveId: 'k1->citadel:white',
        nativeOffboardToken: 'k1@whitecitadel'
    }
]);

export function parseCitadelOffboardToken(token) {
    const normalized = String(token || '').trim().toLowerCase();
    const match = normalized.match(/^([a-k](?:10|[1-9]))@(blackcitadel|whitecitadel)$/);
    if (!match) return null;

    const from = fairySquareToCoord(match[1]);
    const target = getCitadelTarget(match[2]);
    if (!from || !target) return null;

    return {
        token: normalized,
        fromSquare: match[1],
        from,
        to: { ...target.to },
        jsMoveId: `${match[1]}->${target.to.label}`,
        nativeTarget: match[2]
    };
}

export function buildCitadelOffboardTokenFromMove(move) {
    const from = String(move?.from || '').trim().toLowerCase();
    if (!from) return null;

    const target = getCitadelTargetFromMove(move);
    return target ? `${from}@${target.nativeTarget}` : null;
}

export function getCitadelOffboardNativeSmokeCases() {
    return CITADEL_OFFBOARD_NATIVE_SMOKE_CASES.map((entry) => ({
        ...entry,
        from: { ...entry.from },
        to: { ...entry.to }
    }));
}

export function evaluateCitadelOffboardNativeSmoke(results = []) {
    const resultById = new Map(results.map((entry) => [entry.id, entry]));
    const cases = getCitadelOffboardNativeSmokeCases().map((smokeCase) => {
        const result = resultById.get(smokeCase.id) || {};
        const nativeRootMoves = normalizeMoves(result.nativeRootMoves);
        const nativeOffboardMovePresent = nativeRootMoves.includes(smokeCase.nativeOffboardToken);

        return {
            ...smokeCase,
            jsMovePresent: result.jsMovePresent === true,
            nativeRootMoves,
            nativeOffboardMovePresent
        };
    });
    const nativeOffboardCitadelSemantics = cases.every((entry) => (
        entry.jsMovePresent && entry.nativeOffboardMovePresent
    ));

    return {
        ruleId: 'citadel_draw',
        evidence: 'native_offboard_citadel_semantics',
        nativeOffboardCitadelSemantics,
        cases,
        blockers: nativeOffboardCitadelSemantics ? [] : ['native_offboard_citadel_semantics_missing']
    };
}

function normalizeMoves(moves) {
    return [...new Set((moves || [])
        .map((move) => String(move || '').trim().toLowerCase())
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function fairySquareToCoord(square) {
    const match = String(square || '').toLowerCase().match(/^([a-k])(10|[1-9])$/);
    if (!match) return null;

    const col = FAIRY_FILES.indexOf(match[1]);
    const rank = Number(match[2]);
    const row = 10 - rank;

    if (row < 0 || row > 9 || col < 0 || col > 10) return null;
    return { row, col };
}

function getCitadelTarget(nativeTarget) {
    if (nativeTarget === 'blackcitadel') {
        return {
            nativeTarget,
            to: { row: 0, col: -1, label: 'citadel:black' }
        };
    }
    if (nativeTarget === 'whitecitadel') {
        return {
            nativeTarget,
            to: { row: 9, col: 11, label: 'citadel:white' }
        };
    }
    return null;
}

function getCitadelTargetFromMove(move) {
    const to = String(move?.to || '').trim().toLowerCase();
    if (to === 'citadel:black' || (move?.toRow === 0 && move?.toCol === -1)) {
        return getCitadelTarget('blackcitadel');
    }
    if (to === 'citadel:white' || (move?.toRow === 9 && move?.toCol === 11)) {
        return getCitadelTarget('whitecitadel');
    }
    return null;
}
