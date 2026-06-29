import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { GameState } from '../src/game/GameState.js';
import { King, TimurPawn } from '../src/game/PieceFactory.js';
import {
    collectTimurLegalMoves,
    selectSafeTimurMoveFromFairyBestMove
} from '../src/fairy/FairyTimurAdapter.js';
import { COLORS, PAWN_TYPES } from '../src/utils/constants.js';

function createPromotionState() {
    const state = new GameState();
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(9, 5, new King(COLORS.WHITE, 9, 5));
    state.board.setPiece(0, 10, new King(COLORS.BLACK, 0, 10));
    state.board.setPiece(1, 4, new TimurPawn(COLORS.WHITE, 1, 4, PAWN_TYPES.PAWN_OF_VIZIERS));
    return state;
}

test('native Fairy engine promotion output remains safe through the Timur adapter', () => {
    const result = spawnSync(process.execPath, [
        'scripts/validate-fairy-native-promotion.mjs',
        '--json'
    ], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 30000
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const jsonLine = result.stdout
        .trim()
        .split(/\r?\n/)
        .findLast((line) => line.trim().startsWith('{'));
    const payload = JSON.parse(jsonLine);
    assert.equal(payload.ok, true);
    assert.equal(payload.variant, 'timur');
    assert.equal(payload.fromTo, 'e9e10');
    assert.equal(payload.hasBasePromotionMove, true);
    assert.equal(payload.nativeSuffixComplete, false);
    assert.equal(payload.adapterGuardRequired, true);
    assert.ok(payload.promotionMoves.includes('e9e10'));
    assert.ok(payload.missingPromotionMoves.includes('e9e10v'));

    const state = createPromotionState();
    const jsMoves = collectTimurLegalMoves(state);
    const decision = selectSafeTimurMoveFromFairyBestMove(state, `bestmove ${payload.fromTo}`, { jsMoves });

    assert.equal(jsMoves.some((move) => move.uci === payload.fromTo), true);
    assert.equal(decision.accepted, true);
    assert.equal(decision.source, 'fairy');
    assert.equal(decision.reason, 'fairy_bestmove_is_timur_legal');
    assert.equal(decision.selectedMove.uci, payload.fromTo);
});
