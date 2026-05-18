import { COLORS } from '../utils/constants.js';
import { buildPositionHash } from '../ai/AiStrategy.js';
import { getAIPersona } from '../ai/AIPersonas.js';
import { getAIBot, isAIBotId } from '../ai/AIBots.js';

function toIsoString(value, fallback = new Date()) {
    if (!value) return fallback.toISOString();
    if (value instanceof Date) return value.toISOString();

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function normalizeWinner(winner) {
    if (winner === COLORS.WHITE || winner === COLORS.BLACK) return winner;
    if (winner === 'Draw (Hisar)' || winner === 'draw') return 'draw';
    return null;
}

function normalizeResultType(gameState) {
    if (gameState?.resultType === 'timeout_win') return 'timeout_win';
    const lastMove = gameState?.moveHistory?.at?.(-1) || null;
    if (lastMove?.resultType === 'stalemate') return 'stalemate_win';
    if (lastMove?.resultType) return lastMove.resultType;
    if (gameState?.winner === 'Draw (Hisar)') return 'citadel_draw';
    if (gameState?.checkmate) return 'checkmate';
    if (gameState?.stalemate) return 'stalemate_win';
    return 'unknown';
}

function countSpecialEvents(moveHistory = []) {
    return moveHistory.reduce((total, move) => total + (move?.specialTags?.length || 0), 0);
}

function buildFlags(moveHistory = []) {
    const allTags = moveHistory.flatMap((move) => move?.specialTags || []);
    return {
        hasRoyalSwap: allTags.includes('royal_swap'),
        hasCitadelExchange: allTags.includes('citadel_exchange'),
        hasPawnCycle: allTags.includes('pawn_cycle'),
        hasPromotion: allTags.includes('promotion')
    };
}

function buildAnalysisSummary(report) {
    const summary = report?.summary;
    if (!summary) return null;

    return {
        whiteAccuracy: summary.whiteAccuracy ?? null,
        blackAccuracy: summary.blackAccuracy ?? null,
        biggestSwingIndex: summary.biggestSwingIndex ?? null,
        biggestSwingDelta: summary.biggestSwingDelta ?? null,
        resultType: summary.resultType ?? null,
        winner: summary.winner ?? null,
        analysisProfile: summary.analysisProfile ?? null,
        outcomeAdjusted: Boolean(summary.outcomeAdjusted),
        rawAccuracy: summary.rawAccuracy || null
    };
}

function compactFairyDebug(debug) {
    if (!debug?.enabled) return null;

    return {
        mode: debug.mode || 'shadow',
        shadowOnly: debug.shadowOnly !== false,
        appliedToGame: Boolean(debug.appliedToGame),
        artifact: debug.artifact || null,
        variant: debug.variant || null,
        depth: Number.isFinite(debug.depth) ? debug.depth : null,
        fairyBestMove: debug.fairyBestMove || null,
        fairyAccepted: Boolean(debug.fairyAccepted),
        fairyRejectedReason: debug.fairyRejectedReason || null,
        fallbackUsed: Boolean(debug.fallbackUsed),
        fairyThinkMs: Number.isFinite(debug.fairyThinkMs) ? debug.fairyThinkMs : null,
        jsAiMove: debug.jsAiMove || null,
        fairySelectedMove: debug.fairySelectedMove || null,
        fairyMatchesJsMove: Boolean(debug.fairyMatchesJsMove),
        hybridEligible: Boolean(debug.hybridEligible),
        hybridApplied: Boolean(debug.hybridApplied),
        hybridRejectedReason: debug.hybridRejectedReason || null,
        timeout: Boolean(debug.timeout),
        errorCode: debug.errorCode || null
    };
}

function buildDebugSummary(moveHistory = []) {
    const fairyMoves = moveHistory
        .map((move) => compactFairyDebug(move?.fairyDebug))
        .filter(Boolean);

    if (!fairyMoves.length) return null;

    return {
        fairyShadow: {
            enabled: true,
            sampleCount: fairyMoves.length,
            acceptedCount: fairyMoves.filter((entry) => entry.fairyAccepted).length,
            rejectedCount: fairyMoves.filter((entry) => !entry.fairyAccepted).length,
            matchCount: fairyMoves.filter((entry) => entry.fairyMatchesJsMove).length,
            hybridAppliedCount: fairyMoves.filter((entry) => entry.hybridApplied).length,
            timeoutCount: fairyMoves.filter((entry) => entry.timeout).length,
            errorCount: fairyMoves.filter((entry) => entry.errorCode && !entry.timeout).length,
            artifact: fairyMoves.at(-1)?.artifact || null,
            variant: fairyMoves.at(-1)?.variant || null
        }
    };
}

function resolveAiBotMeta(gameState, sessionMeta) {
    const aiBotId = gameState?.aiBotId || sessionMeta?.aiBotId || null;
    if (!isAIBotId(aiBotId)) {
        return {
            id: null,
            level: null,
            stars: null
        };
    }

    const bot = getAIBot(aiBotId);
    return {
        id: bot.id,
        level: Number.isFinite(sessionMeta?.aiBotLevel) ? sessionMeta.aiBotLevel : bot.level,
        stars: Number.isFinite(sessionMeta?.aiBotStars) ? sessionMeta.aiBotStars : bot.stars,
        label: bot.labels?.tr || bot.id
    };
}

function buildMovePayload(move) {
    return {
        index: move.index,
        moveNumber: move.moveNumber,
        color: move.color,
        pieceTypeBefore: move.piece?.typeBefore || null,
        pieceTypeAfter: move.piece?.typeAfter || null,
        pawnType: move.piece?.pawnType || null,
        fromRow: move.from?.row,
        fromCol: move.from?.col,
        toRow: move.to?.row,
        toCol: move.to?.col,
        fromLabel: move.from?.label || null,
        toLabel: move.to?.label || null,
        notation: move.notation,
        capturedPieceType: move.capturedPiece?.type || null,
        specialMoveType: move.specialMoveType || null,
        specialTags: move.specialTags || [],
        isCheck: Boolean(move.isCheck),
        resultType: move.resultType === 'stalemate' ? 'stalemate_win' : (move.resultType || null),
        beforeHash: move.snapshots?.before ? buildPositionHash(move.snapshots.before) : null,
        afterHash: move.snapshots?.after ? buildPositionHash(move.snapshots.after) : null,
        fairyDebug: compactFairyDebug(move.fairyDebug)
    };
}

export function createGameRecordId() {
    return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildGameRecord({
    gameState,
    sessionMeta,
    locale = 'tr',
    installToken = 'anon_unknown',
    authUid = null,
    appInfo = {}
}) {
    if (!gameState || !sessionMeta?.gameId) return null;

    const moveHistory = gameState.moveHistory || [];
    const createdAt = toIsoString(sessionMeta.createdAt || Date.now());
    const finishedAt = toIsoString(Date.now());
    const aiPersonaId = gameState.aiPersonaId || sessionMeta.aiPersonaId || null;
    const aiPersona = aiPersonaId ? getAIPersona(aiPersonaId) : null;
    const aiBot = resolveAiBotMeta(gameState, sessionMeta);
    const durationSeconds = Math.max(
        1,
        Math.round((new Date(finishedAt).getTime() - new Date(createdAt).getTime()) / 1000)
    );

    return {
        schemaVersion: 1,
        gameId: sessionMeta.gameId,
        createdAt,
        finishedAt,
        app: {
            platform: appInfo.platform || 'web',
            version: appInfo.version || 'unknown',
            buildNumber: appInfo.buildNumber || 'unknown',
            locale
        },
        player: {
            installToken,
            authUid,
            recordedBy: sessionMeta.recordedBy || 'local_player'
        },
        game: {
            mode: sessionMeta.mode || 'ai',
            difficulty: gameState.difficulty || sessionMeta.difficulty || 'medium',
            aiPersonaId: aiPersona?.id || null,
            aiPersonaStyle: aiPersona?.style || null,
            aiBotId: aiBot.id,
            aiBotLevel: aiBot.level,
            aiBotStars: aiBot.stars,
            aiBot: aiBot.id ? {
                id: aiBot.id,
                level: aiBot.level,
                stars: aiBot.stars,
                label: aiBot.label
            } : null,
            formation: sessionMeta.formation || null,
            isOnline: Boolean(sessionMeta.isOnline),
            isScripted: Boolean(gameState.isScripted || sessionMeta.isScripted),
            isPuzzle: Boolean(gameState.isPuzzle || sessionMeta.isPuzzle),
            localColor: sessionMeta.localColor || COLORS.WHITE,
            aiColor: sessionMeta.aiColor || gameState.aiColor || null,
            timeControl: gameState.timeControl || sessionMeta.timeControl || 'none',
            whiteTimeLeftMs: gameState.clock?.whiteMs ?? null,
            blackTimeLeftMs: gameState.clock?.blackMs ?? null,
            winner: normalizeWinner(gameState.winner),
            resultType: normalizeResultType(gameState),
            moveCount: moveHistory.length,
            durationSeconds,
            specialEventCount: countSpecialEvents(moveHistory)
        },
        flags: buildFlags(moveHistory),
        debug: buildDebugSummary(moveHistory),
        analysisSummary: buildAnalysisSummary(gameState.analysisReport),
        moves: moveHistory.map(buildMovePayload)
    };
}
