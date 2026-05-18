import { MoveValidator } from '../game/MoveValidator.js';
import { GameRules } from '../game/GameRules.js';
import { COLORS, GAME_STATES, PIECE_TYPES, PIECE_VALUES } from '../utils/constants.js';
import { evaluateTacticalRisk } from './AiEvaluation.js';
import {
    getEndgameIdealStepDistance,
    getEndgameSupportStrength,
    isDirectNetHelper,
    isEndgameSupportPiece
} from './AIEndgameRoles.js';
import { isWinningSideState } from './AiStrategy.js';

const ENDGAME_PIECE_LIMIT = 10;
const ENDGAME_SOLVER_PIECE_LIMIT = 6;
const ENDGAME_SOLVER_MOVE_LIMIT = 12;

const ENDGAME_SOLVER_DEPTH = Object.freeze({
    easy: 1,
    medium: 2,
    hard: 2
});
const ENDGAME_WDL_CACHE_LIMIT = 1200;
const ENDGAME_WDL_CACHE = new Map();
const ENDGAME_WDL_CACHE_STATS = {
    hits: 0,
    misses: 0
};
function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
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

function getSidePieces(state, color) {
    return state.board.pieces.filter((piece) => piece.color === color);
}

function getCriticalRoyals(state, color) {
    const royals = getSidePieces(state, color).filter((piece) => GameRules.isRoyalType(piece.type));
    if (!royals.length) return [];

    const highestRank = Math.max(...royals.map((piece) => GameRules.getRoyalRank(piece.type)));
    return royals.filter((piece) => GameRules.getRoyalRank(piece.type) === highestRank);
}

