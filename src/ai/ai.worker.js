import { GameState } from '../game/GameState.js';
import { Board } from '../game/Board.js';
import { PIECE_TYPES, COLORS, PIECE_VALUES } from '../utils/constants.js';
import { MoveValidator } from '../game/MoveValidator.js';
import { GameRules } from '../game/GameRules.js';
import { getAIProfile } from './AIProfiles.js';
import { getOpeningBookMove } from './OpeningBook.js';
import {
    evaluateStateForBlack,
    evaluateStaticExchangeForMove,
    evaluateTacticalRisk,
    analyzeTacticalMotifsForMove,
    scoreMoveHeuristicForBlack
} from './AiEvaluation.js';
import { selectMoveFromCandidates } from './AISelectionPolicy.js';
import { getTimeAdjustedSearchPlan } from './AITimeBudget.js';
import { scoreOpponentClockPressureMove } from './AIClockPressure.js';
import { analyzeEndgameMoveOutcome, selectMiniTablebaseMove } from './AIEndgame.js';
import { analyzeMiddleGameMove } from './AIMiddleGame.js';
import { scoreCandidateDecisionStyle } from './AIStylePolicy.js';
import {
    TRANSPOSITION_BOUNDS,
    createTranspositionEntry,
    probeTranspositionEntry,
    storeTranspositionEntry as putTranspositionEntry
} from './TranspositionTable.js';
import {
    analyzeRepetitionRisk,
    buildPositionHash,
    getRecentPositionHashes,
    isWinningSideState,
    scoreRepetitionPenalty
} from './AiStrategy.js';
import { findForcedMate, isPositionMateSearchEligible } from './MateSearch.js';
import {
    King, Prince, AdventitiousKing, Vizier, SeaMonster, General,
    Knight, Lion, Elephant, Camel, Dabbaba, Bull, Revealer, Giraffe,
    Picket, Rook, TimurPawn
} from '../game/PieceFactory.js';

function reviveState(plainState) {
    const state = new GameState(plainState.difficulty);
    state.formation = plainState.formation || null;
    state.aiPersonaId = plainState.aiPersonaId || null;
    state.aiBotId = plainState.aiBotId || null;
    state.aiColor = plainState.aiColor || COLORS.BLACK;
    state.playerColor = plainState.playerColor || getOppositeColor(state.aiColor);
    state.currentTurn = plainState.currentTurn;
    state.timeControl = plainState.timeControl || plainState.timeContext?.timeControl || 'none';
    state.aiTimeContext = plainState.timeContext || null;
    state.ransomMoveUsed = {
        [COLORS.WHITE]: Boolean(plainState?.ransomMoveUsed?.white),
        [COLORS.BLACK]: Boolean(plainState?.ransomMoveUsed?.black)
    };
    state.citadelExchangeUsed = {
        [COLORS.WHITE]: Boolean(plainState?.citadelExchangeUsed?.white),
        [COLORS.BLACK]: Boolean(plainState?.citadelExchangeUsed?.black)
    };
    state.aiRecentPositionHashes = plainState.recentPositionHashes || [];
    state.aiRecentPositionSnapshots = plainState.recentPositionSnapshots || [];
    state.openingHistory = plainState.openingHistory || [];
    state.aiRecentMoves = plainState.recentMoves || [];

    const board = new Board();
    plainState.board.pieces.forEach((pieceData) => {
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
        }

        if (!piece) return;
        piece.hasMoved = pieceData.hasMoved;
        piece.isPromoted = Boolean(pieceData.isPromoted);
        if (pieceData.stage != null) piece.stage = pieceData.stage;
        board.setPiece(piece.row, piece.col, piece);
    });

    state.board = board;
    normalizeAiRecentPositionHashes(state);
    return state;
}

