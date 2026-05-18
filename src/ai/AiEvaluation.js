import { COLORS, PIECE_TYPES, PIECE_VALUES } from '../utils/constants.js';
import { GameRules } from '../game/GameRules.js';
import { MoveValidator } from '../game/MoveValidator.js';
import { evaluateWinningEndgame, isWinningSideState } from './AiStrategy.js';
import { getAIProfile } from './AIProfiles.js';
import {
    buildAttackMap,
    getLegalAttackersToSquare as getAttackMapLegalAttackersToSquare,
    getPotentialAttackersToSquare as getAttackMapPotentialAttackersToSquare,
    getSupportersToSquare as getAttackMapSupportersToSquare,
    isSquareAttackedByPotential as isSquarePotentiallyAttacked,
    summarizeAttackMapForColor
} from './AttackMap.js';
import { scoreMiddleGameForBlack } from './AIMiddleGame.js';

function resolveProfile(profileInput = 'medium') {
    return typeof profileInput === 'string' ? getAIProfile(profileInput) : profileInput;
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function getPotentialMoveCount(state, color) {
    return state.board.pieces
        .filter((piece) => piece.color === color)
        .reduce((total, piece) => total + piece.getPotentialMoves(state.board).length, 0);
}

function getCriticalRoyals(state, color) {
    const royals = state.board.pieces.filter((piece) => piece.color === color && GameRules.isRoyalType(piece.type));
    if (!royals.length) return [];

    const highestRank = Math.max(...royals.map((piece) => GameRules.getRoyalRank(piece.type)));
    return royals.filter((piece) => GameRules.getRoyalRank(piece.type) === highestRank);
}

function isSquareAttackedByPotential(board, row, col, attackerColor) {
    return isSquarePotentiallyAttacked(board, row, col, attackerColor);
}

function getClosestEnemyDistance(state, targetPiece, enemyColor) {
    const enemies = state.board.pieces.filter((piece) => piece.color === enemyColor);
    if (!enemies.length) return 8;

    return Math.min(...enemies.map((piece) => Math.abs(piece.row - targetPiece.row) + Math.abs(piece.col - targetPiece.col)));
}

function getDistanceToCitadel(piece, citadel) {
    return Math.abs(piece.row - citadel.row) + Math.abs(piece.col - citadel.col);
}

function getOwnCitadel(color) {
    return color === COLORS.WHITE
        ? { row: 9, col: 11 }
        : { row: 0, col: -1 };
}

function getOpponentCitadel(color) {
    return color === COLORS.WHITE
        ? { row: 0, col: -1 }
        : { row: 9, col: 11 };
}

function countFriendlySupport(state, row, col, color) {
    return state.board.pieces
        .filter((piece) => piece.color === color)
        .reduce((total, piece) => total + (piece.getPotentialMoves(state.board).some((move) => move.row === row && move.col === col) ? 1 : 0), 0);
}

function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function signedForBlack(score, color) {
    return color === COLORS.BLACK ? score : -score;
}

function getCenterDistance(row, col) {
    return Math.abs(col - 5) + Math.abs(row - 4.5);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function isCentralSquare(row, col) {
    return row >= 3 && row <= 6 && col >= 3 && col <= 7;
}

function getForwardProgress(piece) {
    if (!piece) return 0;
    return piece.color === COLORS.BLACK
        ? clamp(piece.row, 0, 9)
        : clamp(9 - piece.row, 0, 9);
}

function getPawnPromotionDistance(pawn, row = pawn?.row) {
    if (!pawn || !Number.isFinite(row)) return 9;
    return pawn.color === COLORS.BLACK
        ? Math.max(0, 9 - row)
        : Math.max(0, row);
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

function getPhaseContext(state) {
    const pieceCount = state.board.pieces.length;
    const moveCount = state.moveHistory?.length || 0;
    const nonRoyalMaterial = state.board.pieces.reduce((total, piece) => (
        GameRules.isRoyalType(piece.type) ? total : total + (PIECE_VALUES[piece.type] || 0)
    ), 0);

    const endgameByPieces = clamp((14 - pieceCount) / 8, 0, 1);
    const endgameByMaterial = clamp((360 - nonRoyalMaterial) / 300, 0, 1);
    const endgame = clamp(Math.max(endgameByPieces, endgameByMaterial * 0.75), 0, 1);
    const openingMaterialRoom = clamp((pieceCount - 10) / 18, 0, 1);
    const opening = clamp((16 - moveCount) / 16, 0, 1) * openingMaterialRoom * (1 - endgame * 0.75);
    const middle = Math.max(0, 1 - opening - endgame);
    const total = opening + middle + endgame || 1;
    const weights = {
        opening: opening / total,
        middle: middle / total,
        endgame: endgame / total
    };
    const label = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];

    return {
        label,
        pieceCount,
        moveCount,
        nonRoyalMaterial,
        weights
    };
}

function getRoyalHomeRow(color) {
    return color === COLORS.BLACK ? 1 : 8;
}

function getRoyalAdvanceFromHome(royal) {
    const homeRow = getRoyalHomeRow(royal.color);
    return royal.color === COLORS.BLACK
        ? Math.max(0, royal.row - homeRow)
        : Math.max(0, homeRow - royal.row);
}

function getRoyalCenterExposure(row, col) {
    const centerPull = Math.max(0, 6 - getCenterDistance(row, col));
    return (isCentralSquare(row, col) ? 34 : 0) + centerPull * 6;
}

function getRoyalHomeShelterScore(state, royal) {
    const homeRow = getRoyalHomeRow(royal.color);
    const homeDistance = Math.abs(royal.row - homeRow) + Math.abs(royal.col - 5);
    const backRankShelter = Math.max(0, 4 - homeDistance) * 8;
    const friendlySupport = Math.min(4, countFriendlySupport(state, royal.row, royal.col, royal.color)) * 6;
    return backRankShelter + friendlySupport;
}

function isClearOrthogonalPath(state, fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;

    const rowStep = Math.sign(toRow - fromRow);
    const colStep = Math.sign(toCol - fromCol);
    let row = fromRow + rowStep;
    let col = fromCol + colStep;

    while (row !== toRow || col !== toCol) {
        if (state.board.getPieceAt(row, col)) return false;
        row += rowStep;
        col += colStep;
    }

    return true;
}

function scoreRoyalOpenLinePressure(state, royal, enemyColor) {
    return state.board.pieces
        .filter((piece) => piece.color === enemyColor)
        .reduce((total, enemy) => {
            const sameLine = enemy.row === royal.row || enemy.col === royal.col;
            if (!sameLine || !isClearOrthogonalPath(state, enemy.row, enemy.col, royal.row, royal.col)) {
                return total;
            }

            const value = PIECE_VALUES[enemy.type] || 0;
            const distance = Math.max(1, Math.abs(enemy.row - royal.row) + Math.abs(enemy.col - royal.col));
            return total + Math.min(42, value * 0.12 + Math.max(0, 7 - distance) * 4);
        }, 0);
}

function countSafeRoyalEscapes(state, royal, enemyColor) {
    if (typeof royal?.getPotentialMoves !== 'function') return 1;

    return royal.getPotentialMoves(state.board).filter((move) => {
        if (!state.board.isValidCoord(move.row, move.col)) return false;
        const target = state.board.getPieceAt(move.row, move.col);
        if (target && target.color === royal.color) return false;
        return !isSquareAttackedByPotential(state.board, move.row, move.col, enemyColor);
    }).length;
}

function scoreSingleRoyalSafety(state, royal, enemyColor) {
    const attacked = isSquareAttackedByPotential(state.board, royal.row, royal.col, enemyColor);
    const closestEnemy = getClosestEnemyDistance(state, royal, enemyColor);
    const advanceExposure = getRoyalAdvanceFromHome(royal);
    const centerExposure = getRoyalCenterExposure(royal.row, royal.col);
    const safeEscapes = countSafeRoyalEscapes(state, royal, enemyColor);
    const openLinePressure = scoreRoyalOpenLinePressure(state, royal, enemyColor);
    const losingCitadelEscapeDistance = getDistanceToCitadel(royal, getOpponentCitadel(royal.color));
    const citadelEscapeCredit = (
        !isWinningSideState(state, royal.color)
        && losingCitadelEscapeDistance <= 3
    )
        ? Math.max(0, 4 - losingCitadelEscapeDistance) * 18
        : 0;

    let royalScore = attacked ? -130 : 44;
    royalScore += Math.max(0, 7 - closestEnemy) * -7;
    royalScore += getRoyalHomeShelterScore(state, royal);
    royalScore -= Math.max(0, advanceExposure - 1) * 18;
    royalScore -= centerExposure;
    royalScore -= openLinePressure;
    royalScore += Math.min(3, safeEscapes) * 7;
    if (safeEscapes === 0) royalScore -= 30;
    royalScore += citadelEscapeCredit;

    if (GameRules.getRoyalRank(royal.type) < 3) {
        royalScore -= 12;
    }

    return royalScore;
}

function isNonRoyalDevelopmentPiece(piece) {
    return piece.type !== PIECE_TYPES.PAWN && !GameRules.isRoyalType(piece.type);
}

const THREAT_MAP_WEIGHT = Object.freeze({
    easy: 0.45,
    medium: 0.85,
    hard: 1.2
});

const STATIC_EXCHANGE_ORDERING_WEIGHT = Object.freeze({
    easy: 4,
    medium: 8,
    hard: 12
});

function getThreatMapWeight(profile) {
    const baseId = getProfileBaseId(profile);
    return THREAT_MAP_WEIGHT[baseId] ?? THREAT_MAP_WEIGHT.medium;
}

function getStaticExchangeOrderingWeight(profile) {
    const baseId = getProfileBaseId(profile);
    return STATIC_EXCHANGE_ORDERING_WEIGHT[baseId] ?? STATIC_EXCHANGE_ORDERING_WEIGHT.medium;
}

function getAttackCount(state, row, col, attackerColor) {
    return getAttackMapPotentialAttackersToSquare(state, row, col, attackerColor).length;
}

function getPieceExchangeValue(piece) {
    if (!piece) return 0;
    return PIECE_VALUES[piece.type] || 0;
}

const STATIC_EXCHANGE_METHOD = 'timur_see_v2';

function serializeExchangePiece(piece) {
    if (!piece) return null;
    return {
        type: piece.type,
        color: piece.color,
        row: piece.row,
        col: piece.col,
        value: getPieceExchangeValue(piece),
        isRoyal: GameRules.isRoyalType(piece.type)
    };
}

function createStaticExchangeResult(overrides = {}) {
    const score = overrides.score ?? 0;
    return {
        method: STATIC_EXCHANGE_METHOD,
        captures: false,
        captureValue: 0,
        attackerValue: 0,
        recaptureRisk: 0,
        defenderCredit: 0,
        sequenceDepth: 0,
        captureTreeDepth: overrides.sequenceDepth ?? 0,
        captureSequence: [],
        leastValuableAttacker: null,
        leastValuableReply: null,
        royalRiskPenalty: 0,
        citadelRiskPenalty: 0,
        specialRiskPenalty: 0,
        exchangeDebt: Math.max(0, -score),
        score,
        favorable: score >= -5,
        ...overrides
    };
}

function withTemporaryTurn(state, color, callback) {
    const previousTurn = state.currentTurn;
    state.currentTurn = color;
    try {
        return callback();
    } finally {
        state.currentTurn = previousTurn;
    }
}

function getLegalAttackersToSquare(state, row, col, attackerColor) {
    return getAttackMapLegalAttackersToSquare(state, row, col, attackerColor);
}

function getSupportersToSquare(state, row, col, supporterColor) {
    return getAttackMapSupportersToSquare(state, row, col, supporterColor);
}

function getCheapestPieceValue(pieces = []) {
    if (!pieces.length) return 0;
    const values = pieces.map(getPieceExchangeValue).filter((value) => value > 0);
    return values.length ? Math.min(...values) : 0;
}

function applyEvaluationMove(state, piece, row, col) {
    const origRow = piece.row;
    const origCol = piece.col;
    const moveData = state.board.movePiece(origRow, origCol, row, col);
    if (!moveData) return null;

    const postMoveEffects = GameRules.applyPostMoveEffects(state, piece, row, col);
    return {
        origRow,
        origCol,
        row,
        col,
        moveData,
        postMoveEffects,
        activePiece: postMoveEffects?.activePiece || state.board.getPieceAt(row, col)
    };
}

function revertEvaluationMove(state, appliedMove) {
    if (!appliedMove) return;
    GameRules.revertPostMoveEffects(state, appliedMove.postMoveEffects);
    state.board.undoMove(appliedMove.origRow, appliedMove.origCol, appliedMove.row, appliedMove.col, appliedMove.moveData);
}

function estimateExchangeGainForSide(state, row, col, sideToMove, depth = 6) {
    const target = state.board.getPieceAt(row, col);
    if (!target || target.color === sideToMove || depth <= 0) {
        return {
            gain: 0,
            depth: 0,
            captureSequence: [],
            leastValuableAttacker: null,
            chosenAttacker: null,
            branchCount: 0
        };
    }

    const attackers = getLegalAttackersToSquare(state, row, col, sideToMove)
        .sort((a, b) => getPieceExchangeValue(a) - getPieceExchangeValue(b));
    if (!attackers.length) {
        return {
            gain: 0,
            depth: 0,
            captureSequence: [],
            leastValuableAttacker: null,
            chosenAttacker: null,
            branchCount: 0
        };
    }

    const leastValuableAttacker = serializeExchangePiece(attackers[0]);
    let best = {
        gain: -Infinity,
        depth: 0,
        captureSequence: [],
        leastValuableAttacker,
        chosenAttacker: null,
        branchCount: 0
    };
    for (const attacker of attackers) {
        const capturedValue = getPieceExchangeValue(target);
        const capturedPiece = serializeExchangePiece(target);
        const attackerPiece = serializeExchangePiece(attacker);
        const appliedMove = applyEvaluationMove(state, attacker, row, col);
        if (!appliedMove) continue;

        const reply = estimateExchangeGainForSide(state, row, col, getOppositeColor(sideToMove), depth - 1);
        const gain = capturedValue - reply.gain;
        const sequence = {
            gain,
            depth: 1 + reply.depth,
            captureSequence: [
                {
                    side: sideToMove,
                    attacker: attackerPiece,
                    captured: capturedPiece,
                    capturedValue,
                    netGain: gain
                },
                ...reply.captureSequence
            ],
            leastValuableAttacker,
            chosenAttacker: attackerPiece,
            branchCount: 1 + (reply.branchCount || 0)
        };

        revertEvaluationMove(state, appliedMove);

        if (sequence.gain > best.gain || (sequence.gain === best.gain && sequence.depth > best.depth)) {
            best = sequence;
        }
    }

    if (!Number.isFinite(best.gain)) {
        return {
            gain: 0,
            depth: 0,
            captureSequence: [],
            leastValuableAttacker,
            chosenAttacker: null,
            branchCount: 0
        };
    }
    return {
        gain: Math.max(0, best.gain),
        depth: best.depth,
        captureSequence: best.captureSequence,
        leastValuableAttacker: best.leastValuableAttacker,
        chosenAttacker: best.chosenAttacker,
        branchCount: best.branchCount
    };
}

function scoreStaticExchangeSpecialRisk(state, activePiece, enemyAttackers = []) {
    if (!activePiece || !GameRules.isRoyalType(activePiece.type)) {
        return {
            royalRiskPenalty: 0,
            citadelRiskPenalty: 0,
            specialRiskPenalty: 0
        };
    }

    const enemyColor = getOppositeColor(activePiece.color);
    const legalAttackRisk = enemyAttackers.length
        ? 150 + Math.min(90, getCheapestPieceValue(enemyAttackers) * 0.65)
        : 0;
    const potentialAttackRisk = isSquareAttackedByPotential(state.board, activePiece.row, activePiece.col, enemyColor)
        ? 55
        : 0;
    const opponentCitadelDistance = getDistanceToCitadel(activePiece, getOpponentCitadel(activePiece.color));
    const citadelRiskPenalty = opponentCitadelDistance <= 1
        ? (isWinningSideState(state, activePiece.color) ? 130 : 70)
        : (opponentCitadelDistance <= 2 && isWinningSideState(state, activePiece.color) ? 45 : 0);
    const royalRiskPenalty = legalAttackRisk + potentialAttackRisk;

    return {
        royalRiskPenalty,
        citadelRiskPenalty,
        specialRiskPenalty: royalRiskPenalty + citadelRiskPenalty
    };
}

export function evaluateStaticExchangeForMove(state, moveObj, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const piece = moveObj?.piece;
    const move = moveObj?.move;
    if (!state?.board || !piece || !move || move.specialMove) {
        return createStaticExchangeResult();
    }

    const targetPiece = state.board.getPieceAt(move.row, move.col);
    const captures = Boolean(targetPiece && targetPiece.color !== piece.color);
    const captureValue = captures ? getPieceExchangeValue(targetPiece) : 0;
    const attackerValue = getPieceExchangeValue(piece);
    const origRow = piece.row;
    const origCol = piece.col;

    const moveData = state.board.movePiece(origRow, origCol, move.row, move.col);
    if (!moveData) {
        return createStaticExchangeResult({
            captures,
            captureValue,
            attackerValue,
            leastValuableAttacker: serializeExchangePiece(piece)
        });
    }

    let recaptureRisk = 0;
    let defenderCredit = 0;
    let sequenceDepth = 0;
    let captureSequence = captures
        ? [{
            side: piece.color,
            attacker: serializeExchangePiece(piece),
            captured: serializeExchangePiece(targetPiece),
            capturedValue: captureValue,
            netGain: captureValue
        }]
        : [];
    let leastValuableReply = null;
    let specialRisk = {
        royalRiskPenalty: 0,
        citadelRiskPenalty: 0,
        specialRiskPenalty: 0
    };
    try {
        const enemyColor = getOppositeColor(piece.color);
        const enemySequence = estimateExchangeGainForSide(state, move.row, move.col, enemyColor, 6);
        const enemyAttackers = getLegalAttackersToSquare(state, move.row, move.col, enemyColor);
        const friendlyDefenders = getSupportersToSquare(state, move.row, move.col, piece.color)
            .filter((defender) => defender !== piece);
        const activePiece = state.board.getPieceAt(move.row, move.col);

        if (enemyAttackers.length) {
            const cheapestEnemy = getCheapestPieceValue(enemyAttackers);
            const cheapestFriendly = getCheapestPieceValue(friendlyDefenders);
            const attackerPressure = Math.max(0, enemyAttackers.length - friendlyDefenders.length);

            recaptureRisk = enemySequence.gain;
            sequenceDepth = enemySequence.depth;
            captureSequence = [...captureSequence, ...enemySequence.captureSequence];
            leastValuableReply = enemySequence.leastValuableAttacker;

            if (cheapestFriendly && cheapestEnemy) {
                defenderCredit = Math.max(0, cheapestEnemy - cheapestFriendly) * 0.18;
            }

            recaptureRisk += attackerPressure * Math.min(attackerValue * 0.08, 14);
        } else if (friendlyDefenders.length) {
            defenderCredit = Math.min(attackerValue * 0.08, 10);
        }

        specialRisk = scoreStaticExchangeSpecialRisk(state, activePiece, enemyAttackers);
    } finally {
        state.board.undoMove(origRow, origCol, move.row, move.col, moveData);
    }

    const rawScore = captureValue - recaptureRisk + defenderCredit - specialRisk.specialRiskPenalty;
    const score = rawScore * (profile?.ordering?.capture || 1);

    return createStaticExchangeResult({
        captures,
        captureValue,
        attackerValue,
        recaptureRisk,
        defenderCredit,
        sequenceDepth,
        captureTreeDepth: sequenceDepth,
        captureSequence,
        leastValuableAttacker: serializeExchangePiece(piece),
        leastValuableReply,
        ...specialRisk,
        exchangeDebt: Math.max(0, -score),
        score,
        favorable: score >= -5 && specialRisk.specialRiskPenalty < 90
    });
}

export function buildBoardThreatMap(state, perspectiveColor = COLORS.BLACK, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const attackMap = buildAttackMap(state);
    const summary = summarizeAttackMapForColor(attackMap, perspectiveColor);
    const rawScore = summary.rawScore;
    const netScore = rawScore * getThreatMapWeight(profile);

    return {
        ...summary,
        attackMapVersion: attackMap.version,
        rawScore,
        netScore
    };
}

function buildSquareKey(row, col) {
    return `${row}:${col}`;
}

function getLegalEnemyTargetsForPiece(state, piece) {
    if (!piece) return [];

    return withTemporaryTurn(state, piece.color, () => {
        const validator = new MoveValidator(state);
        return validator.getLegalMoves(piece.row, piece.col)
            .map((move) => {
                const target = state.board.getPieceAt(move.row, move.col);
                if (!target || target.color === piece.color) return null;
                return {
                    key: buildSquareKey(target.row, target.col),
                    type: target.type,
                    row: target.row,
                    col: target.col,
                    value: getPieceExchangeValue(target),
                    isRoyal: GameRules.isRoyalType(target.type),
                    attacker: piece
                };
            })
            .filter(Boolean);
    });
}

function getLegalEnemyTargetMap(state, color) {
    const targetMap = new Map();
    const pieces = state.board.pieces.filter((piece) => piece.color === color);

    for (const piece of pieces) {
        for (const target of getLegalEnemyTargetsForPiece(state, piece)) {
            const existing = targetMap.get(target.key);
            if (!existing || target.value > existing.value) targetMap.set(target.key, target);
        }
    }

    return targetMap;
}

function scoreOverloadedDefenders(state, attackedTargets, defenderColor) {
    const defenderLoads = new Map();

    for (const target of attackedTargets) {
        if (target.isRoyal || target.value <= 0) continue;
        const defenders = getSupportersToSquare(state, target.row, target.col, defenderColor);
        if (defenders.length !== 1) continue;

        const defender = defenders[0];
        const key = buildSquareKey(defender.row, defender.col);
        const load = defenderLoads.get(key) || {
            defender,
            targets: [],
            value: 0
        };
        load.targets.push(target);
        load.value += target.value;
        defenderLoads.set(key, load);
    }

    const overloaded = [...defenderLoads.values()].filter((load) => load.targets.length >= 2);
    return {
        overloadedDefenders: overloaded.map((load) => ({
            type: load.defender.type,
            row: load.defender.row,
            col: load.defender.col,
            targetCount: load.targets.length,
            targetValue: load.value
        })),
        value: overloaded.reduce((total, load) => total + load.value, 0)
    };
}

function getTacticalMotifWeight(profile) {
    const baseId = getProfileBaseId(profile);
    if (baseId === 'hard') return 1.25;
    if (baseId === 'medium') return 0.85;
    return 0.45;
}

export function analyzeTacticalMotifsForMove(state, moveObj, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const piece = moveObj?.piece;
    const move = moveObj?.move;
    if (!state?.board || !piece || !move || move.specialMove) {
        return {
            score: 0,
            forkTargets: [],
            newTargets: [],
            overloadedDefenders: [],
            royalPressure: false
        };
    }

    const beforeTargets = getLegalEnemyTargetMap(state, piece.color);
    const appliedMove = applyEvaluationMove(state, piece, move.row, move.col);
    if (!appliedMove) {
        return {
            score: 0,
            forkTargets: [],
            newTargets: [],
            overloadedDefenders: [],
            royalPressure: false
        };
    }

    try {
        const activePiece = appliedMove.activePiece || state.board.getPieceAt(move.row, move.col);
        const activeTargets = getLegalEnemyTargetsForPiece(state, activePiece);
        const nonRoyalActiveTargets = activeTargets.filter((target) => !target.isRoyal && target.value > 0);
        const forkTargets = nonRoyalActiveTargets
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);
        const afterTargets = [...getLegalEnemyTargetMap(state, piece.color).values()];
        const newTargets = afterTargets.filter((target) => !beforeTargets.has(target.key) && !target.isRoyal && target.value > 0);
        const overload = scoreOverloadedDefenders(state, afterTargets, getOppositeColor(piece.color));
        const royalPressure = activeTargets.some((target) => target.isRoyal);

        const forkValue = forkTargets.length >= 2
            ? forkTargets.slice(0, 2).reduce((total, target) => total + target.value, 0)
            : 0;
        const newTargetValue = newTargets.reduce((total, target) => total + target.value, 0);
        const rawScore = (
            forkValue * 0.32
            + newTargetValue * 0.14
            + overload.value * 0.18
            + (royalPressure ? 52 : 0)
        );
        const score = rawScore * getTacticalMotifWeight(profile);

        return {
            score,
            forkTargets,
            newTargets,
            overloadedDefenders: overload.overloadedDefenders,
            royalPressure
        };
    } finally {
        revertEvaluationMove(state, appliedMove);
    }
}

function scoreMaterial(state, profile) {
    let score = 0;

    state.board.pieces.forEach((piece) => {
        const baseValue = PIECE_VALUES[piece.type] || 10;
        score += signedForBlack(baseValue * profile.weights.material, piece.color);
    });

    return score;
}

function scorePiecePosition(state, profile) {
    let score = 0;
    const centerCol = 5;
    const centerRow = 4.5;

    state.board.pieces.forEach((piece) => {
        let pieceScore = 0;

        const colDist = Math.abs(piece.col - centerCol);
        const rowDist = Math.abs(piece.row - centerRow);
        if (!GameRules.isRoyalType(piece.type)) {
            pieceScore += Math.max(0, 5 - colDist - rowDist) * 0.5 * profile.weights.center;
        }

        if (piece.col === -1 && piece.row === 0) pieceScore += 50 * profile.weights.citadel;
        else if (piece.col === 11 && piece.row === 9) pieceScore += 50 * profile.weights.citadel;

        score += signedForBlack(pieceScore, piece.color);
    });

    return score;
}

function scoreCenterControl(state, profile) {
    let score = 0;

    for (const piece of state.board.pieces) {
        if (GameRules.isRoyalType(piece.type)) continue;

        const occupancyBonus = isCentralSquare(piece.row, piece.col)
            ? Math.max(0, 7 - getCenterDistance(piece.row, piece.col)) * 0.65
            : 0;
        const controlBonus = piece.getPotentialMoves(state.board)
            .filter((move) => isCentralSquare(move.row, move.col))
            .reduce((total, move) => total + Math.max(0.35, 2.5 - getCenterDistance(move.row, move.col) * 0.18), 0);

        score += signedForBlack((occupancyBonus + controlBonus) * profile.weights.center, piece.color);
    }

    return score;
}

function scoreDevelopment(state, profile) {
    let score = 0;

    for (const piece of state.board.pieces) {
        if (!isNonRoyalDevelopmentPiece(piece)) continue;

        const advancedRows = piece.color === COLORS.BLACK
            ? Math.max(0, piece.row - 1)
            : Math.max(0, 8 - piece.row);
        const movedBonus = piece.hasMoved ? 6 : 0;
        const centralDevelopment = Math.max(0, 5 - getCenterDistance(piece.row, piece.col)) * 0.55;
        const backRankPenalty = advancedRows === 0 ? -4 : 0;
        const pieceScore = (movedBonus + Math.min(advancedRows, 4) * 1.5 + centralDevelopment + backRankPenalty)
            * profile.weights.mobility;

        score += signedForBlack(pieceScore, piece.color);
    }

    return score;
}

function scoreStrategicPlan(state, profile) {
    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const pieces = state.board.pieces.filter((piece) => piece.color === color);
        const nonRoyals = pieces.filter((piece) => !GameRules.isRoyalType(piece.type));
        const occupiedColumns = new Set();
        let colorScore = 0;

        for (const piece of nonRoyals) {
            if (state.board.isValidCoord(piece.row, piece.col)) {
                occupiedColumns.add(piece.col);
            }

            const enemyColor = getOppositeColor(piece.color);
            const center = Math.max(0, 6 - getCenterDistance(piece.row, piece.col));
            const progress = getForwardProgress(piece);
            const support = Math.min(3, countFriendlySupport(state, piece.row, piece.col, piece.color));
            const mobility = piece.getPotentialMoves(state.board)
                .filter((move) => state.board.isValidCoord(move.row, move.col))
                .length;
            const valueWeight = Math.min(1.65, 0.7 + (PIECE_VALUES[piece.type] || 10) / 120);
            const developed = piece.type === PIECE_TYPES.PAWN
                ? progress >= 3
                : (piece.hasMoved || progress >= 2);
            const attackers = getAttackCount(state, piece.row, piece.col, enemyColor);
            const defenders = getAttackCount(state, piece.row, piece.col, piece.color);
            const hangingPenalty = attackers > defenders
                ? Math.min(24, (PIECE_VALUES[piece.type] || 10) * 0.08 + (attackers - defenders) * 4)
                : 0;
            const edgePenalty = (piece.col <= 0 || piece.col >= 10)
                ? 4
                : 0;
            const undevelopedPenalty = (!developed && isNonRoyalDevelopmentPiece(piece))
                ? 7
                : 0;

               const pieceScore = (
                   center * 1.55
                   + Math.min(progress, 6) * 0.8
                   + support * 2.4
                   + Math.min(mobility, 12) * 0.55
                + (developed ? 5.5 : -2.5)
                - hangingPenalty
                - edgePenalty
                - undevelopedPenalty
            ) * valueWeight;

            colorScore += pieceScore;
        }

        const spreadBonus = Math.min(14, occupiedColumns.size * 1.35);
        const centralSpreadBonus = nonRoyals
            .filter((piece) => piece.col >= 3 && piece.col <= 7 && piece.row >= 2 && piece.row <= 7)
            .length * 1.4;
        colorScore += spreadBonus + centralSpreadBonus;

        score += signedForBlack(colorScore * profile.weights.mobility, color);
    }

    return score;
}

