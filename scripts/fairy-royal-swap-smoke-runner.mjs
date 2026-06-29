import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import {
    evaluateRoyalSwapNativeSmoke,
    getRoyalSwapNativeSmokeCases
} from '../src/fairy/FairyRoyalSwapNativeSmoke.js';
import {
    getRoyalSwapSourceEvidence
} from './fairy-native-source-evidence.mjs';
import {
    createEngine,
    getNativeRootMoves,
    initializeTimurVariant,
    shutdownEngine
} from './fairy-citadel-offboard-smoke-runner.mjs';

export async function runRoyalSwapNativeSmoke({
    useEngine = true,
    engine: providedEngine = null,
    initialize = true
} = {}) {
    const sourceEvidence = getRoyalSwapSourceEvidence();
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
        for (const smokeCase of getRoyalSwapNativeSmokeCases()) {
            const { state, king, target } = buildRoyalSwapState(smokeCase);
            const fen = stateToFairyFen(state);
            const nativeRootMoves = engine
                ? await tryGetNativeRootMoves(engine, fen)
                : [];
            const jsResult = evaluateJsRoyalSwap(state, king, target, smokeCase);

            results.push({
                id: smokeCase.id,
                fen,
                nativeRootMoves,
                nativeSourceMarker: sourceEvidence.nativeSourceMarker,
                nativePositionSkeleton: sourceEvidence.nativePositionSkeleton,
                nativeApplyRevertSkeleton: sourceEvidence.nativePositionSkeleton,
                jsCheckEscapeSemantics: jsResult.checkEscapeSemantics,
                jsRoyalSwapSemantics: jsResult.royalSwapSemantics,
                jsOneTimeFlagSemantics: jsResult.oneTimeFlagSemantics,
                jsApplyRevertParity: jsResult.applyRevertParity,
                beforeSnapshot: jsResult.beforeSnapshot,
                afterSwapSnapshot: jsResult.afterSwapSnapshot,
                revertedSnapshot: jsResult.revertedSnapshot
            });
        }
    } finally {
        if (engine && ownsEngine) shutdownEngine(engine);
    }

    const report = evaluateRoyalSwapNativeSmoke(results);
    return {
        ...report,
        sourceEvidence,
        engineInitError: results.engineInitError || null
    };
}

function buildRoyalSwapState(smokeCase) {
    const state = new GameState();
    const king = new King(smokeCase.color, smokeCase.kingFrom.row, smokeCase.kingFrom.col);
    const target = new Rook(smokeCase.color, smokeCase.targetFrom.row, smokeCase.targetFrom.col);
    const checker = new Rook(smokeCase.enemyColor, smokeCase.checkerFrom.row, smokeCase.checkerFrom.col);
    const enemyKing = new King(smokeCase.enemyColor, smokeCase.enemyKingFrom.row, smokeCase.enemyKingFrom.col);

    state.currentTurn = smokeCase.color;
    state.board.setPiece(king.row, king.col, king);
    state.board.setPiece(target.row, target.col, target);
    state.board.setPiece(checker.row, checker.col, checker);
    state.board.setPiece(enemyKing.row, enemyKing.col, enemyKing);

    return { state, king, target };
}

function evaluateJsRoyalSwap(state, king, target, smokeCase) {
    const beforeSnapshot = buildStateSnapshot(state);
    const legalMoves = new MoveValidator(state).getLegalMoves(smokeCase.kingFrom.row, smokeCase.kingFrom.col);
    const legalSwap = legalMoves.find((move) => (
        move.specialMove === 'royal_swap'
        && move.row === smokeCase.targetFrom.row
        && move.col === smokeCase.targetFrom.col
    ));
    const effects = GameRules.applyRoyalSwap(state, king, target);
    const kingAtTarget = state.board.getPieceAt(smokeCase.targetFrom.row, smokeCase.targetFrom.col);
    const targetAtKingSquare = state.board.getPieceAt(smokeCase.kingFrom.row, smokeCase.kingFrom.col);
    const afterSwapSnapshot = buildStateSnapshot(state);
    const secondAttempt = GameRules.applyRoyalSwap(state, king, target);

    const royalSwapSemantics = effects?.kind === 'royal_swap'
        && kingAtTarget === king
        && targetAtKingSquare === target;
    const oneTimeFlagSemantics = state.ransomMoveUsed?.[smokeCase.color] === true
        && secondAttempt === null;

    if (effects) GameRules.revertRoyalSwap(state, effects);
    const revertedSnapshot = buildStateSnapshot(state);

    return {
        checkEscapeSemantics: Boolean(legalSwap),
        royalSwapSemantics,
        oneTimeFlagSemantics,
        applyRevertParity: beforeSnapshot === revertedSnapshot,
        beforeSnapshot,
        afterSwapSnapshot,
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