export function normalizeAiRecentPositionHashes(state) {
    if (!state) return [];

    if (Array.isArray(state.aiRecentPositionHashes) && state.aiRecentPositionHashes.length) {
        return state.aiRecentPositionHashes;
    }

    const snapshots = Array.isArray(state.aiRecentPositionSnapshots)
        ? state.aiRecentPositionSnapshots
        : [];

    if (snapshots.length) {
        state.aiRecentPositionHashes = snapshots
            .map((snapshot) => {
                try {
                    return buildPositionHash(snapshot);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
        return state.aiRecentPositionHashes;
    }

    if (Array.isArray(state.moveHistory) && state.moveHistory.length) {
        state.aiRecentPositionHashes = getRecentPositionHashes(state.moveHistory);
        return state.aiRecentPositionHashes;
    }

    state.aiRecentPositionHashes = [];
    return state.aiRecentPositionHashes;
}

function createPieceLike(piece, color, row, col) {
    let clonedPiece = null;

    switch (piece.type) {
        case PIECE_TYPES.KING: clonedPiece = new King(color, row, col); break;
        case PIECE_TYPES.PRINCE: clonedPiece = new Prince(color, row, col); break;
        case PIECE_TYPES.ADVENTITIOUS_KING: clonedPiece = new AdventitiousKing(color, row, col); break;
        case PIECE_TYPES.VIZIER: clonedPiece = new Vizier(color, row, col); break;
        case PIECE_TYPES.SEA_MONSTER: clonedPiece = new SeaMonster(color, row, col); break;
        case PIECE_TYPES.GENERAL: clonedPiece = new General(color, row, col); break;
        case PIECE_TYPES.KNIGHT: clonedPiece = new Knight(color, row, col); break;
        case PIECE_TYPES.LION: clonedPiece = new Lion(color, row, col); break;
        case PIECE_TYPES.ELEPHANT: clonedPiece = new Elephant(color, row, col); break;
        case PIECE_TYPES.CAMEL: clonedPiece = new Camel(color, row, col); break;
        case PIECE_TYPES.DABBABA: clonedPiece = new Dabbaba(color, row, col); break;
        case PIECE_TYPES.BULL: clonedPiece = new Bull(color, row, col); break;
        case PIECE_TYPES.REVEALER: clonedPiece = new Revealer(color, row, col); break;
        case PIECE_TYPES.GIRAFFE: clonedPiece = new Giraffe(color, row, col); break;
        case PIECE_TYPES.PICKET: clonedPiece = new Picket(color, row, col); break;
        case PIECE_TYPES.ROOK: clonedPiece = new Rook(color, row, col); break;
        case PIECE_TYPES.PAWN: clonedPiece = new TimurPawn(color, row, col, piece.pawnType); break;
    }

    if (!clonedPiece) return null;
    clonedPiece.hasMoved = Boolean(piece.hasMoved);
    clonedPiece.isPromoted = Boolean(piece.isPromoted);
    if (piece.stage != null) clonedPiece.stage = piece.stage;
    return clonedPiece;
}

function serializeMoveChoice(moveObj) {
    if (!moveObj) return null;

    return {
        fromRow: moveObj.piece?.row,
        fromCol: moveObj.piece?.col,
        toRow: moveObj.move?.row,
        toCol: moveObj.move?.col,
        specialMove: moveObj.move?.specialMove || null
    };
}

function getStateMoveCount(state) {
    const timeContextMoveCount = state?.aiTimeContext?.moveCount ?? state?.timeContext?.moveCount;
    if (Number.isFinite(timeContextMoveCount)) return timeContextMoveCount;
    if (Array.isArray(state?.moveHistory)) return state.moveHistory.length;
    return 0;
}

function isMatchingMove(moveObj, serializedMove) {
    if (!moveObj || !serializedMove) return false;

    return (
        moveObj.piece?.row === serializedMove.fromRow
        && moveObj.piece?.col === serializedMove.fromCol
        && moveObj.move?.row === serializedMove.toRow
        && moveObj.move?.col === serializedMove.toCol
        && (moveObj.move?.specialMove || null) === (serializedMove.specialMove || null)
    );
}

const SEARCH_MEMORY_LIMITS = Object.freeze({
    transpositionTable: 24000,
    bestMoves: 8000,
    killerMoves: 512,
    historyScores: 12000,
    continuationHistoryScores: 16000,
    captureHistoryScores: 9000
});

export function createAiSearchMemory() {
    return {
        transpositionTable: new Map(),
        bestMoves: new Map(),
        killerMoves: new Map(),
        historyScores: new Map(),
        continuationHistoryScores: new Map(),
        captureHistoryScores: new Map(),
        transpositionAge: 0
    };
}

const defaultAiSearchMemories = new Map();

export function resetAiSearchMemory(memoryKey = null) {
    if (memoryKey == null) {
        defaultAiSearchMemories.clear();
        return;
    }

    defaultAiSearchMemories.delete(memoryKey);
}

function normalizeAiSearchMemory(memory) {
    if (!memory) return createAiSearchMemory();

    if (!(memory.transpositionTable instanceof Map)) memory.transpositionTable = new Map();
    if (!(memory.bestMoves instanceof Map)) memory.bestMoves = new Map();
    if (!(memory.killerMoves instanceof Map)) memory.killerMoves = new Map();
    if (!(memory.historyScores instanceof Map)) memory.historyScores = new Map();
    if (!(memory.continuationHistoryScores instanceof Map)) memory.continuationHistoryScores = new Map();
    if (!(memory.captureHistoryScores instanceof Map)) memory.captureHistoryScores = new Map();
    if (!Number.isFinite(memory.transpositionAge)) memory.transpositionAge = 0;

    return memory;
}

function getDefaultAiSearchMemoryKey(gameState, profile) {
    return [
        gameState?.difficulty || 'medium',
        profile?.id || 'medium',
        gameState?.formation || 'default',
        gameState?.aiColor || COLORS.BLACK,
        gameState?.playerColor || COLORS.WHITE,
        gameState?.timeControl || 'none'
    ].join('|');
}

function resolveAiSearchMemory(gameState, profile, options = {}) {
    if (options.searchMemory) {
        return normalizeAiSearchMemory(options.searchMemory);
    }

    const memoryKey = options.searchMemoryKey || getDefaultAiSearchMemoryKey(gameState, profile);
    if (!defaultAiSearchMemories.has(memoryKey)) {
        defaultAiSearchMemories.set(memoryKey, createAiSearchMemory());
    }

    return defaultAiSearchMemories.get(memoryKey);
}

function createSearchMemoryStats(memory) {
    return {
        transpositionHits: 0,
        transpositionStores: 0,
        usedRootHashMove: false,
        killerStores: 0,
        historyUpdates: 0,
        continuationHistoryUpdates: 0,
        captureHistoryUpdates: 0,
        continuationHistoryOrders: 0,
        captureHistoryOrders: 0,
        positiveSeeOrders: 0,
        positionalOrderBonuses: 0,
        quiescenceNodes: 0,
        quiescenceNodeLimit: 0,
        quiescenceNodeLimitHits: 0,
        quiescenceCandidateMoves: 0,
        quiescenceNegativeSeeSkips: 0,
        quiescenceCaptureMoves: 0,
        quiescenceCheckMoves: 0,
        quiescenceRoyalThreatMoves: 0,
        quiescenceCitadelThreatMoves: 0,
        quiescenceRescueMoves: 0,
        aspirationWindows: 0,
        aspirationResearches: 0,
        aspirationFailHigh: 0,
        aspirationFailLow: 0,
        pvsNullWindowSearches: 0,
        pvsResearches: 0,
        lateMoveReductions: 0,
        lateMoveResearches: 0,
        searchExtensions: 0,
        futilityPrunes: 0,
        reverseFutilityPrunes: 0,
        futilityTacticalGuards: 0,
        failSoftCutoffs: 0,
        transpositionSize: memory.transpositionTable.size,
        bestMoveSize: memory.bestMoves.size,
        killerMoveSize: memory.killerMoves.size,
        historySize: memory.historyScores.size,
        continuationHistorySize: memory.continuationHistoryScores.size,
        captureHistorySize: memory.captureHistoryScores.size,
        transpositionAge: memory.transpositionAge
    };
}

function summarizeSearchMemory(searchContext) {
    const memory = searchContext?.memory;
    const stats = searchContext?.stats;
    if (!memory || !stats) return null;

    return {
        ...stats,
        transpositionSize: memory.transpositionTable.size,
        bestMoveSize: memory.bestMoves.size,
        killerMoveSize: memory.killerMoves.size,
        historySize: memory.historyScores.size,
        continuationHistorySize: memory.continuationHistoryScores.size,
        captureHistorySize: memory.captureHistoryScores.size,
        transpositionAge: memory.transpositionAge
    };
}

function pruneMemoryMap(map, maxSize) {
    if (!(map instanceof Map) || map.size <= maxSize) return;

    const overflow = map.size - maxSize;
    const removeCount = Math.max(overflow, Math.ceil(maxSize * 0.08));
    let removed = 0;
    for (const key of map.keys()) {
        map.delete(key);
        removed++;
        if (removed >= removeCount) break;
    }
}

function buildSearchMemoryPositionKey(state, profile, isMaximizing) {
    return `${buildPositionHash(state)}|${profile.id}|${isMaximizing ? 'max' : 'min'}`;
}

function buildMoveMemoryKey(moveObj) {
    if (!moveObj) return null;

    return [
        moveObj.piece?.color || '',
        moveObj.piece?.type || '',
        moveObj.piece?.row,
        moveObj.piece?.col,
        moveObj.move?.row,
        moveObj.move?.col,
        moveObj.move?.specialMove || ''
    ].join(':');
}

function buildContinuationHistoryKey(searchHistoryHashes = [], moveObj) {
    const previousHash = Array.isArray(searchHistoryHashes)
        ? searchHistoryHashes[searchHistoryHashes.length - 1]
        : null;
    const moveKey = buildMoveMemoryKey(moveObj);
    if (!previousHash || !moveKey) return null;
    return `${previousHash}>${moveKey}`;
}

function buildCaptureHistoryKey(state, moveObj) {
    if (!state?.board || !moveObj?.piece || !moveObj?.move) return null;
    const targetPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    if (!targetPiece || targetPiece.color === moveObj.piece.color) return null;

    return [
        moveObj.piece.color,
        moveObj.piece.type,
        targetPiece.type,
        moveObj.move.row,
        moveObj.move.col,
        moveObj.move.specialMove || ''
    ].join(':');
}

function rememberOrderingHistoryScore(searchContext, mapName, key, amount, statKey, limitKey) {
    const memory = searchContext?.memory;
    if (!memory || !key || !(memory[mapName] instanceof Map)) return;

    const currentScore = memory[mapName].get(key) || 0;
    memory[mapName].set(key, Math.min(60000, currentScore + Math.max(1, amount)));
    addSearchStat(searchContext, statKey);
    pruneMemoryMap(memory[mapName], SEARCH_MEMORY_LIMITS[limitKey]);
}

function rememberSearchOrderingSuccess(searchContext, state, moveObj, depth, searchHistoryHashes = []) {
    if (!moveObj) return;

    const bonus = Math.max(1, depth * depth);
    rememberOrderingHistoryScore(
        searchContext,
        'continuationHistoryScores',
        buildContinuationHistoryKey(searchHistoryHashes, moveObj),
        bonus * 2,
        'continuationHistoryUpdates',
        'continuationHistoryScores'
    );

    rememberOrderingHistoryScore(
        searchContext,
        'captureHistoryScores',
        buildCaptureHistoryKey(state, moveObj),
        bonus * 3,
        'captureHistoryUpdates',
        'captureHistoryScores'
    );
}

function rememberBestMove(searchContext, positionKey, moveObj) {
    if (!searchContext?.memory || !positionKey || !moveObj) return;

    searchContext.memory.bestMoves.set(positionKey, serializeMoveChoice(moveObj));
    pruneMemoryMap(searchContext.memory.bestMoves, SEARCH_MEMORY_LIMITS.bestMoves);
}

function storeSearchTranspositionEntry(transpositionTable, key, entry, searchContext) {
    const stored = putTranspositionEntry(
        transpositionTable,
        key,
        createTranspositionEntry({
            ...entry,
            age: searchContext?.memory?.transpositionAge ?? entry?.age ?? 0
        }),
        {
            maxSize: SEARCH_MEMORY_LIMITS.transpositionTable,
            age: searchContext?.memory?.transpositionAge ?? entry?.age ?? 0
        }
    );

    if (stored && searchContext?.stats) searchContext.stats.transpositionStores++;
}

function getKillerMoveKey(ply, depth, isMaximizing) {
    return `${ply}|${depth}|${isMaximizing ? 'max' : 'min'}`;
}

function recordSearchCutoff(searchContext, moveObj, depth, ply, isMaximizing, state = null, searchHistoryHashes = []) {
    const memory = searchContext?.memory;
    if (searchContext?.stats) searchContext.stats.failSoftCutoffs++;
    if (!memory || !moveObj) return;

    const serializedMove = serializeMoveChoice(moveObj);
    const killerKey = getKillerMoveKey(ply, depth, isMaximizing);
    const killerMoves = memory.killerMoves.get(killerKey) || [];
    const exists = killerMoves.some((killerMove) => isMatchingMove(moveObj, killerMove));
    if (!exists) {
        memory.killerMoves.set(killerKey, [serializedMove, ...killerMoves].slice(0, 2));
        if (searchContext?.stats) searchContext.stats.killerStores++;
        pruneMemoryMap(memory.killerMoves, SEARCH_MEMORY_LIMITS.killerMoves);
    }

    const moveKey = buildMoveMemoryKey(moveObj);
    if (moveKey) {
        const currentScore = memory.historyScores.get(moveKey) || 0;
        memory.historyScores.set(moveKey, Math.min(50000, currentScore + Math.max(1, depth * depth)));
        if (searchContext?.stats) searchContext.stats.historyUpdates++;
        pruneMemoryMap(memory.historyScores, SEARCH_MEMORY_LIMITS.historyScores);
    }

    rememberSearchOrderingSuccess(searchContext, state, moveObj, depth, searchHistoryHashes);
}

function scoreSearchMemoryMove(moveObj, {
    state = null,
    cachedMove = null,
    searchContext = null,
    searchHistoryHashes = [],
    ply = 0,
    depth = 0,
    isMaximizing = true,
    positionMemoryKey = null,
    isRoot = false
} = {}) {
    const memory = searchContext?.memory;
    if (!memory || !moveObj) return cachedMove && isMatchingMove(moveObj, cachedMove) ? 100000 : 0;

    let score = cachedMove && isMatchingMove(moveObj, cachedMove) ? 100000 : 0;
    const rememberedMove = positionMemoryKey ? memory.bestMoves.get(positionMemoryKey) : null;
    if (rememberedMove) {
        if (isRoot && isMatchingMove(moveObj, rememberedMove) && searchContext?.stats) {
            searchContext.stats.usedRootHashMove = true;
        }

        if (isMatchingMove(moveObj, rememberedMove)) score += 90000;
    }

    const killerMoves = memory.killerMoves.get(getKillerMoveKey(ply, depth, isMaximizing)) || [];
    if (killerMoves.some((killerMove) => isMatchingMove(moveObj, killerMove))) score += 12000;

    const historyScore = memory.historyScores.get(buildMoveMemoryKey(moveObj)) || 0;
    score += Math.min(20000, historyScore);

    const continuationScore = memory.continuationHistoryScores.get(buildContinuationHistoryKey(searchHistoryHashes, moveObj)) || 0;
    if (continuationScore > 0) addSearchStat(searchContext, 'continuationHistoryOrders');
    score += Math.min(26000, continuationScore);

    const captureScore = memory.captureHistoryScores.get(buildCaptureHistoryKey(state, moveObj)) || 0;
    if (captureScore > 0) addSearchStat(searchContext, 'captureHistoryOrders');
    score += Math.min(22000, captureScore);

    return score;
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function mirrorColor(color) {
    if (color === COLORS.WHITE) return COLORS.BLACK;
    if (color === COLORS.BLACK) return COLORS.WHITE;
    return color;
}

function mirrorCoord(row, col) {
    if (row === 0 && col === -1) return { row: 9, col: 11 };
    if (row === 9 && col === 11) return { row: 0, col: -1 };

    return { row: 9 - row, col };
}

function mirrorMoveRecord(move) {
    if (!move) return move;
    const from = mirrorCoord(move.fromRow, move.fromCol);
    const to = mirrorCoord(move.toRow, move.toCol);

    return {
        ...move,
        color: mirrorColor(move.color),
        fromRow: from.row,
        fromCol: from.col,
        toRow: to.row,
        toCol: to.col
    };
}

function mirrorPieceSnapshot(piece) {
    if (!piece) return piece;

    const coord = mirrorCoord(piece.row, piece.col);
    return {
        ...piece,
        color: mirrorColor(piece.color),
        row: coord.row,
        col: coord.col
    };
}

function mirrorSnapshotForWhiteAi(snapshot) {
    if (!snapshot) return null;

    const pieces = snapshot.board?.pieces || snapshot.pieces || [];
    return {
        ...snapshot,
        currentTurn: mirrorColor(snapshot.currentTurn),
        winner: mirrorColor(snapshot.winner),
        ransomMoveUsed: {
            [COLORS.WHITE]: Boolean(snapshot?.ransomMoveUsed?.[COLORS.BLACK] ?? snapshot?.ransomMoveUsed?.black),
            [COLORS.BLACK]: Boolean(snapshot?.ransomMoveUsed?.[COLORS.WHITE] ?? snapshot?.ransomMoveUsed?.white)
        },
        citadelExchangeUsed: {
            [COLORS.WHITE]: Boolean(snapshot?.citadelExchangeUsed?.[COLORS.BLACK] ?? snapshot?.citadelExchangeUsed?.black),
            [COLORS.BLACK]: Boolean(snapshot?.citadelExchangeUsed?.[COLORS.WHITE] ?? snapshot?.citadelExchangeUsed?.white)
        },
        board: {
            pieces: pieces.map(mirrorPieceSnapshot)
        }
    };
}

function mirrorTimeContextForWhiteAi(timeContext) {
    if (!timeContext) return null;

    return {
        ...timeContext,
        activeColor: mirrorColor(timeContext.activeColor),
        currentTurn: mirrorColor(timeContext.currentTurn),
        aiColor: COLORS.BLACK,
        playerColor: COLORS.WHITE,
        whiteRemainingMs: timeContext.blackRemainingMs ?? null,
        blackRemainingMs: timeContext.whiteRemainingMs ?? null,
        whiteTimeRatio: timeContext.blackTimeRatio ?? null,
        blackTimeRatio: timeContext.whiteTimeRatio ?? null
    };
}

export function createBlackPerspectiveStateForWhiteAi(state) {
    const mirroredState = new GameState(state.difficulty || 'medium');
    mirroredState.formation = state.formation || null;
    mirroredState.aiPersonaId = state.aiPersonaId || null;
    mirroredState.aiBotId = state.aiBotId || null;
    mirroredState.aiColor = COLORS.BLACK;
    mirroredState.playerColor = COLORS.WHITE;
    mirroredState.currentTurn = mirrorColor(state.currentTurn);
    mirroredState.timeControl = state.timeControl || state.aiTimeContext?.timeControl || 'none';
    mirroredState.aiTimeContext = mirrorTimeContextForWhiteAi(state.aiTimeContext);
    mirroredState.status = state.status;
    mirroredState.winner = mirrorColor(state.winner);
    mirroredState.checkmate = Boolean(state.checkmate);
    mirroredState.stalemate = Boolean(state.stalemate);
    mirroredState.isDraw = Boolean(state.isDraw);
    mirroredState.ransomMoveUsed = {
        [COLORS.WHITE]: Boolean(state?.ransomMoveUsed?.black),
        [COLORS.BLACK]: Boolean(state?.ransomMoveUsed?.white)
    };
    mirroredState.citadelExchangeUsed = {
        [COLORS.WHITE]: Boolean(state?.citadelExchangeUsed?.black),
        [COLORS.BLACK]: Boolean(state?.citadelExchangeUsed?.white)
    };
    const mirroredSnapshots = (state.aiRecentPositionSnapshots || [])
        .map(mirrorSnapshotForWhiteAi)
        .filter(Boolean);
    mirroredState.aiRecentPositionSnapshots = mirroredSnapshots;
    mirroredState.aiRecentPositionHashes = mirroredSnapshots.map(buildPositionHash);
    mirroredState.openingHistory = (state.openingHistory || []).map(mirrorMoveRecord);
    mirroredState.aiRecentMoves = (state.aiRecentMoves || []).map(mirrorMoveRecord);

    const board = new Board();
    state.board.pieces.forEach((piece) => {
        const coord = mirrorCoord(piece.row, piece.col);
        const mirroredPiece = createPieceLike(piece, mirrorColor(piece.color), coord.row, coord.col);
        if (mirroredPiece) board.setPiece(coord.row, coord.col, mirroredPiece);
    });
    mirroredState.board = board;

    return mirroredState;
}

function mapBlackPerspectiveMoveToWhiteState(originalState, mirroredMove) {
    if (!mirroredMove) return null;

    const from = mirrorCoord(mirroredMove.piece.row, mirroredMove.piece.col);
    const to = mirrorCoord(mirroredMove.move.row, mirroredMove.move.col);
    const originalPiece = originalState.board.getPieceAt(from.row, from.col);
    if (!originalPiece || originalPiece.color !== COLORS.WHITE) return null;

    const previousTurn = originalState.currentTurn;
    originalState.currentTurn = COLORS.WHITE;
    try {
        const validator = new MoveValidator(originalState);
        const legalMove = validator
            .getLegalMoves(from.row, from.col)
            .find((move) => (
                move.row === to.row
                && move.col === to.col
                && (move.specialMove || null) === (mirroredMove.move.specialMove || null)
            ));

        if (!legalMove) return null;

        return {
            piece: originalPiece,
            move: {
                ...legalMove,
                row: to.row,
                col: to.col
            },
            openingBook: Boolean(mirroredMove.openingBook),
            openingId: mirroredMove.openingId || null,
            openingName: mirroredMove.openingName || null,
            openingMoveIndex: mirroredMove.openingMoveIndex || null,
            openingLineId: mirroredMove.openingLineId || null,
            openingConfidence: mirroredMove.openingConfidence ?? null,
            openingPriority: mirroredMove.openingPriority ?? null,
            openingTransition: Boolean(mirroredMove.openingTransition),
            openingPlan: mirroredMove.openingPlan || null
        };
    } finally {
        originalState.currentTurn = previousTurn;
    }
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
        return state.board.pieces
            .filter((piece) => piece.color === color)
            .reduce((total, piece) => total + validator.getLegalMoves(piece.row, piece.col).length, 0);
    });
}

function clampFinite(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function getBoardCenterValue(row, col) {
    if (!Number.isFinite(row) || !Number.isFinite(col)) return 0;
    const distance = Math.abs(col - 5) + Math.abs(row - 4.5);
    return Math.max(0, 6 - distance);
}

function getForwardDelta(piece, fromRow, toRow) {
    if (!piece || !Number.isFinite(fromRow) || !Number.isFinite(toRow)) return 0;
    return piece.color === COLORS.BLACK ? toRow - fromRow : fromRow - toRow;
}

function isStrategicDevelopmentPiece(piece) {
    return Boolean(piece && piece.type !== PIECE_TYPES.PAWN && !GameRules.isRoyalType(piece.type));
}

function countPotentialSupportForSquare(state, row, col, color, ignoredPiece = null) {
    if (!state?.board?.isValidCoord?.(row, col)) return 0;

    return state.board.pieces
        .filter((piece) => piece.color === color && piece !== ignoredPiece)
        .reduce((total, piece) => {
            const supportsSquare = piece
                .getPotentialMoves(state.board)
                .some((move) => move.row === row && move.col === col);
            return total + (supportsSquare ? 1 : 0);
        }, 0);
}

function buildRootMovePlanMetrics(state, moveObj, appliedMove, context = {}) {
    const piece = appliedMove?.activePiece || moveObj?.piece;
    const fromRow = appliedMove?.origRow ?? moveObj?.piece?.row;
    const fromCol = appliedMove?.origCol ?? moveObj?.piece?.col;
    const toRow = moveObj?.move?.row;
    const toCol = moveObj?.move?.col;
    const wasMovedBefore = Boolean(context.wasMovedBefore);
    const captures = Boolean(context.captures);
    const givesCheck = Boolean(context.givesCheck);
    const terminalWin = Boolean(context.terminalWin);
    const ownMobilityBefore = Number.isFinite(context.ownMobilityBefore) ? context.ownMobilityBefore : 0;
    const ownMobilityAfter = Number.isFinite(context.ownMobilityAfter) ? context.ownMobilityAfter : ownMobilityBefore;
    const opponentMobility = Number.isFinite(context.opponentMobility) ? context.opponentMobility : 8;
    const staticExchangeScore = Number.isFinite(context.staticExchange?.score) ? context.staticExchange.score : 0;
    const captureValue = Number.isFinite(context.staticExchange?.captureValue) ? context.staticExchange.captureValue : 0;
    const replyCaptureValue = Number.isFinite(context.opponentReplyThreat?.bestCaptureValue)
        ? context.opponentReplyThreat.bestCaptureValue
        : 0;
    const dangerLevel = Number.isFinite(context.tacticalRisk?.dangerLevel) ? context.tacticalRisk.dangerLevel : 0;
    const mobilityGain = ownMobilityAfter - ownMobilityBefore;
    const centerGain = getBoardCenterValue(toRow, toCol) - getBoardCenterValue(fromRow, fromCol);
    const forwardDelta = getForwardDelta(piece, fromRow, toRow);
    const supportAfter = countPotentialSupportForSquare(state, toRow, toCol, piece?.color, piece);
    const edgeDrift = (toCol <= 0 || toCol >= 10 || toRow <= 0 || toRow >= 9) ? 1 : 0;
    const developmentGain = isStrategicDevelopmentPiece(piece) && !wasMovedBefore ? 8 : 0;
    const pawnStructureGain = piece?.type === PIECE_TYPES.PAWN && forwardDelta > 0 ? Math.min(6, forwardDelta) * 1.4 : 0;
    const safeCaptureGain = captures ? Math.max(0, Math.min(120, captureValue + staticExchangeScore)) * 0.06 : 0;
    const forcingGain = (givesCheck ? 6 : 0) + (terminalWin ? 24 : 0);
    const opponentRestrictionGain = Math.max(0, 12 - opponentMobility) * 1.2;
    const unsafeExchangeDebt = Math.max(0, -staticExchangeScore) * 0.09;
    const replyDebt = Math.max(0, replyCaptureValue - Math.max(0, captureValue)) * 0.08;
    const noProgress = !captures
        && !givesCheck
        && !terminalWin
        && centerGain <= 0
        && forwardDelta <= 0
        && mobilityGain <= 0
        && developmentGain <= 0;

    const planProgress = (
        Math.max(0, centerGain) * 4.2
        + Math.max(0, forwardDelta) * 1.9
        + Math.max(0, mobilityGain) * 1.35
        + Math.min(4, supportAfter) * 1.8
        + developmentGain
        + pawnStructureGain
        + safeCaptureGain
        + forcingGain
        + opponentRestrictionGain
    );
    const planDrift = (
        Math.max(0, -centerGain) * 3
        + Math.max(0, -forwardDelta) * 1.4
        + Math.max(0, -mobilityGain) * 1.6
        + (noProgress ? 8 : 0)
        + edgeDrift * 3
        + dangerLevel * 4.5
        + unsafeExchangeDebt
        + replyDebt
    );

    return {
        planProgress: clampFinite(planProgress, -120, 180),
        planDrift: clampFinite(planDrift, 0, 180),
        planCenterGain: clampFinite(centerGain, -12, 12),
        planMobilityGain: clampFinite(mobilityGain, -80, 80),
        planSupportAfter: clampFinite(supportAfter, 0, 12)
    };
}

function applySearchTerminalState(state, nextTurn) {
    const terminalState = {
        previousStatus: state.status ?? null,
        previousWinner: state.winner ?? null,
        previousCheckmate: Boolean(state.checkmate),
        previousStalemate: Boolean(state.stalemate),
        resultType: null
    };

    if (state.status === 'game_over') {
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
        state.status = 'game_over';
        state.winner = nextTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        terminalState.resultType = 'checkmate';
    } else if (validator.isStalemate(nextTurn)) {
        state.stalemate = true;
        state.status = 'game_over';
        state.winner = nextTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        terminalState.resultType = 'stalemate';
    }

    return terminalState;
}

export function scoreTerminalStateForBlack(state, profile = null, depthRemaining = 0) {
    if (!state || state.status !== 'game_over') return null;

    const depthBonus = Math.max(0, depthRemaining || 0) * 750;
    if (state.winner === COLORS.BLACK) return 120000 + depthBonus;
    if (state.winner === COLORS.WHITE) return -120000 - depthBonus;
    if (state.winner === 'Draw (Hisar)' || state.winner === 'draw' || state.isDraw) return 0;

    return 0;
}

function revertSearchTerminalState(state, terminalState) {
    if (!terminalState) return;

    state.status = terminalState.previousStatus;
    state.winner = terminalState.previousWinner;
    state.checkmate = terminalState.previousCheckmate;
    state.stalemate = terminalState.previousStalemate;
}

export { scoreEndgameMoveOutcome } from './AIEndgame.js';

function buildTranspositionKey(state, isMaximizing, profile, searchHistoryHashes = []) {
    const historySignature = searchHistoryHashes.slice(-4).join('>');
    return `${buildPositionHash(state)}|${profile.id}|${isMaximizing ? 'max' : 'min'}|${historySignature}`;
}

function collectMoves(state) {
    const validator = new MoveValidator(state);
    const currentPlayer = state.currentTurn;
    const pieces = state.board.pieces.filter((piece) => piece.color === currentPlayer);
    const moves = [];

    pieces.forEach((piece) => {
        const legalMoves = validator.getLegalMoves(piece.row, piece.col);
        legalMoves.forEach((move) => moves.push({ piece, move }));
    });

    return moves;
}

function scoreMoveOrderingV3BonusForBlack(state, moveObj, profile, searchContext) {
    if (!state?.board || !moveObj?.piece || !moveObj?.move) return 0;

    const { piece, move } = moveObj;
    const targetPiece = state.board.getPieceAt(move.row, move.col);
    const targetIsEnemy = Boolean(targetPiece && targetPiece.color !== piece.color);
    let rawScore = 0;

    if (targetIsEnemy) {
        const staticExchange = evaluateStaticExchangeForMove(state, moveObj, profile);
        if (staticExchange.score > 0) {
            addSearchStat(searchContext, 'positiveSeeOrders');
            rememberOrderingHistoryScore(
                searchContext,
                'captureHistoryScores',
                buildCaptureHistoryKey(state, moveObj),
                Math.max(1, staticExchange.score * 0.15),
                'captureHistoryUpdates',
                'captureHistoryScores'
            );
            rawScore += 7000 + Math.min(9000, staticExchange.score * 18);
        }
    }

    if (GameRules.isRoyalType(piece.type)) {
        const beforeCenter = Math.abs(piece.col - 5) + Math.abs(piece.row - 4.5);
        const afterCenter = Math.abs(move.col - 5) + Math.abs(move.row - 4.5);
        const movingAwayFromCenter = afterCenter - beforeCenter;
        const homeRankSafety = piece.color === COLORS.BLACK
            ? Math.max(0, piece.row - move.row)
            : Math.max(0, move.row - piece.row);
        rawScore += Math.max(0, movingAwayFromCenter) * 55;
        rawScore += homeRankSafety * 35;
    } else {
        const colDist = Math.abs(move.col - 5);
        const rowDist = Math.abs(move.row - 4.5);
        const centerBonus = Math.max(0, 5 - colDist - rowDist) * (profile?.ordering?.center || 1) * 32;
        const forwardStep = piece.color === COLORS.BLACK
            ? move.row - piece.row
            : piece.row - move.row;
        const developmentBonus = !piece.hasMoved
            ? Math.max(0, forwardStep) * 42
            : 0;
        rawScore += centerBonus + developmentBonus;
    }

    if (rawScore > 0) addSearchStat(searchContext, 'positionalOrderBonuses');
    return piece.color === COLORS.BLACK ? rawScore : -rawScore;
}

function sortMovesForSearch(state, moves, isMaximizing, profile, cachedMove = null, searchContext = null, options = {}) {
    return [...moves].sort((a, b) => {
        const memoryScoreA = scoreSearchMemoryMove(a, {
            state,
            cachedMove,
            searchContext,
            searchHistoryHashes: options.searchHistoryHashes || [],
            ply: options.ply || 0,
            depth: options.depth || 0,
            isMaximizing,
            positionMemoryKey: options.positionMemoryKey || null,
            isRoot: Boolean(options.isRoot)
        });
        const memoryScoreB = scoreSearchMemoryMove(b, {
            state,
            cachedMove,
            searchContext,
            searchHistoryHashes: options.searchHistoryHashes || [],
            ply: options.ply || 0,
            depth: options.depth || 0,
            isMaximizing,
            positionMemoryKey: options.positionMemoryKey || null,
            isRoot: Boolean(options.isRoot)
        });
        if (memoryScoreA !== memoryScoreB) return memoryScoreB - memoryScoreA;

        const heuristicA = scoreMoveHeuristicForBlack(state, a, profile)
            + scoreMoveOrderingV3BonusForBlack(state, a, profile, searchContext);
        const heuristicB = scoreMoveHeuristicForBlack(state, b, profile)
            + scoreMoveOrderingV3BonusForBlack(state, b, profile, searchContext);
        const heuristicDiff = heuristicB - heuristicA;
        return isMaximizing ? heuristicDiff : -heuristicDiff;
    });
}

function limitSearchMoves(moves, profile, limitKey) {
    const limit = profile?.search?.[limitKey];
    if (!Number.isFinite(limit) || limit <= 0) return moves;
    return moves.slice(0, limit);
}

function getSearchNow() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }

    return Date.now();
}

function createSearchDeadline(maxThinkMs, now = getSearchNow) {
    const startMs = now();
    const budgetMs = Number.isFinite(maxThinkMs) ? Math.max(1, maxThinkMs) : Infinity;
    const deadlineMs = Number.isFinite(budgetMs) ? startMs + budgetMs : Infinity;

    return {
        startMs,
        deadlineMs,
        maxThinkMs: budgetMs,
        expired: false,
        isExpired() {
            if (!Number.isFinite(deadlineMs)) return false;
            if (now() >= deadlineMs) {
                this.expired = true;
                return true;
            }
            return false;
        }
    };
}

function applySearchMove(state, moveObj) {
    const origRow = moveObj.piece.row;
    const origCol = moveObj.piece.col;

    if (moveObj.move.specialMove === 'royal_swap') {
        const targetPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
        const effects = GameRules.applyRoyalSwap(state, moveObj.piece, targetPiece);
        return {
            type: 'royal_swap',
            origRow,
            origCol,
            effects,
            activePiece: effects?.activePiece || state.board.getPieceAt(moveObj.move.row, moveObj.move.col)
        };
    }

    if (moveObj.move.specialMove === 'citadel_exchange') {
        const targetPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
        const effects = GameRules.applyCitadelExchange(state, moveObj.piece, targetPiece);
        return {
            type: 'citadel_exchange',
            origRow,
            origCol,
            effects,
            activePiece: effects?.activePiece || state.board.getPieceAt(moveObj.move.row, moveObj.move.col)
        };
    }

    const moveData = state.board.movePiece(origRow, origCol, moveObj.move.row, moveObj.move.col);
    const postMoveEffects = GameRules.applyPostMoveEffects(state, moveObj.piece, moveObj.move.row, moveObj.move.col);

    return {
        type: 'standard',
        origRow,
        origCol,
        moveData,
        postMoveEffects,
        activePiece: postMoveEffects?.activePiece || state.board.getPieceAt(moveObj.move.row, moveObj.move.col)
    };
}

const OPPONENT_REPLY_RISK_WEIGHT = Object.freeze({
    easy: 0.62,
    medium: 1.12,
    hard: 2.35
});

const OPPONENT_CONTINUATION_DEPTH = Object.freeze({
    easy: 1,
    medium: 3,
    hard: 3
});

const OPPONENT_CONTINUATION_RISK_WEIGHT = Object.freeze({
    easy: 0.45,
    medium: 1.45,
    hard: 2.9
});

function getOpponentReplyRiskWeight(profile) {
    const baseId = getProfileBaseId(profile);
    return OPPONENT_REPLY_RISK_WEIGHT[baseId] ?? OPPONENT_REPLY_RISK_WEIGHT.medium;
}

function getOpponentContinuationDepth(profile) {
    const baseId = getProfileBaseId(profile);
    return OPPONENT_CONTINUATION_DEPTH[baseId] ?? OPPONENT_CONTINUATION_DEPTH.medium;
}

function getOpponentContinuationRiskWeight(profile) {
    const baseId = getProfileBaseId(profile);
    return OPPONENT_CONTINUATION_RISK_WEIGHT[baseId] ?? OPPONENT_CONTINUATION_RISK_WEIGHT.medium;
}

export function evaluateOpponentReplyThreat(state, perspectiveColor = COLORS.BLACK, profile = null) {
    if (!state?.board?.pieces?.length || !perspectiveColor) {
        return {
            penalty: 0,
            bestCaptureValue: 0,
            bestReply: null
        };
    }

    const opponentColor = getOppositeColor(perspectiveColor);
    const previousTurn = state.currentTurn;
    let bestCaptureValue = 0;
    let bestReply = null;

    state.currentTurn = opponentColor;
    try {
        const validator = new MoveValidator(state);
        const opponentPieces = state.board.pieces.filter((piece) => piece.color === opponentColor);

        for (const piece of opponentPieces) {
            const legalMoves = validator.getLegalMoves(piece.row, piece.col);
            for (const move of legalMoves) {
                const target = state.board.getPieceAt(move.row, move.col);
                if (!target || target.color !== perspectiveColor) continue;

                const targetValue = PIECE_VALUES[target.type] || 0;
                const attackerValue = PIECE_VALUES[piece.type] || 0;
                const exchangeValue = targetValue + Math.max(0, targetValue - attackerValue) * 0.25;
                if (exchangeValue <= bestCaptureValue) continue;

                bestCaptureValue = exchangeValue;
                bestReply = {
                    piece: {
                        type: piece.type,
                        row: piece.row,
                        col: piece.col
                    },
                    move: {
                        row: move.row,
                        col: move.col,
                        specialMove: move.specialMove || null
                    },
                    target: {
                        type: target.type,
                        row: target.row,
                        col: target.col
                    }
                };
            }
        }
    } finally {
        state.currentTurn = previousTurn;
    }

    return {
        penalty: -bestCaptureValue * getOpponentReplyRiskWeight(profile),
        bestCaptureValue,
        bestReply
    };
}

function getRouteDistance(row, col, targetRow, targetCol) {
    return Math.abs(row - targetRow) + Math.abs(col - targetCol);
}

function serializeContinuationStep(piece, move) {
    return {
        piece: {
            type: piece.type,
            row: piece.row,
            col: piece.col
        },
        move: {
            row: move.row,
            col: move.col,
            specialMove: move.specialMove || null
        }
    };
}

function searchSamePieceRouteToTarget(state, attacker, targetPiece, depthRemaining, path = [], visited = new Set()) {
    if (!attacker || !targetPiece || depthRemaining <= 0) return null;

    const targetRow = targetPiece.row;
    const targetCol = targetPiece.col;
    const routeKey = `${attacker.type}:${attacker.row}:${attacker.col}:${depthRemaining}`;
    if (visited.has(routeKey)) return null;
    visited.add(routeKey);

    const validator = new MoveValidator(state);
    const legalMoves = validator.getLegalMoves(attacker.row, attacker.col);
    const captureMove = legalMoves.find((move) => {
        if (move.row !== targetRow || move.col !== targetCol) return false;
        const target = state.board.getPieceAt(move.row, move.col);
        return target === targetPiece;
    });

    if (captureMove) {
        return {
            depth: path.length + 1,
            attacker,
            path: [...path, serializeContinuationStep(attacker, captureMove)]
        };
    }

    if (depthRemaining <= 1) return null;

    const currentDistance = getRouteDistance(attacker.row, attacker.col, targetRow, targetCol);
    const quietMoves = legalMoves
        .filter((move) => {
            if (state.board.getPieceAt(move.row, move.col)) return false;
            const distance = getRouteDistance(move.row, move.col, targetRow, targetCol);
            return distance < currentDistance;
        })
        .sort((a, b) => (
            getRouteDistance(a.row, a.col, targetRow, targetCol)
            - getRouteDistance(b.row, b.col, targetRow, targetCol)
        ))
        .slice(0, 8);

    for (const move of quietMoves) {
        const moveObj = { piece: attacker, move };
        const appliedMove = applySearchMove(state, moveObj);
        const nextAttacker = appliedMove.activePiece || state.board.getPieceAt(move.row, move.col);
        const found = searchSamePieceRouteToTarget(
            state,
            nextAttacker,
            targetPiece,
            depthRemaining - 1,
            [...path, serializeContinuationStep(attacker, move)],
            new Set(visited)
        );
        revertSearchMove(state, moveObj, appliedMove);
        if (found) return found;
    }

    return null;
}

function evaluateOpponentContinuationThreat(state, moveObj, appliedMove, staticExchange, profile = null, moveCount = 0) {
    const targetPiece = appliedMove?.activePiece;
    if (!state?.board || !moveObj?.piece || !targetPiece || targetPiece.color !== moveObj.piece.color) {
        return {
            penalty: 0,
            bestCaptureValue: 0,
            routeDepth: 0,
            bestRoute: null
        };
    }

    const targetValue = PIECE_VALUES[targetPiece.type] || 0;
    const captureValue = Number.isFinite(staticExchange?.captureValue) ? Math.max(0, staticExchange.captureValue) : 0;
    const captures = Boolean(staticExchange?.captures && captureValue > 0);
    const lowValueRaid = captures && captureValue <= 20 && targetValue >= 40;

    if (targetValue < 30 || !lowValueRaid) {
        return {
            penalty: 0,
            bestCaptureValue: 0,
            routeDepth: 0,
            bestRoute: null
        };
    }

    const opponentColor = getOppositeColor(moveObj.piece.color);
    const maxDepth = getOpponentContinuationDepth(profile);
    if (maxDepth <= 0) {
        return {
            penalty: 0,
            bestCaptureValue: 0,
            routeDepth: 0,
            bestRoute: null
        };
    }

    const previousTurn = state.currentTurn;
    let bestRoute = null;

    state.currentTurn = opponentColor;
    try {
        const targetRow = targetPiece.row;
        const targetCol = targetPiece.col;
        const candidateAttackers = state.board.pieces
            .filter((piece) => piece.color === opponentColor)
            .filter((piece) => getRouteDistance(piece.row, piece.col, targetRow, targetCol) <= maxDepth * 4 + 2)
            .sort((a, b) => (
                getRouteDistance(a.row, a.col, targetRow, targetCol)
                - getRouteDistance(b.row, b.col, targetRow, targetCol)
            ))
            .slice(0, 10);

        for (const attacker of candidateAttackers) {
            const route = searchSamePieceRouteToTarget(state, attacker, targetPiece, maxDepth);
            if (!route) continue;
            if (!bestRoute || route.depth < bestRoute.depth) bestRoute = route;
        }
    } finally {
        state.currentTurn = previousTurn;
    }

    if (!bestRoute) {
        return {
            penalty: 0,
            bestCaptureValue: 0,
            routeDepth: 0,
            bestRoute: null
        };
    }

    const supportAfter = countPotentialSupportForSquare(
        state,
        targetPiece.row,
        targetPiece.col,
        targetPiece.color,
        targetPiece
    );
    const routeUrgency = bestRoute.depth === 1 ? 1 : (bestRoute.depth === 2 ? 0.68 : 0.46);
    const lowValueMultiplier = lowValueRaid ? 2.35 : 1;
    const supportMultiplier = supportAfter <= 0 ? 2.05 : (supportAfter <= 1 ? 1.75 : (supportAfter <= 2 ? 1.25 : 0.9));
    const openingMultiplier = moveCount <= 10 ? 1.9 : (moveCount <= 18 ? 1.45 : 1);
    const swingValue = targetValue + Math.max(0, targetValue - captureValue) * 0.55;
    const penalty = -swingValue
        * getOpponentContinuationRiskWeight(profile)
        * routeUrgency
        * lowValueMultiplier
        * supportMultiplier
        * openingMultiplier;

    return {
        penalty,
        bestCaptureValue: targetValue,
        routeDepth: bestRoute.depth,
        supportAfter,
        bestRoute: {
            attacker: {
                type: bestRoute.attacker.type,
                row: bestRoute.attacker.row,
                col: bestRoute.attacker.col
            },
            path: bestRoute.path
        }
    };
}

export function buildSearchMoveRiskContext(state, appliedMove, moveObj, profile, searchHistoryHashes = []) {
    const nextHash = buildPositionHash(state);
    const move = {
        fromRow: appliedMove.origRow,
        fromCol: appliedMove.origCol,
        toRow: moveObj.move.row,
        toCol: moveObj.move.col,
        specialMove: moveObj.move.specialMove || null
    };

    const repetitionRisk = analyzeRepetitionRisk({
        nextHash,
        recentPositionHashes: state.aiRecentPositionHashes,
        recentMoves: state.aiRecentMoves,
        move,
        searchHistoryHashes
    });
    const repetitionPenalty = scoreRepetitionPenalty({
        nextHash,
        recentPositionHashes: state.aiRecentPositionHashes,
        recentMoves: state.aiRecentMoves,
        move,
        isWinningSide: isWinningSideState(state, moveObj.piece.color),
        searchHistoryHashes,
        profile
    }) * profile.weights.repetition;

    return {
        nextHash,
        move,
        repetitionRisk,
        repetitionPenalty
    };
}

function revertSearchMove(state, moveObj, appliedMove) {
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

const TACTICAL_CONTINUATION_DEPTH = Object.freeze({
    easy: 0,
    medium: 1,
    hard: 3
});

const FORCED_TACTICAL_EXTENSION_DEPTH = Object.freeze({
    easy: 0,
    medium: 1,
    hard: 1
});

const TACTICAL_CONTINUATION_MAX_MOVES = Object.freeze({
    easy: 0,
    medium: 5,
    hard: 10
});

const QUIESCENCE_NODE_LIMIT = Object.freeze({
    easy: 24,
    medium: 90,
    hard: 180
});

const QUIESCENCE_NEGATIVE_SEE_LIMIT = Object.freeze({
    easy: -140,
    medium: -42,
    hard: -12
});

const QUIESCENCE_RESCUE_VALUE = Object.freeze({
    easy: 140,
    medium: 70,
    hard: 45
});

const QUIESCENCE_MAX_MOVES = Object.freeze({
    easy: 0,
    medium: 4,
    hard: 6
});

const STATIC_EXCHANGE_ROOT_WEIGHT = Object.freeze({
    easy: 0.55,
    medium: 1.1,
    hard: 2.25
});

function resolveSearchProfile(profileInput = 'medium') {
    if (!profileInput || typeof profileInput === 'string') {
        return getAIProfile(profileInput || 'medium');
    }

    return profileInput;
}

function getStaticExchangeRootWeight(profile) {
    const baseId = getProfileBaseId(profile);
    return STATIC_EXCHANGE_ROOT_WEIGHT[baseId] ?? STATIC_EXCHANGE_ROOT_WEIGHT.medium;
}

const ASPIRATION_WINDOW = Object.freeze({
    easy: 90,
    medium: 64,
    hard: 42
});

const LATE_MOVE_REDUCTION_START = Object.freeze({
    easy: Infinity,
    medium: 6,
    hard: 4
});

const SEARCH_EXTENSION_BUDGET = Object.freeze({
    easy: 0,
    medium: 1,
    hard: 2
});

const FUTILITY_MARGIN = Object.freeze({
    easy: 120,
    medium: 86,
    hard: 58
});

const REVERSE_FUTILITY_MARGIN = Object.freeze({
    easy: 170,
    medium: 128,
    hard: 92
});

const PVS_EPSILON = 0.01;

function addSearchStat(searchContext, key, amount = 1) {
    if (!searchContext?.stats || !Number.isFinite(searchContext.stats[key])) return;
    searchContext.stats[key] += amount;
}

function createQuiescenceStats(profile) {
    return {
        quiescenceNodes: 0,
        quiescenceNodeLimit: getQuiescenceNodeLimit(profile),
        quiescenceNodeLimitHits: 0,
        quiescenceCandidateMoves: 0,
        quiescenceNegativeSeeSkips: 0,
        quiescenceCaptureMoves: 0,
        quiescenceCheckMoves: 0,
        quiescenceRoyalThreatMoves: 0,
        quiescenceCitadelThreatMoves: 0,
        quiescenceRescueMoves: 0
    };
}

function createQuiescenceContext(profile) {
    const stats = createQuiescenceStats(profile);
    return {
        nodeLimit: stats.quiescenceNodeLimit,
        rootDepth: null,
        stats
    };
}

function addQuiescenceStat(searchContext, quiescenceContext, key, amount = 1) {
    if (quiescenceContext?.stats && Number.isFinite(quiescenceContext.stats[key])) {
        quiescenceContext.stats[key] += amount;
    }
    addSearchStat(searchContext, key, amount);
}

function syncQuiescenceNodeLimit(searchContext, quiescenceContext) {
    if (
        searchContext?.stats
        && quiescenceContext?.stats
        && Number.isFinite(searchContext.stats.quiescenceNodeLimit)
        && searchContext.stats.quiescenceNodeLimit <= 0
    ) {
        searchContext.stats.quiescenceNodeLimit = quiescenceContext.stats.quiescenceNodeLimit;
    }
}

function getAspirationWindow(profile) {
    const baseId = getProfileBaseId(profile);
    return ASPIRATION_WINDOW[baseId] ?? ASPIRATION_WINDOW.medium;
}

function getSearchExtensionBudget(profile) {
    const baseId = getProfileBaseId(profile);
    return SEARCH_EXTENSION_BUDGET[baseId] ?? SEARCH_EXTENSION_BUDGET.medium;
}

function getQuiescenceNodeLimit(profile) {
    const baseId = getProfileBaseId(profile);
    return QUIESCENCE_NODE_LIMIT[baseId] ?? QUIESCENCE_NODE_LIMIT.medium;
}

function getQuiescenceNegativeSeeLimit(profile) {
    const baseId = getProfileBaseId(profile);
    return QUIESCENCE_NEGATIVE_SEE_LIMIT[baseId] ?? QUIESCENCE_NEGATIVE_SEE_LIMIT.medium;
}

function getQuiescenceRescueValue(profile) {
    const baseId = getProfileBaseId(profile);
    return QUIESCENCE_RESCUE_VALUE[baseId] ?? QUIESCENCE_RESCUE_VALUE.medium;
}

function getQuiescenceMaxMoves(profile) {
    const baseId = getProfileBaseId(profile);
    return QUIESCENCE_MAX_MOVES[baseId] ?? QUIESCENCE_MAX_MOVES.medium;
}

function canUsePrincipalVariationSearch(profile, depth, moveIndex, alpha, beta) {
    const baseId = getProfileBaseId(profile);
    return (
        baseId !== 'easy'
        && moveIndex > 0
        && depth >= 2
        && Number.isFinite(alpha)
        && Number.isFinite(beta)
        && beta > alpha + PVS_EPSILON
    );
}

function getPrincipalVariationNullWindow(isMaximizing, alpha, beta) {
    return isMaximizing
        ? { alpha, beta: Math.min(beta, alpha + PVS_EPSILON) }
        : { alpha: Math.max(alpha, beta - PVS_EPSILON), beta };
}

function shouldResearchPrincipalVariation(usePvs, result, score, alpha, beta) {
    return (
        usePvs
        && !result?.timedOut
        && score > alpha
        && score < beta
    );
}

function getLateMoveReductionStart(profile) {
    const baseId = getProfileBaseId(profile);
    return LATE_MOVE_REDUCTION_START[baseId] ?? LATE_MOVE_REDUCTION_START.medium;
}

function getFutilityMargin(profile, depth) {
    const baseId = getProfileBaseId(profile);
    const baseMargin = FUTILITY_MARGIN[baseId] ?? FUTILITY_MARGIN.medium;
    return baseMargin + Math.max(0, depth - 1) * 34;
}

function getReverseFutilityMargin(profile, depth) {
    const baseId = getProfileBaseId(profile);
    const baseMargin = REVERSE_FUTILITY_MARGIN[baseId] ?? REVERSE_FUTILITY_MARGIN.medium;
    return baseMargin + Math.max(0, depth - 1) * 46;
}

function isForcedTacticalState(state) {
    if (!state?.currentTurn) return false;

    try {
        const validator = new MoveValidator(state);
        if (validator.isCheck(state.currentTurn)) return true;
    } catch {
        return false;
    }

    return countLegalMovesForColor(state, state.currentTurn) <= 2;
}

function getTacticalContinuationDepth(profile, state = null) {
    const baseId = getProfileBaseId(profile);
    const baseDepth = TACTICAL_CONTINUATION_DEPTH[baseId] ?? TACTICAL_CONTINUATION_DEPTH.medium;
    const extension = state && isForcedTacticalState(state)
        ? (FORCED_TACTICAL_EXTENSION_DEPTH[baseId] ?? FORCED_TACTICAL_EXTENSION_DEPTH.medium)
        : 0;

    return Math.min(baseDepth + extension, baseDepth + 2);
}

function getTacticalContinuationMaxMoves(profile) {
    const baseId = getProfileBaseId(profile);
    return TACTICAL_CONTINUATION_MAX_MOVES[baseId] ?? TACTICAL_CONTINUATION_MAX_MOVES.medium;
}

function isPromotionMove(piece, move) {
    return (
        piece?.type === PIECE_TYPES.PAWN
        && ((piece.color === COLORS.BLACK && move?.row === 9) || (piece.color === COLORS.WHITE && move?.row === 0))
    );
}

function moveCreatesRoyalThreat(state, moveObj) {
    const movingColor = moveObj?.piece?.color;
    if (!movingColor) return false;

    const opponentColor = getOppositeColor(movingColor);
    const originalTurn = state.currentTurn;
    const appliedMove = applySearchMove(state, moveObj);
    let createsThreat = false;

    try {
        state.currentTurn = opponentColor;
        const validator = new MoveValidator(state);
        createsThreat = validator.isCheck(opponentColor);
    } finally {
        revertSearchMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;
    }

    return createsThreat;
}

function countLegalAttackersToSquare(state, row, col, attackerColor) {
    if (!state?.board || !attackerColor) return 0;

    const originalTurn = state.currentTurn;
    let attackers = 0;

    try {
        state.currentTurn = attackerColor;
        const validator = new MoveValidator(state);
        const pieces = state.board.pieces.filter((piece) => piece.color === attackerColor);
        for (const piece of pieces) {
            const legalMoves = validator.getLegalMoves(piece.row, piece.col);
            if (legalMoves.some((move) => move.row === row && move.col === col)) attackers++;
        }
    } finally {
        state.currentTurn = originalTurn;
    }

    return attackers;
}

function moveCreatesCitadelThreat(state, moveObj) {
    const { piece, move } = moveObj || {};
    if (!state?.board || !piece || !move || !GameRules.isRoyalType(piece.type)) return false;

    const opponentCitadel = GameRules.getOpponentCitadel(piece.color);
    if (!opponentCitadel) return false;
    if (move.row === opponentCitadel.row && move.col === opponentCitadel.col) return true;

    return (
        Math.abs(move.row - opponentCitadel.row) <= 1
        && Math.abs(move.col - opponentCitadel.col) <= 1
        && state.board.isEmpty(opponentCitadel.row, opponentCitadel.col)
    );
}

function isValuableRescueMove(state, moveObj, profile = null) {
    const { piece, move } = moveObj || {};
    if (!state?.board || !piece || !move) return false;
    if (GameRules.isRoyalType(piece.type)) return false;
    if (move.specialMove) return false;

    const targetPiece = state.board.getPieceAt(move.row, move.col);
    if (targetPiece && targetPiece.color !== piece.color) return false;

    const pieceValue = PIECE_VALUES[piece.type] || 0;
    if (pieceValue < getQuiescenceRescueValue(profile)) return false;

    const enemyColor = getOppositeColor(piece.color);
    const attackedBefore = countLegalAttackersToSquare(state, piece.row, piece.col, enemyColor) > 0;
    if (!attackedBefore) return false;

    const originalTurn = state.currentTurn;
    const appliedMove = applySearchMove(state, moveObj);
    let safeAfter = false;

    try {
        const activePiece = appliedMove.activePiece || state.board.getPieceAt(move.row, move.col);
        if (activePiece) {
            safeAfter = countLegalAttackersToSquare(state, activePiece.row, activePiece.col, enemyColor) === 0;
        }
    } finally {
        revertSearchMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;
    }

    return safeAfter;
}

function classifyQuiescenceMove(state, moveObj, profile = null, options = {}) {
    const { piece, move } = moveObj || {};
    const includeRescue = options.includeRescue !== false;
    if (!piece || !move) {
        return {
            tactical: false,
            captures: false,
            givesCheck: false,
            royalThreat: false,
            citadelThreat: false,
            rescue: false,
            staticExchange: null
        };
    }

    const targetPiece = state.board.getPieceAt(move.row, move.col);
    const captures = Boolean(targetPiece && targetPiece.color !== piece.color);
    const special = move.specialMove === 'royal_swap' || move.specialMove === 'citadel_exchange';
    const promotion = isPromotionMove(piece, move);
    const royalThreat = moveCreatesRoyalThreat(state, moveObj);
    const citadelThreat = moveCreatesCitadelThreat(state, moveObj);
    const rescue = includeRescue && isValuableRescueMove(state, moveObj, profile);
    const staticExchange = captures ? evaluateStaticExchangeForMove(state, moveObj, profile) : null;

    return {
        tactical: captures || special || promotion || royalThreat || citadelThreat || rescue,
        captures,
        givesCheck: royalThreat,
        royalThreat,
        citadelThreat,
        rescue,
        special,
        promotion,
        targetPiece,
        staticExchange
    };
}

function isTacticalContinuationMove(state, moveObj, profile = null) {
    return classifyQuiescenceMove(state, moveObj, profile, { includeRescue: false }).tactical;
}

function shouldSkipQuiescenceCapture(traits, profile) {
    if (!traits?.captures || !traits.staticExchange) return false;
    if (traits.givesCheck || traits.royalThreat || traits.citadelThreat) return false;
    if (traits.targetPiece && GameRules.isRoyalType(traits.targetPiece.type)) return false;

    return traits.staticExchange.score < getQuiescenceNegativeSeeLimit(profile);
}

function shouldExtendSearchMove(state, moveObj, profile, extensionBudget = 0) {
    if (extensionBudget <= 0) return false;
    return isTacticalContinuationMove(state, moveObj, profile);
}

function shouldReduceLateMove(state, moveObj, profile, {
    depth,
    moveIndex,
    extension,
    ply,
    allowRoot = false
} = {}) {
    if (extension > 0) return false;
    if (depth < 2 || (!allowRoot && ply < 1)) return false;
    if (moveIndex < getLateMoveReductionStart(profile)) return false;
    if (isForcedTacticalState(state)) return false;
    if (isTacticalContinuationMove(state, moveObj, profile)) return false;
    return true;
}

function canUseSearchPruningWindow(depth, ply, alpha, beta) {
    return (
        ply > 0
        && depth > 0
        && depth <= 2
        && Number.isFinite(alpha)
        && Number.isFinite(beta)
        && beta > alpha
    );
}

function tryReverseFutilityPrune(state, {
    depth,
    ply,
    alpha,
    beta,
    isMaximizing,
    profile,
    searchContext
}) {
    if (!canUseSearchPruningWindow(depth, ply, alpha, beta)) return null;
    if (isForcedTacticalState(state)) return null;

    const staticScore = evaluateStateForBlack(state, profile);
    const margin = getReverseFutilityMargin(profile, depth);
    const failHigh = isMaximizing && staticScore - margin >= beta;
    const failLow = !isMaximizing && staticScore + margin <= alpha;
    if (!failHigh && !failLow) {
        return { pruned: false, staticScore };
    }

    addSearchStat(searchContext, 'reverseFutilityPrunes');
    addSearchStat(searchContext, 'failSoftCutoffs');
    return {
        pruned: true,
        score: staticScore,
        staticScore
    };
}

function shouldFutilityPruneMove(state, moveObj, {
    depth,
    ply,
    moveIndex,
    alpha,
    beta,
    isMaximizing,
    profile,
    staticScore,
    searchContext
}) {
    if (moveIndex <= 0) return false;
    if (!canUseSearchPruningWindow(depth, ply, alpha, beta)) return false;
    if (isForcedTacticalState(state)) return false;

    const margin = getFutilityMargin(profile, depth);
    const wouldPrune = isMaximizing
        ? staticScore + margin <= alpha
        : staticScore - margin >= beta;
    if (!wouldPrune) return false;

    if (isTacticalContinuationMove(state, moveObj, profile)) {
        addSearchStat(searchContext, 'futilityTacticalGuards');
        return false;
    }

    addSearchStat(searchContext, 'futilityPrunes');
    return true;
}

function recordQuiescenceMoveStats(searchContext, quiescenceContext, traits) {
    addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceCandidateMoves');
    if (traits?.captures) addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceCaptureMoves');
    if (traits?.givesCheck) addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceCheckMoves');
    if (traits?.royalThreat) addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceRoyalThreatMoves');
    if (traits?.citadelThreat) addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceCitadelThreatMoves');
    if (traits?.rescue) addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceRescueMoves');
}

function collectTacticalContinuationMoves(
    state,
    isMaximizing,
    profile,
    searchContext = null,
    quiescenceContext = null,
    options = {}
) {
    const maxMoves = Math.min(
        getTacticalContinuationMaxMoves(profile),
        getQuiescenceMaxMoves(profile)
    );
    if (maxMoves <= 0) return [];
    const moves = collectMoves(state);
    const forcedTactical = isForcedTacticalState(state);
    const tacticalMoves = [];

    for (const moveObj of moves) {
        const traits = classifyQuiescenceMove(state, moveObj, profile, {
            includeRescue: options.includeRescue !== false
        });
        if (!forcedTactical && !traits.tactical) continue;
        if (!forcedTactical && shouldSkipQuiescenceCapture(traits, profile)) {
            addQuiescenceStat(searchContext, quiescenceContext, 'quiescenceNegativeSeeSkips');
            continue;
        }

        recordQuiescenceMoveStats(searchContext, quiescenceContext, traits);
        tacticalMoves.push(moveObj);
    }

    return sortMovesForSearch(
        state,
        tacticalMoves,
        isMaximizing,
        profile,
        null,
        searchContext
    ).slice(0, maxMoves);
}

function quiescenceSearchForBlack(
    state,
    alpha,
    beta,
    isMaximizing,
    profile,
    depth,
    searchHistoryHashes = [],
    searchDeadline = null,
    searchContext = null,
    quiescenceContext = null
) {
    const activeQuiescenceContext = quiescenceContext || createQuiescenceContext(profile);
    if (!Number.isFinite(activeQuiescenceContext.rootDepth)) {
        activeQuiescenceContext.rootDepth = depth;
    }
    syncQuiescenceNodeLimit(searchContext, activeQuiescenceContext);
    if (activeQuiescenceContext.stats.quiescenceNodes >= activeQuiescenceContext.nodeLimit) {
        addQuiescenceStat(searchContext, activeQuiescenceContext, 'quiescenceNodeLimitHits');
        return { score: evaluateStateForBlack(state, profile) };
    }
    addQuiescenceStat(searchContext, activeQuiescenceContext, 'quiescenceNodes');

    if (searchDeadline?.isExpired()) {
        return {
            score: evaluateStateForBlack(state, profile),
            timedOut: true
        };
    }

    if (state.status === 'game_over') {
        return {
            score: scoreTerminalStateForBlack(state, profile, depth)
        };
    }

    const standPat = evaluateStateForBlack(state, profile);
    if (depth <= 0) {
        return { score: standPat };
    }

    const moves = collectTacticalContinuationMoves(
        state,
        isMaximizing,
        profile,
        searchContext,
        activeQuiescenceContext,
        {
            includeRescue: depth >= activeQuiescenceContext.rootDepth
        }
    );
    if (!moves.length) {
        return { score: standPat };
    }

    let bestScore = standPat;
    if (isMaximizing) {
        alpha = Math.max(alpha, bestScore);
    } else {
        beta = Math.min(beta, bestScore);
    }

    for (const moveObj of moves) {
        if (searchDeadline?.isExpired()) {
            return { score: bestScore, timedOut: true };
        }

        const appliedMove = applySearchMove(state, moveObj);
        const originalTurn = state.currentTurn;
        state.currentTurn = originalTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        const terminalState = applySearchTerminalState(state, state.currentTurn);
        const { nextHash, repetitionPenalty } = buildSearchMoveRiskContext(
            state,
            appliedMove,
            moveObj,
            profile,
            searchHistoryHashes
        );

        const result = quiescenceSearchForBlack(
            state,
            alpha,
            beta,
            !isMaximizing,
            profile,
            depth - 1,
            [...searchHistoryHashes, nextHash],
            searchDeadline,
            searchContext,
            activeQuiescenceContext
        );

        revertSearchTerminalState(state, terminalState);
        revertSearchMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (result.timedOut) {
            return { score: bestScore, timedOut: true };
        }

        const score = result.score + repetitionPenalty;
        if (isMaximizing) {
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, bestScore);
        } else {
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, bestScore);
        }

        if (beta <= alpha) break;
    }

    return { score: bestScore };
}

