// src/game/PieceFactory.js
import { PIECE_TYPES, COLORS, PAWN_TYPES, FORMATIONS } from '../utils/constants.js';
import { Piece } from './Piece.js';

function buildLeaperMoves(piece, board, directions) {
    const moves = [];
    for (const [dr, dc] of directions) {
        const nr = piece.row + dr;
        const nc = piece.col + dc;
        if (piece._isAccessible(board, nr, nc)) moves.push({ row: nr, col: nc });
    }
    return moves;
}

export class King extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.KING, color, row, col); }
    getPotentialMoves(board) {
        if (this.row === 0 && this.col === -1) {
            return [
                { row: 0, col: 0 },
                { row: 1, col: 0 }
            ].filter((move) => this._isAccessible(board, move.row, move.col));
        }

        if (this.row === 9 && this.col === 11) {
            return [
                { row: 9, col: 10 },
                { row: 8, col: 10 }
            ].filter((move) => this._isAccessible(board, move.row, move.col));
        }

        const moves = buildLeaperMoves(this, board, [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);

        // Citadel access: King/Prince/AdventitiousKing can enter their own empty citadel
        // Black citadel is at (0, -1), accessible from (0, 0)
        // White citadel is at (9, 11), accessible from (9, 10)
        if (this.color === COLORS.BLACK && this.row === 0 && this.col === 0) {
            if (!board.citadelBlack) moves.push({ row: 0, col: -1 });
        }
        if (this.color === COLORS.WHITE && this.row === 9 && this.col === 10) {
            if (!board.citadelWhite) moves.push({ row: 9, col: 11 });
        }

        return moves;
    }
}

export class Prince extends King {
    constructor(color, row, col) {
        super(color, row, col);
        this.type = PIECE_TYPES.PRINCE;
    }
}

export class AdventitiousKing extends King {
    constructor(color, row, col) {
        super(color, row, col);
        this.type = PIECE_TYPES.ADVENTITIOUS_KING;
    }
}

export class Vizier extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.VIZIER, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }
}

export class SeaMonster extends Vizier {
    constructor(color, row, col) {
        super(color, row, col);
        this.type = PIECE_TYPES.SEA_MONSTER;
    }
}

export class General extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.GENERAL, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }
}

export class Knight extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.KNIGHT, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]]);
    }
}

export class Lion extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.LION, color, row, col); }
    getPotentialMoves(board) {
        // Modern reconstruction: 3,0 leaper.
        return buildLeaperMoves(this, board, [[-3, 0], [3, 0], [0, -3], [0, 3]]);
    }
}

export class Elephant extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.ELEPHANT, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-2, -2], [-2, 2], [2, -2], [2, 2]]);
    }
}

export class Camel extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.CAMEL, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-3, -1], [-3, 1], [3, -1], [3, 1], [-1, -3], [1, -3], [-1, 3], [1, 3]]);
    }
}

export class Dabbaba extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.DABBABA, color, row, col); }
    getPotentialMoves(board) {
        return buildLeaperMoves(this, board, [[-2, 0], [2, 0], [0, -2], [0, 2]]);
    }
}

export class Bull extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.BULL, color, row, col); }
    getPotentialMoves(board) {
        // Modern reconstruction: 3,2 leaper.
        return buildLeaperMoves(this, board, [[-3, -2], [-3, 2], [3, -2], [3, 2], [-2, -3], [-2, 3], [2, -3], [2, 3]]);
    }
}

export class Revealer extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.REVEALER, color, row, col); }
    getPotentialMoves(board) {
        // Modern reconstruction: 3,3 leaper.
        return buildLeaperMoves(this, board, [[-3, -3], [-3, 3], [3, -3], [3, 3]]);
    }
}

