import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import {
    AdventitiousKing,
    King,
    Prince
} from '../src/game/PieceFactory.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import {
    evaluateCitadelGameResultNativeSmoke,
    getCitadelGameResultNativeSmokeCases
} from '../src/fairy/FairyCitadelGameResultNativeSmoke.js';
import { COLORS, PIECE_TYPES } from '../src/utils/constants.js';
import {
    createEngine,
    getNativeRootMoves,
    initializeTimurVariant,
    shutdownEngine
} from './fairy-citadel-offboard-smoke-runner.mjs';

const ROYAL_FACTORIES = Object.freeze({
    [PIECE_TYPES.KING]: King,
    [PIECE_TYPES.PRINCE]: Prince,
    [PIECE_TYPES.ADVENTITIOUS_KING]: AdventitiousKing
});

export async function runCitadelGameResultNativeSmoke({ engine: providedEngine = null, initialize = true } = {}) {
    const engine = providedEngine || await createEngine();
    const ownsEngine = !providedEngine;
    try {
        if (initialize) await initializeTimurVariant(engine);
        const results = [];

        for (const smokeCase of getCitadelGameResultNativeSmokeCases()) {
            const state = buildResultState(smokeCase);
            const fen = stateToFairyFen(state);
            const nativeRootMoves = await getNativeRootMoves(engine, fen);
            const jsResult = evaluateJsCitadelResult(state, smokeCase);

            results.push({
                id: smokeCase.id,
                fen,
                nativeRootMoves,
                jsStatus: jsResult.status,
                jsWinner: jsResult.winner,
                applyRevertParity: jsResult.applyRevertParity,
                beforeSnapshot: jsResult.beforeSnapshot,
                revertedSnapshot: jsResult.revertedSnapshot
            });
        }

        return evaluateCitadelGameResultNativeSmoke(results);
    } finally {
        if (ownsEngine) shutdownEngine(engine);
    }
}

function buildResultState(smokeCase) {
    const state = new GameState();
    const ActiveRoyal = ROYAL_FACTORIES[smokeCase.pieceType];
    const opponentColor = smokeCase.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const opponentSquare = smokeCase.color === COLORS.WHITE
        ? { row: 9, col: 10 }
        : { row: 0, col: 0 };

    state.currentTurn = smokeCase.color;
    state.board.setPiece(
        smokeCase.from.row,
        smokeCase.from.col,
        new ActiveRoyal(smokeCase.color, smokeCase.from.row, smokeCase.from.col)
    );
    state.board.setPiece(
        opponentSquare.row,
        opponentSquare.col,
        new King(opponentColor, opponentSquare.row, opponentSquare.col)
    );

    return state;
}

function evaluateJsCitadelResult(state, smokeCase) {
    const beforeSnapshot = buildStateSnapshot(state);
    const moveData = state.board.movePiece(smokeCase.from.row, smokeCase.from.col, smokeCase.to.row, smokeCase.to.col);
    const activePiece = state.board.getPieceAt(smokeCase.to.row, smokeCase.to.col);
    const effects = GameRules.applyPostMoveEffects(
        state,
        activePiece,
        smokeCase.to.row,
        smokeCase.to.col
    );

    const result = {
        status: state.status,
        winner: state.winner
    };

    GameRules.revertPostMoveEffects(state, effects);
    state.board.undoMove(smokeCase.from.row, smokeCase.from.col, smokeCase.to.row, smokeCase.to.col, moveData);
    const revertedSnapshot = buildStateSnapshot(state);

    result.beforeSnapshot = beforeSnapshot;
    result.revertedSnapshot = revertedSnapshot;
    result.applyRevertParity = beforeSnapshot === revertedSnapshot;
    return result;
}

function buildStateSnapshot(state) {
    return [
        `status=${state.status ?? ''}`,
        `winner=${state.winner ?? ''}`,
        GameRules.buildPositionHash(state)
    ].join('::');
}