export function evaluateTacticalContinuationForBlack(state, profileInput = 'medium') {
    return evaluateTacticalContinuationDetailsForBlack(state, profileInput).score;
}

export function evaluateTacticalContinuationDetailsForBlack(state, profileInput = 'medium') {
    const profile = resolveSearchProfile(profileInput);
    const depth = getTacticalContinuationDepth(profile, state);
    const quiescenceContext = createQuiescenceContext(profile);
    if (depth <= 0) {
        return {
            score: evaluateStateForBlack(state, profile),
            stats: quiescenceContext.stats
        };
    }

    const result = quiescenceSearchForBlack(
        state,
        -Infinity,
        Infinity,
        state.currentTurn === COLORS.BLACK,
        profile,
        depth,
        [],
        null,
        null,
        quiescenceContext
    );

    return {
        score: result.score,
        stats: quiescenceContext.stats
    };
}

function minimax(
    state,
    depth,
    alpha,
    beta,
    isMaximizing,
    transpositionTable,
    profile,
    searchHistoryHashes = [],
    searchDeadline = null,
    searchContext = null,
    ply = 0,
    extensionBudget = getSearchExtensionBudget(profile)
) {
    if (searchDeadline?.isExpired()) {
        return {
            score: evaluateStateForBlack(state, profile),
            timedOut: true
        };
    }

    if (state.status === 'game_over') {
        return {
            score: scoreTerminalStateForBlack(state, profile, depth)
        };
    }

    if (depth === 0) {
        return quiescenceSearchForBlack(
            state,
            alpha,
            beta,
            isMaximizing,
            profile,
            getTacticalContinuationDepth(profile, state),
            searchHistoryHashes,
            searchDeadline,
            searchContext
        );
    }

    const originalAlpha = alpha;
    const originalBeta = beta;
    const transpositionKey = buildTranspositionKey(state, isMaximizing, profile, searchHistoryHashes);
    const cachedEntry = probeTranspositionEntry(transpositionTable, transpositionKey, {
        depth,
        alpha,
        beta
    });
    if (cachedEntry.usable) {
        if (searchContext?.stats) searchContext.stats.transpositionHits++;
        return {
            score: cachedEntry.score,
            move: cachedEntry.move
        };
    }

    const reverseFutility = tryReverseFutilityPrune(state, {
        depth,
        ply,
        alpha,
        beta,
        isMaximizing,
        profile,
        searchContext
    });
    if (reverseFutility?.pruned) {
        return { score: reverseFutility.score };
    }
    const staticSearchScore = Number.isFinite(reverseFutility?.staticScore)
        ? reverseFutility.staticScore
        : evaluateStateForBlack(state, profile);

    let moves = collectMoves(state);
    if (!moves.length) {
        return { score: isMaximizing ? -100000 : 100000 };
    }

    let bestMove = null;
    let bestScore = isMaximizing ? -Infinity : Infinity;
    const positionMemoryKey = buildSearchMemoryPositionKey(state, profile, isMaximizing);
    moves = limitSearchMoves(
        sortMovesForSearch(state, moves, isMaximizing, profile, cachedEntry.move, searchContext, {
            ply,
            depth,
            positionMemoryKey,
            searchHistoryHashes
        }),
        profile,
        'branchMoveLimit'
    );

    for (const [moveIndex, moveObj] of moves.entries()) {
        if (searchDeadline?.isExpired()) {
            return { score: bestScore, move: bestMove, timedOut: true };
        }

        if (shouldFutilityPruneMove(state, moveObj, {
            depth,
            ply,
            moveIndex,
            alpha,
            beta,
            isMaximizing,
            profile,
            staticScore: staticSearchScore,
            searchContext
        })) {
            continue;
        }

        const extension = shouldExtendSearchMove(state, moveObj, profile, extensionBudget) ? 1 : 0;
        const nextExtensionBudget = Math.max(0, extensionBudget - extension);
        if (extension) addSearchStat(searchContext, 'searchExtensions');

        const fullChildDepth = Math.max(0, depth - 1 + extension);
        const reduced = shouldReduceLateMove(state, moveObj, profile, {
            depth,
            moveIndex,
            extension,
            ply
        });
        const childDepth = reduced ? Math.max(0, fullChildDepth - 1) : fullChildDepth;
        if (reduced) addSearchStat(searchContext, 'lateMoveReductions');

        const appliedMove = applySearchMove(state, moveObj);
        const originalTurn = state.currentTurn;
        state.currentTurn = originalTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        const terminalState = applySearchTerminalState(state, state.currentTurn);

        const { nextHash, repetitionPenalty } = buildSearchMoveRiskContext(state, appliedMove, moveObj, profile, searchHistoryHashes);

        const childHistory = [...searchHistoryHashes, nextHash];
        const searchChild = (childAlpha, childBeta, nextDepth) => minimax(
            state,
            nextDepth,
            childAlpha,
            childBeta,
            !isMaximizing,
            transpositionTable,
            profile,
            childHistory,
            searchDeadline,
            searchContext,
            ply + 1,
            nextExtensionBudget
        );

        let result = null;
        const usePvs = !reduced && canUsePrincipalVariationSearch(profile, depth, moveIndex, alpha, beta);
        if (usePvs) {
            addSearchStat(searchContext, 'pvsNullWindowSearches');
            const nullWindow = getPrincipalVariationNullWindow(isMaximizing, alpha, beta);
            result = searchChild(nullWindow.alpha, nullWindow.beta, childDepth);
        } else {
            result = searchChild(alpha, beta, childDepth);
        }

        let scoreWithProfile = result.score + repetitionPenalty;
        const pvsNeedsResearch = shouldResearchPrincipalVariation(usePvs, result, scoreWithProfile, alpha, beta);

        const lmrNeedsResearch = (
            reduced
            && !result.timedOut
            && (
                (isMaximizing && scoreWithProfile > alpha)
                || (!isMaximizing && scoreWithProfile < beta)
            )
        );

        if (pvsNeedsResearch || lmrNeedsResearch) {
            if (pvsNeedsResearch) addSearchStat(searchContext, 'pvsResearches');
            if (lmrNeedsResearch) addSearchStat(searchContext, 'lateMoveResearches');
            result = searchChild(alpha, beta, fullChildDepth);
            scoreWithProfile = result.score + repetitionPenalty;
        }

        revertSearchTerminalState(state, terminalState);
        revertSearchMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (result.timedOut) {
            return { score: bestScore, move: bestMove, timedOut: true };
        }

        if (isMaximizing) {
            if (scoreWithProfile > bestScore) {
                bestScore = scoreWithProfile;
                bestMove = moveObj;
            }
            alpha = Math.max(alpha, bestScore);
        } else {
            if (scoreWithProfile < bestScore) {
                bestScore = scoreWithProfile;
                bestMove = moveObj;
            }
            beta = Math.min(beta, bestScore);
        }

        if (beta <= alpha) {
            recordSearchCutoff(searchContext, moveObj, depth, ply, isMaximizing, state, searchHistoryHashes);
            break;
        }
    }

    rememberSearchOrderingSuccess(searchContext, state, bestMove, depth, searchHistoryHashes);
    rememberBestMove(searchContext, positionMemoryKey, bestMove);
    const bound = bestScore <= originalAlpha
        ? TRANSPOSITION_BOUNDS.UPPER
        : (bestScore >= originalBeta ? TRANSPOSITION_BOUNDS.LOWER : TRANSPOSITION_BOUNDS.EXACT);
    storeSearchTranspositionEntry(transpositionTable, transpositionKey, {
        depth,
        bound,
        score: bestScore,
        move: serializeMoveChoice(bestMove)
    }, searchContext);

    return { score: bestScore, move: bestMove };
}

