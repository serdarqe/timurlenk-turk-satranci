import { PIECE_TYPES, COLORS, PAWN_TYPES, GAME_STATES } from '../utils/constants.js';
import { Vizier, SeaMonster, General, Knight, Lion, Elephant, Camel, Dabbaba, Bull, Revealer, Giraffe, Picket, Rook, Prince, AdventitiousKing } from './PieceFactory.js';

export class GameRules {
    static FIFTY_MOVE_PLY_LIMIT = 100;

    static ROYAL_TYPES = new Set([
        PIECE_TYPES.KING,
        PIECE_TYPES.PRINCE,
        PIECE_TYPES.ADVENTITIOUS_KING
    ]);

    static isRoyalType(type) {
        return this.ROYAL_TYPES.has(type);
    }

    static getRoyalRank(type) {
        switch (type) {
            case PIECE_TYPES.KING:
                return 3;
            case PIECE_TYPES.PRINCE:
                return 2;
            case PIECE_TYPES.ADVENTITIOUS_KING:
                return 1;
            default:
                return 0;
        }
    }

    static getOwnCitadel(color) {
        return color === COLORS.WHITE
            ? { row: 9, col: 11 }
            : { row: 0, col: -1 };
    }

    static getOpponentCitadel(color) {
        return color === COLORS.WHITE
            ? { row: 0, col: -1 }
            : { row: 9, col: 11 };
    }

    static getRoyalCount(gameState, color) {
        return gameState.board.pieces.filter((piece) => piece.color === color && this.isRoyalType(piece.type)).length;
    }

    static resolveRoyalElimination(gameState, color) {
        if (this.getRoyalCount(gameState, color) > 0) return null;

        gameState.status = GAME_STATES.GAME_OVER;
        gameState.winner = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        return 'royal_capture';
    }

    static getPiecesForHash(source) {
        if (Array.isArray(source?.board?.pieces)) return source.board.pieces;
        if (Array.isArray(source?.pieces)) return source.pieces;
        return [];
    }

    static buildPositionHash(source) {
        const pieces = this.getPiecesForHash(source)
            .map((piece) => [
                piece.color || '',
                piece.type || '',
                piece.pawnType || '',
                piece.row,
                piece.col,
                piece.stage ?? '',
                piece.isPromoted ? 1 : 0,
                piece.hasMoved ? 1 : 0
            ].join(':'))
            .sort()
            .join('|');

        const ransom = source?.ransomMoveUsed || {};
        const citadel = source?.citadelExchangeUsed || {};
        return [
            `turn=${source?.currentTurn || ''}`,
            `ransom=${ransom[COLORS.WHITE] ? 1 : 0}${ransom[COLORS.BLACK] ? 1 : 0}`,
            `citadel=${citadel[COLORS.WHITE] ? 1 : 0}${citadel[COLORS.BLACK] ? 1 : 0}`,
            pieces
        ].join('::');
    }

    static getMovePositionHash(move) {
        if (move?.positionHash) return move.positionHash;
        if (move?.snapshots?.after) return this.buildPositionHash(move.snapshots.after);
        return null;
    }

    static checkThreefoldRepetition(gameState, { requiredCount = 3, currentAlreadyRecorded = false } = {}) {
        if (!gameState) return false;

        const counts = new Map();
        const addHash = (hash) => {
            if (!hash) return;
            counts.set(hash, (counts.get(hash) || 0) + 1);
        };

        for (const move of gameState.moveHistory || []) {
            addHash(this.getMovePositionHash(move));
        }

        const currentHash = this.buildPositionHash(gameState);
        if (currentHash && !currentAlreadyRecorded) addHash(currentHash);

        return [...counts.values()].some((count) => count >= requiredCount);
    }

    static isPawnMoveRecord(move) {
        const type = move?.piece?.typeBefore || move?.piece?.typeAfter || move?.movedPieceBefore?.type || move?.type;
        return type === PIECE_TYPES.PAWN;
    }

    static isCaptureMoveRecord(move) {
        return Boolean(move?.capturedPiece || move?.captured || move?.capture);
    }

    static checkFiftyMoveDraw(gameState, { pendingMove = null, plyLimit = this.FIFTY_MOVE_PLY_LIMIT } = {}) {
        const moves = [...(gameState?.moveHistory || [])];
        if (pendingMove) moves.push(pendingMove);
        if (moves.length < plyLimit) return false;

        let quietPlyCount = 0;
        for (let i = moves.length - 1; i >= 0; i--) {
            const move = moves[i];
            if (this.isPawnMoveRecord(move) || this.isCaptureMoveRecord(move)) break;
            quietPlyCount++;
            if (quietPlyCount >= plyLimit) return true;
        }

        return false;
    }

