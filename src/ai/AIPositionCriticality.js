import { MoveValidator } from '../game/MoveValidator.js';
import { GameRules } from '../game/GameRules.js';
import { COLORS, PIECE_VALUES } from '../utils/constants.js';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function withTurn(state, color, callback) {
    const originalTurn = state.currentTurn;
    state.currentTurn = color;
    try {
        return callback();
    } finally {
        state.currentTurn = originalTurn;
    }
}

function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getThreatValue(piece) {
    if (!piece || GameRules.isRoyalType(piece.type)) return 0;
    return PIECE_VALUES[piece.type] || 0;
}

function hasCriticalRoyal(state, color) {
    return state.board.pieces.some((piece) => piece.color === color && GameRules.isRoyalType(piece.type));
}

function getAttackCount(state, row, col, attackerColor) {
    return state.board.pieces
        .filter((piece) => piece.color === attackerColor)
        .reduce((total, piece) => {
            const attacks = piece.getPotentialMoves(state.board)
                .some((move) => move.row === row && move.col === col);
            return total + (attacks ? 1 : 0);
        }, 0);
}

function getHangingThreats(state, perspectiveColor) {
    const enemyColor = getOppositeColor(perspectiveColor);
    let ownHangingValue = 0;
    let enemyHangingValue = 0;

    for (const piece of state.board.pieces || []) {
        const value = getThreatValue(piece);
        if (!value) continue;

        const attackers = getAttackCount(
            state,
            piece.row,
            piece.col,
            piece.color === perspectiveColor ? enemyColor : perspectiveColor
        );
        if (!attackers) continue;

        const defenders = getAttackCount(state, piece.row, piece.col, piece.color);
        const hangingValue = defenders <= 1 ? value : value * 0.35;

        if (piece.color === perspectiveColor) {
            ownHangingValue += hangingValue;
        } else {
            enemyHangingValue += hangingValue;
        }
    }

    return { ownHangingValue, enemyHangingValue };
}

function collectLegalMoveSummary(state, color) {
    const validator = new MoveValidator(state);
    return withTurn(state, color, () => {
        let legalMoveCount = 0;
        let captureCount = 0;
        let bestCaptureValue = 0;
        let royalCaptureAvailable = false;

        for (const piece of state.board.pieces.filter((item) => item.color === color)) {
            const legalMoves = validator.getLegalMoves(piece.row, piece.col);
            legalMoveCount += legalMoves.length;

            for (const move of legalMoves) {
                const target = state.board.getPieceAt(move.row, move.col);
                if (!target || target.color === color) continue;

                captureCount += 1;
                const value = PIECE_VALUES[target.type] || 0;
                bestCaptureValue = Math.max(bestCaptureValue, value);
                if (GameRules.isRoyalType(target.type)) {
                    royalCaptureAvailable = true;
                }
            }
        }

        return {
            legalMoveCount,
            captureCount,
            bestCaptureValue,
            royalCaptureAvailable
        };
    });
}

function pushReason(reasons, reason, condition) {
    if (condition) reasons.push(reason);
}

function getLevel(score) {
    if (score >= 90) return 'decisive';
    if (score >= 58) return 'critical';
    if (score >= 28) return 'sharp';
    return 'quiet';
}