function getPieceNetworkDistance(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function scoreCoordination(state, profile) {
    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const pieces = state.board.pieces.filter((piece) => piece.color === color);
        const nonRoyals = pieces.filter((piece) => !GameRules.isRoyalType(piece.type));
        const targetPressure = new Map();
        let colorScore = 0;

        for (const piece of nonRoyals) {
            const potentialMoves = piece.getPotentialMoves(state.board)
                .filter((move) => state.board.isValidCoord(move.row, move.col));
            potentialMoves.forEach((move) => {
                const key = `${move.row}:${move.col}`;
                targetPressure.set(key, (targetPressure.get(key) || 0) + 1);
            });

            const support = Math.min(3, countFriendlySupport(state, piece.row, piece.col, color));
            const closeAllies = nonRoyals.filter((ally) => (
                ally !== piece && getPieceNetworkDistance(piece, ally) <= 3
            )).length;
            const centerAnchor = Math.max(0, 5 - getCenterDistance(piece.row, piece.col));
            const valueWeight = clamp((PIECE_VALUES[piece.type] || 20) / 90, 0.35, 1.65);
            const isolatedPenalty = closeAllies === 0 ? 7 : 0;
            const edgePenalty = (piece.row <= 0 || piece.row >= 9 || piece.col <= 0 || piece.col >= 10) ? 3.5 : 0;

            colorScore += (
                support * 5.2
                + Math.min(3, closeAllies) * 3.4
                + centerAnchor * 1.35
                - isolatedPenalty
                - edgePenalty
            ) * valueWeight;
        }

        const sharedTargets = [...targetPressure.values()]
            .filter((count) => count >= 2)
            .reduce((total, count) => total + Math.min(4, count), 0);
        const centralNetwork = nonRoyals.filter((piece) => (
            piece.row >= 2 && piece.row <= 7 && piece.col >= 2 && piece.col <= 8
        )).length;
        colorScore += Math.min(24, sharedTargets * 1.8 + centralNetwork * 1.7);

        score += signedForBlack(colorScore * profile.weights.mobility, color);
    }

    return score;
}

