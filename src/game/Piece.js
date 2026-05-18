// src/game/Piece.js
// Base class for all pieces

import { COLORS } from '../utils/constants.js';

export class Piece {
    constructor(type, color, row, col) {
        this.type = type;
        this.color = color;
        this.row = row; // 0-9
        this.col = col; // 0-10 (-1 or 11 for citadels)
        this.hasMoved = false; // Important for some rules, though less so than modern chess

        // Specific properties a piece might have
        this.pawnType = null; // Only for pawns
        this.isPromoted = false; // If a pawn has promoted
    }

    // Returns array of {row, col} for standard movements (ignores check rules)
    getPotentialMoves(board) {
        // To be overridden by subclasses
        return [];
    }

    // Helper: Is the coordinate within standard board limits (excluding citadels for normal moves)
    _isValidCoord(row, col) {
        return row >= 0 && row < 10 && col >= 0 && col < 11;
    }

    clone() {
        const cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        return cloned;
    }

    // Helper: Is the square empty or contains an enemy piece
    _isAccessible(board, row, col) {
        if (!this._isValidCoord(row, col)) return false;
        const target = board.getPieceAt(row, col);
        if (!target) return true; // Empty
        return target.color !== this.color; // Capturable
    }

    // Helper: Is the square completely empty
    _isEmpty(board, row, col) {
        if (!this._isValidCoord(row, col)) return false;
        return board.getPieceAt(row, col) === null;
    }
}