function countLegalMovesForColor(state, color) {
    return withTurn(state, color, () => {
        const validator = new MoveValidator(state);
        return getSidePieces(state, color)
            .reduce((total, piece) => total + validator.getLegalMoves(piece.row, piece.col).length, 0);
    });
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

function getDistance(piece, target) {
    if (!piece || !target) return 99;
    return Math.abs(piece.row - target.row) + Math.abs(piece.col - target.col);
}

function getSquareDistance(a, b) {
    if (!a || !b) return 99;
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function getRoyalStepDistance(a, b) {
    if (!a || !b) return 99;
    return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

function isProtectedByRoyalOrRook(state, piece, color) {
    if (!state?.board || !piece) return false;

    const ownPieces = getSidePieces(state, color);
    return ownPieces.some((candidate) => {
        if (candidate === piece) return false;
        if (GameRules.isRoyalType(candidate.type)) {
            return getRoyalStepDistance(candidate, piece) <= 1;
        }
        return candidate.type === PIECE_TYPES.ROOK
            && (candidate.row === piece.row || candidate.col === piece.col)
            && isLineClearBetween(state, candidate, piece);
    });
}

function isRoyalCaptureDanger(state, piece, opponentRoyal, color) {
    if (!piece || !opponentRoyal) return false;
    if (getRoyalStepDistance(piece, opponentRoyal) > 1) return false;
    return !isProtectedByRoyalOrRook(state, piece, color);
}

function isRookNetHelper(piece) {
    return isDirectNetHelper(piece);
}

function isRookNetSupport(piece) {
    return isEndgameSupportPiece(piece);
}

function getPawnPromotionDistance(pawn, row = pawn?.row) {
    if (!pawn || !Number.isFinite(row)) return 9;
    return pawn.color === COLORS.BLACK
        ? Math.max(0, 9 - row)
        : Math.max(0, row);
}

function isDirectPromotionMove(piece, move) {
    return piece?.type === PIECE_TYPES.PAWN && (
        (piece.color === COLORS.WHITE && move?.row === 0)
        || (piece.color === COLORS.BLACK && move?.row === 9)
    );
}

function isPassedPawn(state, pawn) {
    if (!pawn || pawn.type !== PIECE_TYPES.PAWN) return false;
    const enemyColor = getOppositeColor(pawn.color);
    return !state.board.pieces.some((candidate) => {
        if (candidate.color !== enemyColor || candidate.type !== PIECE_TYPES.PAWN) return false;
        if (Math.abs(candidate.col - pawn.col) > 1) return false;
        return pawn.color === COLORS.BLACK
            ? candidate.row > pawn.row
            : candidate.row < pawn.row;
    });
}

function getClosestDistanceToRoyals(pieces, targetRoyals) {
    if (!pieces.length || !targetRoyals.length) return 99;

    let minDistance = Infinity;
    for (const piece of pieces) {
        for (const royal of targetRoyals) {
            minDistance = Math.min(minDistance, getDistance(piece, royal));
        }
    }

    return Number.isFinite(minDistance) ? minDistance : 99;
}

function isLineClearBetween(state, a, b) {
    if (!a || !b) return false;
    if (a.row !== b.row && a.col !== b.col) return false;

    const rowStep = Math.sign(b.row - a.row);
    const colStep = Math.sign(b.col - a.col);
    let row = a.row + rowStep;
    let col = a.col + colStep;

    while (row !== b.row || col !== b.col) {
        if (state.board.getPieceAt(row, col)) return false;
        row += rowStep;
        col += colStep;
    }

    return true;
}

function getMaterialForColor(state, color) {
    return getSidePieces(state, color)
        .filter((piece) => !GameRules.isRoyalType(piece.type))
        .reduce((sum, piece) => sum + (PIECE_VALUES[piece.type] || 0), 0);
}

function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function getSolverDepth(profile) {
    const baseId = getProfileBaseId(profile);
    return ENDGAME_SOLVER_DEPTH[baseId] ?? ENDGAME_SOLVER_DEPTH.medium;
}

function hasImmediateEndgameUrgency(state, rootColor) {
    const opponentColor = getOppositeColor(rootColor);
    if (getRoyalCountForColor(state, opponentColor) === 0 || getRoyalCountForColor(state, rootColor) === 0) return true;

    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    const ownRoyals = getCriticalRoyals(state, rootColor);
    const opponentDrawDistance = opponentRoyals.length
        ? Math.min(...opponentRoyals.map((royal) => getDistance(royal, GameRules.getOwnCitadel(rootColor))))
        : 99;
    const ownDrawDistance = ownRoyals.length
        ? Math.min(...ownRoyals.map((royal) => getDistance(royal, GameRules.getOpponentCitadel(rootColor))))
        : 99;

    return opponentDrawDistance <= 2 || ownDrawDistance <= 2 || state.board.pieces.length <= 4;
}

function getRoyalCountForColor(state, color) {
    return getSidePieces(state, color).filter((piece) => GameRules.isRoyalType(piece.type)).length;
}

function buildEndgamePositionKey(state, depth, rootColor) {
    const pieces = state.board.pieces
        .map((piece) => [
            piece.color,
            piece.type,
            piece.row,
            piece.col,
            piece.stage ?? '',
            piece.hasMoved ? 1 : 0
        ].join(':'))
        .sort()
        .join('|');

    return [
        rootColor,
        state.currentTurn,
        depth,
        state.status || '',
        state.winner || '',
        pieces
    ].join('~');
}

function addReason(reasons, key, condition) {
    if (condition) reasons.push(key);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getMinDistanceToTarget(pieces, target) {
    if (!pieces.length || !target) return 99;
    return Math.min(...pieces.map((piece) => getDistance(piece, target)));
}

function getEndgameWdlCacheKey(state, rootColor, depth, profile) {
    const profileKey = [
        getProfileBaseId(profile),
        Number(profile?.weights?.winningEndgame || 1).toFixed(2)
    ].join(':');

    return [
        'wdl-v2',
        profileKey,
        buildEndgamePositionKey(state, depth, rootColor)
    ].join('::');
}

function cloneEndgameWdlResult(result, cacheHit = result.cacheHit) {
    return {
        ...result,
        cacheHit,
        components: { ...(result.components || {}) },
        metrics: { ...(result.metrics || {}) },
        plan: {
            ...(result.plan || {}),
            steps: [...(result.plan?.steps || [])],
            reasons: [...(result.plan?.reasons || [])]
        },
        reasons: [...(result.reasons || [])]
    };
}

function rememberEndgameWdl(key, result) {
    if (ENDGAME_WDL_CACHE.size >= ENDGAME_WDL_CACHE_LIMIT) {
        const oldestKey = ENDGAME_WDL_CACHE.keys().next().value;
        if (oldestKey) ENDGAME_WDL_CACHE.delete(oldestKey);
    }

    ENDGAME_WDL_CACHE.set(key, cloneEndgameWdlResult(result, false));
}

function classifyWdlOutcome(exactScore, exactResult) {
    if (exactScore > 50000) return 'win';
    if (exactScore < -50000) return 'loss';
    if (exactResult === 'draw' || Math.abs(exactScore) <= 12000) return 'draw';
    return exactScore > 0 ? 'advantage' : 'risk';
}

function buildEndgameWdlMetrics(state, rootColor) {
    const opponentColor = getOppositeColor(rootColor);
    const ownPieces = getSidePieces(state, rootColor);
    const opponentPieces = getSidePieces(state, opponentColor);
    const ownRoyals = getCriticalRoyals(state, rootColor);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    const ownMaterial = getMaterialForColor(state, rootColor);
    const opponentMaterial = getMaterialForColor(state, opponentColor);

    return {
        pieceCount: ownPieces.length + opponentPieces.length,
        ownMaterial,
        opponentMaterial,
        materialLead: ownMaterial - opponentMaterial,
        ownMobility: countLegalMovesForColor(state, rootColor),
        opponentMobility: countLegalMovesForColor(state, opponentColor),
        royalHuntDistance: getClosestDistanceToRoyals(ownPieces, opponentRoyals),
        ownCitadelDistance: getMinDistanceToTarget(ownRoyals, GameRules.getOpponentCitadel(rootColor)),
        opponentCitadelDistance: getMinDistanceToTarget(opponentRoyals, GameRules.getOwnCitadel(rootColor)),
        opponentEdgeDistance: opponentRoyals.length
            ? Math.min(...opponentRoyals.map((royal) => getEdgeDistance(royal)))
            : 99,
        opponentCornerDistance: opponentRoyals.length
            ? Math.min(...opponentRoyals.map((royal) => getCornerDistance(royal)))
            : 99
    };
}

function buildEndgameWdlPlan({ outcome, metrics, exactScore, distance, rootColor }) {
    const role = outcome === 'win' || outcome === 'advantage' ? 'conversion' : 'resistance';
    const steps = [];
    const reasons = [];
    const pressureScore =
        Math.max(0, 10 - metrics.royalHuntDistance) * 95
        + Math.max(0, 8 - metrics.opponentMobility) * 145
        + Math.max(0, 4 - metrics.opponentEdgeDistance) * 120
        + Math.max(0, 7 - metrics.opponentCornerDistance) * 58;
    const citadelCutScore = Math.max(0, 4 - metrics.opponentCitadelDistance) * 1150;
    const resistanceScore =
        Math.max(0, 5 - metrics.ownCitadelDistance) * 900
        + Math.max(0, metrics.ownMobility) * 45
        + Math.max(0, -metrics.materialLead) * 0.8;

    if (role === 'conversion') {
        if (exactScore > 50000) steps.push('force-royal-capture');
        steps.push(metrics.opponentCitadelDistance <= 3 ? 'cut-citadel-draw' : 'keep-royal-away-from-citadel');
        steps.push(metrics.opponentMobility <= 3 ? 'tighten-stalemate-net' : 'reduce-royal-mobility');
        steps.push(metrics.royalHuntDistance <= 3 ? 'royal-net-contact' : 'improve-royal-net');
        if (metrics.opponentEdgeDistance <= 2) steps.push('convert-edge-pressure');
        reasons.push('conversion-plan');
    } else {
        steps.push(metrics.ownCitadelDistance <= 3 ? 'seek-citadel-draw' : 'race-to-citadel');
        steps.push(metrics.ownMobility <= 2 ? 'restore-royal-mobility' : 'keep-escape-squares');
        steps.push(metrics.materialLead < 0 ? 'trade-to-reduce-pressure' : 'avoid-forced-net');
        if (distance.distanceToDraw > 0) steps.push('prefer-draw-route');
        reasons.push('resistance-plan');
    }

    return {
        role,
        color: rootColor,
        priority: clamp((Math.abs(exactScore) / 95000) + (role === 'conversion' ? pressureScore : resistanceScore) / 6000, 0, 2),
        pressureScore,
        citadelCutScore,
        conversionScore: role === 'conversion' ? pressureScore + citadelCutScore : 0,
        resistanceScore: role === 'resistance' ? resistanceScore : 0,
        steps: [...new Set(steps)],
        reasons
    };
}

export function clearEndgameWdlCache() {
    ENDGAME_WDL_CACHE.clear();
    ENDGAME_WDL_CACHE_STATS.hits = 0;
    ENDGAME_WDL_CACHE_STATS.misses = 0;
}

export function getEndgameWdlCacheStats() {
    return {
        entries: ENDGAME_WDL_CACHE.size,
        hits: ENDGAME_WDL_CACHE_STATS.hits,
        misses: ENDGAME_WDL_CACHE_STATS.misses,
        limit: ENDGAME_WDL_CACHE_LIMIT
    };
}

export function analyzeEndgameWdl(state, rootColor, profile) {
    const empty = {
        score: 0,
        exactScore: 0,
        distanceScore: 0,
        outcome: 'unknown',
        result: null,
        depth: 0,
        confidence: 0,
        cacheHit: false,
        key: null,
        components: {
            exactSolver: 0,
            distanceToWin: 0,
            distanceToDraw: 0,
            conversionPlan: 0,
            resistancePlan: 0
        },
        metrics: {},
        plan: {
            role: 'none',
            color: rootColor,
            priority: 0,
            pressureScore: 0,
            citadelCutScore: 0,
            conversionScore: 0,
            resistanceScore: 0,
            steps: [],
            reasons: []
        },
        reasons: []
    };

    if (!state?.board || !rootColor || state.board.pieces.length > ENDGAME_SOLVER_PIECE_LIMIT) return empty;

    const previousTurn = state.currentTurn;
    if (!state.currentTurn) state.currentTurn = rootColor;

    try {
        const depth = getSolverDepth(profile);
        const key = getEndgameWdlCacheKey(state, rootColor, depth, profile);
        const cached = ENDGAME_WDL_CACHE.get(key);
        if (cached) {
            ENDGAME_WDL_CACHE_STATS.hits += 1;
            return cloneEndgameWdlResult(cached, true);
        }

        ENDGAME_WDL_CACHE_STATS.misses += 1;
        const exact = solveExactEndgame(state, rootColor, depth, profile, new Map());
        const distance = scoreDistanceMetrics(state, rootColor, profile);
        const metrics = buildEndgameWdlMetrics(state, rootColor);
        const outcome = classifyWdlOutcome(exact.score, exact.result);
        const plan = buildEndgameWdlPlan({
            outcome,
            metrics,
            exactScore: exact.score,
            distance,
            rootColor
        });
        const planScore = plan.role === 'conversion'
            ? Math.min(2400, plan.conversionScore * 0.18)
            : Math.min(1800, plan.resistanceScore * 0.2);
        const result = {
            score: exact.score + distance.score + planScore,
            exactScore: exact.score,
            distanceScore: distance.score,
            outcome,
            result: exact.result,
            depth,
            confidence: clamp((Math.abs(exact.score) / 95000) + (metrics.pieceCount <= 4 ? 0.12 : 0), 0, 1),
            cacheHit: false,
            key,
            components: {
                exactSolver: exact.score,
                distanceToWin: distance.distanceToWin,
                distanceToDraw: distance.distanceToDraw,
                conversionPlan: plan.role === 'conversion' ? planScore : 0,
                resistancePlan: plan.role === 'resistance' ? planScore : 0
            },
            metrics,
            plan,
            reasons: [
                ...distance.reasons,
                ...plan.reasons,
                `wdl-${outcome}`
            ]
        };

        rememberEndgameWdl(key, result);
        return result;
    } finally {
        state.currentTurn = previousTurn;
    }
}

function scoreTerminalEndgame(state, movingColor, terminalState) {
    const opponentColor = getOppositeColor(movingColor);
    const winner = state.winner;

    if (!terminalState?.resultType) return null;
    if (winner === movingColor) return 120000;
    if (winner === 'Draw (Hisar)' && isWinningSideState(state, movingColor)) return -90000;
    if (winner === opponentColor) return -120000;
    return 0;
}

function scoreExactTerminal(state, rootColor, depthRemaining = 0) {
    const opponentColor = getOppositeColor(rootColor);
    const rootRoyalCount = getRoyalCountForColor(state, rootColor);
    const opponentRoyalCount = getRoyalCountForColor(state, opponentColor);
    const tempoBonus = Math.max(0, depthRemaining) * 1600;

    if (opponentRoyalCount === 0) return 95000 + tempoBonus;
    if (rootRoyalCount === 0) return -95000 - tempoBonus;
    if (state.status !== GAME_STATES.GAME_OVER && state.status !== 'game_over') return null;

    if (state.winner === rootColor) return 95000 + tempoBonus;
    if (state.winner === opponentColor) return -95000 - tempoBonus;
    if (state.winner === 'Draw (Hisar)' || state.winner === 'draw' || state.isDraw) {
        return isWinningSideState(state, rootColor)
            ? -62000 - Math.max(0, depthRemaining) * 500
            : 36000 + Math.max(0, depthRemaining) * 350;
    }

    return 0;
}

function applyEndgameTerminalState(state, nextTurn) {
    const terminalState = {
        previousStatus: state.status ?? null,
        previousWinner: state.winner ?? null,
        previousCheckmate: Boolean(state.checkmate),
        previousStalemate: Boolean(state.stalemate),
        previousIsDraw: Boolean(state.isDraw),
        resultType: null
    };

    if (state.status === GAME_STATES.GAME_OVER || state.status === 'game_over') {
        terminalState.resultType = state.winner === 'Draw (Hisar)' ? 'citadel_draw' : 'game_over';
        return terminalState;
    }

    const royalElimination = GameRules.resolveRoyalElimination(state, nextTurn);
    if (royalElimination) {
        terminalState.resultType = royalElimination;
        return terminalState;
    }

    const validator = new MoveValidator(state);
    if (validator.isCheckmate(nextTurn)) {
        state.checkmate = true;
        state.status = GAME_STATES.GAME_OVER;
        state.winner = getOppositeColor(nextTurn);
        terminalState.resultType = 'checkmate';
    } else if (validator.isStalemate(nextTurn)) {
        state.stalemate = true;
        state.status = GAME_STATES.GAME_OVER;
        state.winner = getOppositeColor(nextTurn);
        terminalState.resultType = 'stalemate';
    }

    return terminalState;
}

function revertEndgameTerminalState(state, terminalState) {
    if (!terminalState) return;

    state.status = terminalState.previousStatus;
    state.winner = terminalState.previousWinner;
    state.checkmate = terminalState.previousCheckmate;
    state.stalemate = terminalState.previousStalemate;
    state.isDraw = terminalState.previousIsDraw;
}

function collectEndgameMoves(state, color) {
    return withTurn(state, color, () => {
        const validator = new MoveValidator(state);
        return getSidePieces(state, color).flatMap((piece) => (
            validator.getLegalMoves(piece.row, piece.col).map((move) => ({ piece, move }))
        ));
    });
}

function scoreEndgameMoveOrdering(state, moveObj, rootColor) {
    const target = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    const targetValue = target && target.color !== moveObj.piece.color ? (PIECE_VALUES[target.type] || 0) : 0;
    let score = targetValue * 10;

    if (target && GameRules.isRoyalType(target.type)) score += 50000;
    if (moveObj.move.specialMove === 'royal_swap' || moveObj.move.specialMove === 'citadel_exchange') score += 800;

    const opponentColor = getOppositeColor(moveObj.piece.color);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    const closestRoyalDistance = opponentRoyals.length
        ? Math.min(...opponentRoyals.map((royal) => Math.abs(moveObj.move.row - royal.row) + Math.abs(moveObj.move.col - royal.col)))
        : 9;
    score += Math.max(0, 10 - closestRoyalDistance) * (moveObj.piece.color === rootColor ? 18 : 10);

    return score;
}

function sortEndgameMoves(state, moves, rootColor) {
    return [...moves]
        .sort((a, b) => scoreEndgameMoveOrdering(state, b, rootColor) - scoreEndgameMoveOrdering(state, a, rootColor))
        .slice(0, ENDGAME_SOLVER_MOVE_LIMIT);
}

function scoreSparseEndgameGeometry(state, movingColor, profile) {
    const opponentColor = getOppositeColor(movingColor);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    if (opponentRoyals.length !== 1) return 0;

    const opponentRoyal = opponentRoyals[0];
    const ownPieces = getSidePieces(state, movingColor);
    const ownRooks = ownPieces.filter((piece) => piece.type === PIECE_TYPES.ROOK);
    const ownRoyals = getCriticalRoyals(state, movingColor);
    const opponentMobility = countLegalMovesForColor(state, opponentColor);
    const opponentInCheck = withTurn(state, opponentColor, () => new MoveValidator(state).isCheck(opponentColor));
    const edgeDistance = getEdgeDistance(opponentRoyal);
    const cornerDistance = getCornerDistance(opponentRoyal);
    const scale = profile?.weights?.winningEndgame || 1;
    let score = 0;

    if (!ownRooks.length) score -= 52000;
    score += Math.max(0, 5 - edgeDistance) * 1350;
    score += Math.max(0, 9 - cornerDistance) * 125;
    score += Math.max(0, 12 - opponentMobility) * 720;
    if (opponentInCheck) score += 2200 + Math.max(0, 4 - opponentMobility) * 620;

    for (const rook of ownRooks) {
        if (getRoyalStepDistance(rook, opponentRoyal) <= 1) score -= 48000;
        if ((rook.row === opponentRoyal.row || rook.col === opponentRoyal.col)
            && isLineClearBetween(state, rook, opponentRoyal)
        ) {
            score += 3600;
        }
    }

    if (ownRoyals.length) {
        const royalDistance = Math.min(...ownRoyals.map((royal) => getRoyalStepDistance(royal, opponentRoyal)));
        score += royalDistance >= 2 && royalDistance <= 4 ? 2400 : Math.max(0, 7 - royalDistance) * 220;
    }

    return score * scale;
}

function forecastSparseEndgameAfterOpponentReply(state, movingColor, profile) {
    const opponentColor = getOppositeColor(movingColor);
    const replies = sortEndgameMoves(state, collectEndgameMoves(state, opponentColor), movingColor);
    if (!replies.length) return 90000;

    let worstScore = Infinity;
    for (const reply of replies) {
        const originalTurn = state.currentTurn;
        const appliedReply = applyEndgameMove(state, reply);
        if (!appliedReply) continue;

        state.currentTurn = movingColor;
        const terminalState = applyEndgameTerminalState(state, movingColor);
        const terminalScore = scoreExactTerminal(state, movingColor, 1);
        const geometryScore = terminalScore != null
            ? terminalScore
            : scoreSparseEndgameGeometry(state, movingColor, profile);

        revertEndgameTerminalState(state, terminalState);
        revertEndgameMove(state, reply, appliedReply);
        state.currentTurn = originalTurn;

        worstScore = Math.min(worstScore, geometryScore);
    }

    return Number.isFinite(worstScore) ? worstScore : 0;
}

function hasImmediateEndgameWin(state, movingColor) {
    const opponentColor = getOppositeColor(movingColor);
    const moves = sortEndgameMoves(state, collectEndgameMoves(state, movingColor), movingColor);
    if (!moves.length) return false;

    for (const moveObj of moves) {
        const originalTurn = state.currentTurn;
        const appliedMove = applyEndgameMove(state, moveObj);
        if (!appliedMove) continue;

        state.currentTurn = opponentColor;
        const terminalState = applyEndgameTerminalState(state, opponentColor);
        const terminalScore = scoreTerminalEndgame(state, movingColor, terminalState)
            ?? scoreExactTerminal(state, movingColor, 1);
        const winsNow = terminalScore != null && terminalScore > 50000;

        revertEndgameTerminalState(state, terminalState);
        revertEndgameMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (winsNow) return true;
    }

    return false;
}

function forecastRookHelperNetAfterOpponentReply(state, movingColor, profile) {
    const opponentColor = getOppositeColor(movingColor);
    const replies = sortEndgameMoves(state, collectEndgameMoves(state, opponentColor), movingColor);
    if (!replies.length) return 110000;

    let worstScore = Infinity;
    let immediateWinReplies = 0;

    for (const reply of replies) {
        const originalTurn = state.currentTurn;
        const appliedReply = applyEndgameMove(state, reply);
        if (!appliedReply) continue;

        state.currentTurn = movingColor;
        const terminalState = applyEndgameTerminalState(state, movingColor);
        const terminalScore = scoreExactTerminal(state, movingColor, 1);
        let replyScore = terminalScore != null
            ? terminalScore
            : scoreSparseEndgameGeometry(state, movingColor, profile);

        if (terminalScore == null && hasImmediateEndgameWin(state, movingColor)) {
            replyScore += 52000;
            immediateWinReplies++;
        }

        revertEndgameTerminalState(state, terminalState);
        revertEndgameMove(state, reply, appliedReply);
        state.currentTurn = originalTurn;

        worstScore = Math.min(worstScore, replyScore);
    }

    if (!Number.isFinite(worstScore)) return 0;
    return worstScore + immediateWinReplies * 1600;
}

function applyEndgameMove(state, moveObj) {
    const origRow = moveObj.piece.row;
    const origCol = moveObj.piece.col;

    if (moveObj.move.specialMove === 'royal_swap') {
        const targetPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
        const effects = GameRules.applyRoyalSwap(state, moveObj.piece, targetPiece);
        if (!effects) return null;
        return { type: 'royal_swap', origRow, origCol, effects };
    }

    if (moveObj.move.specialMove === 'citadel_exchange') {
        const targetPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
        const effects = GameRules.applyCitadelExchange(state, moveObj.piece, targetPiece);
        if (!effects) return null;
        return { type: 'citadel_exchange', origRow, origCol, effects };
    }

    const moveData = state.board.movePiece(origRow, origCol, moveObj.move.row, moveObj.move.col);
    if (!moveData) return null;
    const postMoveEffects = GameRules.applyPostMoveEffects(state, moveObj.piece, moveObj.move.row, moveObj.move.col);

    return {
        type: 'standard',
        origRow,
        origCol,
        moveData,
        postMoveEffects
    };
}

function revertEndgameMove(state, moveObj, appliedMove) {
    if (!appliedMove) return;

    if (appliedMove.type === 'royal_swap') {
        GameRules.revertRoyalSwap(state, appliedMove.effects);
        return;
    }

    if (appliedMove.type === 'citadel_exchange') {
        GameRules.revertCitadelExchange(state, appliedMove.effects);
        return;
    }

    GameRules.revertPostMoveEffects(state, appliedMove.postMoveEffects);
    state.board.undoMove(
        appliedMove.origRow,
        appliedMove.origCol,
        moveObj.move.row,
        moveObj.move.col,
        appliedMove.moveData
    );
}

function scoreDistanceMetrics(state, rootColor, profile) {
    if (!state?.board?.pieces?.length || state.board.pieces.length > ENDGAME_PIECE_LIMIT) {
        return {
            score: 0,
            distanceToWin: 0,
            distanceToDraw: 0,
            reasons: []
        };
    }

    const opponentColor = getOppositeColor(rootColor);
    const ownPieces = getSidePieces(state, rootColor);
    const ownRoyals = getCriticalRoyals(state, rootColor);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    const winning = isWinningSideState(state, rootColor);
    let distanceToWin = 0;
    let distanceToDraw = 0;

    if (opponentRoyals.length) {
        const attackDistance = getClosestDistanceToRoyals(ownPieces, opponentRoyals);
        const opponentMobility = countLegalMovesForColor(state, opponentColor);
        distanceToWin += Math.max(0, 10 - attackDistance) * 95;
        distanceToWin += Math.max(0, 8 - opponentMobility) * 140;

        const opponentDrawDistance = Math.min(
            ...opponentRoyals.map((royal) => getDistance(royal, GameRules.getOwnCitadel(rootColor)))
        );
        distanceToDraw -= Math.max(0, 4 - opponentDrawDistance) * (winning ? 4200 : 900);
    }

    if (!winning && ownRoyals.length) {
        const ownDrawDistance = Math.min(
            ...ownRoyals.map((royal) => getDistance(royal, GameRules.getOpponentCitadel(rootColor)))
        );
        distanceToDraw += Math.max(0, 4 - ownDrawDistance) * 3200;
    }

    const scale = profile.weights?.winningEndgame || 1;
    const reasons = [];
    addReason(reasons, 'distance-win', distanceToWin >= 900);
    addReason(reasons, 'draw-race', Math.abs(distanceToDraw) >= 2500);

    return {
        score: (distanceToWin + distanceToDraw) * scale,
        distanceToWin: distanceToWin * scale,
        distanceToDraw: distanceToDraw * scale,
        reasons
    };
}

function solveExactEndgame(state, rootColor, depth, profile, memo) {
    const terminalScore = scoreExactTerminal(state, rootColor, depth);
    if (terminalScore != null) {
        return {
            score: terminalScore,
            result: terminalScore > 50000 ? 'win' : terminalScore < -50000 ? 'loss-or-draw-risk' : 'draw',
            depth
        };
    }

    if (depth <= 0) {
        const distance = scoreDistanceMetrics(state, rootColor, profile);
        return {
            score: distance.score,
            result: 'leaf',
            depth: 0
        };
    }

    const key = buildEndgamePositionKey(state, depth, rootColor);
    if (memo.has(key)) return memo.get(key);

    const currentColor = state.currentTurn || getOppositeColor(rootColor);
    const moves = sortEndgameMoves(state, collectEndgameMoves(state, currentColor), rootColor);
    if (!moves.length) {
        const noMoveScore = currentColor === rootColor ? -84000 - depth * 1200 : 84000 + depth * 1200;
        const noMoveResult = { score: noMoveScore, result: 'no-legal-moves', depth };
        memo.set(key, noMoveResult);
        return noMoveResult;
    }

    const maximizing = currentColor === rootColor;
    let best = {
        score: maximizing ? -Infinity : Infinity,
        result: 'search',
        depth
    };

    for (const moveObj of moves) {
        const originalTurn = state.currentTurn;
        const appliedMove = applyEndgameMove(state, moveObj);
        if (!appliedMove) continue;

        state.currentTurn = getOppositeColor(currentColor);
        const terminalState = applyEndgameTerminalState(state, state.currentTurn);
        const result = solveExactEndgame(state, rootColor, depth - 1, profile, memo);

        revertEndgameTerminalState(state, terminalState);
        revertEndgameMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (
            (maximizing && result.score > best.score)
            || (!maximizing && result.score < best.score)
        ) {
            best = {
                score: result.score,
                result: result.result,
                depth
            };
        }
    }

    if (!Number.isFinite(best.score)) best = { score: 0, result: 'no-applied-moves', depth };
    memo.set(key, best);
    return best;
}

export function analyzeExactEndgame(state, movingColor, profile) {
    const empty = {
        score: 0,
        components: {
            exactSolver: 0,
            distanceToWin: 0,
            distanceToDraw: 0
        },
        reasons: [],
        result: null
    };

    if (!state?.board || !movingColor || state.board.pieces.length > ENDGAME_SOLVER_PIECE_LIMIT) return empty;

    const previousTurn = state.currentTurn;
    if (!state.currentTurn) state.currentTurn = getOppositeColor(movingColor);

    try {
        if (!hasImmediateEndgameUrgency(state, movingColor)) {
            const distance = scoreDistanceMetrics(state, movingColor, profile);
            return {
                score: distance.score,
                components: {
                    exactSolver: 0,
                    distanceToWin: distance.distanceToWin,
                    distanceToDraw: distance.distanceToDraw
                },
                reasons: distance.reasons,
                result: 'distance-only'
            };
        }

        const wdl = analyzeEndgameWdl(state, movingColor, profile);
        const exactSolver = wdl.result === 'leaf' ? wdl.exactScore * 0.15 : wdl.exactScore;
        const conversionPlan = wdl.components.conversionPlan || 0;
        const resistancePlan = wdl.components.resistancePlan || 0;
        const reasons = [...wdl.reasons];

        addReason(reasons, 'exact-win', exactSolver > 50000);
        addReason(reasons, 'exact-loss', exactSolver < -80000);
        addReason(
            reasons,
            'exact-draw-risk',
            exactSolver < -30000 && exactSolver > -80000 && isWinningSideState(state, movingColor)
        );
        addReason(
            reasons,
            'exact-draw-save',
            exactSolver > 25000 && exactSolver < 80000 && !isWinningSideState(state, movingColor)
        );

        return {
            score: exactSolver
                + (wdl.components.distanceToWin || 0)
                + (wdl.components.distanceToDraw || 0)
                + conversionPlan
                + resistancePlan,
            components: {
                exactSolver,
                distanceToWin: wdl.components.distanceToWin || 0,
                distanceToDraw: wdl.components.distanceToDraw || 0,
                conversionPlan,
                resistancePlan
            },
            reasons,
            result: wdl.result,
            outcome: wdl.outcome,
            plan: wdl.plan,
            metrics: wdl.metrics,
            cacheHit: wdl.cacheHit
        };
    } finally {
        state.currentTurn = previousTurn;
    }
}

function scoreCitadelRisk(state, movingColor, opponentRoyals, opponentInCheck, opponentMobility, profile) {
    const ownCitadel = GameRules.getOwnCitadel(movingColor);
    let risk = 0;

    for (const royal of opponentRoyals) {
        const distance = getDistance(royal, ownCitadel);
        if (distance <= 1) risk -= 5200;
        else if (distance === 2) risk -= 2600;
        else if (distance === 3) risk -= 900;
    }

    if (opponentInCheck) risk *= 0.45;
    if (opponentMobility <= 2) risk *= 0.7;

    return risk * (profile.weights?.citadel || 1);
}

function scoreMateNet({ opponentInCheck, opponentMobility, opponentRoyals, ownPieces, profile }) {
    let score = 0;

    if (opponentInCheck) score += 2400;
    if (opponentInCheck && opponentMobility <= 2) score += 2600;
    else if (opponentInCheck && opponentMobility <= 4) score += 1200;

    score += Math.max(0, 10 - opponentMobility) * 115;

    for (const royal of opponentRoyals) {
        score += Math.max(0, 4 - getEdgeDistance(royal)) * 95;
        score += Math.max(0, 8 - getCornerDistance(royal)) * 38;
    }

    const netDistance = getClosestDistanceToRoyals(ownPieces, opponentRoyals);
    score += Math.max(0, 9 - netDistance) * 80;

    return score * (profile.weights?.winningEndgame || 1);
}

function scoreRoyalHunt({ movedPiece, ownPieces, opponentRoyals, profile }) {
    const movedDistance = getClosestDistanceToRoyals([movedPiece].filter(Boolean), opponentRoyals);
    const teamDistance = getClosestDistanceToRoyals(ownPieces, opponentRoyals);
    let score = 0;

    score += Math.max(0, 11 - movedDistance) * 48;
    score += Math.max(0, 10 - teamDistance) * 42;

    return score * (profile.ordering?.pressure || 1);
}

function scoreMiniTablebasePlan({
    state,
    movingColor,
    movedPiece,
    moveObj,
    opponentRoyals,
    ownPieces,
    opponentMobility,
    opponentInCheck,
    profile
}) {
    if (!opponentRoyals.length || state.board.pieces.length > ENDGAME_SOLVER_PIECE_LIMIT) return 0;

    const opponentColor = getOppositeColor(movingColor);
    const opponentNonRoyals = getSidePieces(state, opponentColor).filter((piece) => !GameRules.isRoyalType(piece.type));
    if (opponentNonRoyals.length > 0) return 0;

    const ownRoyals = getCriticalRoyals(state, movingColor);
    const opponentRoyal = opponentRoyals[0];
    const ownRoyal = ownRoyals[0];
    const ownMaterialPieces = ownPieces.filter((piece) => !GameRules.isRoyalType(piece.type));
    if (!ownMaterialPieces.length) return 0;

    const scale = profile.weights?.winningEndgame || 1;
    const opponentEdge = getEdgeDistance(opponentRoyal);
    const opponentCorner = getCornerDistance(opponentRoyal);
    const ownRoyalDistance = getSquareDistance(ownRoyal, opponentRoyal);
    const movedDistance = getSquareDistance(movedPiece, opponentRoyal);
    const materialLead = Math.max(
        0,
        getMaterialForColor(state, movingColor) - getMaterialForColor(state, opponentColor)
    );
    let score = 0;

    // Mini tablebase hedefi: rakip şahı kenara/köşeye sür, alanını azalt,
    // kendi şahını çok uzak bırakma ve taşı boşa dolaştırma.
    score += Math.max(0, 5 - opponentEdge) * 760;
    score += Math.max(0, 9 - opponentCorner) * 92;
    score += Math.max(0, 12 - opponentMobility) * 330;
    if (opponentInCheck) score += 1250 + Math.max(0, 4 - opponentMobility) * 520;
    if (opponentMobility === 0) score += 5200;

    if (ownRoyal) {
        const idealRoyalDistance = ownRoyalDistance >= 2 && ownRoyalDistance <= 4
            ? 1180
            : Math.max(0, 8 - ownRoyalDistance) * 105;
        score += idealRoyalDistance;
    }

    const rooks = ownMaterialPieces.filter((piece) => piece.type === PIECE_TYPES.ROOK);
    for (const rook of rooks) {
        const aligned = rook.row === opponentRoyal.row || rook.col === opponentRoyal.col;
        if (aligned && isLineClearBetween(state, rook, opponentRoyal)) {
            score += 1750;
            if (getSquareDistance(rook, opponentRoyal) >= 2) score += 550;
        }

        const rowCut = Math.abs(rook.row - opponentRoyal.row);
        const colCut = Math.abs(rook.col - opponentRoyal.col);
        const cutPressure = Math.max(0, 5 - Math.min(rowCut, colCut)) * 210;
        score += cutPressure;
    }

    if (movedPiece) {
        score += Math.max(0, 10 - movedDistance) * 80;
        if (movedPiece.type === PIECE_TYPES.ROOK) score += Math.max(0, 7 - movedDistance) * 95;
    }

    const directPromotion = isDirectPromotionMove(moveObj?.piece, moveObj?.move);
    if (directPromotion) score += 6200;
    score += Math.min(materialLead, 180) * 7;

    return score * scale;
}

function scorePromotionPlan({ state, movingColor, movedPiece, moveObj, profile }) {
    const ownPawns = getSidePieces(state, movingColor).filter((piece) => piece.type === PIECE_TYPES.PAWN);
    if (!ownPawns.length) return 0;

    let score = 0;
    for (const pawn of ownPawns) {
        const distance = getPawnPromotionDistance(pawn);
        const urgency = Math.max(0, 7 - distance);
        const passed = isPassedPawn(state, pawn);
        score += urgency * urgency * 38;
        if (passed) score += (urgency + 1) * (urgency + 1) * 58;
        if (distance <= 2) score += (3 - distance) * 520;
    }

    if (isDirectPromotionMove(moveObj?.piece, moveObj?.move)) {
        score += 7600;
    }

    if (moveObj?.piece?.type === PIECE_TYPES.PAWN) {
        const beforeDistance = getPawnPromotionDistance(moveObj.piece);
        const afterDistance = getPawnPromotionDistance(moveObj.piece, moveObj.move?.row);
        if (afterDistance < beforeDistance) {
            const advanceUrgency = Math.max(0, 8 - afterDistance);
            score += advanceUrgency * advanceUrgency * 160;
            if (afterDistance <= 2) score += (3 - afterDistance) * 1100;
        }
    }

    if (movedPiece?.type === PIECE_TYPES.PAWN) {
        const movedDistance = getPawnPromotionDistance(movedPiece);
        score += Math.max(0, 7 - movedDistance) * 72;
        if (movedDistance <= 2) score += (3 - movedDistance) * 420;
    }

    return score * (profile.weights?.winningEndgame || 1);
}

export function selectMiniTablebaseMove(state, movingColor, profile) {
    if (!state?.board || !movingColor || state.board.pieces.length > ENDGAME_SOLVER_PIECE_LIMIT) return null;
    if (!isWinningSideState(state, movingColor)) return null;

    const opponentColor = getOppositeColor(movingColor);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    const opponentNonRoyals = getSidePieces(state, opponentColor).filter((piece) => !GameRules.isRoyalType(piece.type));
    const ownPieces = getSidePieces(state, movingColor);
    const ownNonRoyals = ownPieces.filter((piece) => !GameRules.isRoyalType(piece.type));
    const ownRooks = ownNonRoyals.filter((piece) => piece.type === PIECE_TYPES.ROOK);
    const hasRookNet = ownRooks.length > 0 && ownNonRoyals.length === 1;
    const rookNetHelpers = ownNonRoyals.filter(isRookNetHelper);
    const rookNetSupports = ownNonRoyals.filter(isRookNetSupport);
    const rawRookSupportNet = (
        ownRooks.length === 1
        && rookNetSupports.length >= 1
        && ownNonRoyals.length >= 2
        && ownNonRoyals.length <= 3
    );
    const strongestSupport = rookNetSupports.reduce((best, piece) => {
        return Math.max(best, getEndgameSupportStrength(piece));
    }, 0);
    const rawRookHelperNet = rawRookSupportNet && (
        rookNetHelpers.length >= 1
        || strongestSupport >= 0.3
    );
    const initialHelperRoyalDistance = opponentRoyals.length === 1
        ? getCriticalRoyals(state, movingColor)
            .reduce((bestDistance, royal) => Math.min(bestDistance, getRoyalStepDistance(royal, opponentRoyals[0])), 99)
        : 99;
    const hasPromotedVizierNet = (
        rawRookHelperNet
        && rookNetHelpers.some((piece) => piece.type === PIECE_TYPES.VIZIER && piece.isPromoted)
    );
    const hasRookHelperNet = rawRookHelperNet && (
        hasPromotedVizierNet
        || initialHelperRoyalDistance <= 7
    );
    const promotionPawns = ownNonRoyals.filter((piece) => (
        piece.type === PIECE_TYPES.PAWN
        && isPassedPawn(state, piece)
        && getPawnPromotionDistance(piece) <= 2
    ));

    if (opponentRoyals.length !== 1 || opponentNonRoyals.length > 0) return null;

    const rookVsRoyal = ownNonRoyals.length === 1 && ownRooks.length === 1;
    const promotionRace = promotionPawns.length > 0;
    const activeRookNet = hasRookNet || hasRookHelperNet;
    if (!activeRookNet && !promotionRace) return null;

    const moves = collectEndgameMoves(state, movingColor);
    if (!moves.length) return null;

    let best = null;
    const scale = profile?.weights?.winningEndgame || 1;

    for (const moveObj of moves) {
        const pieceType = moveObj.piece.type;
        const fromRow = moveObj.piece.row;
        const directPromotion = isDirectPromotionMove(moveObj.piece, moveObj.move);
        const beforePromotionDistance = pieceType === PIECE_TYPES.PAWN
            ? getPawnPromotionDistance(moveObj.piece, fromRow)
            : 9;
        const originalTurn = state.currentTurn;
        const appliedMove = applyEndgameMove(state, moveObj);
        if (!appliedMove) continue;

        state.currentTurn = opponentColor;
        const terminalState = applyEndgameTerminalState(state, opponentColor);
        const activePiece = appliedMove.postMoveEffects?.activePiece
            || state.board.getPieceAt(moveObj.move.row, moveObj.move.col)
            || moveObj.piece;
        const afterOpponentRoyals = getCriticalRoyals(state, opponentColor);
            const opponentRoyal = afterOpponentRoyals[0];
            const opponentMobility = countLegalMovesForColor(state, opponentColor);
            const opponentInCheck = withTurn(state, opponentColor, () => new MoveValidator(state).isCheck(opponentColor));
            const tacticalRisk = evaluateTacticalRisk(state, movingColor, activePiece);
            let score = 0;

        const terminalScore = scoreTerminalEndgame(state, movingColor, terminalState);
        if (terminalScore != null) {
            score += terminalScore;
            if (terminalScore > 50000) score += 900000;
        }

        if (opponentRoyal) {
            const cornerDistance = getCornerDistance(opponentRoyal);
            const ownRooksAfter = getSidePieces(state, movingColor).filter((piece) => piece.type === PIECE_TYPES.ROOK);
            const exposedRookCount = ownRooksAfter.filter((rook) => getRoyalStepDistance(rook, opponentRoyal) <= 1).length;
            const nearestOwnRoyalDistanceNow = getCriticalRoyals(state, movingColor)
                .reduce((bestDistance, royal) => Math.min(bestDistance, getRoyalStepDistance(royal, opponentRoyal)), 99);
            const replyForecast = forecastSparseEndgameAfterOpponentReply(state, movingColor, profile);
            const helperNetForecast = hasRookHelperNet
                ? forecastRookHelperNetAfterOpponentReply(state, movingColor, profile)
                : 0;
            score += Math.max(0, 5 - getEdgeDistance(opponentRoyal)) * 1120;
            score += Math.max(0, 9 - cornerDistance) * 110;
            score += Math.max(0, 12 - opponentMobility) * 620;
            if (opponentInCheck) score += 2400 + Math.max(0, 4 - opponentMobility) * 780;
            if (exposedRookCount && !terminalState?.resultType) {
                score -= exposedRookCount * 42000;
            }
            score += replyForecast * 0.42;
            score += helperNetForecast * 0.36;
            if (
                hasRookHelperNet
                && nearestOwnRoyalDistanceNow > 2
                && getEdgeDistance(opponentRoyal) <= 1
                && !GameRules.isRoyalType(pieceType)
                && !terminalState?.resultType
            ) {
                score -= nearestOwnRoyalDistanceNow > 4 ? 52000 : 70000;
            }

            if (pieceType === PIECE_TYPES.ROOK) {
                const rookRoyalDistance = getRoyalStepDistance(activePiece, opponentRoyal);
                score += 2600;
                if ((activePiece.row === opponentRoyal.row || activePiece.col === opponentRoyal.col)
                    && isLineClearBetween(state, activePiece, opponentRoyal)
                ) {
                    score += 3200;
                }
                if (hasRookNet && cornerDistance <= 2 && opponentMobility > 0) {
                    score -= opponentInCheck ? 16000 : 11800;
                }
                const nearestRoyalForRook = getCriticalRoyals(state, movingColor)
                    .reduce((bestDistance, royal) => Math.min(bestDistance, getRoyalStepDistance(royal, opponentRoyal)), 99);
                if (
                    activeRookNet
                    && ownNonRoyals.length > 1
                    && nearestRoyalForRook > 3
                    && getEdgeDistance(opponentRoyal) <= 1
                    && !terminalState?.resultType
                ) {
                    score -= 14000;
                }
                if (hasRookHelperNet && rookRoyalDistance >= 2) {
                    score += Math.max(0, 8 - rookRoyalDistance) * 420;
                    if (opponentMobility <= 3) score += 3600;
                }
            }

            if (GameRules.isRoyalType(pieceType) && ownRooks.length) {
                const ownRoyalDistance = getRoyalStepDistance(activePiece, opponentRoyal);
                const previousRoyalDistance = getRoyalStepDistance(moveObj.piece, opponentRoyal);
                score += ownRoyalDistance >= 2 && ownRoyalDistance <= 4 ? 650 : -850;
                if (activeRookNet && getEdgeDistance(opponentRoyal) > 1) {
                    score -= 9000;
                }
                if (activeRookNet && cornerDistance <= 2) {
                    score += Math.max(0, 10 - ownRoyalDistance) * 720;
                    if (ownRoyalDistance < previousRoyalDistance) {
                        score += previousRoyalDistance > 4 ? 14500 : 3600;
                    }
                    else score -= previousRoyalDistance > 4 ? 22000 : 14000;
                }
                if (hasRookHelperNet && getEdgeDistance(opponentRoyal) <= 1) {
                    if (ownRoyalDistance < previousRoyalDistance) {
                        score += previousRoyalDistance > 4 ? 64000 : 42000;
                    } else if (previousRoyalDistance > 2) {
                        score -= 36000;
                    }
                }
            } else if (activeRookNet && isRookNetSupport(activePiece)) {
                const helperDistance = getRoyalStepDistance(activePiece, opponentRoyal);
                const previousHelperDistance = getRoyalStepDistance(moveObj.piece, opponentRoyal);
                const supportStrength = getEndgameSupportStrength(activePiece);
                const idealHelperDistance = getEndgameIdealStepDistance(activePiece);
                const currentIdealGap = Math.abs(helperDistance - idealHelperDistance);
                const previousIdealGap = Math.abs(previousHelperDistance - idealHelperDistance);
                const nearestOwnRoyalDistance = getCriticalRoyals(state, movingColor)
                    .reduce((bestDistance, royal) => Math.min(bestDistance, getRoyalStepDistance(royal, opponentRoyal)), 99);
                score += Math.max(0, 8 - helperDistance) * 420 * Math.max(0.55, supportStrength);
                if (currentIdealGap < previousIdealGap) score += 2800 * Math.max(0.55, supportStrength);
                else if (cornerDistance <= 2 && helperDistance <= 3) score -= 2600 * Math.max(0.55, supportStrength);
                if (nearestOwnRoyalDistance > 4 && helperDistance <= 2) score -= 8500;
                if (hasRookHelperNet && isRookNetHelper(activePiece)) {
                    const helperSquareDistance = getSquareDistance(activePiece, opponentRoyal);
                    const protectedHelper = isProtectedByRoyalOrRook(state, activePiece, movingColor);
                    const royalCaptureDanger = isRoyalCaptureDanger(state, activePiece, opponentRoyal, movingColor);
                    score += Math.max(0, 7 - helperSquareDistance) * 780;
                    if (helperSquareDistance === 1) {
                        score += protectedHelper ? 6200 : -52000;
                    }
                    if (helperDistance < previousHelperDistance) score += 2600;
                    else if (helperDistance > previousHelperDistance) score -= 3600;
                    if (nearestOwnRoyalDistance <= 4 && helperDistance <= 2) score += 4200;
                    if (royalCaptureDanger) score -= 68000;
                    if (nearestOwnRoyalDistance > 3 && helperDistance <= 3 && !royalCaptureDanger) {
                        score -= 26000;
                    }
                } else if (hasRookHelperNet) {
                    const royalCaptureDanger = isRoyalCaptureDanger(state, activePiece, opponentRoyal, movingColor);
                    const inUsefulBand = helperDistance >= Math.max(1, idealHelperDistance - 1)
                        && helperDistance <= idealHelperDistance + 2;
                    if (inUsefulBand) score += 4200 * Math.max(0.45, supportStrength);
                    if (currentIdealGap > previousIdealGap && !terminalState?.resultType) {
                        score -= 2600 * Math.max(0.45, supportStrength);
                    }
                    if (getEdgeDistance(opponentRoyal) <= 1 && nearestOwnRoyalDistance <= 4 && inUsefulBand) {
                        score += 3600 * Math.max(0.45, supportStrength);
                    }
                    if (royalCaptureDanger) score -= 68000;
                    if (nearestOwnRoyalDistance > 3 && helperDistance <= 1 && !royalCaptureDanger) {
                        score -= 22000;
                    }
                }
            }
        }

        if (promotionRace) {
            if (directPromotion) {
                score += 24000;
            } else if (pieceType === PIECE_TYPES.PAWN) {
                const afterPromotionDistance = activePiece.type === PIECE_TYPES.PAWN
                    ? getPawnPromotionDistance(activePiece)
                    : 0;
                if (afterPromotionDistance < beforePromotionDistance) {
                    score += (beforePromotionDistance - afterPromotionDistance) * 6500;
                    score += Math.max(0, 3 - afterPromotionDistance) * 4200;
                }
            } else if (pieceType === PIECE_TYPES.ROOK && opponentRoyal) {
                score += opponentInCheck ? 1200 : 0;
            }
        }

        score -= tacticalRisk.dangerLevel * 1600;
        score *= scale;

        revertEndgameTerminalState(state, terminalState);
        revertEndgameMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (!best || score > best.score) {
            best = {
                move: moveObj,
                score,
                reason: promotionRace
                    ? 'promotion-tablebase'
                    : hasRookHelperNet
                        ? (hasPromotedVizierNet ? 'promoted-vizier-net' : rookNetHelpers.length ? 'rook-helper-net' : 'rook-support-net')
                        : 'rook-tablebase'
            };
        }
    }

    if (hasRookHelperNet) return best || null;
    return best && best.score >= 3200 ? best : null;
}

function scoreStalemateAndConversion({ state, movingColor, opponentColor, opponentMobility, ownMobility, opponentInCheck, profile }) {
    let score = 0;
    const ownMaterial = getMaterialForColor(state, movingColor);
    const opponentMaterial = getMaterialForColor(state, opponentColor);
    const materialLead = Math.max(0, ownMaterial - opponentMaterial);

    if (!opponentInCheck && opponentMobility <= 1) score += 1400;
    if (opponentMobility <= 3) score += 420;
    if (ownMobility <= 2) score -= 900;
    score += Math.min(materialLead, 220) * 1.15;

    return score * (profile.weights?.winningEndgame || 1);
}

export function analyzeEndgameMoveOutcome(state, moveObj, profile, terminalState = null) {
    const movingColor = moveObj?.piece?.color;
    const empty = {
        score: 0,
        components: {
            terminal: 0,
            exactSolver: 0,
            checkPressure: 0,
            mateNet: 0,
            citadelRisk: 0,
            stalemateAndConversion: 0,
            royalHunt: 0,
            tacticalSafety: 0,
            miniTablebase: 0,
            promotionPlan: 0,
            distanceToWin: 0,
            distanceToDraw: 0,
            conversionPlan: 0,
            resistancePlan: 0
        },
        reasons: []
    };

    if (!state?.board || !movingColor) return empty;

    const terminalScore = scoreTerminalEndgame(state, movingColor, terminalState);
    if (terminalScore != null) {
        return {
            score: terminalScore,
            components: {
                ...empty.components,
                terminal: terminalScore
            },
            reasons: [terminalScore > 0 ? 'terminal-win' : terminalScore < 0 ? 'terminal-risk' : 'terminal-draw']
        };
    }

    const exactEndgame = analyzeExactEndgame(state, movingColor, profile);
    const exactOnlyResult = {
        score: exactEndgame.score,
        components: {
            ...empty.components,
            ...exactEndgame.components
        },
        reasons: exactEndgame.reasons,
        exactResult: exactEndgame.result
    };

    if (!isWinningSideState(state, movingColor)) {
        return exactEndgame.score ? exactOnlyResult : empty;
    }
    if ((state.board.pieces.length || 0) > ENDGAME_PIECE_LIMIT) {
        return exactEndgame.score ? exactOnlyResult : empty;
    }

    const opponentColor = getOppositeColor(movingColor);
    const opponentRoyals = getCriticalRoyals(state, opponentColor);
    if (!opponentRoyals.length) return exactEndgame.score ? exactOnlyResult : empty;

    const validator = new MoveValidator(state);
    const opponentInCheck = withTurn(state, opponentColor, () => validator.isCheck(opponentColor));
    const opponentMobility = countLegalMovesForColor(state, opponentColor);
    const ownMobility = countLegalMovesForColor(state, movingColor);
    const movedPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col) || moveObj.piece;
    const ownPieces = getSidePieces(state, movingColor);
    const tacticalRisk = evaluateTacticalRisk(state, movingColor, movedPiece);
    const tacticalSafety = tacticalRisk.dangerLevel * -620 * (profile.weights?.winningEndgame || 1);

    const checkPressure = opponentInCheck
        ? 2400 * (tacticalRisk.dangerLevel >= 2 ? 0.35 : 1) * (profile.weights?.winningEndgame || 1)
        : 0;
    const mateNet = scoreMateNet({ opponentInCheck, opponentMobility, opponentRoyals, ownPieces, profile });
    const citadelRisk = scoreCitadelRisk(state, movingColor, opponentRoyals, opponentInCheck, opponentMobility, profile);
    const stalemateAndConversion = scoreStalemateAndConversion({
        state,
        movingColor,
        opponentColor,
        opponentMobility,
        ownMobility,
        opponentInCheck,
        profile
    });
    const royalHunt = scoreRoyalHunt({ movedPiece, ownPieces, opponentRoyals, profile });
    const miniTablebase = scoreMiniTablebasePlan({
        state,
        movingColor,
        movedPiece,
        moveObj,
        opponentRoyals,
        ownPieces,
        opponentMobility,
        opponentInCheck,
        profile
    });
    const promotionPlan = scorePromotionPlan({ state, movingColor, movedPiece, moveObj, profile });

    const components = {
        terminal: 0,
        exactSolver: exactEndgame.components.exactSolver,
        checkPressure,
        mateNet,
        citadelRisk,
        stalemateAndConversion,
        royalHunt,
        tacticalSafety,
        miniTablebase,
        promotionPlan,
        distanceToWin: exactEndgame.components.distanceToWin,
        distanceToDraw: exactEndgame.components.distanceToDraw,
        conversionPlan: exactEndgame.components.conversionPlan || 0,
        resistancePlan: exactEndgame.components.resistancePlan || 0
    };

    const reasons = [...exactEndgame.reasons];
    addReason(reasons, 'check-pressure', checkPressure > 0);
    addReason(reasons, 'mate-net', mateNet >= 1800);
    addReason(reasons, 'promotion-plan', promotionPlan >= 900);
    addReason(reasons, 'citadel-risk', citadelRisk <= -1000);
    addReason(reasons, 'stalemate-net', !opponentInCheck && opponentMobility <= 1);
    addReason(reasons, 'royal-hunt', royalHunt >= 500);
    addReason(reasons, 'tactical-risk', tacticalSafety <= -1000);
    addReason(reasons, 'mini-tablebase', miniTablebase >= 3000);
    addReason(reasons, 'conversion-plan', (exactEndgame.components.conversionPlan || 0) > 0);
    addReason(reasons, 'resistance-plan', (exactEndgame.components.resistancePlan || 0) > 0);

    return {
        score: Object.values(components).reduce((sum, value) => sum + value, 0),
        components,
        reasons,
        exactResult: exactEndgame.result,
        wdlOutcome: exactEndgame.outcome || null,
        wdlPlan: exactEndgame.plan || null,
        opponentMobility,
        ownMobility
    };
}

export function scoreEndgameMoveOutcome(state, moveObj, profile, terminalState = null) {
    return analyzeEndgameMoveOutcome(state, moveObj, profile, terminalState).score;
}