function evaluateRootCandidates(
    state,
    depth,
    transpositionTable,
    profile,
    searchDeadline = null,
    searchContext = null,
    searchBounds = null,
    priorityMove = null
) {
    const rootPositionMemoryKey = buildSearchMemoryPositionKey(state, profile, true);
    const moveCount = getStateMoveCount(state);
    const moves = limitSearchMoves(
        sortMovesForSearch(state, collectMoves(state), true, profile, priorityMove, searchContext, {
            ply: 0,
            depth,
            positionMemoryKey: rootPositionMemoryKey,
            isRoot: true
        }),
        profile,
        'rootMoveLimit'
    );
    const candidates = [];
    const searchAlpha = Number.isFinite(searchBounds?.alpha) ? searchBounds.alpha : -Infinity;
    const searchBeta = Number.isFinite(searchBounds?.beta) ? searchBounds.beta : Infinity;
    let alpha = searchAlpha;
    const beta = searchBeta;
    let timedOut = false;

    for (const [moveIndex, moveObj] of moves.entries()) {
        if (searchDeadline?.isExpired()) {
            timedOut = true;
            break;
        }

        const targetPieceBeforeMove = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
        const captures = Boolean(targetPieceBeforeMove && targetPieceBeforeMove.color !== moveObj.piece.color);
        const captureValue = captures ? (PIECE_VALUES[targetPieceBeforeMove.type] || 0) : 0;
        const staticExchange = evaluateStaticExchangeForMove(state, moveObj, profile);
        const tacticalMotifs = analyzeTacticalMotifsForMove(state, moveObj, profile);
        const middleGameMove = analyzeMiddleGameMove(state, moveObj, profile);
        const rootExtensionBudget = getSearchExtensionBudget(profile);
        const extension = shouldExtendSearchMove(state, moveObj, profile, rootExtensionBudget) ? 1 : 0;
        const nextExtensionBudget = Math.max(0, rootExtensionBudget - extension);
        if (extension) addSearchStat(searchContext, 'searchExtensions');
        const fullChildDepth = Math.max(0, depth - 1 + extension);
        const reduced = shouldReduceLateMove(state, moveObj, profile, {
            depth,
            moveIndex,
            extension,
            ply: 0,
            allowRoot: true
        });
        const childDepth = reduced ? Math.max(0, fullChildDepth - 1) : fullChildDepth;
        if (reduced) addSearchStat(searchContext, 'lateMoveReductions');
        const tracksTempo = getProfileBaseId(profile) !== 'easy';
        const wasMovedBefore = Boolean(moveObj.piece.hasMoved);
        const ownMobilityBefore = tracksTempo ? countLegalMovesForColor(state, moveObj.piece.color) : 0;
        const appliedMove = applySearchMove(state, moveObj);
        const originalTurn = state.currentTurn;
        state.currentTurn = originalTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        const terminalState = applySearchTerminalState(state, state.currentTurn);

        const { nextHash, repetitionRisk, repetitionPenalty } = buildSearchMoveRiskContext(state, appliedMove, moveObj, profile);
        const endgamePlan = analyzeEndgameMoveOutcome(state, moveObj, profile, terminalState);
        const endgameOutcomeScore = endgamePlan.score;
        const tacticalRisk = evaluateTacticalRisk(state, moveObj.piece.color, appliedMove.activePiece);
        const opponentReplyThreat = evaluateOpponentReplyThreat(state, moveObj.piece.color, profile);
        const opponentContinuationThreat = evaluateOpponentContinuationThreat(
            state,
            moveObj,
            appliedMove,
            staticExchange,
            profile,
            moveCount
        );
        const opponentColor = getOppositeColor(moveObj.piece.color);
        const givesCheck = withTurn(state, opponentColor, () => new MoveValidator(state).isCheck(opponentColor));
        const opponentMobility = countLegalMovesForColor(state, opponentColor);
        const terminalWin = Boolean(terminalState?.resultType && state.winner === moveObj.piece.color);
        const ownMobilityAfter = tracksTempo ? countLegalMovesForColor(state, moveObj.piece.color) : ownMobilityBefore;
        const quietMoveOpponentFreedom = (!captures && !givesCheck && !terminalWin)
            ? Math.max(0, opponentMobility - 16) * 0.35
            : 0;
        const tempoLoss = tracksTempo
            ? Math.max(0, ownMobilityBefore - ownMobilityAfter) + quietMoveOpponentFreedom
            : 0;
        const planMetrics = buildRootMovePlanMetrics(state, moveObj, appliedMove, {
            wasMovedBefore,
            captures,
            givesCheck,
            terminalWin,
            ownMobilityBefore,
            ownMobilityAfter,
            opponentMobility,
            staticExchange,
            opponentReplyThreat,
            tacticalRisk
        });
        const clockPressure = scoreOpponentClockPressureMove({
            timeBudget: profile.timeBudget,
            profile,
            moveTraits: {
                captures,
                captureValue,
                givesCheck,
                opponentMobility,
                opponentReplyBestCaptureValue: opponentReplyThreat.bestCaptureValue,
                terminalWin,
                specialMove: moveObj.move.specialMove || null
            }
        });

        const result = depth > 1
            ? (() => {
                const childHistory = [nextHash];
                const searchChild = (childAlpha, childBeta, nextDepth) => minimax(
                    state,
                    nextDepth,
                    childAlpha,
                    childBeta,
                    false,
                    transpositionTable,
                    profile,
                    childHistory,
                    searchDeadline,
                    searchContext,
                    1,
                    nextExtensionBudget
                );

                const usePvs = !reduced && canUsePrincipalVariationSearch(profile, depth, moveIndex, alpha, beta);
                let childResult = null;
                if (usePvs) {
                    addSearchStat(searchContext, 'pvsNullWindowSearches');
                    const nullWindow = getPrincipalVariationNullWindow(true, alpha, beta);
                    childResult = searchChild(nullWindow.alpha, nullWindow.beta, childDepth);
                } else {
                    childResult = searchChild(alpha, beta, childDepth);
                }

                const scoreWithRootAdjustments = (
                    childResult.score
                    + repetitionPenalty
                    + endgameOutcomeScore
                    + opponentReplyThreat.penalty
                    + opponentContinuationThreat.penalty
                    + clockPressure.bonus
                    + staticExchange.score * getStaticExchangeRootWeight(profile)
                    + tacticalMotifs.score
                    + middleGameMove.score
                );
                const pvsNeedsResearch = shouldResearchPrincipalVariation(
                    usePvs,
                    childResult,
                    scoreWithRootAdjustments,
                    alpha,
                    beta
                );
                const lmrNeedsResearch = (
                    reduced
                    && !childResult.timedOut
                    && scoreWithRootAdjustments > alpha
                );

                if (pvsNeedsResearch || lmrNeedsResearch) {
                    if (pvsNeedsResearch) addSearchStat(searchContext, 'pvsResearches');
                    if (lmrNeedsResearch) addSearchStat(searchContext, 'lateMoveResearches');
                    childResult = searchChild(alpha, beta, fullChildDepth);
                }

                return childResult;
            })()
            : { score: evaluateStateForBlack(state, profile) };

        revertSearchTerminalState(state, terminalState);
        revertSearchMove(state, moveObj, appliedMove);
        state.currentTurn = originalTurn;

        if (result.timedOut) {
            timedOut = true;
            break;
        }

        const baseScore = (
            result.score
            + repetitionPenalty
            + endgameOutcomeScore
            + opponentReplyThreat.penalty
            + opponentContinuationThreat.penalty
            + clockPressure.bonus
            + staticExchange.score * getStaticExchangeRootWeight(profile)
            + tacticalMotifs.score
            + middleGameMove.score
        );
        const candidate = {
            score: baseScore,
            move: moveObj,
            repetitionRisk,
            tacticalRisk,
            staticExchange,
            tacticalMotifs,
            middleGameMove,
            endgamePlan,
            opponentReplyThreat,
            opponentContinuationThreat,
            clockPressure,
            metadata: {
                isWinningSide: isWinningSideState(state, moveObj.piece.color),
                moveCount,
                captures,
                givesCheck,
                opponentMobility,
                ownMobilityBefore,
                ownMobilityAfter,
                ...planMetrics,
                tempoLoss,
                staticExchangeScore: staticExchange.score,
                exchangeDebt: staticExchange.exchangeDebt ?? Math.max(0, -staticExchange.score),
                captureTreeDepth: staticExchange.captureTreeDepth ?? staticExchange.sequenceDepth ?? 0,
                seeMethod: staticExchange.method || null,
                middleGameScore: middleGameMove.score,
                middleGameMotifs: middleGameMove.motifs,
                middleGamePlan: middleGameMove.plan?.id || null,
                terminalWin,
                terminalResultType: terminalState?.resultType || null
            }
        };
        const styleAdjustment = scoreCandidateDecisionStyle(candidate, profile);
        candidate.baseScore = baseScore;
        candidate.score = baseScore + styleAdjustment.score;
        candidate.styleAdjustment = styleAdjustment;
        candidates.push(candidate);
        alpha = Math.max(alpha, candidate.score);
        if (beta <= alpha) break;
    }

    const sortedCandidates = candidates.sort((a, b) => b.score - a.score);
    if (sortedCandidates[0]) rememberBestMove(searchContext, rootPositionMemoryKey, sortedCandidates[0].move);
    const bestScore = sortedCandidates[0]?.score ?? null;

    return {
        candidates: sortedCandidates,
        completed: !timedOut,
        timedOut,
        failedLow: Number.isFinite(searchAlpha) && Number.isFinite(bestScore) && bestScore <= searchAlpha,
        failedHigh: Number.isFinite(searchBeta) && Number.isFinite(bestScore) && bestScore >= searchBeta
    };
}

