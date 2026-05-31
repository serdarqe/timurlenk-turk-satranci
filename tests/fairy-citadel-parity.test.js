import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { AdventitiousKing, King } from '../src/game/PieceFactory.js';
import {
    getCitadelDrawParityCases,
    getOwnCitadelEntryParityCases
} from '../src/fairy/FairyCitadelParity.js';
import { COLORS } from '../src/utils/constants.js';

function playCitadelEntry({ pieceFactory, from, to }) {
    const state = new GameState();
    const piece = pieceFactory(from.row, from.col);
    state.board.setPiece(from.row, from.col, piece);
    state.board.movePiece(from.row, from.col, to.row, to.col);
    const activePiece = state.board.getPieceAt(to.row, to.col);
    GameRules.applyPostMoveEffects(state, activePiece, to.row, to.col);
    return { state, activePiece };
}

test('opponent citadel entry parity ends the game as a citadel draw', () => {
    for (const parityCase of getCitadelDrawParityCases()) {
        const { state, activePiece } = playCitadelEntry({
            pieceFactory: (row, col) => new King(parityCase.color, row, col),
            from: parityCase.from,
            to: parityCase.to
        });

        assert.equal(activePiece.color, parityCase.color);
        assert.equal(activePiece.row, parityCase.to.row);
        assert.equal(activePiece.col, parityCase.to.col);
        assert.equal(state.status, parityCase.expectedStatus, parityCase.id);
        assert.equal(state.winner, parityCase.expectedWinner, parityCase.id);
    }
});

test('own citadel adventitious king entry parity does not resolve the game', () => {
    for (const parityCase of getOwnCitadelEntryParityCases()) {
        const { state, activePiece } = playCitadelEntry({
            pieceFactory: (row, col) => new AdventitiousKing(parityCase.color, row, col),
            from: parityCase.from,
            to: parityCase.to
        });

        assert.equal(activePiece.color, parityCase.color);
        assert.equal(state.status, parityCase.expectedStatus, parityCase.id);
        assert.equal(state.winner, parityCase.expectedWinner, parityCase.id);
    }
});

test('citadel parity exposes both colors and both citadel coordinates', () => {
    const drawCases = getCitadelDrawParityCases();
    const ownCases = getOwnCitadelEntryParityCases();

    assert.deepEqual(drawCases.map((item) => item.color).sort(), [COLORS.BLACK, COLORS.WHITE].sort());
    assert.deepEqual(ownCases.map((item) => item.color).sort(), [COLORS.BLACK, COLORS.WHITE].sort());
    assert.equal(drawCases.some((item) => item.to.row === 0 && item.to.col === -1), true);
    assert.equal(drawCases.some((item) => item.to.row === 9 && item.to.col === 11), true);
});
