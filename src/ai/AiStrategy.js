import { MoveValidator } from '../game/MoveValidator.js';
import { COLORS, PIECE_TYPES, PIECE_VALUES } from '../utils/constants.js';
import { buildZobristHash } from '../game/ZobristHash.js';
import { getAIProfile } from './AIProfiles.js';

const ROYAL_TYPES = new Set([
    PIECE_TYPES.KING,
    PIECE_TYPES.PRINCE,
    PIECE_TYPES.ADVENTITIOUS_KING
]);

function getPiecesFromStateLike(stateLike) {
    return stateLike?.board?.pieces || stateLike?.pieces || [];
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function getProfileBaseId(profile) {
    return profile?.baseId || String(profile?.id || 'medium').split(':')[0];
}

function getRepetitionDifficultyMultiplier(profile) {
    const baseId = getProfileBaseId(profile);
    if (baseId === 'hard') return 1.45;
    if (baseId === 'easy') return 0.75;
    return 1;
}

function getRouteKey(move) {
    if (!move) return null;
    const from = `${move.fromRow}:${move.fromCol}`;
    const to = `${move.toRow}:${move.toCol}`;
    return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function getSidePieces(state, color) {
    return state.board.pieces.filter((piece) => piece.color === color);
}

function getRoyalPieces(state, color) {
    return getSidePieces(state, color).filter((piece) => ROYAL_TYPES.has(piece.type));
}

function getEdgeDistance(piece) {
    const rowEdge = Math.min(piece.row, 9 - piece.row);
    const colEdge = piece.col < 0 ? 0 : piece.col > 10 ? 0 : Math.min(piece.col, 10 - piece.col);
    return Math.min(rowEdge, colEdge);
}

function getCornerDistance(piece) {
    const corners = [
        [0, 0],
        [0, 10],
        [9, 0],
        [9, 10]
    ];

    return Math.min(...corners.map(([row, col]) => Math.abs(piece.row - row) + Math.abs(piece.col - col)));
}

function getClosestDistanceToRoyals(pieces, targetRoyals) {
    if (!pieces.length || !targetRoyals.length) return 0;

    let minDistance = Infinity;
    for (const piece of pieces) {
        for (const royal of targetRoyals) {
            const distance = Math.abs(piece.row - royal.row) + Math.abs(piece.col - royal.col);
            if (distance < minDistance) minDistance = distance;
        }
    }

    return Number.isFinite(minDistance) ? minDistance : 0;
}

function withTurn(state, color, callback) {
    const previousTurn = state.currentTurn;
    state.currentTurn = color;
    try {
        return callback();
    } finally {
        state.currentTurn = previousTurn;
    }
}

function countLegalMovesForColor(state, color) {
    return withTurn(state, color, () => {
        const validator = new MoveValidator(state);
        const pieces = getSidePieces(state, color);
        return pieces.reduce((total, piece) => total + validator.getLegalMoves(piece.row, piece.col).length, 0);
    });
}

function getSideSummary(state, color) {
    const pieces = getSidePieces(state, color);
    const royals = pieces.filter((piece) => ROYAL_TYPES.has(piece.type));
    const nonRoyals = pieces.filter((piece) => !ROYAL_TYPES.has(piece.type));
    const material = nonRoyals.reduce((sum, piece) => sum + (PIECE_VALUES[piece.type] || 0), 0);

    return {
        color,
        pieces,
        royals,
        nonRoyals,
        pieceCount: pieces.length,
        material
    };
}

export function buildPositionHash(stateLike) {
    return buildZobristHash({
        ...stateLike,
        board: {
            ...(stateLike?.board || {}),
            pieces: getPiecesFromStateLike(stateLike)
        }
    });
}

export function getRecentPositionHashes(moveHistory = [], limit = 12) {
    return moveHistory
        .slice(-limit)
        .map((entry) => entry?.snapshots?.after ? buildPositionHash(entry.snapshots.after) : null)
        .filter(Boolean);
}

export function getRecentMoves(moveHistory = [], limit = 8) {
    return moveHistory
        .slice(-limit)
        .map((entry) => ({
            color: entry?.color || null,
            fromRow: entry?.from?.row,
            fromCol: entry?.from?.col,
            toRow: entry?.to?.row,
            toCol: entry?.to?.col
        }))
        .filter((entry) => typeof entry.fromRow === 'number' && typeof entry.toRow === 'number');
}

export function isWinningSideState(state, color) {
    const own = getSideSummary(state, color);
    const opponent = getSideSummary(state, getOppositeColor(color));
    const materialAdvantage = own.material - opponent.material;

    return materialAdvantage >= 40 || (opponent.nonRoyals.length <= 1 && own.material > opponent.material);
}

export function scoreRepetitionPenalty({
    nextHash,
    recentPositionHashes = [],
    recentMoves = [],
    move,
    isWinningSide = false,
    searchHistoryHashes = [],
    profile = null
}) {
    const risk = analyzeRepetitionRisk({
        nextHash,
        recentPositionHashes,
        recentMoves,
        move,
        searchHistoryHashes
    });

    let penalty = 0;
    const difficultyMultiplier = getRepetitionDifficultyMultiplier(profile);

    if (risk.repeatsRecentPosition) {
        penalty -= (isWinningSide ? 240 : 90) * difficultyMultiplier;
    }

    if (risk.repeatsSearchHistory) {
        penalty -= (isWinningSide ? 180 : 70) * difficultyMultiplier;
    }

    if (risk.isImmediateReverse) {
        penalty -= (isWinningSide ? 160 : 60) * difficultyMultiplier;
    }

    if (risk.repeatsMoveRoute) {
        const routePenalty = (isWinningSide ? 190 : 70) + Math.max(0, risk.routeRepeatCount - 2) * 35;
        penalty -= routePenalty * difficultyMultiplier;
    }

    return penalty;
}

export function analyzeRepetitionRisk({
    nextHash,
    recentPositionHashes = [],
    recentMoves = [],
    move,
    searchHistoryHashes = []
}) {
    const lastMove = recentMoves.at(-1);
    const isImmediateReverse = Boolean(
        lastMove
        && move
        && lastMove.fromRow === move.toRow
        && lastMove.fromCol === move.toCol
        && lastMove.toRow === move.fromRow
        && lastMove.toCol === move.fromCol
    );

    const repeatsRecentPosition = Boolean(nextHash && recentPositionHashes.includes(nextHash));
    const repeatsSearchHistory = Boolean(nextHash && searchHistoryHashes.includes(nextHash));
    const moveRouteKey = getRouteKey(move);
    const routeRepeatCount = moveRouteKey
        ? recentMoves.filter((recentMove) => {
            if (move.color && recentMove.color && move.color !== recentMove.color) return false;
            return getRouteKey(recentMove) === moveRouteKey;
        }).length
        : 0;
    const repeatsMoveRoute = routeRepeatCount >= 2;

    return {
        isImmediateReverse,
        repeatsRecentPosition,
        repeatsSearchHistory,
        repeatsMoveRoute,
        routeRepeatCount,
        severity:
            (isImmediateReverse ? 2 : 0)
            + (repeatsRecentPosition ? 2 : 0)
            + (repeatsSearchHistory ? 1 : 0)
            + (repeatsMoveRoute ? Math.min(4, 1 + routeRepeatCount) : 0)
    };
}

export function evaluateWinningEndgame(state, perspectiveColor) {
    if (!state?.board?.pieces?.length) return 0;
    if (!isWinningSideState(state, perspectiveColor)) return 0;

    const own = getSideSummary(state, perspectiveColor);
    const opponentColor = getOppositeColor(perspectiveColor);
    const opponent = getSideSummary(state, opponentColor);

    if (!opponent.royals.length) return 0;

    const totalPieces = own.pieceCount + opponent.pieceCount;
    if (totalPieces > 8 && opponent.nonRoyals.length > 1) return 0;

    const opponentMobility = countLegalMovesForColor(state, opponentColor);
    const edgePressure = opponent.royals.reduce((sum, royal) => sum + (4 - getEdgeDistance(royal)), 0);
    const cornerPressure = opponent.royals.reduce((sum, royal) => sum + Math.max(0, 8 - getCornerDistance(royal)), 0);
    const ownRoyalDistance = getClosestDistanceToRoyals(own.royals, opponent.royals);
    const ownAttackDistance = getClosestDistanceToRoyals(
        own.nonRoyals.length ? own.nonRoyals : own.royals,
        opponent.royals
    );
    const materialAdvantage = Math.max(0, own.material - opponent.material);
    const simplificationBonus = Math.max(0, 12 - totalPieces) * 9;
    const cleanUpBonus = opponent.nonRoyals.length === 0 ? 26 : Math.max(0, 3 - opponent.nonRoyals.length) * 8;
    const royalNetBonus = Math.max(0, 9 - ownRoyalDistance) * 4;
    const attackContactBonus = Math.max(0, 10 - ownAttackDistance) * 6;

    return (
        Math.min(materialAdvantage, 180) * 0.8
        + Math.max(0, 14 - opponentMobility) * 14
        + edgePressure * 18
        + cornerPressure * 10
        + simplificationBonus
        + cleanUpBonus
        + royalNetBonus
        + attackContactBonus
        - ownRoyalDistance * 6
        - ownAttackDistance * 4
    );
}

export function getAdaptiveSearchDepth(state, difficultyOrProfile = 'medium') {
    const profile = typeof difficultyOrProfile === 'string'
        ? getAIProfile(difficultyOrProfile)
        : difficultyOrProfile;
    const totalPieces = state?.board?.pieces?.length || 0;
    const sparseEndgame = totalPieces > 0 && totalPieces <= 6;
    const narrowEndgame = totalPieces > 0 && totalPieces <= 8;

    if (sparseEndgame) return profile.depth.sparseEndgame;
    if (narrowEndgame) return profile.depth.narrowEndgame;
    return profile.depth.base;
}
