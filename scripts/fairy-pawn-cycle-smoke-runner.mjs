import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, TimurPawn } from '../src/game/PieceFactory.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import {
    evaluatePawnCycleNativeSmoke,
    getPawnCycleNativeSmokeCases
} from '../src/fairy/FairyPawnCycleNativeSmoke.js';
import { getPawnCycleSourceEvidence } from './fairy-native-source-evidence.mjs';
import { COLORS, PAWN_TYPES, PIECE_TYPES } from '../src/utils/constants.js';
import {
    createEngine,
    getNativeRootMoves,
    initializeTimurVariant,
    shutdownEngine
} from './fairy-citadel-offboard-smoke-runner.mjs';

export async function runPawnCycleNativeSmoke({
    useEngine = true,
    engine: providedEngine = null,
    initialize = true
} = {}) {
    const sourceEvidence = getPawnCycleSourceEvidence();
    const results = [];
    let engine = providedEngine;
    const ownsEngine = useEngine && !providedEngine;

    if (useEngine) {
        try {
            if (!engine) engine = await createEngine();
            if (initialize) await initializeTimurVariant(engine);
        } catch (error) {
            engine = null;
            results.engineInitError = String(error?.message || error);
        }
    }

    try {
        for (const smokeCase of getPawnCycleNativeSmokeCases()) {
            const { state, pawn } = buildPawnCycleState(smokeCase);
            const fen = stateToFairyFen(state);
            const nativeRootMoves = engine
                ? await tryGetNativeRootMoves(engine, fen)
                : [];
            const jsResult = evaluateJsPawnCycle(state, pawn, smokeCase);

            results.push({
                id: smokeCase.id,
                fen,
                nativeRootMoves,
                nativeSourceMarker: sourceEvidence.nativeSourceMarker,
                nativePositionSkeleton: sourceEvidence.nativePositionSkeleton,
                nativeApplyRevertSkeleton: sourceEvidence.nativePositionSkeleton,
                jsStageEncoding: jsResult.stageEncoding,
                jsRepatriationSemantics: jsResult.repatriationSemantics,
                jsApplyRevertParity: jsResult.applyRevertParity,
                beforeSnapshot: jsResult.beforeSnapshot,
                afterCycleSnapshot: jsResult.afterCycleSnapshot,
                revertedSnapshot: jsResult.revertedSnapshot
            });
        }
    } finally {
        if (engine && ownsEngine) shutdownEngine(engine);
    }

    const report = evaluatePawnCycleNativeSmoke(results);
    return {
        ...report,
        sourceEvidence,
        engineInitError: results.engineInitError || null
    };
}

function buildPawnCycleState(smokeCase) {
    const state = new GameState();
    const pawn = new TimurPawn(
        smokeCase.color,
        smokeCase.pawnStart.row,
        smokeCase.pawnStart.col,
        PAWN_TYPES.PAWN_OF_PAWNS
    );
    pawn.stage = smokeCase.stageBefore ?? null;

    state.currentTurn = smokeCase.color;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(pawn.row, pawn.col, pawn);

    return { state, pawn };
}

function evaluateJsPawnCycle(state, pawn, smokeCase) {
    const beforeSnapshot = buildStateSnapshot(state);
    const promotion = GameRules.checkPawnPromotion(state, pawn);
    const afterCycleSnapshot = buildStateSnapshot(state);
    const stageEncoding = evaluateStageEncoding(state, pawn, promotion, smokeCase);
    const repatriationSemantics = evaluateRepatriationSemantics(state, pawn, promotion, smokeCase);

    GameRules.revertPostMoveEffects(state, {
        previousStatus: null,
        previousWinner: null,
        promotion
    });
    const revertedSnapshot = buildStateSnapshot(state);

    return {
        stageEncoding,
        repatriationSemantics,
        applyRevertParity: beforeSnapshot === revertedSnapshot,
        beforeSnapshot,
        afterCycleSnapshot,
        revertedSnapshot
    };
}

function evaluateStageEncoding(state, pawn, promotion, smokeCase) {
    if (smokeCase.expectedKind === 'pawn_cycle') {
        return promotion?.kind === 'pawn_cycle'
            && promotion?.previousStage === (smokeCase.stageBefore ?? null)
            && pawn.stage === smokeCase.expectedStageAfter;
    }

    const promotedPiece = state.board.getPieceAt(smokeCase.expectedTarget.row, smokeCase.expectedTarget.col);
    return promotion?.kind === 'promotion'
        && promotion?.previousStage === smokeCase.stageBefore
        && promotedPiece?.type === PIECE_TYPES.ADVENTITIOUS_KING
        && promotedPiece?.isPromoted === true;
}

function evaluateRepatriationSemantics(state, pawn, promotion, smokeCase) {
    if (smokeCase.expectedKind === 'promotion') {
        return promotion?.kind === 'promotion'
            && promotion?.promotedPiece?.row === smokeCase.expectedTarget.row
            && promotion?.promotedPiece?.col === smokeCase.expectedTarget.col
            && promotion?.promotedPiece?.type === PIECE_TYPES.ADVENTITIOUS_KING;
    }

    const movedPawn = state.board.getPieceAt(smokeCase.expectedTarget.row, smokeCase.expectedTarget.col);
    return promotion?.kind === 'pawn_cycle'
        && movedPawn === pawn
        && promotion?.fromRow === smokeCase.pawnStart.row
        && promotion?.fromCol === smokeCase.pawnStart.col
        && promotion?.toRow === smokeCase.expectedTarget.row
        && promotion?.toCol === smokeCase.expectedTarget.col;
}

async function tryGetNativeRootMoves(engine, fen) {
    try {
        return await getNativeRootMoves(engine, fen);
    } catch {
        return [];
    }
}

function buildStateSnapshot(state) {
    return [
        `status=${state.status ?? ''}`,
        `winner=${state.winner ?? ''}`,
        GameRules.buildPositionHash(state)
    ].join('::');
}