function normalizeHistoryMove(entry) {
    const fromRow = entry?.fromRow ?? entry?.from?.row;
    const fromCol = entry?.fromCol ?? entry?.from?.col;
    const toRow = entry?.toRow ?? entry?.to?.row;
    const toCol = entry?.toCol ?? entry?.to?.col;

    if (
        typeof fromRow !== 'number'
        || typeof fromCol !== 'number'
        || typeof toRow !== 'number'
        || typeof toCol !== 'number'
    ) {
        return null;
    }

    return {
        color: entry?.color || entry?.movedPieceBefore?.color || null,
        type: entry?.movedPieceBefore?.type || entry?.pieceType || null,
        fromRow,
        fromCol,
        toRow,
        toCol
    };
}

function getUndirectedRouteKey(move) {
    const from = `${move.fromRow}:${move.fromCol}`;
    const to = `${move.toRow}:${move.toCol}`;
    return from < to ? `${from}|${to}` : `${to}|${from}`;
}

function getMoveForwardProgress(move, color) {
    return color === COLORS.BLACK
        ? move.toRow - move.fromRow
        : move.fromRow - move.toRow;
}

function scoreTempoContinuity(state, profile) {
    const moves = (Array.isArray(state.moveHistory) ? state.moveHistory : [])
        .slice(-10)
        .map(normalizeHistoryMove)
        .filter(Boolean);
    if (!moves.length) return 0;

    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const colorMoves = moves.filter((move) => move.color === color);
        const routeCounts = new Map();
        let colorScore = 0;

        colorMoves.forEach((move, index) => {
            const routeKey = getUndirectedRouteKey(move);
            routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1);

            const progress = getMoveForwardProgress(move, color);
            colorScore += clamp(progress, -2, 2) * 2.6;

            const previous = colorMoves[index - 1];
            if (previous && getUndirectedRouteKey(previous) === routeKey) {
                colorScore -= 13;
            }
        });

        for (const count of routeCounts.values()) {
            if (count > 1) colorScore -= (count - 1) * 9;
        }

        score += signedForBlack(colorScore * profile.weights.mobility, color);
    }

    return score;
}