    static resolveRuleDraw(gameState, options = {}) {
        let resultType = null;
        if (this.checkThreefoldRepetition(gameState, options)) {
            resultType = 'threefold_repetition';
        } else if (this.checkFiftyMoveDraw(gameState, options)) {
            resultType = 'fifty_move_draw';
        }

        if (!resultType) return null;

        gameState.status = GAME_STATES.GAME_OVER;
        gameState.winner = 'draw';
        gameState.resultType = resultType;
        return resultType;
    }

    static applyPostMoveEffects(gameState, piece, endRow, endCol) {
        const effects = {
            previousStatus: gameState.status ?? null,
            previousWinner: gameState.winner ?? null,
            promotion: null,
            activePiece: piece
        };

        effects.promotion = this.checkPawnPromotion(gameState, piece);
        if (effects.promotion?.activePiece) {
            effects.activePiece = effects.promotion.activePiece;
        }

        this.checkCitadelDraw(gameState, effects.activePiece, effects.activePiece?.col ?? endCol);
        return effects;
    }

    static revertPostMoveEffects(gameState, effects) {
        if (!effects) return;

        gameState.status = effects.previousStatus;
        gameState.winner = effects.previousWinner;

        if (!effects.promotion) return;

        if (effects.promotion.kind === 'pawn_cycle') {
            const {
                piece,
                fromRow,
                fromCol,
                toRow,
                toCol,
                moveData,
                previousStage
            } = effects.promotion;

            gameState.board.undoMove(fromRow, fromCol, toRow, toCol, moveData);
            piece.stage = previousStage ?? null;
            return;
        }

        if (effects.promotion.kind === 'promotion') {
            const {
                originalPiece,
                promotedPiece,
                previousStage,
                previousHasMoved
            } = effects.promotion;

            gameState.board.removePiece(promotedPiece);
            originalPiece.stage = previousStage ?? null;
            originalPiece.hasMoved = previousHasMoved;
            originalPiece.isPromoted = false;
            gameState.board.setPiece(promotedPiece.row, promotedPiece.col, originalPiece);
        }
    }

    static applyRoyalSwap(gameState, kingPiece, targetPiece) {
        if (!gameState || !kingPiece || !targetPiece) return null;
        if (kingPiece.type !== PIECE_TYPES.KING) return null;
        if (kingPiece.color !== targetPiece.color) return null;

        const previousRansomUsed = Boolean(gameState.ransomMoveUsed?.[kingPiece.color]);
        if (previousRansomUsed) return null;
        const previousStatus = gameState.status ?? null;
        const previousWinner = gameState.winner ?? null;

        const swapData = gameState.board.swapPieces(
            kingPiece.row,
            kingPiece.col,
            targetPiece.row,
            targetPiece.col
        );
        if (!swapData) return null;

        gameState.ransomMoveUsed[kingPiece.color] = true;
        this.checkCitadelDraw(gameState, swapData.firstPiece, swapData.firstPiece?.col);

        return {
            kind: 'royal_swap',
            kingColor: kingPiece.color,
            previousRansomUsed,
            previousStatus,
            previousWinner,
            swapData,
            activePiece: swapData.firstPiece
        };
    }

    static revertRoyalSwap(gameState, effects) {
        if (!effects || effects.kind !== 'royal_swap') return;

        gameState.board.undoSwap(effects.swapData);
        gameState.ransomMoveUsed[effects.kingColor] = effects.previousRansomUsed;
        gameState.status = effects.previousStatus;
        gameState.winner = effects.previousWinner;
    }

    static applyCitadelExchange(gameState, royalPiece, targetRoyal) {
        if (!gameState || !royalPiece || !targetRoyal) return null;
        if (!this.isRoyalType(royalPiece.type) || !this.isRoyalType(targetRoyal.type)) return null;
        if (royalPiece.color !== targetRoyal.color) return null;
        if (this.getRoyalRank(targetRoyal.type) >= this.getRoyalRank(royalPiece.type)) return null;

        const previousUsed = Boolean(gameState.citadelExchangeUsed?.[royalPiece.color]);
        if (previousUsed) return null;

        const citadel = this.getOpponentCitadel(royalPiece.color);
        if (Math.abs(royalPiece.row - citadel.row) > 1 || Math.abs(royalPiece.col - citadel.col) > 1) return null;
        if (!gameState.board.isEmpty(citadel.row, citadel.col)) return null;
        const royalOriginalRow = royalPiece.row;
        const royalOriginalCol = royalPiece.col;
        const targetOriginalRow = targetRoyal.row;
        const targetOriginalCol = targetRoyal.col;

        const targetMoveData = gameState.board.movePiece(targetOriginalRow, targetOriginalCol, citadel.row, citadel.col);
        const royalMoveData = gameState.board.movePiece(royalOriginalRow, royalOriginalCol, targetOriginalRow, targetOriginalCol);

        gameState.citadelExchangeUsed[royalPiece.color] = true;

        return {
            kind: 'citadel_exchange',
            color: royalPiece.color,
            previousUsed,
            citadel,
            royalOriginalRow,
            royalOriginalCol,
            targetOriginalRow,
            targetOriginalCol,
            targetMoveData,
            royalMoveData,
            activePiece: gameState.board.getPieceAt(targetOriginalRow, targetOriginalCol)
        };
    }