export function calculateAIPositionCriticality(state, profileInput = null) {
    if (!state?.board?.pieces?.length) {
        return Object.freeze({
            score: 0,
            level: 'quiet',
            reasons: [],
            pieceCount: 0
        });
    }

    const profileBaseId = getProfileBaseId(profileInput);
    const aiColor = state.aiColor || state.currentTurn || COLORS.BLACK;
    const opponentColor = getOppositeColor(aiColor);
    const validator = new MoveValidator(state);
    const pieceCount = state.board.pieces.length;
    const hasAiRoyal = hasCriticalRoyal(state, aiColor);
    const hasOpponentRoyal = hasCriticalRoyal(state, opponentColor);
    const hasBothRoyals = hasAiRoyal && hasOpponentRoyal;
    const aiInCheck = hasAiRoyal && withTurn(state, aiColor, () => validator.isCheck(aiColor));
    const opponentInCheck = hasOpponentRoyal && withTurn(state, opponentColor, () => validator.isCheck(opponentColor));
    const aiCheckmate = hasAiRoyal && withTurn(state, aiColor, () => validator.isCheckmate(aiColor));
    const opponentCheckmate = hasOpponentRoyal && withTurn(state, opponentColor, () => validator.isCheckmate(opponentColor));
    const aiStalemate = hasBothRoyals && withTurn(state, aiColor, () => validator.isStalemate(aiColor));
    const opponentStalemate = hasBothRoyals && withTurn(state, opponentColor, () => validator.isStalemate(opponentColor));
    const aiMoves = collectLegalMoveSummary(state, aiColor);
    const opponentMoves = collectLegalMoveSummary(state, opponentColor);
    const threats = getHangingThreats(state, aiColor);
    const reasons = [];
    let score = 0;

    if (aiCheckmate || opponentCheckmate) {
        score += 100;
    }
    if (aiStalemate || opponentStalemate) {
        score += 76;
    }

    score += aiInCheck ? 38 : 0;
    score += opponentInCheck ? 24 : 0;
    score += aiMoves.royalCaptureAvailable ? 42 : 0;
    score += opponentMoves.royalCaptureAvailable ? 42 : 0;
    score += Math.min(30, aiMoves.bestCaptureValue / 4);
    score += Math.min(24, opponentMoves.bestCaptureValue / 5);
    score += Math.min(28, threats.ownHangingValue / 5);
    score += Math.min(22, threats.enemyHangingValue / 6);

    if (pieceCount <= 8) score += 14;
    if (pieceCount <= 6) score += 8;
    if (aiMoves.legalMoveCount <= 3 || opponentMoves.legalMoveCount <= 3) score += 16;
    if (profileBaseId === 'hard' && score >= 24) score += 4;

    pushReason(reasons, 'ai-in-check', aiInCheck);
    pushReason(reasons, 'opponent-in-check', opponentInCheck);
    pushReason(reasons, 'ai-checkmate-risk', aiCheckmate);
    pushReason(reasons, 'opponent-checkmate-chance', opponentCheckmate);
    pushReason(reasons, 'stalemate-edge', aiStalemate || opponentStalemate);
    pushReason(reasons, 'royal-capture-available', aiMoves.royalCaptureAvailable || opponentMoves.royalCaptureAvailable);
    pushReason(reasons, 'valuable-capture', aiMoves.bestCaptureValue >= 60 || opponentMoves.bestCaptureValue >= 60);
    pushReason(reasons, 'own-hanging-material', threats.ownHangingValue >= 60);
    pushReason(reasons, 'enemy-hanging-material', threats.enemyHangingValue >= 60);
    pushReason(reasons, 'endgame', pieceCount <= 8);
    pushReason(reasons, 'low-mobility', aiMoves.legalMoveCount <= 3 || opponentMoves.legalMoveCount <= 3);

    const finalScore = Math.round(clamp(score, 0, 100));
    return Object.freeze({
        score: finalScore,
        level: getLevel(finalScore),
        reasons,
        aiColor,
        opponentColor,
        pieceCount,
        aiInCheck,
        opponentInCheck,
        aiLegalMoveCount: aiMoves.legalMoveCount,
        opponentLegalMoveCount: opponentMoves.legalMoveCount,
        aiBestCaptureValue: aiMoves.bestCaptureValue,
        opponentBestCaptureValue: opponentMoves.bestCaptureValue,
        ownHangingValue: Math.round(threats.ownHangingValue),
        enemyHangingValue: Math.round(threats.enemyHangingValue)
    });
}