function scoreTempo(state, profile) {
    const tempo = state.currentTurn === COLORS.BLACK ? 1 : -1;
    const mobilityDelta = getPotentialMoveCount(state, COLORS.BLACK) - getPotentialMoveCount(state, COLORS.WHITE);
    return (tempo * 4 + mobilityDelta * 0.15) * profile.weights.mobility;
}

function scorePawnStructure(state, profile) {
    let score = 0;
    const phase = getPhaseContext(state);
    const endgamePawnMultiplier = 1 + (phase.weights?.endgame || 0) * 3.6;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const pawns = state.board.pieces.filter((piece) => piece.color === color && piece.type === PIECE_TYPES.PAWN);
        const fileCounts = new Map();
        pawns.forEach((pawn) => fileCounts.set(pawn.col, (fileCounts.get(pawn.col) || 0) + 1));

        let colorScore = 0;
        for (const pawn of pawns) {
            const advance = pawn.color === COLORS.BLACK
                ? Math.max(0, pawn.row - 2)
                : Math.max(0, 7 - pawn.row);
            colorScore += advance * 0.55 * profile.weights.pawnAdvance;
            colorScore += (pawn.stage || 0) * 5 * profile.weights.pawnAdvance;

            const promotionDistance = getPawnPromotionDistance(pawn);
            const promotionUrgency = Math.max(0, 7 - promotionDistance);
            const passedPawn = isPassedPawn(state, pawn);
            colorScore += Math.pow(promotionUrgency, 1.65) * 1.25 * profile.weights.pawnAdvance * endgamePawnMultiplier;
            if (passedPawn) {
                colorScore += Math.pow(promotionUrgency + 1, 2) * 1.55 * profile.weights.pawnAdvance * endgamePawnMultiplier;
            }
            if (promotionDistance <= 2) {
                colorScore += (3 - promotionDistance) * 60 * profile.weights.pawnAdvance * endgamePawnMultiplier;
            }

            const hasLeftNeighbor = fileCounts.has(pawn.col - 1);
            const hasRightNeighbor = fileCounts.has(pawn.col + 1);
            if (hasLeftNeighbor || hasRightNeighbor) colorScore += 3.5 * profile.weights.pawnAdvance;
            else colorScore -= 3 * profile.weights.pawnAdvance;

            const doubledCount = fileCounts.get(pawn.col) || 0;
            if (doubledCount > 1) colorScore -= (doubledCount - 1) * 4.5 * profile.weights.pawnAdvance;

            const sameFilePawnAhead = pawns.some((other) => (
                other !== pawn
                && other.col === pawn.col
                && (pawn.color === COLORS.BLACK ? other.row > pawn.row : other.row < pawn.row)
            ));
            if (sameFilePawnAhead) {
                colorScore -= Math.pow(promotionUrgency + 1, 2) * 5 * profile.weights.pawnAdvance * endgamePawnMultiplier;
            }
        }

        score += signedForBlack(colorScore, color);
    }

    return score;
}

