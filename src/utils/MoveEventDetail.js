import { COLORS, GAME_STATES } from './constants.js';

function isGameOverState(gameState) {
    return Boolean(gameState?.isGameOver?.() || gameState?.status === GAME_STATES.GAME_OVER);
}

function resolveMoveResultType(gameState, moveRecord, explicitResultType = null) {
    if (explicitResultType) return explicitResultType;
    if (moveRecord?.resultType) return moveRecord.resultType;
    if (gameState?.resultType) return gameState.resultType;
    if (gameState?.winner === 'Draw (Hisar)') return 'citadel_draw';
    if (gameState?.checkmate) return 'checkmate';
    if (gameState?.stalemate) return 'stalemate';
    if (gameState?.winner === COLORS.WHITE || gameState?.winner === COLORS.BLACK) return 'game_over';
    return null;
}

export function buildPieceMovedEventDetail({
    gameState,
    fromRow = null,
    fromCol = null,
    toRow = null,
    toCol = null,
    movedColor = null,
    moveRecord = null,
    resultType = null,
    specialTags = null,
    noMove = false
} = {}) {
    const resolvedResultType = resolveMoveResultType(gameState, moveRecord, resultType);

    return {
        fromRow,
        fromCol,
        toRow,
        toCol,
        movedColor,
        moveRecord,
        noMove: Boolean(noMove),
        gameOver: isGameOverState(gameState),
        winner: gameState?.winner || null,
        resultType: resolvedResultType,
        specialTags: Array.isArray(specialTags)
            ? specialTags
            : (Array.isArray(moveRecord?.specialTags) ? moveRecord.specialTags : [])
    };
}
