import { COLORS, PIECE_TYPES } from '../utils/constants.js';

export const FAIRY_PIECE_TO_FEN = Object.freeze({
    [PIECE_TYPES.KING]: 'k',
    [PIECE_TYPES.VIZIER]: 'v',
    [PIECE_TYPES.SEA_MONSTER]: 's',
    [PIECE_TYPES.GENERAL]: 'g',
    [PIECE_TYPES.KNIGHT]: 'n',
    [PIECE_TYPES.LION]: 'l',
    [PIECE_TYPES.ELEPHANT]: 'e',
    [PIECE_TYPES.CAMEL]: 'c',
    [PIECE_TYPES.DABBABA]: 'd',
    [PIECE_TYPES.BULL]: 'b',
    [PIECE_TYPES.REVEALER]: 'h',
    [PIECE_TYPES.GIRAFFE]: 'z',
    [PIECE_TYPES.PICKET]: 't',
    [PIECE_TYPES.ROOK]: 'r',
    [PIECE_TYPES.PAWN]: 'p',
    [PIECE_TYPES.PRINCE]: 'q',
    [PIECE_TYPES.ADVENTITIOUS_KING]: 'a'
});

function assertFairyFenSupported(state) {
    const pieces = state?.board?.pieces || [];
    for (const piece of pieces) {
        if (!piece) continue;
        if (!state.board.isValidCoord(piece.row, piece.col)) {
            throw new Error('fairy_fen_unsupported_offboard_piece');
        }
        if (!FAIRY_PIECE_TO_FEN[piece.type]) {
            throw new Error(`fairy_fen_unknown_piece:${piece.type}`);
        }
    }
}

export function stateToFairyFen(state) {
    if (!state?.board) {
        throw new Error('fairy_fen_missing_state');
    }

    assertFairyFenSupported(state);

    const ranks = [];
    for (let row = 0; row < 10; row += 1) {
        let rank = '';
        let empty = 0;

        for (let col = 0; col < 11; col += 1) {
            const piece = state.board.getPieceAt(row, col);
            if (!piece) {
                empty += 1;
                continue;
            }

            if (empty) {
                rank += String(empty);
                empty = 0;
            }

            const fenChar = FAIRY_PIECE_TO_FEN[piece.type];
            rank += piece.color === COLORS.WHITE ? fenChar.toUpperCase() : fenChar;
        }

        if (empty) rank += String(empty);
        ranks.push(rank);
    }

    const sideToMove = state.currentTurn === COLORS.WHITE ? 'w' : 'b';
    return `${ranks.join('/')} ${sideToMove} - - 0 1`;
}
