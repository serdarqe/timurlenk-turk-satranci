import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { King, Prince, Rook } from '../src/game/PieceFactory.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';
import {
    applyPerftMove,
    collectLegalMoves,
    createPerftSignature,
    dividePerft,
    perft,
    revertPerftMove
} from '../src/game/Perft.js';

test('baslangic dizilimleri derinlik 1 ve 2 perft sayilarini sabitler', async () => {
    const expectations = {
        [FORMATIONS.MASCULINE]: { depth1: 31, depth2: 961 },
        [FORMATIONS.FEMININE]: { depth1: 31, depth2: 961 },
        [FORMATIONS.FULL]: { depth1: 19, depth2: 361 }
    };

    for (const [formation, expected] of Object.entries(expectations)) {
        const state = await GameState.createInitialState(formation);
        state.currentTurn = COLORS.WHITE;

        assert.equal(collectLegalMoves(state).length, expected.depth1, `${formation} depth 1 move count`);
        assert.equal(perft(state, 1), expected.depth1, `${formation} depth 1 perft`);
        assert.equal(perft(state, 2), expected.depth2, `${formation} depth 2 perft`);
    }
});

test('dividePerft kok hamleleri ve node toplamlarini raporlar', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const divisions = dividePerft(state, 1);
    const total = divisions.reduce((sum, entry) => sum + entry.nodes, 0);

    assert.equal(divisions.length, 31);
    assert.equal(total, 31);
    assert.ok(divisions.every((entry) => entry.nodes === 1));
    assert.ok(divisions.every((entry) => typeof entry.notation === 'string' && entry.notation.includes('->')));
});

test('perft hamle uygulama ve geri alma normal hamlede state imzasini korur', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const before = createPerftSignature(state);
    const moveObj = collectLegalMoves(state)[0];

    const applied = applyPerftMove(state, moveObj);
    revertPerftMove(state, applied);

    assert.equal(createPerftSignature(state), before);
});

test('perft royal swap ozel hamlesini uygulayip geri alir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(8, 4, new Rook(COLORS.WHITE, 8, 4));
    state.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
    state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));
    const before = createPerftSignature(state);

    const king = state.board.getPieceAt(9, 5);
    const royalSwap = new MoveValidator(state)
        .getLegalMoves(9, 5)
        .find((move) => move.specialMove === 'royal_swap');

    assert.ok(royalSwap);

    const applied = applyPerftMove(state, { piece: king, move: royalSwap });
    revertPerftMove(state, applied);

    assert.equal(createPerftSignature(state), before);
});

test('perft hisar degisimi ozel hamlesini uygulayip geri alir', () => {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(5, 5, new Prince(COLORS.WHITE, 5, 5));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    const before = createPerftSignature(state);

    const king = state.board.getPieceAt(0, 0);
    const citadelExchange = new MoveValidator(state)
        .getLegalMoves(0, 0)
        .find((move) => move.specialMove === 'citadel_exchange');

    assert.ok(citadelExchange);

    const applied = applyPerftMove(state, { piece: king, move: citadelExchange });
    revertPerftMove(state, applied);

    assert.equal(createPerftSignature(state), before);
});

