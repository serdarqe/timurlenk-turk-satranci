import { COLORS } from '../utils/constants.js';

export const MOVE_QUALITY = {
    DECISIVE: 'decisive',
    STRONG: 'strong',
    GOOD: 'good',
    SLIP: 'slip',
    MISTAKE: 'mistake',
    BLUNDER: 'blunder'
};

export function normalizeScoreForColor(rawScore, color) {
    return color === COLORS.BLACK ? rawScore : -rawScore;
}

export function calculateAccuracy(moveLosses = []) {
    if (!Array.isArray(moveLosses) || moveLosses.length === 0) return 100;

    const totalLoss = moveLosses.reduce((sum, loss) => sum + Math.max(0, Number(loss) || 0), 0);
    const averageLoss = totalLoss / moveLosses.length;
    const accuracy = Math.round(100 * Math.exp(-averageLoss / 38));

    return Math.max(0, Math.min(100, accuracy));
}

function clampAccuracy(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.min(100, Math.round(numeric)));
}

function isDecisiveResultType(resultType) {
    return ['checkmate', 'stalemate', 'royal_capture', 'game_over', 'win'].includes(resultType);
}

export function normalizeAnalysisAccuracyForOutcome(summary = {}) {
    const whiteAccuracy = clampAccuracy(summary.whiteAccuracy);
    const blackAccuracy = clampAccuracy(summary.blackAccuracy);
    const winner = summary.winner;

    if (whiteAccuracy == null || blackAccuracy == null) {
        return {
            ...summary,
            whiteAccuracy,
            blackAccuracy
        };
    }

    if (
        !isDecisiveResultType(summary.resultType)
        || !(winner === COLORS.WHITE || winner === COLORS.BLACK)
    ) {
        return {
            ...summary,
            whiteAccuracy,
            blackAccuracy
        };
    }

    const winnerKey = winner === COLORS.WHITE ? 'whiteAccuracy' : 'blackAccuracy';
    const loserAccuracy = winner === COLORS.WHITE ? blackAccuracy : whiteAccuracy;
    const winnerAccuracy = winner === COLORS.WHITE ? whiteAccuracy : blackAccuracy;

    if (winnerAccuracy >= loserAccuracy) {
        return {
            ...summary,
            whiteAccuracy,
            blackAccuracy
        };
    }

    return {
        ...summary,
        whiteAccuracy,
        blackAccuracy,
        [winnerKey]: Math.min(100, loserAccuracy + 1),
        rawAccuracy: {
            white: whiteAccuracy,
            black: blackAccuracy
        },
        outcomeAdjusted: true
    };
}

export function classifyMoveQuality(loss = 0, delta = 0, tags = []) {
    if (tags.includes('checkmate') || tags.includes('stalemate') || tags.includes('royal_capture')) {
        return MOVE_QUALITY.DECISIVE;
    }

    if (loss <= 8 && delta >= 18) return MOVE_QUALITY.STRONG;
    if (loss <= 16) return MOVE_QUALITY.GOOD;
    if (loss <= 34) return MOVE_QUALITY.SLIP;
    if (loss <= 70) return MOVE_QUALITY.MISTAKE;
    return MOVE_QUALITY.BLUNDER;
}

export function getMovePhase(moveIndex, totalMoves) {
    if (totalMoves <= 0) return 'opening';

    const ratio = moveIndex / totalMoves;
    if (ratio <= 0.3) return 'opening';
    if (ratio <= 0.75) return 'middlegame';
    return 'endgame';
}

export function getTopEntries(items = [], limit = 3, selector = (entry) => entry?.score || 0) {
    return [...items]
        .sort((a, b) => selector(b) - selector(a))
        .slice(0, limit);
}