    static revertCitadelExchange(gameState, effects) {
        if (!effects || effects.kind !== 'citadel_exchange') return;

        gameState.board.undoMove(
            effects.royalOriginalRow,
            effects.royalOriginalCol,
            effects.targetOriginalRow,
            effects.targetOriginalCol,
            effects.royalMoveData
        );

        gameState.board.undoMove(
            effects.targetOriginalRow,
            effects.targetOriginalCol,
            effects.citadel.row,
            effects.citadel.col,
            effects.targetMoveData
        );

        gameState.citadelExchangeUsed[effects.color] = effects.previousUsed;
    }

    static postMoveChecks(gameState, piece, endRow, endCol) {
        return this.applyPostMoveEffects(gameState, piece, endRow, endCol);
    }

    static checkPawnPromotion(gameState, piece) {
        if (piece.type !== PIECE_TYPES.PAWN) return;

        const promotionRow = piece.color === COLORS.WHITE ? 0 : 9;
        if (piece.row !== promotionRow) return;

        let newPiece = null;

        switch (piece.pawnType) {
            case PAWN_TYPES.PAWN_OF_VIZIERS: newPiece = new Vizier(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_SEA_MONSTERS: newPiece = new SeaMonster(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_GENERALS: newPiece = new General(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_KNIGHTS: newPiece = new Knight(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_LIONS: newPiece = new Lion(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_ELEPHANTS: newPiece = new Elephant(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_CAMELS: newPiece = new Camel(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_DABBABAS: newPiece = new Dabbaba(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_BULLS: newPiece = new Bull(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_REVEALERS: newPiece = new Revealer(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_GIRAFFES: newPiece = new Giraffe(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_PICKETS: newPiece = new Picket(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_ROOKS: newPiece = new Rook(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_KINGS: newPiece = new Prince(piece.color, piece.row, piece.col); break;
            case PAWN_TYPES.PAWN_OF_PAWNS: {
                const previousStage = piece.stage ?? null;
                if (!piece.stage) piece.stage = 1;
                if (piece.stage < 3) {
                    piece.stage++;
                    const startRow = piece.color === COLORS.WHITE ? 7 : 2;
                    let targetCol = piece.col;
                    if (!gameState.board.isEmpty(startRow, targetCol)) {
                        for (let i = 1; i < 11; i++) {
                            if (targetCol + i < 11 && gameState.board.isEmpty(startRow, targetCol + i)) { targetCol += i; break; }
                            if (targetCol - i >= 0 && gameState.board.isEmpty(startRow, targetCol - i)) { targetCol -= i; break; }
                        }
                    }
                    const fromRow = piece.row;
                    const fromCol = piece.col;
                    const moveData = gameState.board.movePiece(piece.row, piece.col, startRow, targetCol);
                    console.log(`Pawn of Pawns reached stage ${piece.stage}! Repatriated to ${startRow}, ${targetCol}.`);
                    return {
                        kind: 'pawn_cycle',
                        piece,
                        previousStage,
                        fromRow,
                        fromCol,
                        toRow: startRow,
                        toCol: targetCol,
                        moveData,
                        activePiece: piece
                    };
                }
                newPiece = new AdventitiousKing(piece.color, piece.row, piece.col);
                break;
            }
        }

        if (newPiece) {
            const previousStage = piece.stage ?? null;
            const previousHasMoved = piece.hasMoved;
            gameState.board.removePiece(piece);
            newPiece.hasMoved = previousHasMoved;
            newPiece.isPromoted = true;
            gameState.board.setPiece(newPiece.row, newPiece.col, newPiece);
            console.log(`Pawn promoted to ${newPiece.type}!`);
            return {
                kind: 'promotion',
                originalPiece: piece,
                promotedPiece: newPiece,
                previousStage,
                previousHasMoved,
                activePiece: newPiece
            };
        }

        return null;
    }

    static checkCitadelDraw(gameState, piece, endCol) {
        if (!piece) return;

        if (piece.type === PIECE_TYPES.KING || piece.type === PIECE_TYPES.PRINCE || piece.type === PIECE_TYPES.ADVENTITIOUS_KING) {
            if (piece.color === COLORS.WHITE && endCol === -1) {
                console.log('Draw! White King entered Black\'s Citadel.');
                gameState.status = GAME_STATES.GAME_OVER;
                gameState.winner = 'Draw (Hisar)';
            } else if (piece.color === COLORS.BLACK && endCol === 11) {
                console.log('Draw! Black King entered White\'s Citadel.');
                gameState.status = GAME_STATES.GAME_OVER;
                gameState.winner = 'Draw (Hisar)';
            }
        }
    }
}
