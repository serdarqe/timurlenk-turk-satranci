import { MoveValidator } from '../game/MoveValidator.js';
import { GameRules } from '../game/GameRules.js';
import { COLORS } from '../utils/constants.js';
import { i18n } from '../utils/i18n.js';
import { buildMoveRecord, serializeGameStateSnapshot, serializePiece } from '../analysis/AnalysisSerialization.js';
import { buildPieceMovedEventDetail } from '../utils/MoveEventDetail.js';
import { getRecentMoves, getRecentPositionHashes } from './AiStrategy.js';
import { buildAITimeContext } from './AITimeContext.js';
import {
    finalizeFairyDecisionProbe,
    isFairyForkEnabled,
    resolveFairySearchDepth,
    startFairyShadowProbe
} from '../fairy/FairyDebugEngine.js';

function getRecentPositionSnapshots(moveHistory = [], limit = 12) {
    return moveHistory
        .slice(-limit)
        .map((entry) => entry?.snapshots?.after || null)
        .filter(Boolean);
}

function getOpeningHistory(moveHistory = [], limit = 18) {
    return moveHistory
        .slice(0, limit)
        .map((entry) => ({
            index: entry?.index ?? null,
            color: entry?.color || null,
            fromRow: entry?.from?.row,
            fromCol: entry?.from?.col,
            toRow: entry?.to?.row,
            toCol: entry?.to?.col
        }))
        .filter((entry) => (
            entry.color
            && typeof entry.fromRow === 'number'
            && typeof entry.fromCol === 'number'
            && typeof entry.toRow === 'number'
            && typeof entry.toCol === 'number'
        ));
}

