import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import * as FairyDebugEngine from '../src/fairy/FairyDebugEngine.js';
import {
    buildFairyShadowMetadataFromProbe,
    parseFairyPerftRootMoves,
    resolveFairySearchDepth
} from '../src/fairy/FairyDebugEngine.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import { collectTimurLegalMoves } from '../src/fairy/FairyTimurAdapter.js';
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
    assert.equal(metadata.rootMovesAvailable, false);
    assert.equal(metadata.rootMoveCount, 0);
    assert.equal(metadata.rootMovesError, null);
    assert.equal(metadata.shadowMode.enabled, true);
    assert.equal(metadata.shadowMode.authoritativeSource, 'js');
    assert.equal(metadata.shadowMode.status, 'bestmove_only_accepted');
    assert.equal(metadata.shadowMode.rootComparisonAvailable, false);
    assert.equal(metadata.shadowMode.nativeBestMoveStatus, 'accepted');
    assert.equal(metadata.shadowMode.nativeBestMoveReason, 'fairy_bestmove_is_timur_legal');
    assert.equal(metadata.shadowMode.unexpectedJsOnlyCount, 0);
    assert.equal(metadata.shadowMode.unexpectedFairyOnlyCount, 0);
    assert.equal(metadata.shadowLogEntry.status, 'bestmove_only_accepted');
    assert.equal(metadata.shadowLogEntry.severity, 'ok');
    assert.equal(metadata.shadowLogEntry.jsAiMove, 'd3d4');
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
    assert.equal(metadata.shadowMode.enabled, true);
    assert.equal(metadata.shadowMode.status, 'bestmove_only_rejected');
    assert.equal(metadata.shadowMode.rootComparisonAvailable, false);
    assert.equal(metadata.shadowMode.nativeBestMoveStatus, 'rejected');
    assert.equal(metadata.shadowMode.nativeBestMoveReason, 'picket_minimum_distance_rule');
    assert.equal(metadata.shadowLogEntry.status, 'bestmove_only_rejected');
    assert.equal(metadata.shadowLogEntry.severity, 'mismatch');
    assert.equal(metadata.shadowLogEntry.rejectionReason, 'picket_minimum_distance_rule');
});

test('Fairy perft root move parser normal ve ozel native tokenlari korur', () => {
    assert.deepEqual(parseFairyPerftRootMoves([
        'd3d4: 1',
        'A10@BlackCitadel: 1',
        'royal_swap:f1:e2@ransom: 1',
        'pawn_cycle:e10:e3@stage2: 1',
        'citadel_exchange:a10:f5@blackcitadel: 1',
        'Nodes searched: 5',
        'info depth 1 nodes 5'
    ]), [
        'a10@blackcitadel',
        'citadel_exchange:a10:f5@blackcitadel',
        'd3d4',
        'pawn_cycle:e10:e3@stage2',
        'royal_swap:f1:e2@ransom'
    ]);
});

test('Fairy primary depth sure modu IDlerini 5m ve 30m olarak hesaba katar', () => {
    assert.equal(resolveFairySearchDepth({ difficulty: 'hard', timeControl: '5m' }, { fairyPrimary: true }), 5);
    assert.equal(resolveFairySearchDepth({ difficulty: 'hard', timeControl: '30m' }, { fairyPrimary: true }), 7);
    assert.equal(resolveFairySearchDepth({ difficulty: 'hard', timeControl: 'none' }, { fairyPrimary: true }), 7);
});

test('Fairy clock bilgisi Stockfish UCI wtime btime komutuna cevrilir', () => {
    assert.equal(typeof FairyDebugEngine.buildFairyClockLimits, 'function');
    assert.equal(typeof FairyDebugEngine.buildFairyGoCommand, 'function');

    const clockLimits = FairyDebugEngine.buildFairyClockLimits({
        timeControl: '30m',
        clock: {
            timeControl: '30m',
            whiteMs: 1_200_000,
            blackMs: 60_000,
            activeColor: COLORS.BLACK,
            running: true,
            lastTickAt: 10_000,
            expiredColor: null
        }
    }, 25_000);

    assert.deepEqual(clockLimits, {
        wtime: 1_200_000,
        btime: 45_000,
        winc: 0,
        binc: 0,
        movetime: 540
    });
    assert.equal(
        FairyDebugEngine.buildFairyGoCommand({
            useNativeTimeProfile: true,
            depth: 6,
            clockLimits
        }),
        'go wtime 1200000 btime 45000 winc 0 binc 0 movetime 540'
    );
    assert.equal(
        FairyDebugEngine.buildFairyGoCommand({
            useNativeTimeProfile: false,
            depth: 6,
            clockLimits
        }),
        'go depth 6'
    );
});

test('Fairy shadow metadata rootMoves verilirse tam karsilastirma ozeti tutar', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    const legalMoves = collectTimurLegalMoves(state);

    const metadata = buildFairyShadowMetadataFromProbe(
        state,
        { fromRow: 7, fromCol: 3, toRow: 6, toCol: 3 },
        {
            ok: true,
            bestmove: 'bestmove d3d4',
            rootMoves: legalMoves.filter((move) => !move.unsupported).map((move) => move.uci),
            thinkMs: 42,
            artifact: 'singlethread',
            variant: 'timur',
            depth: 4
        }
    );

    assert.equal(metadata.rootMovesAvailable, true);
    assert.equal(metadata.rootMoveCount, legalMoves.filter((move) => !move.unsupported).length);
    assert.equal(metadata.rootMovesError, null);
    assert.equal(metadata.shadowMode.enabled, true);
    assert.equal(metadata.shadowMode.status, 'in_sync');
    assert.equal(metadata.shadowMode.rootComparisonAvailable, true);
    assert.equal(metadata.shadowMode.exactMatch, true);
    assert.equal(metadata.shadowMode.onlyExpectedDiffs, true);
    assert.equal(metadata.shadowMode.missingWrapperCount, 0);
    assert.equal(metadata.shadowMode.rejectedFairyCount, 0);
});