function evaluateRootCandidatesIteratively(
    state,
    targetDepth,
    transpositionTable,
    profile,
    searchDeadline = null,
    searchContext = null,
    priorityMove = null
) {
    let bestCompletedCandidates = [];
    let completedDepth = 0;
    let timeExpired = false;
    let previousBestScore = null;

    for (let depth = 1; depth <= targetDepth; depth++) {
        const depthDeadline = depth === 1 ? null : searchDeadline;
        const aspirationWindow = getAspirationWindow(profile);
        const useAspiration = depth > 1 && Number.isFinite(previousBestScore);
        let result = null;

        if (useAspiration) {
            addSearchStat(searchContext, 'aspirationWindows');
            const bounds = {
                alpha: previousBestScore - aspirationWindow,
                beta: previousBestScore + aspirationWindow
            };
            result = evaluateRootCandidates(state, depth, transpositionTable, profile, depthDeadline, searchContext, bounds, priorityMove);

            if (result.completed && !result.timedOut && (result.failedLow || result.failedHigh)) {
                addSearchStat(searchContext, 'aspirationResearches');
                if (result.failedLow) addSearchStat(searchContext, 'aspirationFailLow');
                if (result.failedHigh) addSearchStat(searchContext, 'aspirationFailHigh');
                result = evaluateRootCandidates(state, depth, transpositionTable, profile, depthDeadline, searchContext, null, priorityMove);
            }
        } else {
            result = evaluateRootCandidates(state, depth, transpositionTable, profile, depthDeadline, searchContext, null, priorityMove);
        }

        if (result.completed && result.candidates.length) {
            bestCompletedCandidates = result.candidates;
            completedDepth = depth;
            previousBestScore = result.candidates[0]?.score ?? previousBestScore;
        } else {
            timeExpired = Boolean(result.timedOut || searchDeadline?.expired);
            if (!bestCompletedCandidates.length && result.candidates.length) {
                bestCompletedCandidates = result.candidates;
                completedDepth = depth;
                previousBestScore = result.candidates[0]?.score ?? previousBestScore;
            }
            break;
        }

        if (depth < targetDepth && searchDeadline?.isExpired()) {
            timeExpired = true;
            break;
        }
    }

    return {
        candidates: bestCompletedCandidates,
        completedDepth,
        targetDepth,
        timeExpired
    };
}