function scorePieceSafety(state, profile) {
    let score = 0;

    for (const piece of state.board.pieces) {
        if (GameRules.isRoyalType(piece.type)) continue;

        const enemyColor = getOppositeColor(piece.color);
        const attackers = getAttackCount(state, piece.row, piece.col, enemyColor);
        const defenders = getAttackCount(state, piece.row, piece.col, piece.color);
        const value = PIECE_VALUES[piece.type] || 0;
        let pieceScore = 0;

        if (attackers > defenders) pieceScore -= value * (0.16 + Math.min(3, attackers - defenders) * 0.08);
        else if (defenders > attackers) pieceScore += Math.min(value * 0.08, 10) + (defenders - attackers) * 1.5;
        else if (attackers > 0) pieceScore -= value * 0.04;

        score += signedForBlack(pieceScore * getThreatMapWeight(profile), piece.color);
    }

    return score;
}

function scoreAttackDefense(state, profile) {
    const threatMap = buildBoardThreatMap(state, COLORS.BLACK, profile);
    const attackingValue = threatMap.enemyHangingValue + threatMap.enemyContestedValue * 0.55;
    const defensiveRisk = threatMap.ownHangingValue + threatMap.ownContestedValue * 0.55;

    return (attackingValue - defensiveRisk) * getThreatMapWeight(profile);
}

