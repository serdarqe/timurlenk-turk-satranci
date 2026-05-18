import { getAIProfile } from '../ai/AIProfiles.js';
import { getAIPersona, getAIPersonaLabel } from '../ai/AIPersonas.js';
import { getAIBot, isAIBotId } from '../ai/AIBots.js';
import { COLORS, FORMATIONS } from '../utils/constants.js';

const HISTORY_KEY = 'timur_match_history_v1';
const MAX_HISTORY_RECORDS = 50;

function getStorage() {
    try {
        return globalThis.localStorage || null;
    } catch (error) {
        return null;
    }
}

function readHistory() {
    const storage = getStorage();
    if (!storage) {
        return [];
    }

    try {
        const parsed = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[MatchHistoryStore] History could not be read.', error);
        return [];
    }
}

function writeHistory(records) {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY_RECORDS)));
    } catch (error) {
        console.warn('[MatchHistoryStore] History could not be saved.', error);
    }
}

function getMoveNotation(move) {
    return move?.notation || move?.displayNotation || move?.san || null;
}

function normalizeMoveList(moveHistory) {
    if (!Array.isArray(moveHistory)) {
        return [];
    }

    return moveHistory
        .map((move, index) => ({
            index: Number.isFinite(move?.index) ? move.index : index + 1,
            moveNumber: Number.isFinite(move?.moveNumber) ? move.moveNumber : Math.floor(index / 2) + 1,
            color: move?.color || null,
            notation: getMoveNotation(move) || `#${index + 1}`,
            fairyDebug: move?.fairyDebug?.enabled ? clonePlain(move.fairyDebug) : null,
        }))
        .filter((move) => move.notation);
}

function clonePlain(value) {
    if (value == null) return null;

    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        return null;
    }
}

function compactAnalysisReport(report) {
    if (!report?.summary) return null;

    return {
        summary: clonePlain(report.summary),
        phases: clonePlain(report.phases || {}),
        timurInsights: clonePlain(report.timurInsights || {}),
        criticalMoments: clonePlain(report.criticalMoments || []),
        moves: clonePlain(report.moves || [])
    };
}

function getAnalysisSummary(report) {
    const summary = clonePlain(report?.summary || null);
    return summary && typeof summary === 'object' ? summary : null;
}

function getFairyDebugSummary(moveHistory = []) {
    const samples = (moveHistory || []).filter((move) => move?.fairyDebug?.enabled);
    if (!samples.length) return null;

    return {
        sampleCount: samples.length,
        acceptedCount: samples.filter((move) => move.fairyDebug?.fairyAccepted).length,
        matchCount: samples.filter((move) => move.fairyDebug?.fairyMatchesJsMove).length,
        timeoutCount: samples.filter((move) => move.fairyDebug?.timeout).length
    };
}

function getResultLabel(gameState) {
    if (gameState?.resultType === 'timeout_win') {
        return gameState.winner === 'white' ? 'Beyaz süreyle kazandı' : 'Siyah süreyle kazandı';
    }

    if (gameState?.isDraw) {
        return 'Beraberlik';
    }

    if (gameState?.winner === 'white') {
        return 'Beyaz kazandı';
    }

    if (gameState?.winner === 'black') {
        return 'Siyah kazandı';
    }

    return 'Sonuç yok';
}

function resolveAiBotMeta(gameState, sessionMeta) {
    const aiBotId = gameState?.aiBotId || sessionMeta?.aiBotId || null;
    if (!isAIBotId(aiBotId)) {
        return {
            id: null,
            level: null,
            stars: null,
            label: null
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

export function buildMatchHistoryRecord({ gameState, sessionMeta = {}, timeControl = 'none' } = {}) {
    if (!gameState) {
        return null;
    }

    const moves = normalizeMoveList(gameState.moveHistory);
    const gameId = sessionMeta.gameId || gameState.gameId || `local_${Date.now()}`;
    const formation = sessionMeta.formation || gameState.formation || FORMATIONS.TIMUR;
    const difficulty = sessionMeta.difficulty || gameState.difficulty || 'medium';
    const aiPersonaId = gameState.aiPersonaId || sessionMeta.aiPersonaId || null;
    const aiPersona = aiPersonaId ? getAIPersona(aiPersonaId) : null;
    const aiBot = resolveAiBotMeta(gameState, sessionMeta);
    const playerColor = gameState.playerColor || sessionMeta.localColor || COLORS.WHITE;
    const aiColor = gameState.aiColor || sessionMeta.aiColor || (playerColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
    const analysisReport = compactAnalysisReport(gameState.analysisReport);

    return {
        id: gameId,
        gameId,
        createdAt: sessionMeta.startedAt || gameState.createdAt || new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        formation,
        difficulty,
        difficultyLabel: getAIProfile(difficulty)?.label || difficulty,
        playerColor,
        aiColor,
        aiPersonaId: aiPersona?.id || null,
        aiPersonaLabel: aiPersona ? getAIPersonaLabel(aiPersona.id) : null,
        aiPersonaStyle: aiPersona?.style || null,
        aiBotId: aiBot.id,
        aiBotLevel: aiBot.level,
        aiBotStars: aiBot.stars,
        aiBotLabel: aiBot.label,
        timeControl: gameState.timeControl || sessionMeta.timeControl || timeControl,
        resultType: gameState.resultType || null,
        winner: gameState.winner || null,
        isDraw: Boolean(gameState.isDraw),
        resultLabel: getResultLabel(gameState),
        moveCount: moves.length,
        moves,
        fairyDebugSummary: getFairyDebugSummary(gameState.moveHistory),
        analysisStatus: gameState.analysisStatus || (analysisReport ? 'ready' : 'idle'),
        analysisSummary: getAnalysisSummary(gameState.analysisReport),
        analysisReport,
        finalFen: gameState.fen || null,
    };
}

export function getMatchHistoryRecords() {
    return readHistory();
}

export function addMatchHistoryRecord(record) {
    if (!record?.gameId) {
        return;
    }

    const existing = readHistory().filter((item) => item.gameId !== record.gameId);
    writeHistory([record, ...existing]);
}

export function clearMatchHistoryRecords() {
    writeHistory([]);
}