const OPENING_BOOK_SCORE_WINDOW = Object.freeze({
    easy: 72,
    medium: 40,
    hard: 70
});

const OPENING_BOOK_TACTICAL_WINDOW = Object.freeze({
    easy: 48,
    medium: 20,
    hard: 4
});

const OPENING_BOOK_REPLY_RISK_LIMIT = Object.freeze({
    easy: 110,
    medium: 58,
    hard: 24
});

const OPENING_BOOK_EXCHANGE_DEBT_LIMIT = Object.freeze({
    easy: 70,
    medium: 34,
    hard: 12
});

function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function clampOpeningTrust(value, fallback = 1) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(0.15, Math.min(1.15, value));
}

function copyOpeningMetadata(targetMove, openingMove) {
    if (!targetMove || !openingMove) return targetMove;

    return {
        piece: targetMove.piece,
        move: targetMove.move,
        openingBook: true,
        openingId: openingMove.openingId,
        openingName: openingMove.openingName,
        openingMoveIndex: openingMove.openingMoveIndex,
        openingLineId: openingMove.openingLineId || null,
        openingConfidence: openingMove.openingConfidence ?? null,
        openingPriority: openingMove.openingPriority ?? null,
        openingTransition: Boolean(openingMove.openingTransition),
        openingPlan: openingMove.openingPlan || null,
        openingPositionHash: openingMove.openingPositionHash || null,
        openingStats: openingMove.openingStats || null,
        openingDataScore: openingMove.openingDataScore ?? null
    };
}

