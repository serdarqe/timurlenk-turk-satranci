import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { buildFairyShadowMetadataFromProbe } from '../src/fairy/FairyDebugEngine.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';

test('Fairy FEN baslangic Timur POC dizilimini uretir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    assert.equal(
        stateToFairyFen(state),
        'ecd5dce/rntzgkvztnr/ppppppppppp/11/11/11/11/PPPPPPPPPPP/RNTZGKVZTNR/ECD5DCE w - - 0 1'
    );
});

test('Fairy shadow metadata legal bestmove ile JS AI hamlesini eslestirir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const metadata = buildFairyShadowMetadataFromProbe(
        state,
        { fromRow: 7, fromCol: 3, toRow: 6, toCol: 3 },
        {
            ok: true,
            bestmove: 'bestmove d3d4',
            thinkMs: 42,
            artifact: 'singlethread',
            variant: 'timur',
            depth: 4
        }
    );

    assert.equal(metadata.enabled, true);
    assert.equal(metadata.shadowOnly, true);
    assert.equal(metadata.appliedToGame, false);
    assert.equal(metadata.fairyBestMove, 'd3d4');
    assert.equal(metadata.fairyAccepted, true);
    assert.equal(metadata.fallbackUsed, false);
    assert.equal(metadata.fairyThinkMs, 42);
    assert.equal(metadata.jsAiMove, 'd3d4');
    assert.equal(metadata.fairyMatchesJsMove, true);
});

test('Fairy shadow metadata illegal bestmove icin fallback bilgisi tutar', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;

    const metadata = buildFairyShadowMetadataFromProbe(
        state,
        { fromRow: 7, fromCol: 3, toRow: 6, toCol: 3 },
        {
            ok: true,
            bestmove: 'bestmove c2d1',
            thinkMs: 31,
            artifact: 'singlethread',
            variant: 'timur',
            depth: 4
        }
    );

    assert.equal(metadata.fairyBestMove, 'c2d1');
    assert.equal(metadata.fairyAccepted, false);
    assert.equal(metadata.fairyRejectedReason, 'picket_minimum_distance_rule');
    assert.equal(metadata.fallbackUsed, true);
    assert.equal(metadata.jsAiMove, 'd3d4');
    assert.equal(metadata.fairySelectedMove, 'd3d4');
    assert.equal(metadata.fairyMatchesJsMove, false);
});
