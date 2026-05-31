import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { GameRules } from '../src/game/GameRules.js';
import { King, Prince } from '../src/game/PieceFactory.js';
import { getCitadelExchangeParityCases } from '../src/fairy/FairyCitadelExchangeParity.js';

function buildExchangeState(parityCase) {
    const state = new GameState();
    const royal = new King(parityCase.color, parityCase.royalFrom.row, parityCase.royalFrom.col);
    const target = new Prince(parityCase.color, parityCase.targetRoyalFrom.row, parityCase.targetRoyalFrom.col);
    state.board.setPiece(royal.row, royal.col, royal);
    state.board.setPiece(target.row, target.col, target);
    return { state, royal, target };
}

test('citadel exchange parity moves target royal to opponent citadel and acting royal to target square', () => {
    for (const parityCase of getCitadelExchangeParityCases()) {
        const { state, royal, target } = buildExchangeState(parityCase);
        const effects = GameRules.applyCitadelExchange(state, royal, target);

        assert.equal(effects.kind, 'citadel_exchange', parityCase.id);
        assert.equal(state.citadelExchangeUsed[parityCase.color], true, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.citadel.row, parityCase.citadel.col), target, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.targetRoyalFrom.row, parityCase.targetRoyalFrom.col), royal, parityCase.id);
        assert.equal(effects.activePiece, royal, parityCase.id);
        assert.equal(state.status, parityCase.expectedStatus, parityCase.id);
        assert.equal(state.winner, parityCase.expectedWinner, parityCase.id);
    }
});

test('citadel exchange parity is one-time per color and reversible', () => {
    for (const parityCase of getCitadelExchangeParityCases()) {
        const { state, royal, target } = buildExchangeState(parityCase);
        const effects = GameRules.applyCitadelExchange(state, royal, target);

        assert.equal(GameRules.applyCitadelExchange(state, royal, target), null, parityCase.id);

        GameRules.revertCitadelExchange(state, effects);

        assert.equal(state.citadelExchangeUsed[parityCase.color], false, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.royalFrom.row, parityCase.royalFrom.col), royal, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.targetRoyalFrom.row, parityCase.targetRoyalFrom.col), target, parityCase.id);
        assert.equal(state.board.getPieceAt(parityCase.citadel.row, parityCase.citadel.col), null, parityCase.id);
    }
});

test('citadel exchange parity covers both colors and both opponent citadels', () => {
    const cases = getCitadelExchangeParityCases();

    assert.equal(cases.length, 2);
    assert.equal(cases.some((item) => item.citadel.row === 0 && item.citadel.col === -1), true);
    assert.equal(cases.some((item) => item.citadel.row === 9 && item.citadel.col === 11), true);
});