export function serializeStateForWorker(gameState) {
    return {
        difficulty: gameState.difficulty,
        formation: gameState.formation || null,
        aiPersonaId: gameState.aiPersonaId || null,
        aiBotId: gameState.aiBotId || null,
        aiColor: gameState.aiColor || COLORS.BLACK,
        playerColor: gameState.playerColor || COLORS.WHITE,
        currentTurn: gameState.currentTurn,
        timeControl: gameState.timeControl || gameState.clock?.timeControl || 'none',
        timeContext: buildAITimeContext(gameState),
        ransomMoveUsed: {
            white: Boolean(gameState.ransomMoveUsed?.white),
            black: Boolean(gameState.ransomMoveUsed?.black)
        },
        citadelExchangeUsed: {
            white: Boolean(gameState.citadelExchangeUsed?.white),
            black: Boolean(gameState.citadelExchangeUsed?.black)
        },
        board: {
            pieces: gameState.board.pieces.map(piece => ({
                type: piece.type,
                color: piece.color,
                row: piece.row,
                col: piece.col,
                pawnType: piece.pawnType || null,
                hasMoved: Boolean(piece.hasMoved),
                stage: piece.stage ?? null
            }))
        },
        recentPositionHashes: getRecentPositionHashes(gameState.moveHistory),
        recentPositionSnapshots: getRecentPositionSnapshots(gameState.moveHistory),
        openingHistory: getOpeningHistory(gameState.moveHistory),
        recentMoves: getRecentMoves(gameState.moveHistory)
    };
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

export class AIEngine {
    static aiWorker = null;
    static pendingRequestId = 0;
    static activeSessionToken = 0;
    static analytics = null;

    static setAnalytics(analytics) {
        AIEngine.analytics = analytics;
    }

    static resetAiStatus() {
        const aiStatus = document.getElementById('ai-status');
        if (aiStatus) aiStatus.innerText = i18n.t('common.waiting') || 'Bekliyor';
    }

    static initWorker() {
        if (!AIEngine.aiWorker) {
            AIEngine.aiWorker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
            AIEngine.aiWorker.onerror = (error) => {
                console.error('AI worker crashed:', error);
                AIEngine.analytics?.track('worker_error', {
                    worker_type: 'ai_worker',
                    stage: 'onerror',
                    error_code: 'worker_crash'
                });
                AIEngine.resetAiStatus();
                AIEngine.aiWorker?.terminate();
                AIEngine.aiWorker = null;
            };
        }
    }

    static cancelPending() {
        AIEngine.pendingRequestId++;
        AIEngine.activeSessionToken++;

        if (AIEngine.aiWorker) {
            AIEngine.aiWorker.terminate();
            AIEngine.aiWorker = null;
        }
    }

    static makeMove(gameState, boardRenderer) {
        const aiColor = gameState?.aiColor || COLORS.BLACK;
        if (!gameState || !boardRenderer || gameState.currentTurn !== aiColor || gameState.isGameOver?.()) return;

        console.log(`AI thinking (${gameState.difficulty})...`);

        AIEngine.initWorker();

        const requestId = ++AIEngine.pendingRequestId;
        const sessionToken = AIEngine.activeSessionToken;
        const plainState = serializeStateForWorker(gameState);
        const fairyPrimary = isFairyForkEnabled();
        const fairyShadowProbe = startFairyShadowProbe(gameState, {
            fairyPrimary,
            depth: resolveFairySearchDepth(gameState, { fairyPrimary })
        });

        AIEngine.aiWorker.onmessage = async (e) => {
            const data = e.data;
            if (data.requestId !== requestId) return;
            if (sessionToken !== AIEngine.activeSessionToken) return;
            if (gameState.currentTurn !== aiColor || gameState.isGameOver?.()) return;

            if (data.noMoves) {
                console.log('AI has no valid moves.');

                const validator = new MoveValidator(gameState);
                if (validator.isCheckmate(aiColor)) {
                    gameState.checkmate = true;
                    gameState.status = 'game_over';
                    gameState.winner = getOppositeColor(aiColor);
                } else if (validator.isStalemate(aiColor)) {
                    gameState.stalemate = true;
                    gameState.status = 'game_over';
                    gameState.winner = getOppositeColor(aiColor);
                }

                boardRenderer.render();
                document.dispatchEvent(new CustomEvent('pieceMoved', {
                    detail: buildPieceMovedEventDetail({
                        gameState,
                        movedColor: aiColor,
                        moveRecord: null,
                        noMove: true
                    })
                }));
                return;
            }

            const jsAiMove = {
                fromRow: data.fromRow,
                fromCol: data.fromCol,
                toRow: data.toRow,
                toCol: data.toCol,
                specialMove: data.specialMove || null
            };
            const fairyDecision = await finalizeFairyDecisionProbe(gameState, jsAiMove, fairyShadowProbe, {
                allowHybrid: true,
                fairyPrimary
            });
            if (sessionToken !== AIEngine.activeSessionToken) return;
            if (gameState.currentTurn !== aiColor || gameState.isGameOver?.()) return;

            const selectedAiMove = fairyDecision?.appliedMove || jsAiMove;
            const fairyDebug = fairyDecision?.metadata || null;
            const { fromRow, fromCol, toRow, toCol, specialMove } = selectedAiMove;
            const isRoyalSwap = specialMove === 'royal_swap';
            const isCitadelExchange = specialMove === 'citadel_exchange';
            const capturedPiece = (isRoyalSwap || isCitadelExchange) ? null : gameState.board.getPieceAt(toRow, toCol);
            const preSnapshot = serializeGameStateSnapshot(gameState);
            const movedPieceBefore = serializePiece(gameState.board.getPieceAt(fromRow, fromCol));

            if (!movedPieceBefore) {
                boardRenderer.isAnimating = false;
                return;
            }

            boardRenderer.isAnimating = true;
            boardRenderer._animateMove(fromRow, fromCol, toRow, toCol, !!capturedPiece, () => {
                if (sessionToken !== AIEngine.activeSessionToken || gameState.isGameOver?.()) {
                    boardRenderer.isAnimating = false;
                    return;
                }

                const movingPiece = gameState.board.getPieceAt(fromRow, fromCol);
                const targetPiece = gameState.board.getPieceAt(toRow, toCol);
                let captured = null;

                if (isRoyalSwap) {
                    GameRules.applyRoyalSwap(gameState, movingPiece, targetPiece);
                } else if (isCitadelExchange) {
                    GameRules.applyCitadelExchange(gameState, movingPiece, targetPiece);
                } else {
                    const moveData = gameState.board.movePiece(fromRow, fromCol, toRow, toCol);
                    captured = moveData ? moveData.capturedPiece : null;
                }

                if (captured) gameState.addCapture(captured);

                const movedPiece = gameState.board.getPieceAt(toRow, toCol);
                const postMoveEffects = (isRoyalSwap || isCitadelExchange)
                    ? { activePiece: movedPiece }
                    : GameRules.postMoveChecks(gameState, movedPiece, toRow, toCol);

                gameState.switchTurn();

                boardRenderer.selectedCell = null;
                boardRenderer.validMoves = [];
                boardRenderer.lastMove = { fromRow, fromCol, toRow, toCol };
                boardRenderer.render();
                boardRenderer.isAnimating = false;

                AIEngine.resetAiStatus();

                const validator = new MoveValidator(gameState);
                const nextTurn = gameState.currentTurn;
                let isCheck = false;
                let resultType = null;

                const royalElimination = GameRules.resolveRoyalElimination(gameState, nextTurn);

                if (royalElimination) {
                    resultType = royalElimination;
                } else if (validator.isCheckmate(nextTurn)) {
                    gameState.checkmate = true;
                    gameState.status = 'game_over';
                    gameState.winner = nextTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                    resultType = 'checkmate';
                } else if (validator.isStalemate(nextTurn)) {
                    gameState.stalemate = true;
                    gameState.status = 'game_over';
                    gameState.winner = nextTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                    resultType = 'stalemate';
                } else if (validator.isCheck(nextTurn)) {
                    isCheck = true;
                }

                if (gameState.winner === 'Draw (Hisar)') {
                    resultType = 'citadel_draw';
                }

                const movedPieceAfter =
                    serializePiece(postMoveEffects?.activePiece)
                    || gameState.board.getPieceAt(toRow, toCol)
                    || gameState.board.pieces.find(piece =>
                        piece.color === movedPieceBefore.color
                        && piece.pawnType === movedPieceBefore.pawnType
                        && piece.type === movedPieceBefore.type
                    )
                    || gameState.board.pieces.find(piece =>
                        piece.color === movedPieceBefore.color
                        && piece.row === toRow
                        && piece.col === toCol
                    )
                    || null;

                const postSnapshot = serializeGameStateSnapshot(gameState);
                const moveRecord = buildMoveRecord({
                    gameState,
                    fromRow,
                    fromCol,
                    toRow,
                    toCol,
                    movedPieceBefore,
                    movedPieceAfter: serializePiece(movedPieceAfter),
                    capturedPiece: serializePiece(captured),
                    preSnapshot,
                    postSnapshot,
                    isCheck,
                    resultType,
                    specialMoveType: isRoyalSwap ? 'royal_swap' : (isCitadelExchange ? 'citadel_exchange' : null),
                    fairyDebug
                });
                gameState.moveHistory.push(moveRecord);

                const moveEvent = new CustomEvent('pieceMoved', {
                    detail: buildPieceMovedEventDetail({
                        gameState,
                        fromRow,
                        fromCol,
                        toRow,
                        toCol,
                        movedColor: aiColor,
                        moveRecord,
                        resultType
                    })
                });
                document.dispatchEvent(moveEvent);
            });
        };

        AIEngine.aiWorker.postMessage({ requestId, state: plainState });
    }
}
