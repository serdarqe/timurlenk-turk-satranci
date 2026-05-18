import { COLORS, PIECE_TYPES } from '../utils/constants.js';

export const ROYAL_TYPES = [
    PIECE_TYPES.KING,
    PIECE_TYPES.PRINCE,
    PIECE_TYPES.ADVENTITIOUS_KING
];

export const SIGNATURE_TYPES = [
    PIECE_TYPES.GIRAFFE,
    PIECE_TYPES.PICKET,
    PIECE_TYPES.CAMEL,
    PIECE_TYPES.DABBABA,
    PIECE_TYPES.BULL,
    PIECE_TYPES.REVEALER
];

export function isRoyalType(type) {
    return ROYAL_TYPES.includes(type);
}

export function getOpponentCitadelTarget(color) {
    return color === COLORS.WHITE
        ? { row: 0, col: -1 }
        : { row: 9, col: 11 };
}

export function getDistanceToOpponentCitadel(color, row, col) {
    const target = getOpponentCitadelTarget(color);
    return Math.abs(target.row - row) + Math.abs(target.col - col);
}

export function getMinRoyalCitadelDistance(pieces = [], color) {
    const royals = pieces.filter((piece) => piece.color === color && isRoyalType(piece.type));
    if (!royals.length) return null;

    return royals.reduce((minDistance, piece) => {
        const distance = getDistanceToOpponentCitadel(color, piece.row, piece.col);
        return minDistance == null ? distance : Math.min(minDistance, distance);
    }, null);
}

export function buildRecommendationKeys(sideInsight = {}) {
    const recommendations = [];

    if ((sideInsight.missedStalemateWins || 0) > 0) {
        recommendations.push('analysis.recommendation.stalemate');
    }

    if (sideInsight.minCitadelDistance != null && sideInsight.minCitadelDistance <= 4) {
        recommendations.push('analysis.recommendation.citadel');
    }

    if ((sideInsight.royalPeak || 0) >= 3) {
        recommendations.push('analysis.recommendation.royal');
    }

    if ((sideInsight.pawnCycleCount || 0) === 0 && (sideInsight.pawnAdvanceScore || 0) < 18) {
        recommendations.push('analysis.recommendation.pawn_cycle');
    }

    if ((sideInsight.signatureActivity || 0) <= 2) {
        recommendations.push('analysis.recommendation.signature');
    }

    return recommendations.slice(0, 3);
}
