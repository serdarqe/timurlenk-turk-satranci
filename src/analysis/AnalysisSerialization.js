import { PAWN_TYPES, PIECE_TYPES } from '../utils/constants.js';

export function serializePiece(piece) {
    if (!piece) return null;

    return {
        type: piece.type,
        color: piece.color,
        row: piece.row,
        col: piece.col,
        pawnType: piece.pawnType || null,
        hasMoved: Boolean(piece.hasMoved),
        stage: piece.stage ?? null,
        isPromoted: Boolean(piece.isPromoted)
    };
}

export function serializeGameStateSnapshot(gameState) {
    return {
        difficulty: gameState.difficulty,
        formation: gameState.formation || null,
        aiPersonaId: gameState.aiPersonaId || null,
        aiBotId: gameState.aiBotId || null,
        aiColor: gameState.aiColor || null,
        playerColor: gameState.playerColor || null,
        timeControl: gameState.timeControl || gameState.clock?.timeControl || 'none',
        currentTurn: gameState.currentTurn,
        status: gameState.status || null,
        winner: gameState.winner || null,
        resultType: gameState.resultType || null,
        checkmate: Boolean(gameState.checkmate),
        stalemate: Boolean(gameState.stalemate),
        ransomMoveUsed: {
            white: Boolean(gameState.ransomMoveUsed?.white),
            black: Boolean(gameState.ransomMoveUsed?.black)
        },
        citadelExchangeUsed: {
            white: Boolean(gameState.citadelExchangeUsed?.white),
            black: Boolean(gameState.citadelExchangeUsed?.black)
        },
        capturedPieces: {
            white: (gameState.capturedPieces?.white || []).map(serializePiece),
            black: (gameState.capturedPieces?.black || []).map(serializePiece)
        },
        board: {
            pieces: gameState.board.pieces.map(serializePiece)
        }
    };
}

export function getCoordinateLabel(row, col) {
    if (col === -1 && row === 0) return 'HS';
    if (col === 11 && row === 9) return 'HB';

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    return `${files[col]}${10 - row}`;
}

function detectSpecialTags({ movedPieceBefore, movedPieceAfter, capturedPiece, resultType, isCheck, specialMoveType }) {
    const tags = new Set();

    if (capturedPiece) tags.add('capture');
    if (isCheck) tags.add('check');
    if (resultType) tags.add(resultType);
    if (specialMoveType) tags.add(specialMoveType);

    if (movedPieceBefore?.type === PIECE_TYPES.PAWN && movedPieceAfter?.type && movedPieceAfter.type !== PIECE_TYPES.PAWN) {
        tags.add('promotion');
    }

    if (
        movedPieceBefore?.type === PIECE_TYPES.PAWN &&
        movedPieceBefore?.pawnType === PAWN_TYPES.PAWN_OF_PAWNS &&
        movedPieceAfter?.type === PIECE_TYPES.PAWN &&
        (movedPieceAfter.stage || 0) > (movedPieceBefore.stage || 0)
    ) {
        tags.add('pawn_cycle');
    }

    return [...tags];
}

export function buildMoveRecord({
    gameState,
    fromRow,
    fromCol,
    toRow,
    toCol,
    movedPieceBefore,
    movedPieceAfter,
    capturedPiece,
    preSnapshot,
    postSnapshot,
    isCheck = false,
    resultType = null,
    specialMoveType = null,
    fairyDebug = null
}) {
    const index = (gameState?.moveHistory?.length || 0) + 1;
    const specialTags = detectSpecialTags({
        movedPieceBefore,
        movedPieceAfter,
        capturedPiece,
        resultType,
        isCheck,
        specialMoveType
    });

    return {
        index,
        moveNumber: Math.ceil(index / 2),
        color: movedPieceBefore?.color || movedPieceAfter?.color || null,
        piece: {
            typeBefore: movedPieceBefore?.type || null,
            typeAfter: movedPieceAfter?.type || movedPieceBefore?.type || null,
            pawnType: movedPieceBefore?.pawnType || movedPieceAfter?.pawnType || null
        },
        from: {
            row: fromRow,
            col: fromCol,
            label: getCoordinateLabel(fromRow, fromCol)
        },
        to: {
            row: toRow,
            col: toCol,
            label: getCoordinateLabel(toRow, toCol)
        },
        notation: `${getCoordinateLabel(fromRow, fromCol)} -> ${getCoordinateLabel(toRow, toCol)}`,
        capturedPiece: serializePiece(capturedPiece),
        isCheck,
        resultType,
        specialMoveType,
        specialTags,
        snapshots: {
            before: preSnapshot,
            after: postSnapshot
        },
        fairyDebug: fairyDebug || null
    };
}