export class Giraffe extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.GIRAFFE, color, row, col); }
    getPotentialMoves(board) {
        const moves = [];
        const starts = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dRow, dCol] of starts) {
            let checkRow = this.row + dRow;
            let checkCol = this.col + dCol;
            if (!this._isEmpty(board, checkRow, checkCol)) continue;

            let contR = checkRow;
            let contC = checkCol;
            let step = 1;
            while (true) {
                contR += dRow;
                if (!this._isValidCoord(contR, contC)) break;
                if (!this._isEmpty(board, contR, contC) && !this._isAccessible(board, contR, contC)) break;
                if (step >= 3 && this._isAccessible(board, contR, contC)) moves.push({ row: contR, col: contC });
                if (!this._isEmpty(board, contR, contC)) break;
                step++;
            }

            contR = checkRow;
            contC = checkCol;
            step = 1;
            while (true) {
                contC += dCol;
                if (!this._isValidCoord(contR, contC)) break;
                if (!this._isEmpty(board, contR, contC) && !this._isAccessible(board, contR, contC)) break;
                if (step >= 3 && this._isAccessible(board, contR, contC)) moves.push({ row: contR, col: contC });
                if (!this._isEmpty(board, contR, contC)) break;
                step++;
            }
        }
        return moves;
    }
}

export class Picket extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.PICKET, color, row, col); }
    getPotentialMoves(board) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of directions) {
            let nr = this.row + dr;
            let nc = this.col + dc;
            let step = 1;
            while (this._isValidCoord(nr, nc)) {
                if (step >= 2 && this._isAccessible(board, nr, nc)) moves.push({ row: nr, col: nc });
                if (!this._isEmpty(board, nr, nc)) break;
                nr += dr;
                nc += dc;
                step++;
            }
        }
        return moves;
    }
}

export class Rook extends Piece {
    constructor(color, row, col) { super(PIECE_TYPES.ROOK, color, row, col); }
    getPotentialMoves(board) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of directions) {
            let nr = this.row + dr;
            let nc = this.col + dc;
            while (this._isValidCoord(nr, nc)) {
                if (this._isAccessible(board, nr, nc)) moves.push({ row: nr, col: nc });
                if (!this._isEmpty(board, nr, nc)) break;
                nr += dr;
                nc += dc;
            }
        }
        return moves;
    }
}

export class TimurPawn extends Piece {
    constructor(color, row, col, pawnType) {
        super(PIECE_TYPES.PAWN, color, row, col);
        this.pawnType = pawnType;
    }
    getPotentialMoves(board) {
        const moves = [];
        const forward = this.color === COLORS.WHITE ? -1 : 1;

        let nr = this.row + forward;
        let nc = this.col;
        if (this._isEmpty(board, nr, nc)) moves.push({ row: nr, col: nc });

        nr = this.row + forward;
        nc = this.col - 1;
        if (this._isValidCoord(nr, nc) && !this._isEmpty(board, nr, nc) && this._isAccessible(board, nr, nc)) {
            moves.push({ row: nr, col: nc });
        }

        nr = this.row + forward;
        nc = this.col + 1;
        if (this._isValidCoord(nr, nc) && !this._isEmpty(board, nr, nc) && this._isAccessible(board, nr, nc)) {
            moves.push({ row: nr, col: nc });
        }

        return moves;
    }
}

export class PieceFactory {
    static setupBoard(board, formation) {
        board.grid = Array(10).fill(null).map(() => Array(11).fill(null));
        board.pieces = [];

        if (formation === FORMATIONS.FULL) {
            this._setupFullBoard(board);
            return;
        }

        const pawnTypes = [
            PAWN_TYPES.PAWN_OF_PAWNS,
            PAWN_TYPES.PAWN_OF_DABBABAS,
            PAWN_TYPES.PAWN_OF_CAMELS,
            PAWN_TYPES.PAWN_OF_ELEPHANTS,
            PAWN_TYPES.PAWN_OF_GENERALS,
            PAWN_TYPES.PAWN_OF_KINGS,
            PAWN_TYPES.PAWN_OF_VIZIERS,
            PAWN_TYPES.PAWN_OF_GIRAFFES,
            PAWN_TYPES.PAWN_OF_PICKETS,
            PAWN_TYPES.PAWN_OF_KNIGHTS,
            PAWN_TYPES.PAWN_OF_ROOKS
        ];

        for (let i = 0; i < 11; i++) {
            board.setPiece(2, i, new TimurPawn(COLORS.BLACK, 2, i, pawnTypes[i]));
            board.setPiece(7, i, new TimurPawn(COLORS.WHITE, 7, i, pawnTypes[i]));
        }

        this._placeMainPieces(board, COLORS.BLACK, 0, 1, formation);
        this._placeMainPieces(board, COLORS.WHITE, 9, 8, formation);
    }

