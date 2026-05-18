import { Board } from '../game/Board.js';
import { GameRules } from '../game/GameRules.js';
import { GameState } from '../game/GameState.js';
import { MoveValidator } from '../game/MoveValidator.js';
import { COLORS, PIECE_TYPES, PIECE_VALUES } from '../utils/constants.js';
import { evaluateStateForBlack } from '../ai/AiEvaluation.js';
import { getAIProfile } from '../ai/AIProfiles.js';
import {
    King, Prince, AdventitiousKing, Vizier, SeaMonster, General,
    Knight, Lion, Elephant, Camel, Dabbaba, Bull, Revealer, Giraffe,
    Picket, Rook, TimurPawn
} from '../game/PieceFactory.js';
import {
    calculateAccuracy,
    classifyMoveQuality,
    getMovePhase,
    getTopEntries,
    normalizeAnalysisAccuracyForOutcome,
    normalizeScoreForColor
} from './AnalysisMath.js';
import {
    SIGNATURE_TYPES,
    buildRecommendationKeys,
    getMinRoyalCitadelDistance,
    isRoyalType
} from './TimurInsights.js';

function revivePiece(pieceData) {
    let piece = null;

    switch (pieceData.type) {
        case PIECE_TYPES.KING: piece = new King(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.PRINCE: piece = new Prince(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.ADVENTITIOUS_KING: piece = new AdventitiousKing(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.VIZIER: piece = new Vizier(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.SEA_MONSTER: piece = new SeaMonster(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.GENERAL: piece = new General(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.KNIGHT: piece = new Knight(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.LION: piece = new Lion(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.ELEPHANT: piece = new Elephant(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.CAMEL: piece = new Camel(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.DABBABA: piece = new Dabbaba(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.BULL: piece = new Bull(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.REVEALER: piece = new Revealer(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.GIRAFFE: piece = new Giraffe(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.PICKET: piece = new Picket(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.ROOK: piece = new Rook(pieceData.color, pieceData.row, pieceData.col); break;
        case PIECE_TYPES.PAWN: piece = new TimurPawn(pieceData.color, pieceData.row, pieceData.col, pieceData.pawnType); break;
        default: piece = null;
    }

    if (!piece) return null;

    piece.hasMoved = Boolean(pieceData.hasMoved);
    piece.isPromoted = Boolean(pieceData.isPromoted);
    if (pieceData.stage != null) piece.stage = pieceData.stage;

    return piece;
}

function reviveState(snapshot) {
    const state = new GameState(snapshot?.difficulty || 'medium');
    const board = new Board();

    state.formation = snapshot?.formation || null;
    state.aiPersonaId = snapshot?.aiPersonaId || null;
    state.aiBotId = snapshot?.aiBotId || null;
    state.aiColor = snapshot?.aiColor || COLORS.BLACK;
    state.playerColor = snapshot?.playerColor || COLORS.WHITE;
    state.timeControl = snapshot?.timeControl || 'none';
    state.currentTurn = snapshot?.currentTurn || COLORS.WHITE;
    state.status = snapshot?.status || null;
    state.winner = snapshot?.winner || null;
    state.resultType = snapshot?.resultType || null;
    state.checkmate = Boolean(snapshot?.checkmate);
    state.stalemate = Boolean(snapshot?.stalemate);
    state.ransomMoveUsed = {
        [COLORS.WHITE]: Boolean(snapshot?.ransomMoveUsed?.white),
        [COLORS.BLACK]: Boolean(snapshot?.ransomMoveUsed?.black)
    };
    state.citadelExchangeUsed = {
        [COLORS.WHITE]: Boolean(snapshot?.citadelExchangeUsed?.white),
        [COLORS.BLACK]: Boolean(snapshot?.citadelExchangeUsed?.black)
    };

    (snapshot?.board?.pieces || []).forEach((pieceData) => {
        const piece = revivePiece(pieceData);
        if (!piece) return;
        board.setPiece(piece.row, piece.col, piece);
    });

    state.board = board;
    return state;
}

const ANALYSIS_DIFFICULTY = 'hard';

function resolveAnalysisProfile(state) {
    return getAIProfile(
        ANALYSIS_DIFFICULTY,
        state?.aiPersonaId || null,
        null
    );
}

function getTerminalScoreForBlack(state) {
    if (!state?.winner) return null;
    if (state.winner === COLORS.BLACK) return 120000;
    if (state.winner === COLORS.WHITE) return -120000;
    if (state.winner === 'Draw (Hisar)' || state.winner === 'draw' || state.isDraw) return 0;
    return null;
}

function evaluate(state) {
    const terminalScore = getTerminalScoreForBlack(state);
    if (terminalScore != null) return terminalScore;
    return evaluateStateForBlack(state, resolveAnalysisProfile(state));
}

function getWinnerColor(state) {
    if (state.winner === COLORS.WHITE || state.winner === COLORS.BLACK) return state.winner;
    return null;
}

function getTerminalBonus(state, perspectiveColor, tags = []) {
    const winnerColor = getWinnerColor(state);
    let bonus = 0;

    if ((state.checkmate || tags.includes('checkmate')) && winnerColor === perspectiveColor) {
        bonus += 6000;
    }

    if ((state.stalemate || tags.includes('stalemate')) && winnerColor === perspectiveColor) {
        bonus += 5500;
    }

    if (tags.includes('promotion')) bonus += 90;
    if (tags.includes('pawn_cycle')) bonus += 70;
    if (tags.includes('citadel_draw')) bonus += 140;
    if (tags.includes('royal_capture')) bonus += 6200;
    if (tags.includes('check')) bonus += 24;

    return bonus;
}

function evaluateCandidate(snapshot, candidate) {
    const state = reviveState(snapshot);
    const movingPiece = state.board.getPieceAt(candidate.fromRow, candidate.fromCol);
    if (!movingPiece) return null;

    if (candidate.specialMove === 'royal_swap') {
        const targetPiece = state.board.getPieceAt(candidate.toRow, candidate.toCol);
        GameRules.applyRoyalSwap(state, movingPiece, targetPiece);
    } else if (candidate.specialMove === 'citadel_exchange') {
        const targetPiece = state.board.getPieceAt(candidate.toRow, candidate.toCol);
        GameRules.applyCitadelExchange(state, movingPiece, targetPiece);
    } else {
        state.board.movePiece(candidate.fromRow, candidate.fromCol, candidate.toRow, candidate.toCol);
        const movedAfterBoardMove = state.board.getPieceAt(candidate.toRow, candidate.toCol);
        GameRules.postMoveChecks(state, movedAfterBoardMove, candidate.toRow, candidate.toCol);
    }

    state.switchTurn();

    const validator = new MoveValidator(state);
    const tags = [];

    if (candidate.specialMove) {
        tags.push(candidate.specialMove);
    }

    const royalElimination = GameRules.resolveRoyalElimination(state, state.currentTurn);

    if (royalElimination) {
        tags.push(royalElimination);
    } else if (validator.isCheckmate(state.currentTurn)) {
        state.checkmate = true;
        state.status = 'game_over';
        state.winner = state.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        tags.push('checkmate');
    } else if (validator.isStalemate(state.currentTurn)) {
        state.stalemate = true;
        state.status = 'game_over';
        state.winner = state.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        tags.push('stalemate');
    } else if (validator.isCheck(state.currentTurn)) {
        tags.push('check');
    }

    if (state.winner === 'Draw (Hisar)') {
        tags.push('citadel_draw');
    }

    const rawScore = evaluate(state);
    const score = normalizeScoreForColor(rawScore, movingPiece.color) + getTerminalBonus(state, movingPiece.color, tags);

    return {
        move: candidate,
        score,
        tags
    };
}

function findBestMove(snapshot) {
    const state = reviveState(snapshot);
    const validator = new MoveValidator(state);
    const pieces = state.board.pieces.filter((piece) => piece.color === state.currentTurn);

    let best = null;

    pieces.forEach((piece) => {
        const moves = validator.getLegalMoves(piece.row, piece.col);
        moves.forEach((move) => {
            const candidate = evaluateCandidate(snapshot, {
                pieceType: piece.type,
                pawnType: piece.pawnType || null,
                color: piece.color,
                fromRow: piece.row,
                fromCol: piece.col,
                toRow: move.row,
                toCol: move.col,
                specialMove: move.specialMove || null
            });

            if (!candidate) return;
            if (!best || candidate.score > best.score) {
                best = candidate;
            }
        });
    });

    return best;
}

function analyzeMove(moveRecord, totalMoves) {
    const preState = reviveState(moveRecord.snapshots.before);
    const postState = reviveState(moveRecord.snapshots.after);

    const preScore = normalizeScoreForColor(evaluate(preState), moveRecord.color);
    const postScore = normalizeScoreForColor(evaluate(postState), moveRecord.color)
        + getTerminalBonus(postState, moveRecord.color, moveRecord.specialTags);

    const bestCandidate = findBestMove(moveRecord.snapshots.before);
    const bestScore = bestCandidate?.score ?? postScore;
    const loss = Math.max(0, Number((bestScore - postScore).toFixed(1)));
    const delta = Number((postScore - preScore).toFixed(1));
    const quality = classifyMoveQuality(loss, delta, moveRecord.specialTags);

    return {
        index: moveRecord.index,
        moveNumber: moveRecord.moveNumber,
        color: moveRecord.color,
        notation: moveRecord.notation,
        piece: moveRecord.piece,
        from: moveRecord.from,
        to: moveRecord.to,
        specialTags: moveRecord.specialTags,
        capturedPiece: moveRecord.capturedPiece,
        quality,
        phase: getMovePhase(moveRecord.index, totalMoves),
        loss,
        delta,
        preScore: Number(preScore.toFixed(1)),
        postScore: Number(postScore.toFixed(1)),
        bestMove: bestCandidate ? {
            pieceType: bestCandidate.move.pieceType,
            pawnType: bestCandidate.move.pawnType,
            fromRow: bestCandidate.move.fromRow,
            fromCol: bestCandidate.move.fromCol,
            toRow: bestCandidate.move.toRow,
            toCol: bestCandidate.move.toCol,
            score: Number(bestCandidate.score.toFixed(1)),
            tags: bestCandidate.tags || []
        } : null
    };
}

function summarizeSpecialTags(analyses) {
    const counts = {};
    analyses.forEach((entry) => {
        (entry.specialTags || []).forEach((tag) => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });
    return counts;
}

function buildPhaseSummary(analyses, color) {
    return ['opening', 'middlegame', 'endgame'].map((phase) => {
        const losses = analyses
            .filter((entry) => entry.phase === phase && entry.color === color)
            .map((entry) => entry.loss);

        return {
            phase,
            color,
            accuracy: losses.length ? calculateAccuracy(losses) : null
        };
    });
}

function deriveResultType(meta, analyses) {
    const lastMove = analyses[analyses.length - 1];

    if (meta?.resultType === 'timeout_win') return 'timeout_win';
    if (meta?.stalemate || lastMove?.specialTags?.includes('stalemate')) return 'stalemate';
    if (meta?.checkmate || lastMove?.specialTags?.includes('checkmate')) return 'checkmate';
    if ((meta?.winner || '').includes('Hisar') || lastMove?.specialTags?.includes('citadel_draw')) return 'citadel_draw';
    if (lastMove?.specialTags?.includes('royal_capture')) return 'royal_capture';
    if (meta?.winner && !(meta.winner === COLORS.WHITE || meta.winner === COLORS.BLACK)) return 'draw';
    if (!meta?.winner && !meta?.status) return 'ongoing';
    return meta?.winner ? 'win' : 'draw';
}

function getRoyalCount(pieces, color) {
    return pieces.filter((piece) => piece.color === color && isRoyalType(piece.type)).length;
}

function getPawnAdvanceScore(pieces, color) {
    return pieces
        .filter((piece) => piece.color === color && piece.type === PIECE_TYPES.PAWN)
        .reduce((sum, piece) => {
            const advance = color === COLORS.WHITE
                ? Math.max(0, 7 - piece.row)
                : Math.max(0, piece.row - 2);

            return sum + advance + ((piece.stage || 0) * 4);
        }, 0);
}

function buildPieceEfficiency(pieceStats) {
    return Object.values(pieceStats)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

function buildSideInsight(color, analyses, moveHistory) {
    let royalPeak = 0;
    let minCitadelDistance = null;
    let closestCitadelMoment = null;
    let pawnAdvanceScore = 0;
    let pawnCycleCount = 0;
    let promotionCount = 0;
    let signatureActivity = 0;
    let captureValue = 0;
    let missedStalemateWins = 0;

    const pieceStats = {};

    analyses.forEach((entry, index) => {
        if (entry.color !== color) return;

        const moveRecord = moveHistory[index];
        const postPieces = moveRecord?.snapshots?.after?.board?.pieces || [];
        const pieceType = entry.piece.typeAfter || entry.piece.typeBefore;
        const capturedValue = entry.capturedPiece ? (PIECE_VALUES[entry.capturedPiece.type] || 0) : 0;

        royalPeak = Math.max(royalPeak, getRoyalCount(postPieces, color));
        pawnAdvanceScore = Math.max(pawnAdvanceScore, getPawnAdvanceScore(postPieces, color));

        const citadelDistance = getMinRoyalCitadelDistance(postPieces, color);
        if (citadelDistance != null && (minCitadelDistance == null || citadelDistance < minCitadelDistance)) {
            minCitadelDistance = citadelDistance;
            closestCitadelMoment = entry.index;
        }

        if (entry.specialTags.includes('pawn_cycle')) pawnCycleCount++;
        if (entry.specialTags.includes('promotion')) promotionCount++;
        if (SIGNATURE_TYPES.includes(pieceType)) signatureActivity++;
        if (entry.bestMove?.tags?.includes('stalemate') && !entry.specialTags.includes('stalemate')) {
            missedStalemateWins++;
        }

        captureValue += capturedValue;

        if (!pieceStats[pieceType]) {
            pieceStats[pieceType] = {
                type: pieceType,
                moves: 0,
                captureValue: 0,
                positiveSwing: 0,
                score: 0
            };
        }

        const stat = pieceStats[pieceType];
        stat.moves += 1;
        stat.captureValue += capturedValue;
        stat.positiveSwing += Math.max(0, entry.delta);
        stat.score += capturedValue + Math.max(0, entry.delta) + (
            entry.specialTags.includes('checkmate') ? 140 :
            entry.specialTags.includes('stalemate') ? 120 :
            entry.specialTags.includes('promotion') ? 45 :
            entry.specialTags.includes('pawn_cycle') ? 30 :
            entry.specialTags.includes('check') ? 12 : 0
        );
    });

    const pieceEfficiency = buildPieceEfficiency(pieceStats);

    return {
        color,
        royalPeak,
        minCitadelDistance,
        closestCitadelMoment,
        pawnAdvanceScore,
        pawnCycleCount,
        promotionCount,
        signatureActivity,
        captureValue,
        missedStalemateWins,
        pieceEfficiency,
        topPiece: pieceEfficiency[0] || null,
        recommendations: buildRecommendationKeys({
            royalPeak,
            minCitadelDistance,
            pawnAdvanceScore,
            pawnCycleCount,
            signatureActivity,
            missedStalemateWins
        })
    };
}

function buildStory(summary, whiteInsight, blackInsight) {
    if (summary.resultType === 'stalemate') {
        return { key: 'analysis.story.stalemate' };
    }

    if ((summary.specialCounts?.pawn_cycle || 0) > 0) {
        return { key: 'analysis.story.pawn_cycle' };
    }

    if ((whiteInsight.minCitadelDistance != null && whiteInsight.minCitadelDistance <= 3)
        || (blackInsight.minCitadelDistance != null && blackInsight.minCitadelDistance <= 3)) {
        return { key: 'analysis.story.citadel' };
    }

    if (Math.abs(summary.biggestSwingDelta || 0) >= 120) {
        return { key: 'analysis.story.swing' };
    }

    return { key: 'analysis.story.balance' };
}

export function buildReport(moveHistory = [], meta = {}) {
    const analyses = moveHistory.map((moveRecord) => analyzeMove(moveRecord, moveHistory.length));
    const whiteLosses = analyses.filter((entry) => entry.color === COLORS.WHITE).map((entry) => entry.loss);
    const blackLosses = analyses.filter((entry) => entry.color === COLORS.BLACK).map((entry) => entry.loss);

    const biggestSwing = getTopEntries(analyses, 1, (entry) => Math.abs(entry.delta))[0] || null;
    const criticalMoments = getTopEntries(
        analyses.filter((entry) => entry.loss > 0 || entry.specialTags.length > 0),
        5,
        (entry) => Math.max(entry.loss, Math.abs(entry.delta))
    );

    const whiteInsight = buildSideInsight(COLORS.WHITE, analyses, moveHistory);
    const blackInsight = buildSideInsight(COLORS.BLACK, analyses, moveHistory);
    const rawSummary = {
        moveCount: moveHistory.length,
        winner: meta?.winner || null,
        resultType: deriveResultType(meta, analyses),
        whiteAccuracy: calculateAccuracy(whiteLosses),
        blackAccuracy: calculateAccuracy(blackLosses),
        biggestSwingIndex: biggestSwing?.index || null,
        biggestSwingDelta: biggestSwing?.delta || 0,
        specialCounts: summarizeSpecialTags(analyses),
        analysisProfile: ANALYSIS_DIFFICULTY
    };
    const summary = normalizeAnalysisAccuracyForOutcome(rawSummary);

    return {
        summary: {
            ...summary,
            story: buildStory(summary, whiteInsight, blackInsight)
        },
        phases: {
            white: buildPhaseSummary(analyses, COLORS.WHITE),
            black: buildPhaseSummary(analyses, COLORS.BLACK)
        },
        timurInsights: {
            white: whiteInsight,
            black: blackInsight
        },
        criticalMoments,
        moves: analyses
    };
}

if (typeof self !== 'undefined') {
    self.addEventListener('message', (event) => {
        const { requestId, moveHistory, meta } = event.data;

        try {
            const report = buildReport(moveHistory, meta);
            self.postMessage({ requestId, report });
        } catch (error) {
            self.postMessage({
                requestId,
                error: error?.message || 'Analysis failed.'
            });
        }
    });
}
