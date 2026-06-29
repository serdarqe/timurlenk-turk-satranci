import { PIECE_TYPES, COLORS } from '../utils/constants.js';
import { GameRules } from './GameRules.js';

export class MoveValidator {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // Get all strictly legal moves for a specific piece considering check state
    getLegalMoves(startRow, startCol) {
        const board = this.gameState.board;
        const piece = board.getPieceAt(startRow, startCol);

        if (!piece || piece.color !== this.gameState.currentTurn) {
            return [];
        }

        const legalMoves = this._getOrdinaryLegalMoves(piece, startRow, startCol);

        if (piece.type === PIECE_TYPES.KING && this._canUseRoyalSwap(piece.color)) {
            legalMoves.push(...this._getRoyalSwapMoves(piece));
        }

        legalMoves.push(...this._getCitadelMoves(piece));

        if (GameRules.isRoyalType(piece.type)) {
            legalMoves.push(...this._getCitadelExchangeMoves(piece));
        }

        return legalMoves;
    }

    _getOrdinaryLegalMoves(piece, startRow, startCol) {
        const rawMoves = piece.getPotentialMoves(this.gameState.board)
            .filter((move) => !this._isCitadelCoord(move.row, move.col));
        const legalMoves = [];

        for (const move of rawMoves) {
            if (this._simulatesSafeMove(startRow, startCol, move.row, move.col, piece.color)) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }

    // Helper: simulate a move and check if it leaves own king(s) in check
    _simulatesSafeMove(startRow, startCol, endRow, endCol, color) {
        if (this._hasMultipleRoyals(color)) {
            return true;
        }

        const board = this.gameState.board;
        const piece = board.getPieceAt(startRow, startCol);

        // Use make/unmake instead of cloning
        const moveData = board.movePiece(startRow, startCol, endRow, endCol);
        const postMoveEffects = GameRules.applyPostMoveEffects(this.gameState, piece, endRow, endCol);

        // Find own king(s), typically just Shah, but could be Prince or Adjunct King
        const kings = board.pieces.filter(p => p.color === color && (p.type === PIECE_TYPES.KING || p.type === PIECE_TYPES.PRINCE || p.type === PIECE_TYPES.ADVENTITIOUS_KING));
        let safe = true;

        if (kings.length === 0) safe = false;
        else {
            for (const king of kings) {
                if (this._isSquareAttacked(board, king.row, king.col, this._getOppositeColor(color))) {
                    safe = false;
                    break;
                }
            }
        }

        // Restore state
        GameRules.revertPostMoveEffects(this.gameState, postMoveEffects);
        board.undoMove(startRow, startCol, endRow, endCol, moveData);

        return safe;
    }

    _simulatesSafeRoyalSwap(kingPiece, targetPiece, color) {
        const swapEffects = GameRules.applyRoyalSwap(this.gameState, kingPiece, targetPiece);
        if (!swapEffects) return false;

        if (this._hasMultipleRoyals(color)) {
            GameRules.revertRoyalSwap(this.gameState, swapEffects);
            return true;
        }

        const kings = this._getCriticalRoyals(color);

        let safe = kings.length > 0;
        if (safe) {
            for (const king of kings) {
                if (this._isSquareAttacked(this.gameState.board, king.row, king.col, this._getOppositeColor(color))) {
                    safe = false;
                    break;
                }
            }
        }

        GameRules.revertRoyalSwap(this.gameState, swapEffects);
        return safe;
    }

    _canUseRoyalSwap(color) {
        if (this.gameState.ransomMoveUsed?.[color]) return false;
        if (this.isCheck(color)) return true;
        return this._hasNoOrdinaryLegalMoves(color);
    }

    _hasNoOrdinaryLegalMoves(color) {
        const pieces = this.gameState.board.pieces.filter((piece) => piece.color === color);
        for (const piece of pieces) {
            if (this._getOrdinaryLegalMoves(piece, piece.row, piece.col).length > 0) {
                return false;
            }
        }
        return true;
    }

    _getRoyalSwapMoves(kingPiece) {
        const allies = this.gameState.board.pieces.filter(
            (piece) => piece.color === kingPiece.color && piece !== kingPiece
        );

        return allies
            .filter((ally) => this._simulatesSafeRoyalSwap(kingPiece, ally, kingPiece.color))
            .map((ally) => ({
                row: ally.row,
                col: ally.col,
                specialMove: 'royal_swap'
            }));
    }

    _getCitadelMoves(piece) {
        if (!GameRules.isRoyalType(piece.type)) return [];

        const moves = [];
        const enemyCitadel = this._getEnemyCitadel(piece.color);
        const ownCitadel = this._getOwnCitadel(piece.color);

        if (this._canEnterOpponentCitadel(piece) && this._isAdjacentToCitadel(piece, enemyCitadel) && this.gameState.board.isEmpty(enemyCitadel.row, enemyCitadel.col)) {
            moves.push({ row: enemyCitadel.row, col: enemyCitadel.col });
        }

        if (
            piece.type === PIECE_TYPES.ADVENTITIOUS_KING
            && this._isAdjacentToCitadel(piece, ownCitadel)
            && this.gameState.board.isEmpty(ownCitadel.row, ownCitadel.col)
        ) {
            moves.push({ row: ownCitadel.row, col: ownCitadel.col });
        }

        return moves;
    }

    _getCitadelExchangeMoves(piece) {
        if (!this._canUseCitadelExchange(piece)) return [];

        return this._getLowerRoyalPieces(piece.color).map((targetRoyal) => ({
            row: targetRoyal.row,
            col: targetRoyal.col,
            specialMove: 'citadel_exchange'
        }));
    }

    _canUseCitadelExchange(piece) {
        if (!piece || !GameRules.isRoyalType(piece.type)) return false;
        if (this.gameState.citadelExchangeUsed?.[piece.color]) return false;
        if (!this._canEnterOpponentCitadel(piece)) return false;

        const enemyCitadel = this._getEnemyCitadel(piece.color);
        if (!this._isAdjacentToCitadel(piece, enemyCitadel)) return false;
        if (this.gameState.board.getPieceAt(enemyCitadel.row, enemyCitadel.col)) return false;

        return this._getLowerRoyalPieces(piece.color).length > 0;
    }

    _getLowerRoyalPieces(color) {
        const royals = this.gameState.board.pieces.filter((piece) => piece.color === color && GameRules.isRoyalType(piece.type));
        const highestRank = Math.max(...royals.map((piece) => GameRules.getRoyalRank(piece.type)));

        return royals.filter((piece) => GameRules.getRoyalRank(piece.type) < highestRank);
    }

    _getCriticalRoyals(color) {
        const royals = this.gameState.board.pieces.filter((piece) => piece.color === color && GameRules.isRoyalType(piece.type));
        if (!royals.length) return [];

        const highestRank = Math.max(...royals.map((piece) => GameRules.getRoyalRank(piece.type)));
        return royals.filter((piece) => GameRules.getRoyalRank(piece.type) === highestRank);
    }

    _hasMultipleRoyals(color) {
        return this.gameState.board.pieces.filter((piece) => piece.color === color && GameRules.isRoyalType(piece.type)).length > 1;
    }

    _canEnterOpponentCitadel(piece) {
        const criticalRoyals = this._getCriticalRoyals(piece.color);
        return criticalRoyals.includes(piece);
    }

    _getOwnCitadel(color) {
        return color === COLORS.WHITE
            ? { row: 9, col: 11 }
            : { row: 0, col: -1 };
    }

    _getEnemyCitadel(color) {
        return color === COLORS.WHITE
            ? { row: 0, col: -1 }
            : { row: 9, col: 11 };
    }

    _isAdjacentToCitadel(piece, citadel) {
        return Math.abs(piece.row - citadel.row) <= 1 && Math.abs(piece.col - citadel.col) <= 1;
    }

    _isCitadelCoord(row, col) {
        return (row === 0 && col === -1) || (row === 9 && col === 11);
    }

    _isSquareAttacked(board, row, col, attackerColor) {
        const enemies = board.pieces.filter(p => p.color === attackerColor);
        for (const enemy of enemies) {
            const rawMoves = enemy.getPotentialMoves(board);
            if (rawMoves.some(m => m.row === row && m.col === col)) {
                return true;
            }
        }
        return false;
    }

    _getOppositeColor(color) {
        return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    }

    isCheck(color) {
        if (this._hasMultipleRoyals(color)) return false;

        const board = this.gameState.board;
        const kings = this._getCriticalRoyals(color);
        for (const king of kings) {
            if (this._isSquareAttacked(board, king.row, king.col, this._getOppositeColor(color))) {
                return true;
            }
        }
        return false;
    }

    isCheckmate(color) {
        if (this._hasMultipleRoyals(color)) return false;
        if (!this.isCheck(color)) return false;

        const pieces = this.gameState.board.pieces.filter(p => p.color === color);
        for (const piece of pieces) {
            const moves = this.getLegalMoves(piece.row, piece.col);
            if (moves.length > 0) return false;
        }

        return true;
    }

    isStalemate(color) {
        if (this._hasMultipleRoyals(color)) return false;
        if (this.isCheck(color)) return false;

        const pieces = this.gameState.board.pieces.filter(p => p.color === color);
        for (const piece of pieces) {
            const moves = this.getLegalMoves(piece.row, piece.col);
            if (moves.length > 0) return false;
        }

        return true; // Pat state
    }
}
