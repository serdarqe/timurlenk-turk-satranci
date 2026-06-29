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
    if (baseId === 'hard') return 1.65;
    if (baseId === 'easy') return 0.75;
    return 1.15;
}

function getProgressiveRepetitionPenalty(severity, isWinningSide) {
    if (!Number.isFinite(severity) || severity <= 0) return 0;

    const balancedScale = isWinningSide ? 1 : 0.55;
    if (severity === 1) return -30 * balancedScale;
    if (severity === 2) return -200 * balancedScale;
    if (severity === 3) return -1500 * balancedScale;
    return (-3000 - Math.max(0, severity - 4) * 500) * balancedScale;
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

function createInactiveMatingNet(overrides = {}) {
    return {
        active: false,
        score: 0,
        reasons: [],
        materialAdvantage: 0,
        opponentMobility: 99,
        opponentEdgeDistance: 9,
        opponentCornerDistance: 99,
        ownRoyalDistance: 99,
        ownAttackDistance: 99,
        opponentNonRoyalCount: 99,
        ...overrides
    };
}

export function analyzeMatingNetState(state, perspectiveColor) {
    if (!state?.board?.pieces?.length || !perspectiveColor) {
        return createInactiveMatingNet({ reasons: ['missing-state'] });
    }

    const own = getSideSummary(state, perspectiveColor);
    const opponentColor = getOppositeColor(perspectiveColor);
    const opponent = getSideSummary(state, opponentColor);
    if (!own.royals.length || !opponent.royals.length) {
        return createInactiveMatingNet({ reasons: ['missing-royal'] });
    }

    const materialAdvantage = own.material - opponent.material;
    const totalPieces = own.pieceCount + opponent.pieceCount;
    const opponentMobility = countLegalMovesForColor(state, opponentColor);
    const opponentEdgeDistance = Math.min(...opponent.royals.map(getEdgeDistance));
    const opponentCornerDistance = Math.min(...opponent.royals.map(getCornerDistance));
    const ownRoyalDistance = getClosestDistanceToRoyals(own.royals, opponent.royals);
    const ownAttackDistance = getClosestDistanceToRoyals(
        own.nonRoyals.length ? own.nonRoyals : own.royals,
        opponent.royals
    );
    const opponentNonRoyalCount = opponent.nonRoyals.length;

    const enoughForce = (
        materialAdvantage >= 80
        || (opponentNonRoyalCount <= 1 && own.material > opponent.material)
        || (totalPieces <= 6 && own.material > opponent.material)
    );
    const boardBoxed = (
        opponentMobility <= 5
        || opponentEdgeDistance <= 2
        || opponentCornerDistance <= 4
    );
    const ownNetClose = (
        ownAttackDistance <= 5
        || ownRoyalDistance <= 4
        || (own.nonRoyals.length >= 2 && opponentMobility <= 7)
    );

    const score = (
        Math.max(0, materialAdvantage) * 0.7
        + Math.max(0, 8 - opponentMobility) * 58
        + Math.max(0, 4 - opponentEdgeDistance) * 82
        + Math.max(0, 8 - opponentCornerDistance) * 42
        + Math.max(0, 7 - ownAttackDistance) * 36
        + Math.max(0, 6 - ownRoyalDistance) * 18
        + Math.max(0, 2 - opponentNonRoyalCount) * 54
    );

    const active = enoughForce && boardBoxed && ownNetClose && score >= 190;
    const reasons = [];
    if (enoughForce) reasons.push('material-force');
    if (opponentMobility <= 5) reasons.push('low-mobility');
    if (opponentEdgeDistance <= 2) reasons.push('edge-box');
    if (opponentCornerDistance <= 4) reasons.push('corner-box');
    if (ownNetClose) reasons.push('net-contact');
    if (!active) reasons.push('not-mating-net');

    return {
        active,
        score,
        reasons,
        materialAdvantage,
        opponentMobility,
        opponentEdgeDistance,
        opponentCornerDistance,
        ownRoyalDistance,
        ownAttackDistance,
        opponentNonRoyalCount
    };
}

export function isInMatingNet(state, perspectiveColor) {
    return analyzeMatingNetState(state, perspectiveColor).active;
}

export function scoreRepetitionPenalty({
    nextHash,
    recentPositionHashes = [],
    recentMoves = [],
    move,
    isWinningSide = false,
    searchHistoryHashes = [],
    profile = null,
    risk: providedRisk = null,
    inMatingNet = false,
    matingNet = null
}) {
    const risk = providedRisk || analyzeRepetitionRisk({
        nextHash,
        recentPositionHashes,
        recentMoves,
        move,
        searchHistoryHashes
    });

    let penalty = 0;
    const difficultyMultiplier = getRepetitionDifficultyMultiplier(profile);
    const matingNetActive = Boolean(isWinningSide && (inMatingNet || matingNet?.active));
    const matingNetIsForcing = Boolean(
        matingNetActive
        && (
            risk.severity <= 2
            || (matingNet?.opponentMobility ?? 99) <= 2
            || (matingNet?.score ?? 0) >= 420
        )
    );
    const matingNetPenaltyScale = matingNetActive
        ? (matingNetIsForcing ? 0.04 : 0.14)
        : 1;

    if (risk.repeatsRecentPosition) {
        penalty -= (isWinningSide ? 240 : 90) * difficultyMultiplier * matingNetPenaltyScale;
    }

    if (risk.repeatsSearchHistory) {
        penalty -= (isWinningSide ? 180 : 70) * difficultyMultiplier * matingNetPenaltyScale;
    }

    if (risk.isImmediateReverse) {
        penalty -= (isWinningSide ? 160 : 60) * difficultyMultiplier * matingNetPenaltyScale;
    }

    if (risk.repeatsMoveRoute) {
        const routePenalty = (isWinningSide ? 330 : 115) + Math.max(0, risk.routeRepeatCount - 2) * (isWinningSide ? 120 : 55);
        penalty -= routePenalty * difficultyMultiplier * matingNetPenaltyScale;

        if (risk.routeRepeatCount >= 3) {
            penalty -= (isWinningSide ? 260 : 90) * difficultyMultiplier * matingNetPenaltyScale;
        }

        if (risk.routeRepeatCount >= 4) {
            penalty -= (isWinningSide ? 520 : 170) * difficultyMultiplier * matingNetPenaltyScale;
        }
    }

    const progressivePenalty = getProgressiveRepetitionPenalty(risk.severity, isWinningSide)
        * difficultyMultiplier
        * matingNetPenaltyScale;
    if (progressivePenalty < penalty) penalty = progressivePenalty;

    if (matingNetActive) {
        const baseId = getProfileBaseId(profile);
        const cap = matingNetIsForcing
            ? (baseId === 'hard' ? -70 : (baseId === 'medium' ? -52 : -36))
            : (baseId === 'hard' ? -180 : (baseId === 'medium' ? -130 : -90));
        penalty = Math.max(penalty, cap);
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
    const cornerPressure = opponent.royals.reduce((sum, royal) => sum + Math.max(0, 10 - getCornerDistance(royal)), 0);
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
        + Math.max(0, 14 - opponentMobility) * 18
        + edgePressure * 26
        + cornerPressure * 18
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