function scoreThreatMap(state, profile) {
    return buildBoardThreatMap(state, COLORS.BLACK, profile).netScore;
}

function scoreMobility(state, profile) {
    const blackMobility = getPotentialMoveCount(state, COLORS.BLACK);
    const whiteMobility = getPotentialMoveCount(state, COLORS.WHITE);
    return (blackMobility - whiteMobility) * 1.8 * profile.weights.mobility;
}

function scorePieceSquareTables(state, profile, phase) {
    let score = 0;

    for (const piece of state.board.pieces) {
        if (!state.board.isValidCoord(piece.row, piece.col)) continue;

        const center = Math.max(0, 6 - getCenterDistance(piece.row, piece.col));
        const progress = getForwardProgress(piece);
        const support = Math.min(3, countFriendlySupport(state, piece.row, piece.col, piece.color));
        const mobility = piece.getPotentialMoves(state.board).filter((move) => state.board.isValidCoord(move.row, move.col)).length;
        let openingScore = 0;
        let middleScore = 0;
        let endgameScore = 0;

        if (GameRules.isRoyalType(piece.type)) {
            const homeDistance = Math.abs(piece.row - getRoyalHomeRow(piece.color)) + Math.abs(piece.col - 5);
            openingScore += Math.max(0, 4 - homeDistance) * 4 + support * 4;
            openingScore -= Math.max(0, progress - 1) * 10;
            middleScore += support * 5 - getRoyalCenterExposure(piece.row, piece.col) * 0.28;
            middleScore -= Math.max(0, progress - 2) * 9;
            endgameScore += center * 2.4 + mobility * 0.6;
        } else if (piece.type === PIECE_TYPES.PAWN) {
            const connected = (
                state.board.pieces.some((candidate) => (
                    candidate !== piece
                    && candidate.color === piece.color
                    && candidate.type === PIECE_TYPES.PAWN
                    && Math.abs(candidate.col - piece.col) === 1
                    && Math.abs(candidate.row - piece.row) <= 1
                ))
            );
            openingScore += progress * 0.9 + (connected ? 5 : -2);
            middleScore += progress * 1.15 + center * 0.85 + (connected ? 4 : -3);
            endgameScore += progress * 1.55 + (connected ? 3 : -4);
        } else {
            const roleWeight = Math.min(1.45, 0.75 + (PIECE_VALUES[piece.type] || 20) / 160);
            openingScore += (piece.hasMoved ? 7 : -3) + center * 1.2 + Math.min(progress, 4) * 0.7;
            middleScore += center * 1.55 + mobility * 0.35 + support * 2.2;
            endgameScore += center * 0.8 + mobility * 0.55 + progress * 0.45;
            openingScore *= roleWeight;
            middleScore *= roleWeight;
            endgameScore *= roleWeight;
        }

        const pieceScore = (
            openingScore * phase.weights.opening
            + middleScore * phase.weights.middle
            + endgameScore * phase.weights.endgame
        ) * profile.weights.center;
        score += signedForBlack(pieceScore, piece.color);
    }

    return score;
}