    static _placeMainPieces(board, color, backRow, middleRow, formation) {
        board.setPiece(middleRow, 0, new Rook(color, middleRow, 0));
        board.setPiece(middleRow, 1, new Knight(color, middleRow, 1));
        board.setPiece(middleRow, 2, new Picket(color, middleRow, 2));
        board.setPiece(middleRow, 3, new Giraffe(color, middleRow, 3));

        if (formation === FORMATIONS.FEMININE) {
            board.setPiece(middleRow, 4, new Vizier(color, middleRow, 4));
            board.setPiece(middleRow, 5, new King(color, middleRow, 5));
            board.setPiece(middleRow, 6, new General(color, middleRow, 6));
        } else {
            board.setPiece(middleRow, 4, new General(color, middleRow, 4));
            board.setPiece(middleRow, 5, new King(color, middleRow, 5));
            board.setPiece(middleRow, 6, new Vizier(color, middleRow, 6));
        }

        board.setPiece(middleRow, 7, new Giraffe(color, middleRow, 7));
        board.setPiece(middleRow, 8, new Picket(color, middleRow, 8));
        board.setPiece(middleRow, 9, new Knight(color, middleRow, 9));
        board.setPiece(middleRow, 10, new Rook(color, middleRow, 10));

        board.setPiece(backRow, 0, new Elephant(color, backRow, 0));
        board.setPiece(backRow, 1, new Camel(color, backRow, 1));
        board.setPiece(backRow, 2, new Dabbaba(color, backRow, 2));
        board.setPiece(backRow, 8, new Dabbaba(color, backRow, 8));
        board.setPiece(backRow, 9, new Camel(color, backRow, 9));
        board.setPiece(backRow, 10, new Elephant(color, backRow, 10));
    }

    static _setupFullBoard(board) {
        const fullBackRow = [
            PIECE_TYPES.ELEPHANT,
            PIECE_TYPES.LION,
            PIECE_TYPES.KNIGHT,
            PIECE_TYPES.BULL,
            PIECE_TYPES.DABBABA,
            PIECE_TYPES.REVEALER,
            PIECE_TYPES.DABBABA,
            PIECE_TYPES.BULL,
            PIECE_TYPES.CAMEL,
            PIECE_TYPES.LION,
            PIECE_TYPES.ELEPHANT
        ];

        const fullMiddleRow = [
            PIECE_TYPES.ROOK,
            PIECE_TYPES.KNIGHT,
            PIECE_TYPES.PICKET,
            PIECE_TYPES.GIRAFFE,
            PIECE_TYPES.GENERAL,
            PIECE_TYPES.KING,
            PIECE_TYPES.SEA_MONSTER,
            PIECE_TYPES.GIRAFFE,
            PIECE_TYPES.PICKET,
            PIECE_TYPES.KNIGHT,
            PIECE_TYPES.ROOK
        ];

        const fullPawnRow = [
            PAWN_TYPES.PAWN_OF_PAWNS,
            PAWN_TYPES.PAWN_OF_KNIGHTS,
            PAWN_TYPES.PAWN_OF_CAMELS,
            PAWN_TYPES.PAWN_OF_DABBABAS,
            PAWN_TYPES.PAWN_OF_GENERALS,
            PAWN_TYPES.PAWN_OF_KINGS,
            PAWN_TYPES.PAWN_OF_SEA_MONSTERS,
            PAWN_TYPES.PAWN_OF_GIRAFFES,
            PAWN_TYPES.PAWN_OF_PICKETS,
            PAWN_TYPES.PAWN_OF_LIONS,
            PAWN_TYPES.PAWN_OF_ROOKS
        ];

        const extraPawnCols = [
            { col: 2, pawnType: PAWN_TYPES.PAWN_OF_BULLS },
            { col: 5, pawnType: PAWN_TYPES.PAWN_OF_REVEALERS },
            { col: 8, pawnType: PAWN_TYPES.PAWN_OF_ELEPHANTS }
        ];

        this._placePieceRow(board, COLORS.BLACK, 0, fullBackRow);
        this._placePieceRow(board, COLORS.BLACK, 1, fullMiddleRow);
        this._placePawnRow(board, COLORS.BLACK, 2, fullPawnRow);
        this._placeExtraPawnRow(board, COLORS.BLACK, 3, extraPawnCols);

        this._placePieceRow(board, COLORS.WHITE, 9, [...fullBackRow].reverse());
        this._placePieceRow(board, COLORS.WHITE, 8, [...fullMiddleRow].reverse());
        this._placePawnRow(board, COLORS.WHITE, 7, [...fullPawnRow].reverse());
        this._placeExtraPawnRow(board, COLORS.WHITE, 6, extraPawnCols);
    }

