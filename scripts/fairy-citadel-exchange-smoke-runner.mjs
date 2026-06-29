import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, Prince } from '../src/game/PieceFactory.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import {
    evaluateCitadelExchangeNativeSmoke,
    getCitadelExchangeNativeSmokeCases
} from '../src/fairy/FairyCitadelExchangeNativeSmoke.js';
import { COLORS } from '../src/utils/constants.js';
import {
    getCitadelExchangeSourceEvidence
} from './fairy-native-source-evidence.mjs';
import {
    createEngine,
    getNativeRootMoves,
    initializeTimurVariant,
    shutdownEngine
} from './fairy-citadel-offboard-smoke-runner.mjs';

export async function runCitadelExchangeNativeSmoke({
    useEngine = true,
    engine: providedEngine = null,
    initialize = true
} = {}) {
    const sourceEvidence = getCitadelExchangeSourceEvidence();
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
        for (const smokeCase of getCitadelExchangeNativeSmokeCases()) {
            const { state, royal, targetRoyal } = buildExchangeState(smokeCase);
            const fen = stateToFairyFen(state);
            const nativeRootMoves = engine
                ? await tryGetNativeRootMoves(engine, fen)
                : [];
            const jsResult = evaluateJsCitadelExchange(state, royal, targetRoyal, smokeCase);

            results.push({
                id: smokeCase.id,
                fen,
                nativeRootMoves,
                nativeSourceMarker: sourceEvidence.nativeSourceMarker,
                nativePositionSkeleton: sourceEvidence.nativePositionSkeleton,
                nativeApplyRevertSkeleton: sourceEvidence.nativePositionSkeleton,
                jsDualRelocationMatches: jsResult.dualRelocationMatches,
                jsOneTimeFlagSemantics: jsResult.oneTimeFlagSemantics,
                jsApplyRevertParity: jsResult.applyRevertParity,
                beforeSnapshot: jsResult.beforeSnapshot,
                afterExchangeSnapshot: jsResult.afterExchangeSnapshot,
                revertedSnapshot: jsResult.revertedSnapshot
            });
        }
    } finally {
        if (engine && ownsEngine) shutdownEngine(engine);
    }

    const report = evaluateCitadelExchangeNativeSmoke(results);
    return {
        ...report,
        sourceEvidence,
        engineInitError: results.engineInitError || null
    };
}

function buildExchangeState(smokeCase) {
    const state = new GameState();
    const royal = new King(smokeCase.color, smokeCase.royalFrom.row, smokeCase.royalFrom.col);
    const targetRoyal = new Prince(smokeCase.color, smokeCase.targetRoyalFrom.row, smokeCase.targetRoyalFrom.col);
    const opponentColor = smokeCase.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const opponentSquare = smokeCase.color === COLORS.WHITE
        ? { row: 9, col: 10 }
        : { row: 0, col: 0 };

    state.currentTurn = smokeCase.color;
    state.board.setPiece(royal.row, royal.col, royal);
    state.board.setPiece(targetRoyal.row, targetRoyal.col, targetRoyal);
    state.board.setPiece(
        opponentSquare.row,
        opponentSquare.col,
        new King(opponentColor, opponentSquare.row, opponentSquare.col)
    );

    return { state, royal, targetRoyal };
}

function evaluateJsCitadelExchange(state, royal, targetRoyal, smokeCase) {
    const beforeSnapshot = buildStateSnapshot(state);
    const effects = GameRules.applyCitadelExchange(state, royal, targetRoyal);
    const targetAtCitadel = state.board.getPieceAt(smokeCase.citadel.row, smokeCase.citadel.col);
    const royalAtTargetSquare = state.board.getPieceAt(
        smokeCase.targetRoyalFrom.row,
        smokeCase.targetRoyalFrom.col
    );
    const afterExchangeSnapshot = buildStateSnapshot(state);
    const secondAttempt = GameRules.applyCitadelExchange(state, royal, targetRoyal);

    const dualRelocationMatches = effects?.kind === 'citadel_exchange'
        && targetAtCitadel === targetRoyal
        && royalAtTargetSquare === royal;
    const oneTimeFlagSemantics = state.citadelExchangeUsed?.[smokeCase.color] === true
        && secondAttempt === null;

    if (effects) GameRules.revertCitadelExchange(state, effects);
    const revertedSnapshot = buildStateSnapshot(state);

    return {
        dualRelocationMatches,
        oneTimeFlagSemantics,
        applyRevertParity: beforeSnapshot === revertedSnapshot,
        beforeSnapshot,
        afterExchangeSnapshot,
        revertedSnapshot
    };
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