function scorePhasePosition(state, profile, phase) {
    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const pieces = state.board.pieces.filter((piece) => piece.color === color);
        const royals = pieces.filter((piece) => GameRules.isRoyalType(piece.type));
        const developmentPieces = pieces.filter(isNonRoyalDevelopmentPiece);
        const developedPieces = developmentPieces.filter((piece) => piece.hasMoved || getForwardProgress(piece) >= 2).length;
        const homeRoyals = royals.reduce((total, royal) => {
            const homeDistance = Math.abs(royal.row - getRoyalHomeRow(royal.color)) + Math.abs(royal.col - 5);
            return total + Math.max(0, 4 - homeDistance);
        }, 0);
        const endgameRoyalActivity = royals.reduce((total, royal) => (
            total + Math.max(0, 6 - getCenterDistance(royal.row, royal.col))
        ), 0);

        const openingPlan = developedPieces * 5 + homeRoyals * 4;
        const middlePlan = developedPieces * 3 + getPotentialMoveCount(state, color) * 0.12;
        const endgamePlan = endgameRoyalActivity * 2.4 + pieces.length * -0.4;
        const colorScore = (
            openingPlan * phase.weights.opening
            + middlePlan * phase.weights.middle
            + endgamePlan * phase.weights.endgame
        ) * profile.weights.mobility;

        score += signedForBlack(colorScore, color);
    }

    return score;
}

function scoreLineControl(state, profile) {
    let score = 0;

    for (const piece of state.board.pieces) {
        if (GameRules.isRoyalType(piece.type) || piece.type === PIECE_TYPES.PAWN) continue;

        const moves = piece.getPotentialMoves(state.board).filter((move) => state.board.isValidCoord(move.row, move.col));
        const lineMoves = moves.filter((move) => move.row === piece.row || move.col === piece.col);
        const capturePressure = lineMoves.reduce((total, move) => {
            const target = state.board.getPieceAt(move.row, move.col);
            return total + (target && target.color !== piece.color ? (PIECE_VALUES[target.type] || 0) * 0.045 : 0);
        }, 0);
        const centralLine = lineMoves.filter((move) => isCentralSquare(move.row, move.col)).length * 0.9;
        const pieceScore = (lineMoves.length * 0.7 + centralLine + capturePressure) * profile.weights.center;

        score += signedForBlack(pieceScore, piece.color);
    }

    return score;
}

function scoreWeakSquares(state, profile) {
    let score = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 11; col++) {
            const centerValue = Math.max(0, 5 - getCenterDistance(row, col)) * 0.8;
            const blackInfiltration = row >= 5 ? 1.2 : 0;
            const whiteInfiltration = row <= 4 ? 1.2 : 0;
            const squareValue = 1 + centerValue;
            const blackAttackers = getAttackCount(state, row, col, COLORS.BLACK);
            const whiteAttackers = getAttackCount(state, row, col, COLORS.WHITE);

            if (blackAttackers && !whiteAttackers) score += (squareValue + blackInfiltration) * Math.min(2, blackAttackers);
            if (whiteAttackers && !blackAttackers) score -= (squareValue + whiteInfiltration) * Math.min(2, whiteAttackers);
        }
    }

    return score * 0.55 * profile.weights.center;
}

function scoreMobilityQuality(state, profile) {
    let score = 0;

    for (const piece of state.board.pieces) {
        const enemyColor = getOppositeColor(piece.color);
        const moves = piece.getPotentialMoves(state.board).filter((move) => state.board.isValidCoord(move.row, move.col));
        const originCenter = Math.max(0, 5 - getCenterDistance(piece.row, piece.col));
        const originSupport = countFriendlySupport(state, piece.row, piece.col, piece.color);
        const originQuality = GameRules.isRoyalType(piece.type)
            ? 1
            : clamp(0.55 + originCenter * 0.07 + Math.min(2, originSupport) * 0.08, 0.45, 1.15);
        let pieceScore = 0;

        for (const move of moves) {
            const target = state.board.getPieceAt(move.row, move.col);
            if (target && target.color === piece.color) continue;

            const attackers = getAttackCount(state, move.row, move.col, enemyColor);
            const defenders = getAttackCount(state, move.row, move.col, piece.color);
            const captureValue = target && target.color !== piece.color ? (PIECE_VALUES[target.type] || 0) : 0;
            const moveCenter = Math.max(0, 4 - getCenterDistance(move.row, move.col)) * 0.38;
            const progress = piece.color === COLORS.BLACK
                ? Math.max(0, move.row - piece.row)
                : Math.max(0, piece.row - move.row);
            let moveScore = 0.8 + moveCenter + progress * 0.25 + captureValue * 0.035;

            if (defenders > attackers) moveScore += Math.min(2.2, defenders - attackers);
            if (attackers > defenders) {
                const danger = Math.min(12, (PIECE_VALUES[piece.type] || 0) * 0.055 + (attackers - defenders) * 1.4);
                moveScore -= danger;
            }
            if (GameRules.isRoyalType(piece.type) && attackers > 0) moveScore -= 18;

            pieceScore += moveScore * originQuality;
        }

        score += signedForBlack(pieceScore * profile.weights.mobility, piece.color);
    }

    return score;
}

function scoreConversion(state, profile) {
    let score = 0;

    if (isWinningSideState(state, COLORS.BLACK)) {
        score += evaluateWinningEndgame(state, COLORS.BLACK) * profile.weights.winningEndgame;
    }

    if (isWinningSideState(state, COLORS.WHITE)) {
        score -= evaluateWinningEndgame(state, COLORS.WHITE) * profile.weights.winningEndgame;
    }

    return score;
}

function sumComponents(components) {
    return Object.values(components).reduce((total, value) => total + value, 0);
}

function roundScore(score) {
    return Number(score.toFixed(6));
}

export function buildEvaluationBreakdownForBlack(state, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const phase = getPhaseContext(state);
    const components = {
        material: scoreMaterial(state, profile),
        piecePosition: scorePiecePosition(state, profile),
        pieceSquare: scorePieceSquareTables(state, profile, phase),
        phasePosition: scorePhasePosition(state, profile, phase),
        attackDefense: scoreAttackDefense(state, profile),
        pieceSafety: scorePieceSafety(state, profile),
        royalSafety: scoreRoyalSafety(state, profile),
        centerControl: scoreCenterControl(state, profile),
        lineControl: scoreLineControl(state, profile),
        weakSquares: scoreWeakSquares(state, profile),
        tempo: scoreTempo(state, profile),
        tempoContinuity: scoreTempoContinuity(state, profile),
        development: scoreDevelopment(state, profile),
        strategicPlan: scoreStrategicPlan(state, profile),
        coordination: scoreCoordination(state, profile),
        pawnStructure: scorePawnStructure(state, profile),
        citadel: scoreCitadelPressure(state, profile),
        mobility: scoreMobility(state, profile),
        mobilityQuality: scoreMobilityQuality(state, profile),
        middleGamePlan: scoreMiddleGameForBlack(state, profile),
        threatMap: scoreThreatMap(state, profile),
        conversion: scoreConversion(state, profile)
    };

    Object.keys(components).forEach((key) => {
        components[key] = roundScore(components[key]);
    });

    return {
        perspective: COLORS.BLACK,
        phase: {
            label: phase.label,
            moveCount: phase.moveCount,
            pieceCount: phase.pieceCount,
            nonRoyalMaterial: phase.nonRoyalMaterial,
            weights: {
                opening: roundScore(phase.weights.opening),
                middle: roundScore(phase.weights.middle),
                endgame: roundScore(phase.weights.endgame)
            }
        },
        components,
        total: roundScore(sumComponents(components))
    };
}