    static _placePieceRow(board, color, row, pieceTypes) {
        pieceTypes.forEach((pieceType, col) => {
            board.setPiece(row, col, this._createPiece(pieceType, color, row, col));
        });
    }

    static _placePawnRow(board, color, row, pawnTypes) {
        pawnTypes.forEach((pawnType, col) => {
            board.setPiece(row, col, new TimurPawn(color, row, col, pawnType));
        });
    }

    static _placeExtraPawnRow(board, color, row, extraPawnCols) {
        extraPawnCols.forEach(({ col, pawnType }) => {
            board.setPiece(row, col, new TimurPawn(color, row, col, pawnType));
        });
    }

    static _createPiece(pieceType, color, row, col, pawnType = null) {
        switch (pieceType) {
            case PIECE_TYPES.KING: return new King(color, row, col);
            case PIECE_TYPES.PRINCE: return new Prince(color, row, col);
            case PIECE_TYPES.ADVENTITIOUS_KING: return new AdventitiousKing(color, row, col);
            case PIECE_TYPES.VIZIER: return new Vizier(color, row, col);
            case PIECE_TYPES.SEA_MONSTER: return new SeaMonster(color, row, col);
            case PIECE_TYPES.GENERAL: return new General(color, row, col);
            case PIECE_TYPES.KNIGHT: return new Knight(color, row, col);
            case PIECE_TYPES.LION: return new Lion(color, row, col);
            case PIECE_TYPES.ELEPHANT: return new Elephant(color, row, col);
            case PIECE_TYPES.CAMEL: return new Camel(color, row, col);
            case PIECE_TYPES.DABBABA: return new Dabbaba(color, row, col);
            case PIECE_TYPES.BULL: return new Bull(color, row, col);
            case PIECE_TYPES.REVEALER: return new Revealer(color, row, col);
            case PIECE_TYPES.GIRAFFE: return new Giraffe(color, row, col);
            case PIECE_TYPES.PICKET: return new Picket(color, row, col);
            case PIECE_TYPES.ROOK: return new Rook(color, row, col);
            case PIECE_TYPES.PAWN: return new TimurPawn(color, row, col, pawnType || PAWN_TYPES.PAWN_OF_PAWNS);
            default: return null;
        }
    }

    static setupPuzzleBoard(board, piecesData) {
        board.grid = Array(10).fill(null).map(() => Array(11).fill(null));
        board.pieces = [];

        piecesData.forEach(pData => {
            const [type, color, row, col, pawnType] = pData;
            const newPiece = this._createPiece(type, color, row, col, pawnType);
            if (newPiece) board.setPiece(row, col, newPiece);
        });
    }
}
