import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEvaluationBreakdownForBlack } from '../src/ai/AiEvaluation.js';
import { GameState } from '../src/game/GameState.js';
import { General, King, Knight, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';

function createKingsOnlyState() {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    return state;
}

function moveRecord(color, fromRow, fromCol, toRow, toCol, type = 'rook') {
    return {
        color,
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        movedPieceBefore: { type, color }
    };
}

test('evaluation v3 koordinasyon bileseni destekli merkezi tas agini odullendirir', () => {
    const coordinated = createKingsOnlyState();
    coordinated.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    coordinated.board.setPiece(5, 5, new General(COLORS.BLACK, 5, 5));
    coordinated.board.setPiece(3, 6, new Knight(COLORS.BLACK, 3, 6));

    const scattered = createKingsOnlyState();
    scattered.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    scattered.board.setPiece(8, 10, new General(COLORS.BLACK, 8, 10));
    scattered.board.setPiece(7, 0, new Knight(COLORS.BLACK, 7, 0));

    const coordinatedBreakdown = buildEvaluationBreakdownForBlack(coordinated, 'hard');
    const scatteredBreakdown = buildEvaluationBreakdownForBlack(scattered, 'hard');

    assert.ok('coordination' in coordinatedBreakdown.components);
    assert.ok(coordinatedBreakdown.components.coordination > scatteredBreakdown.components.coordination + 8);
});

test('evaluation v3 tempo devamlılığı ayni tasin ileri geri oynanmasini cezalandirir', () => {
    const productive = createKingsOnlyState();
    productive.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    productive.board.setPiece(5, 5, new General(COLORS.BLACK, 5, 5));
    productive.moveHistory = [
        moveRecord(COLORS.BLACK, 1, 0, 3, 0),
        moveRecord(COLORS.WHITE, 1, 0, 2, 0),
        moveRecord(COLORS.BLACK, 1, 2, 3, 2),
        moveRecord(COLORS.WHITE, 1, 2, 2, 2),
        moveRecord(COLORS.BLACK, 3, 0, 4, 1)
    ];

    const shuttle = createKingsOnlyState();
    shuttle.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    shuttle.board.setPiece(5, 5, new General(COLORS.BLACK, 5, 5));
    shuttle.moveHistory = [
        moveRecord(COLORS.BLACK, 4, 4, 4, 6),
        moveRecord(COLORS.WHITE, 1, 0, 2, 0),
        moveRecord(COLORS.BLACK, 4, 6, 4, 4),
        moveRecord(COLORS.WHITE, 1, 2, 2, 2),
        moveRecord(COLORS.BLACK, 4, 4, 4, 6)
    ];

    const productiveBreakdown = buildEvaluationBreakdownForBlack(productive, 'hard');
    const shuttleBreakdown = buildEvaluationBreakdownForBlack(shuttle, 'hard');

    assert.ok('tempoContinuity' in productiveBreakdown.components);
    assert.ok(productiveBreakdown.components.tempoContinuity > shuttleBreakdown.components.tempoContinuity + 12);
});