function scoreCitadelPressure(state, profile) {
    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const enemyColor = getOppositeColor(color);
        const criticalRoyals = getCriticalRoyals(state, color);
        if (!criticalRoyals.length) continue;

        const distanceToOpponentCitadel = Math.min(
            ...criticalRoyals.map((royal) => getDistanceToCitadel(royal, getOpponentCitadel(color)))
        );
        const distanceToOwnCitadel = Math.min(
            ...criticalRoyals.map((royal) => getDistanceToCitadel(royal, getOwnCitadel(color)))
        );

        let colorScore = 0;

        if (!isWinningSideState(state, color) && distanceToOpponentCitadel <= 3) {
            colorScore += Math.max(0, 4 - distanceToOpponentCitadel) * 32;
        }

        if (isWinningSideState(state, enemyColor) && distanceToOwnCitadel <= 3) {
            colorScore -= Math.max(0, 4 - distanceToOwnCitadel) * 26;
        }

        if (color === COLORS.BLACK) score += colorScore * profile.weights.citadel;
        else score -= colorScore * profile.weights.citadel;
    }

    return score;
}

function scoreRoyalSafety(state, profile) {
    let score = 0;

    for (const color of [COLORS.BLACK, COLORS.WHITE]) {
        const criticalRoyals = getCriticalRoyals(state, color);
        const enemyColor = getOppositeColor(color);

        criticalRoyals.forEach((royal) => {
            const royalScore = scoreSingleRoyalSafety(state, royal, enemyColor);

            if (color === COLORS.BLACK) score += royalScore * profile.weights.royalSafety;
            else score -= royalScore * profile.weights.royalSafety;
        });
    }

    return score;
}

function scoreRoyalMoveSafetyDelta(state, piece, move, profile) {
    const enemyColor = getOppositeColor(piece.color);
    const currentSafety = scoreSingleRoyalSafety(state, piece, enemyColor);
    const nextRoyal = {
        ...piece,
        row: move.row,
        col: move.col
    };
    const nextSafety = scoreSingleRoyalSafety(state, nextRoyal, enemyColor);
    return (nextSafety - currentSafety) * profile.weights.royalSafety * 0.9;
}

export function evaluateTacticalRisk(state, color, movedPiece = null) {
    const enemyColor = getOppositeColor(color);
    let dangerLevel = 0;
    const reasons = [];

    const criticalRoyals = getCriticalRoyals(state, color);
    const attackedRoyals = criticalRoyals.filter((royal) => isSquareAttackedByPotential(state.board, royal.row, royal.col, enemyColor));
    if (attackedRoyals.length) {
        dangerLevel += 3;
        reasons.push('critical_royal_attacked');
    }

    if (movedPiece) {
        const attacked = isSquareAttackedByPotential(state.board, movedPiece.row, movedPiece.col, enemyColor);
        const supportCount = countFriendlySupport(state, movedPiece.row, movedPiece.col, color);
        if (attacked && supportCount <= 1 && !GameRules.isRoyalType(movedPiece.type)) {
            dangerLevel += 2;
            reasons.push('moved_piece_hanging');
        } else if (attacked) {
            dangerLevel += 1;
            reasons.push('moved_piece_attacked');
        }
    }

    return {
        dangerLevel,
        reasons
    };
}

export function evaluateStateForBlack(state, profileInput = 'medium') {
    return buildEvaluationBreakdownForBlack(state, profileInput).total;
}

export function scoreMoveHeuristicForBlack(state, moveObj, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const { piece, move } = moveObj;
    const targetPiece = state.board.getPieceAt(move.row, move.col);
    const totalPieces = state.board.pieces.length;
    let score = 0;

    if (move.specialMove === 'royal_swap' || move.specialMove === 'citadel_exchange') {
        score += 420 * profile.ordering.specialMove;
    }

    if (targetPiece && targetPiece.color !== piece.color) {
        score += (1000 + (PIECE_VALUES[targetPiece.type] || 0) - ((PIECE_VALUES[piece.type] || 0) * 0.1)) * profile.ordering.capture;
        score += evaluateStaticExchangeForMove(state, moveObj, profile).score * getStaticExchangeOrderingWeight(profile);
    }

    if (
        piece.type === PIECE_TYPES.PAWN
        && ((piece.color === COLORS.BLACK && move.row === 9) || (piece.color === COLORS.WHITE && move.row === 0))
    ) {
        score += 1400 * profile.ordering.promotion;
    } else if (piece.type === PIECE_TYPES.PAWN) {
        const beforeDistance = getPawnPromotionDistance(piece);
        const afterDistance = getPawnPromotionDistance(piece, move.row);
        if (afterDistance < beforeDistance) {
            const endgameBoost = totalPieces <= 10 ? 1.7 : 0.7;
            const urgency = Math.max(0, 7 - afterDistance);
            score += (urgency * urgency * 22 + (afterDistance <= 2 ? (3 - afterDistance) * 260 : 0))
                * profile.ordering.promotion
                * endgameBoost;
        }
    }

    if (
        GameRules.isRoyalType(piece.type)
        && ((piece.color === COLORS.BLACK && move.row === 9 && move.col === 11) || (piece.color === COLORS.WHITE && move.row === 0 && move.col === -1))
    ) {
        score += (isWinningSideState(state, piece.color) ? -500 : 980) * profile.ordering.specialMove;
    }

    if (isWinningSideState(state, piece.color)) {
        const opponentColor = getOppositeColor(piece.color);
        const opponentRoyals = state.board.pieces.filter((candidate) =>
            candidate.color === opponentColor && GameRules.isRoyalType(candidate.type)
        );

        if (targetPiece && targetPiece.color !== piece.color && totalPieces <= 10) {
            score += 240 * profile.weights.winningEndgame;
        }

        if (opponentRoyals.length) {
            const closestRoyalDistance = Math.min(
                ...opponentRoyals.map((royal) => Math.abs(move.row - royal.row) + Math.abs(move.col - royal.col))
            );
            score += Math.max(0, 12 - closestRoyalDistance) * 12 * profile.ordering.pressure;

            if (totalPieces <= 8) {
                score += Math.max(0, 10 - closestRoyalDistance) * 14 * profile.weights.winningEndgame;
            }
        }
    }

    if (GameRules.isRoyalType(piece.type) && !move.specialMove) {
        score += scoreRoyalMoveSafetyDelta(state, piece, move, profile);
    } else if (!GameRules.isRoyalType(piece.type)) {
        const colDist = Math.abs(move.col - 5);
        const rowDist = Math.abs(move.row - 4.5);
        score += Math.max(0, 5 - colDist - rowDist) * profile.ordering.center;
    }

    score += analyzeTacticalMotifsForMove(state, moveObj, profile).score;

    return piece.color === COLORS.BLACK ? score : -score;
}
