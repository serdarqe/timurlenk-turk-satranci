import { MoveValidator } from './MoveValidator.js';
import { GameRules } from './GameRules.js';
import { COLORS } from '../utils/constants.js';

const FILES = 'abcdefghijk';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function validateDepth(depth) {
    if (!Number.isInteger(depth) || depth < 0) {
        throw new TypeError(`Perft depth must be a non-negative integer. Received: ${depth}`);
    }
}

function squareToNotation(row, col) {
    if (row === 0 && col === -1) return 'black-citadel';
    if (row === 9 && col === 11) return 'white-citadel';
    return `${FILES[col] ?? '?'}${10 - row}`;
}

function moveToNotation(moveObj) {
    const { piece, move } = moveObj;
    const suffix = move.specialMove ? ` (${move.specialMove})` : '';
    return `${squareToNotation(piece.row, piece.col)} -> ${squareToNotation(move.row, move.col)}${suffix}`;
}

export function collectLegalMoves(gameState, color = gameState.currentTurn) {
    if (!gameState?.board || !color) return [];

    const previousTurn = gameState.currentTurn;
    gameState.currentTurn = color;

    try {
        const validator = new MoveValidator(gameState);
        return gameState.board.pieces
            .filter((piece) => piece.color === color)
            .flatMap((piece) => validator
                .getLegalMoves(piece.row, piece.col)
                .map((move) => ({ piece, move })));
    } finally {
        gameState.currentTurn = previousTurn;
    }
}

export function applyPerftMove(gameState, moveObj) {
    if (!gameState?.board || !moveObj?.piece || !moveObj?.move) {
        throw new TypeError('applyPerftMove requires a game state and a legal move object.');
    }

    const { piece, move } = moveObj;
    const previousTurn = gameState.currentTurn;
    const previousStatus = gameState.status ?? null;
    const previousWinner = gameState.winner ?? null;

    if (move.specialMove === 'royal_swap') {
        const targetPiece = gameState.board.getPieceAt(move.row, move.col);
        const effects = GameRules.applyRoyalSwap(gameState, piece, targetPiece);
        gameState.currentTurn = getOppositeColor(previousTurn);
        return {
            kind: 'royal_swap',
            moveObj,
            effects,
            previousTurn,
            previousStatus,
            previousWinner
        };
    }

    if (move.specialMove === 'citadel_exchange') {
        const targetPiece = gameState.board.getPieceAt(move.row, move.col);
        const effects = GameRules.applyCitadelExchange(gameState, piece, targetPiece);
        gameState.currentTurn = getOppositeColor(previousTurn);
        return {
            kind: 'citadel_exchange',
            moveObj,
            effects,
            previousTurn,
            previousStatus,
            previousWinner
        };
    }

    const fromRow = piece.row;
    const fromCol = piece.col;
    const moveData = gameState.board.movePiece(fromRow, fromCol, move.row, move.col);
    const postMoveEffects = GameRules.applyPostMoveEffects(gameState, piece, move.row, move.col);

    if (moveData?.capturedPiece) {
        GameRules.resolveRoyalElimination(gameState, moveData.capturedPiece.color);
    }

    gameState.currentTurn = getOppositeColor(previousTurn);

    return {
        kind: 'ordinary',
        moveObj,
        fromRow,
        fromCol,
        toRow: move.row,
        toCol: move.col,
        moveData,
        postMoveEffects,
        previousTurn,
        previousStatus,
        previousWinner
    };
}

export function revertPerftMove(gameState, appliedMove) {
    if (!gameState?.board || !appliedMove) return;

    gameState.currentTurn = appliedMove.previousTurn;

    if (appliedMove.kind === 'royal_swap') {
        GameRules.revertRoyalSwap(gameState, appliedMove.effects);
    } else if (appliedMove.kind === 'citadel_exchange') {
        GameRules.revertCitadelExchange(gameState, appliedMove.effects);
    } else if (appliedMove.kind === 'ordinary') {
        GameRules.revertPostMoveEffects(gameState, appliedMove.postMoveEffects);
        gameState.board.undoMove(
            appliedMove.fromRow,
            appliedMove.fromCol,
            appliedMove.toRow,
            appliedMove.toCol,
            appliedMove.moveData
        );
    }

    gameState.status = appliedMove.previousStatus;
    gameState.winner = appliedMove.previousWinner;
}

function perftInternal(gameState, depth) {
    if (depth === 0) return 1;
    if (gameState.isGameOver?.()) return 0;

    let nodes = 0;
    const moves = collectLegalMoves(gameState);

    for (const moveObj of moves) {
        const appliedMove = applyPerftMove(gameState, moveObj);
        nodes += perftInternal(gameState, depth - 1);
        revertPerftMove(gameState, appliedMove);
    }

    return nodes;
}

export function perft(gameState, depth, options = {}) {
    validateDepth(depth);

    const previousTurn = gameState.currentTurn;
    if (options.color) gameState.currentTurn = options.color;

    try {
        return perftInternal(gameState, depth);
    } finally {
        gameState.currentTurn = previousTurn;
    }
}

export function dividePerft(gameState, depth, options = {}) {
    validateDepth(depth);
    if (depth === 0) return [];

    const previousTurn = gameState.currentTurn;
    if (options.color) gameState.currentTurn = options.color;

    try {
        return collectLegalMoves(gameState).map((moveObj) => {
            const appliedMove = applyPerftMove(gameState, moveObj);
            const nodes = perftInternal(gameState, depth - 1);
            revertPerftMove(gameState, appliedMove);

            return {
                notation: moveToNotation(moveObj),
                nodes,
                from: { row: moveObj.piece.row, col: moveObj.piece.col },
                to: { row: moveObj.move.row, col: moveObj.move.col },
                specialMove: moveObj.move.specialMove || null
            };
        });
    } finally {
        gameState.currentTurn = previousTurn;
    }
}

export function createPerftSignature(gameState) {
    const pieces = [...(gameState?.board?.pieces || [])]
        .map((piece) => ({
            type: piece.type,
            color: piece.color,
            row: piece.row,
            col: piece.col,
            pawnType: piece.pawnType || null,
            stage: piece.stage ?? null,
            hasMoved: Boolean(piece.hasMoved),
            isPromoted: Boolean(piece.isPromoted)
        }))
        .sort((a, b) => (
            a.color.localeCompare(b.color)
            || a.type.localeCompare(b.type)
            || a.row - b.row
            || a.col - b.col
            || String(a.pawnType).localeCompare(String(b.pawnType))
        ));

    return JSON.stringify({
        currentTurn: gameState.currentTurn,
        status: gameState.status ?? null,
        winner: gameState.winner ?? null,
        ransomMoveUsed: gameState.ransomMoveUsed || null,
        citadelExchangeUsed: gameState.citadelExchangeUsed || null,
        pieces
    });
}

