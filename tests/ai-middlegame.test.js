import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeMiddleGameMove, analyzeMiddleGamePosition } from '../src/ai/AIMiddleGame.js';
import { selectAiMoveAnalysisForState } from '../src/ai/ai.worker.js';
import { GameState } from '../src/game/GameState.js';
import { King, Knight, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';

function createBaseState(difficulty = 'hard') {
    const state = new GameState(difficulty);
    state.currentTurn = COLORS.BLACK;
    state.moveHistory = Array.from({ length: 24 }, (_, index) => ({
        color: index % 2 === 0 ? COLORS.BLACK : COLORS.WHITE,
        from: { row: index % 10, col: index % 11 },
        to: { row: (index + 1) % 10, col: (index + 2) % 11 },
        movedPieceBefore: { type: 'pawn', color: index % 2 === 0 ? COLORS.BLACK : COLORS.WHITE }
    }));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    return state;
}

test('middle game move analysis recognizes a quiet fork threat', () => {
    const state = createBaseState();
    const knight = new Knight(COLORS.BLACK, 7, 4);
    state.board.setPiece(7, 4, knight);
    state.board.setPiece(3, 4, new Rook(COLORS.WHITE, 3, 4));
    state.board.setPiece(3, 6, new Rook(COLORS.WHITE, 3, 6));

    const analysis = analyzeMiddleGameMove(state, {
        piece: knight,
        move: { row: 5, col: 5 }
    }, 'hard');

    assert.ok(analysis.score > 40);
    assert.ok(analysis.motifs.includes('fork'));
    assert.equal(analysis.quietThreat, true);
    assert.equal(analysis.targets.length, 2);
});

test('middle game position analysis chooses stabilization when own material is hanging', () => {
    const state = createBaseState();
    state.board.setPiece(5, 5, new Rook(COLORS.BLACK, 5, 5));
    state.board.setPiece(3, 4, new Knight(COLORS.WHITE, 3, 4));

    const analysis = analyzeMiddleGamePosition(state, COLORS.BLACK, 'hard');

    assert.equal(analysis.plan.id, 'stabilize');
    assert.ok(analysis.components.ownHangingRisk > 0);
    assert.ok(analysis.score < 0);
});

test('ai root candidates carry middle game fork signals', () => {
    const state = createBaseState('hard');
    const knight = new Knight(COLORS.BLACK, 7, 4);
    state.board.setPiece(7, 4, knight);
    state.board.setPiece(3, 4, new Rook(COLORS.WHITE, 3, 4));
    state.board.setPiece(3, 6, new Rook(COLORS.WHITE, 3, 6));

    const analysis = selectAiMoveAnalysisForState(state, {
        maxThinkMs: 80,
        disableEndgameShortcuts: true
    });
    const forkCandidate = analysis.searchInfo.candidates.find((candidate) => (
        candidate.move.piece.row === 7
        && candidate.move.piece.col === 4
        && candidate.move.move.row === 5
        && candidate.move.move.col === 5
    ));

    assert.ok(forkCandidate);
    assert.ok(forkCandidate.middleGameMove.score > 40);
    assert.ok(forkCandidate.middleGameMove.motifs.includes('fork'));
});