export function selectOpeningCandidateIfSafe(candidates = [], openingMove = null, profile = null) {
    if (!openingMove || !candidates.length) return null;

    const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score);
    const bestScore = sortedCandidates[0]?.score ?? -Infinity;
    const openingCandidate = sortedCandidates.find((candidate) => isMatchingMove(candidate.move, serializeMoveChoice(openingMove)));
    if (!openingCandidate) return null;

    const baseId = getProfileBaseId(profile);
    const baseScoreWindow = OPENING_BOOK_SCORE_WINDOW[baseId] ?? OPENING_BOOK_SCORE_WINDOW.medium;
    const bookConfidence = clampOpeningTrust(openingMove.openingConfidence, 1);
    const transitionTrust = openingMove.openingTransition ? 0.55 : 1;
    const openingTrust = Math.max(0.25, Math.min(1.15, bookConfidence * transitionTrust));
    const scoreWindowFloor = baseId === 'hard' ? 6 : (baseId === 'medium' ? 12 : 18);
    const scoreWindow = openingMove.openingTransition && bookConfidence < 0.6
        ? scoreWindowFloor
        : Math.max(scoreWindowFloor, baseScoreWindow * openingTrust);
    if (openingCandidate.score < bestScore - scoreWindow) return null;

    const bestCandidate = sortedCandidates[0];
    const bestIsTacticalOpportunity = Boolean(bestCandidate?.metadata?.captures);
    const openingIsTacticalOpportunity = Boolean(openingCandidate?.metadata?.captures);
    const baseTacticalWindow = OPENING_BOOK_TACTICAL_WINDOW[baseId] ?? OPENING_BOOK_TACTICAL_WINDOW.medium;
    const tacticalWindow = Math.max(2, baseTacticalWindow * Math.max(0.45, openingTrust));
    if (
        bestIsTacticalOpportunity
        && !openingIsTacticalOpportunity
        && openingCandidate.score < bestScore - tacticalWindow
    ) {
        return null;
    }

    const maxDangerLevel = Number.isFinite(profile?.selection?.maxDangerLevel)
        ? profile.selection.maxDangerLevel
        : (baseId === 'hard' ? 1 : 2);
    const dangerLevel = openingCandidate.tacticalRisk?.dangerLevel ?? 0;
    if (dangerLevel > maxDangerLevel) return null;

    const replyRiskLimit = Math.min(
        Number.isFinite(profile?.selection?.maxReplyCaptureValue)
            ? profile.selection.maxReplyCaptureValue
            : Infinity,
        OPENING_BOOK_REPLY_RISK_LIMIT[baseId] ?? OPENING_BOOK_REPLY_RISK_LIMIT.medium
    );
    const exchangeDebtLimit = OPENING_BOOK_EXCHANGE_DEBT_LIMIT[baseId] ?? OPENING_BOOK_EXCHANGE_DEBT_LIMIT.medium;
    const replyCaptureValue = openingCandidate.opponentReplyThreat?.bestCaptureValue ?? 0;
    const exchangeDebt = openingCandidate.staticExchange?.exchangeDebt ?? Math.max(0, -(openingCandidate.staticExchange?.score ?? 0));
    if (openingCandidate.staticExchange?.favorable === false && exchangeDebt > exchangeDebtLimit) return null;
    if (replyCaptureValue > replyRiskLimit && exchangeDebt > exchangeDebtLimit) return null;

    return {
        ...openingCandidate,
        move: copyOpeningMetadata(openingCandidate.move, openingMove)
    };
}

