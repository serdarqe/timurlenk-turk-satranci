import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { COLORS } from '../src/utils/constants.js';
import { SCRIPTED_MATCH, setupScriptedMatchBoard } from '../src/tutorial/ScriptedMatch.js';

function applyLegalMove(state, from, to, label) {
    const validator = new MoveValidator(state);
    const legalMoves = validator.getLegalMoves(from.row, from.col);
    const isLegal = legalMoves.some((move) => move.row === to.row && move.col === to.col);

    assert.ok(
        isLegal,
        `${label} illegal: ${from.row},${from.col} -> ${to.row},${to.col}`
    );

    const moveData = state.board.movePiece(from.row, from.col, to.row, to.col);
    assert.ok(moveData, `${label} could not be applied on board`);
    state.switchTurn();
}

test('scripted tutorial sparse board keeps both kings and teaching pieces ready', () => {
    const state = new GameState();
    setupScriptedMatchBoard(state.board);

    const whiteKing = state.board.getPieceAt(9, 5);
    const blackKing = state.board.getPieceAt(1, 4);
    const whiteRook = state.board.getPieceAt(8, 10);
    const whiteElephant = state.board.getPieceAt(9, 10);

    assert.equal(whiteKing?.color, COLORS.WHITE);
    assert.equal(blackKing?.color, COLORS.BLACK);
    assert.equal(whiteRook?.color, COLORS.WHITE);
    assert.equal(whiteElephant?.color, COLORS.WHITE);
    assert.equal(state.board.getPieceAt(7, 8), null);
    assert.equal(state.board.getPieceAt(8, 8), null);
});

test('scripted tutorial move sequence stays legal from start to finish', () => {
    const state = new GameState();
    setupScriptedMatchBoard(state.board);
    state.currentTurn = COLORS.WHITE;

    SCRIPTED_MATCH.forEach((step, index) => {
        applyLegalMove(
            state,
            step.from,
            step.to,
            `player step ${index + 1}`
        );

        if (step.aiMove) {
            applyLegalMove(
                state,
                step.aiMove.from,
                step.aiMove.to,
                `ai step ${index + 1}`
            );
        }
    });

    const finalRook = state.board.getPieceAt(0, 5);
    assert.equal(finalRook?.color, COLORS.WHITE);
});
