// src/game/Board.js
// Represents the 11x10 board + 2 citadels

import { PIECE_TYPES, COLORS } from '../utils/constants.js';

export class Board {
    constructor() {
        // 10 rows (ranks), 11 columns (files)
        // Array[row][col] where row 0 is Black's back rank, row 9 is White's back rank
        this.grid = Array(10).fill(null).map(() => Array(11).fill(null));

        // Citadels
        this.citadelBlack = null; // Left side, row 0, col -1 essentially
        this.citadelWhite = null; // Right side, row 9, col 11 essentially

        this.pieces = []; // Flat list of all pieces for quick iteration
    }

    // Set a piece at standard board coordinates
    setPiece(row, col, piece) {
        this._setAt(row, col, piece);
        if (piece) {
            piece.row = row;
            piece.col = col;
            if (!this.pieces.includes(piece)) {
                this.pieces.push(piece);
            }
        }
    }

    // Move a piece from (startRow, startCol) to (endRow, endCol)
    // Returns captured piece and original state for undo
    movePiece(startRow, startCol, endRow, endCol) {
        const piece = this.getPieceAt(startRow, startCol);
        if (!piece) return null;

        const capturedPiece = this.getPieceAt(endRow, endCol);
        const originalHasMoved = piece.hasMoved;

        // Remove from old
        this._setAt(startRow, startCol, null);

        // Put in new
        this._setAt(endRow, endCol, piece);

        piece.row = endRow;
        piece.col = endCol;
        piece.hasMoved = true;

        if (capturedPiece) {
            this.removePiece(capturedPiece);
        }

        return { capturedPiece, originalHasMoved };
    }

    undoMove(startRow, startCol, endRow, endCol, moveData) {
        const piece = this.getPieceAt(endRow, endCol);
        if (!piece) return;

        const { capturedPiece, originalHasMoved } = moveData;

        // Move piece back
        this._setAt(endRow, endCol, capturedPiece);
        this._setAt(startRow, startCol, piece);

        piece.row = startRow;
        piece.col = startCol;
        piece.hasMoved = originalHasMoved;

        if (capturedPiece) {
            this.pieces.push(capturedPiece);
        }
    }

    swapPieces(firstRow, firstCol, secondRow, secondCol) {
        const firstPiece = this.getPieceAt(firstRow, firstCol);
        const secondPiece = this.getPieceAt(secondRow, secondCol);
        if (!firstPiece || !secondPiece) return null;

        const firstOriginalHasMoved = firstPiece.hasMoved;
        const secondOriginalHasMoved = secondPiece.hasMoved;

        this._setAt(firstRow, firstCol, null);
        this._setAt(secondRow, secondCol, null);

        this._setAt(firstRow, firstCol, secondPiece);
        secondPiece.row = firstRow;
        secondPiece.col = firstCol;

        this._setAt(secondRow, secondCol, firstPiece);
        firstPiece.row = secondRow;
        firstPiece.col = secondCol;
        firstPiece.hasMoved = true;

        return {
            firstPiece,
            secondPiece,
            firstRow,
            firstCol,
            secondRow,
            secondCol,
            firstOriginalHasMoved,
            secondOriginalHasMoved
        };
    }

    undoSwap(swapData) {
        if (!swapData) return;

        const {
            firstPiece,
            secondPiece,
            firstRow,
            firstCol,
            secondRow,
            secondCol,
            firstOriginalHasMoved,
            secondOriginalHasMoved
        } = swapData;

        this._setAt(firstRow, firstCol, null);
        this._setAt(secondRow, secondCol, null);

        this._setAt(firstRow, firstCol, firstPiece);
        firstPiece.row = firstRow;
        firstPiece.col = firstCol;
        firstPiece.hasMoved = firstOriginalHasMoved;

        this._setAt(secondRow, secondCol, secondPiece);
        secondPiece.row = secondRow;
        secondPiece.col = secondCol;
        secondPiece.hasMoved = secondOriginalHasMoved;
    }

    getPieceAt(row, col) {
        // Check if querying citadels
        if (row === 0 && col === -1) return this.citadelBlack;
        if (row === 9 && col === 11) return this.citadelWhite;

        if (this.isValidCoord(row, col)) {
            return this.grid[row][col];
        }
        return null;
    }

    removePiece(piece) {
        if (!piece) return;

        // Find and remove from grid or citadels
        if (piece.col === -1) this.citadelBlack = null;
        else if (piece.col === 11) this.citadelWhite = null;
        else if (this.isValidCoord(piece.row, piece.col)) {
            if (this.grid[piece.row][piece.col] === piece) {
                this.grid[piece.row][piece.col] = null;
            }
        }

        // Remove from pieces array
        this.pieces = this.pieces.filter(p => p !== piece);
    }

    isValidCoord(row, col) {
        // Allow strictly the 10x11 grid
        return row >= 0 && row < 10 && col >= 0 && col < 11;
    }

    isEmpty(row, col) {
        return this.getPieceAt(row, col) === null;
    }

    // Helper to abstract grid vs citadel setting
    _setAt(row, col, piece) {
        if (row === 0 && col === -1) this.citadelBlack = piece;
        else if (row === 9 && col === 11) this.citadelWhite = piece;
        else if (this.isValidCoord(row, col)) this.grid[row][col] = piece;
    }

    clone() {
        const newBoard = new Board();
        // Copy grid
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 11; c++) {
                const p = this.grid[r][c];
                if (p) {
                    const clonedPiece = p.clone ? p.clone() : Object.assign(Object.create(Object.getPrototypeOf(p)), p);
                    newBoard.grid[r][c] = clonedPiece;
                    newBoard.pieces.push(clonedPiece);
                }
            }
        }
        // Copy citadels
        if (this.citadelBlack) {
            const cb = this.citadelBlack;
            newBoard.citadelBlack = cb.clone ? cb.clone() : Object.assign(Object.create(Object.getPrototypeOf(cb)), cb);
            newBoard.pieces.push(newBoard.citadelBlack);
        }
        if (this.citadelWhite) {
            const cw = this.citadelWhite;
            newBoard.citadelWhite = cw.clone ? cw.clone() : Object.assign(Object.create(Object.getPrototypeOf(cw)), cw);
            newBoard.pieces.push(newBoard.citadelWhite);
        }
        return newBoard;
    }
}