function selectBlackMoveAnalysisForState(gameState, options = {}) {
    if (!gameState || gameState.currentTurn !== COLORS.BLACK || gameState.isGameOver?.()) return null;

    const profile = getAIProfile(gameState.difficulty || 'medium', gameState.aiPersonaId, gameState.aiBotId);
    const searchPlan = getTimeAdjustedSearchPlan(gameState, profile);
    const depth = searchPlan.depth;
    const searchProfile = searchPlan.profile;
    const searchMemory = resolveAiSearchMemory(gameState, searchProfile, options);
    searchMemory.transpositionAge += 1;
    const searchContext = {
        memory: searchMemory,
        stats: createSearchMemoryStats(searchMemory)
    };
    const transpositionTable = searchMemory.transpositionTable;
    const maxThinkMs = Number.isFinite(options.maxThinkMs)
        ? options.maxThinkMs
        : searchPlan.budget.maxThinkMs;
    const searchDeadline = createSearchDeadline(maxThinkMs, options.now || getSearchNow);

    // =============================================================
    // MAT ARAMA HOOK (Faz 13)
    // -------------------------------------------------------------
    // Az taşlı pozisyonlarda, normal aramaya başlamadan önce
    // zorunlu mat dizisi var mı kontrol et. Bulunursa direkt o
    // hamleyi döndür — derin arama gerekmez.
    //
    // Sadece "winning side" pozisyonlarda çalışır (taş üstünlüğü).
    // Time budget'in kontrollu bir bolumunu kullanir.
    // =============================================================
    if (!options.disableEndgameShortcuts
        && isWinningSideState(gameState, COLORS.BLACK)
        && isPositionMateSearchEligible(gameState, COLORS.BLACK)) {
        const mateNow = options.now || getSearchNow;
        // Endgame pozisyonlarında mat-arama kritik: düşük think-ms gelse bile
        // kısa ama gerçek bir pencere veriyoruz.
        const mateBudget = Math.max(650, Math.min(maxThinkMs * 0.55, 2600));
        const mateDeadline = mateNow() + mateBudget;
        const mateResult = findForcedMate(gameState, COLORS.BLACK, {
            deadline: mateDeadline,
            maxDepth: 16,
            maxNodes: 1_400_000,
            now: mateNow
        });
        if (mateResult?.mate && mateResult.move) {
            const rootPositionMemoryKey = buildSearchMemoryPositionKey(gameState, searchProfile, true);
            rememberBestMove(searchContext, rootPositionMemoryKey, mateResult.move);
            return {
                move: mateResult.move,
                searchInfo: {
                    mateFound: true,
                    matePlies: mateResult.plies,
                    mateDepth: mateResult.depthSearched,
                    mateNodes: mateResult.nodes,
                    usedOpeningBook: false,
                    candidateCount: 1,
                    memory: summarizeSearchMemory(searchContext)
                }
            };
        }
    }

    const miniTablebaseMove = options.disableEndgameShortcuts
        ? null
        : selectMiniTablebaseMove(gameState, COLORS.BLACK, searchProfile);
    if (miniTablebaseMove?.move) {
        const rootPositionMemoryKey = buildSearchMemoryPositionKey(gameState, searchProfile, true);
        rememberBestMove(searchContext, rootPositionMemoryKey, miniTablebaseMove.move);
        return {
            move: miniTablebaseMove.move,
            searchInfo: {
                miniTablebase: true,
                miniTablebaseReason: miniTablebaseMove.reason,
                miniTablebaseScore: miniTablebaseMove.score,
                usedOpeningBook: false,
                candidateCount: 1,
                memory: summarizeSearchMemory(searchContext)
            }
        };
    }

    const openingMove = getOpeningBookMove(gameState, searchProfile);
    const searchResult = evaluateRootCandidatesIteratively(
        gameState,
        depth,
        transpositionTable,
        searchProfile,
        searchDeadline,
        searchContext,
        openingMove
    );
    const candidates = searchResult.candidates;
    const safeOpeningCandidate = selectOpeningCandidateIfSafe(candidates, openingMove, searchProfile);
    const memorySummary = summarizeSearchMemory(searchContext);
    const rootPositionMemoryKey = buildSearchMemoryPositionKey(gameState, searchProfile, true);
    if (safeOpeningCandidate) {
        rememberBestMove(searchContext, rootPositionMemoryKey, safeOpeningCandidate.move);
        return {
            move: safeOpeningCandidate.move,
            searchInfo: {
                ...searchResult,
                maxThinkMs: searchDeadline.maxThinkMs,
                usedOpeningBook: true,
                candidateCount: candidates.length,
                memory: memorySummary
            }
        };
    }

    const chosenCandidate = selectMoveFromCandidates(candidates, searchProfile);
    if (chosenCandidate?.move) rememberBestMove(searchContext, rootPositionMemoryKey, chosenCandidate.move);
    return {
        move: chosenCandidate?.move || null,
        searchInfo: {
            ...searchResult,
            maxThinkMs: searchDeadline.maxThinkMs,
            usedOpeningBook: false,
            candidateCount: candidates.length,
            memory: memorySummary
        }
    };
}

function selectBlackMoveForState(gameState, options = {}) {
    return selectBlackMoveAnalysisForState(gameState, options)?.move || null;
}

export function selectAiMoveAnalysisForState(gameState, options = {}) {
    const aiColor = gameState?.aiColor || COLORS.BLACK;
    if (!gameState || gameState.currentTurn !== aiColor || gameState.isGameOver?.()) return null;
    normalizeAiRecentPositionHashes(gameState);

    if (aiColor === COLORS.WHITE) {
        const mirroredState = createBlackPerspectiveStateForWhiteAi(gameState);
        const mirroredAnalysis = selectBlackMoveAnalysisForState(mirroredState, options);
        return {
            move: mapBlackPerspectiveMoveToWhiteState(gameState, mirroredAnalysis?.move),
            searchInfo: mirroredAnalysis?.searchInfo || null
        };
    }

    return selectBlackMoveAnalysisForState(gameState, options);
}

export function selectAiMoveForState(gameState, options = {}) {
    return selectAiMoveAnalysisForState(gameState, options)?.move || null;
}

if (typeof self !== 'undefined') {
    self.addEventListener('message', (e) => {
        const { requestId, state: plainState } = e.data;
        const gameState = reviveState(plainState);
        const bestMove = selectAiMoveForState(gameState);

        if (!bestMove) {
            self.postMessage({ requestId, noMoves: true });
            return;
        }

        self.postMessage({
            requestId,
            fromRow: bestMove.piece.row,
            fromCol: bestMove.piece.col,
            toRow: bestMove.move.row,
            toCol: bestMove.move.col,
            specialMove: bestMove.move.specialMove || null
        });
    });
}
