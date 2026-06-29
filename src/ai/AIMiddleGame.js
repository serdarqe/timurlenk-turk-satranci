import { COLORS, PIECE_VALUES } from '../utils/constants.js';
import { GameRules } from '../game/GameRules.js';
import { MoveValidator } from '../game/MoveValidator.js';
import { getAIProfile } from './AIProfiles.js';
import { buildAttackMap, summarizeAttackMapForColor } from './AttackMap.js';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function resolveProfile(profileInput = 'medium') {
    return typeof profileInput === 'string' ? getAIProfile(profileInput) : (profileInput || getAIProfile('medium'));
}

function getBaseDifficultyId(profile) {
    return profile?.baseId || String(profile?.id || 'medium').split(':')[0];
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getCenterDistance(row, col) {
    return Math.abs(col - 5) + Math.abs(row - 4.5);
}

function getMiddleGamePhaseWeight(state) {
    const pieceCount = state?.board?.pieces?.length || 0;
    const moveCount = state?.moveHistory?.length || 0;
    const openingPressure = clamp((16 - moveCount) / 16, 0, 1) * clamp((pieceCount - 10) / 18, 0, 1);
    const endgamePressure = clamp((14 - pieceCount) / 8, 0, 1);
    return clamp(1 - openingPressure - endgamePressure * 0.65, 0, 1);
}

function getDifficultyScale(profile) {
    const baseId = getBaseDifficultyId(profile);
    if (baseId === 'hard') return 1.25;
    if (baseId === 'medium') return 0.95;
    return 0.58;
}

function getPieceValue(piece) {
    if (!piece || GameRules.isRoyalType(piece.type)) return 0;
    return PIECE_VALUES[piece.type] || 0;
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

function countPotentialMoves(state, color) {
    if (!state?.board?.pieces) return 0;
    return state.board.pieces
        .filter((piece) => piece.color === color)
        .reduce((total, piece) => (
            total + piece.getPotentialMoves(state.board).filter((move) => state.board.isValidCoord(move.row, move.col)).length
        ), 0);
}

function scoreCenterPresence(state, color) {
    if (!state?.board?.pieces) return 0;

    return state.board.pieces
        .filter((piece) => piece.color === color && !GameRules.isRoyalType(piece.type))
        .reduce((total, piece) => {
            const valueScale = clamp(getPieceValue(piece) / 90, 0.35, 1.35);
            return total + Math.max(0, 5 - getCenterDistance(piece.row, piece.col)) * valueScale;
        }, 0);
}

function countFriendlySupport(state, row, col, color, ignoredPiece = null) {
    if (!state?.board?.pieces) return 0;

    return state.board.pieces
        .filter((piece) => piece.color === color && piece !== ignoredPiece)
        .reduce((total, piece) => {
            const supports = piece
                .getPotentialMoves(state.board)
                .some((move) => move.row === row && move.col === col);
            return total + (supports ? 1 : 0);
        }, 0);
}

function applyMiddleGameMove(state, moveObj) {
    const piece = moveObj?.piece;
    const move = moveObj?.move;
    if (!state?.board || !piece || !move || move.specialMove) return null;

    const origRow = piece.row;
    const origCol = piece.col;
    const moveData = state.board.movePiece(origRow, origCol, move.row, move.col);
    if (!moveData) return null;

    const postMoveEffects = GameRules.applyPostMoveEffects(state, piece, move.row, move.col);

    return {
        origRow,
        origCol,
        moveData,
        postMoveEffects,
        activePiece: postMoveEffects?.activePiece || state.board.getPieceAt(move.row, move.col)
    };
}

function revertMiddleGameMove(state, moveObj, appliedMove) {
    if (!appliedMove || !moveObj?.move) return;

    if (appliedMove.postMoveEffects) {
        GameRules.revertPostMoveEffects?.(state, appliedMove.postMoveEffects);
    }
    state.board.undoMove(appliedMove.origRow, appliedMove.origCol, moveObj.move.row, moveObj.move.col, appliedMove.moveData);
}

function getLegalTargetsForPiece(state, piece) {
    if (!state?.board || !piece) return [];

    return withTemporaryTurn(state, piece.color, () => {
        const validator = new MoveValidator(state);
        return validator.getLegalMoves(piece.row, piece.col)
            .map((move) => {
                const target = state.board.getPieceAt(move.row, move.col);
                if (!target || target.color === piece.color) return null;
                return {
                    type: target.type,
                    row: target.row,
                    col: target.col,
                    value: getPieceValue(target),
                    isRoyal: GameRules.isRoyalType(target.type)
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.value - a.value);
    });
}

function buildPlan(id, label, reason) {
    return { id, label, reason };
}

function selectMiddleGamePlan(components) {
    if (components.ownHangingRisk > components.enemyHangingOpportunity + 24) {
        return buildPlan('stabilize', 'Taşları sağlamlaştır', 'Kendi değerli taşların rakip tehdit altında.');
    }

    if (components.enemyHangingOpportunity >= 45 || components.overloadOpportunity >= 35) {
        return buildPlan('attack-targets', 'Zayıf taşı hedefle', 'Rakibin savunmasız veya aşırı yüklenmiş taşları var.');
    }

    if (components.royalPressure >= 36) {
        return buildPlan('royal-net', 'Kraliyet alanını daralt', 'Rakip kraliyet taşının kaçış alanı zayıflıyor.');
    }

    if (components.centerBalance >= 0) {
        return buildPlan('centralize', 'Merkezi güçlendir', 'Merkez ve geçiş karelerinde oyun kurulabilir.');
    }

    return buildPlan('regroup', 'Taşları yeniden koordine et', 'Önce taş uyumu ve savunma ağı kurulmalı.');
}

export function analyzeMiddleGamePosition(state, perspectiveColor = COLORS.BLACK, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    if (!state?.board?.pieces?.length) {
        return {
            score: 0,
            plan: buildPlan('none', 'Orta oyun yok', 'Tahta okunamadı.'),
            components: {},
            motifs: [],
            phaseWeight: 0
        };
    }

    const enemyColor = getOppositeColor(perspectiveColor);
    const attackMap = buildAttackMap(state);
    const summary = summarizeAttackMapForColor(attackMap, perspectiveColor);
    const phaseWeight = getMiddleGamePhaseWeight(state);
    const difficultyScale = getDifficultyScale(profile);
    const ownMobility = countPotentialMoves(state, perspectiveColor);
    const enemyMobility = countPotentialMoves(state, enemyColor);
    const ownCenter = scoreCenterPresence(state, perspectiveColor);
    const enemyCenter = scoreCenterPresence(state, enemyColor);
    const ownRoyalPressure = (summary.royalSafety.own || [])
        .reduce((total, royal) => total + (royal.legalAttacked ? 36 : 0) + Math.max(0, 2 - royal.safeEscapeCount) * 10, 0);
    const enemyRoyalPressure = (summary.royalSafety.enemy || [])
        .reduce((total, royal) => total + (royal.legalAttacked ? 36 : 0) + Math.max(0, 2 - royal.safeEscapeCount) * 10, 0);

    const components = {
        enemyHangingOpportunity: summary.enemyHangingValue + summary.enemyContestedValue * 0.32,
        ownHangingRisk: summary.ownHangingValue + summary.ownContestedValue * 0.38,
        overloadOpportunity: summary.overloadedEnemyDefenderValue,
        overloadRisk: summary.overloadedOwnDefenderValue,
        royalPressure: enemyRoyalPressure - ownRoyalPressure,
        centerBalance: (ownCenter - enemyCenter) * 4.2,
        mobilityBalance: (ownMobility - enemyMobility) * 0.48
    };

    const rawScore = (
        components.enemyHangingOpportunity * 0.42
        + components.overloadOpportunity * 0.16
        + components.royalPressure * 0.72
        + components.centerBalance
        + components.mobilityBalance
        - components.ownHangingRisk * 0.62
        - components.overloadRisk * 0.2
    );
    const motifs = [];
    if (components.enemyHangingOpportunity >= 35) motifs.push('hanging-target');
    if (components.ownHangingRisk >= 35) motifs.push('own-hanging-risk');
    if (components.overloadOpportunity >= 40) motifs.push('overloaded-defender');
    if (components.royalPressure >= 36) motifs.push('royal-pressure');
    if (components.centerBalance >= 10) motifs.push('center-control');

    return {
        score: rawScore * phaseWeight * difficultyScale,
        plan: selectMiddleGamePlan(components),
        components,
        motifs,
        phaseWeight
    };
}

export function analyzeMiddleGameMove(state, moveObj, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const piece = moveObj?.piece;
    const move = moveObj?.move;
    if (!state?.board || !piece || !move || move.specialMove) {
        return {
            score: 0,
            motifs: [],
            targets: [],
            quietThreat: false,
            plan: buildPlan('none', 'Orta oyun yok', 'Hamle okunamadı.')
        };
    }

    const before = analyzeMiddleGamePosition(state, piece.color, profile);
    const captured = state.board.getPieceAt(move.row, move.col);
    const appliedMove = applyMiddleGameMove(state, moveObj);
    if (!appliedMove) {
        return {
            score: 0,
            motifs: [],
            targets: [],
            quietThreat: false,
            plan: buildPlan('none', 'Orta oyun yok', 'Hamle uygulanamadı.')
        };
    }

    try {
        const activePiece = appliedMove.activePiece || state.board.getPieceAt(move.row, move.col);
        const targets = getLegalTargetsForPiece(state, activePiece)
            .filter((target) => target.value > 0 || target.isRoyal)
            .slice(0, 4);
        const nonRoyalTargets = targets.filter((target) => !target.isRoyal && target.value > 0);
        const after = analyzeMiddleGamePosition(state, piece.color, profile);
        const supportAfter = countFriendlySupport(state, activePiece.row, activePiece.col, activePiece.color, activePiece);
        const motifs = [];
        const forkValue = nonRoyalTargets.length >= 2
            ? nonRoyalTargets.slice(0, 2).reduce((total, target) => total + target.value, 0)
            : 0;
        const royalPressure = targets.some((target) => target.isRoyal);
        const hangingGain = Math.max(0, after.components.enemyHangingOpportunity - before.components.enemyHangingOpportunity);
        const overloadGain = Math.max(0, after.components.overloadOpportunity - before.components.overloadOpportunity);
        const ownRiskGain = Math.max(0, after.components.ownHangingRisk - before.components.ownHangingRisk);
        const centerGain = Math.max(0, after.components.centerBalance - before.components.centerBalance);

        if (forkValue > 0) motifs.push('fork');
        if (royalPressure) motifs.push('royal-pressure');
        if (hangingGain >= 20) motifs.push('hanging-target');
        if (overloadGain >= 25) motifs.push('overloaded-defender');
        if (centerGain >= 8) motifs.push('center-improvement');

        const quietThreat = !captured && motifs.some((motif) => (
            motif === 'fork'
            || motif === 'royal-pressure'
            || motif === 'hanging-target'
            || motif === 'overloaded-defender'
        ));
        const rawScore = (
            forkValue * 0.56
            + (royalPressure ? 52 : 0)
            + hangingGain * 0.34
            + overloadGain * 0.18
            + centerGain * 0.42
            + Math.min(3, supportAfter) * 4
            - ownRiskGain * 0.55
        );

        return {
            score: rawScore * getDifficultyScale(profile) * Math.max(0.55, after.phaseWeight),
            motifs,
            targets,
            quietThreat,
            supportAfter,
            plan: after.plan,
            before,
            after
        };
    } finally {
        revertMiddleGameMove(state, moveObj, appliedMove);
    }
}

export function scoreMiddleGameForBlack(state, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const black = analyzeMiddleGamePosition(state, COLORS.BLACK, profile);
    const white = analyzeMiddleGamePosition(state, COLORS.WHITE, profile);
    return (black.score - white.score) * 0.42 * (profile.weights?.center || 1);
}
