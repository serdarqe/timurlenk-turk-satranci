import test from 'node:test';
import assert from 'node:assert/strict';

import {
    appendFairyShadowLogEntry,
    buildFairyShadowLogEntry,
    buildFairyShadowLogReport,
    formatFairyShadowLogLine
} from '../src/fairy/FairyShadowLog.js';
import { COLORS } from '../src/utils/constants.js';

function buildMetadata(overrides = {}) {
    return {
        enabled: true,
        mode: 'shadow',
        depth: 4,
        fairyBestMove: 'd3d4',
        fairyAccepted: true,
        fairyRejectedReason: null,
        fallbackUsed: false,
        fairyThinkMs: 42,
        rootMovesAvailable: true,
        rootMoveCount: 48,
        rootMoveThinkMs: 8,
        rootMovesError: null,
        jsAiMove: 'd3d4',
        fairySelectedMove: 'd3d4',
        fairyMatchesJsMove: true,
        hybridApplied: false,
        timeout: false,
        errorCode: null,
        shadowMode: {
            enabled: true,
            status: 'in_sync',
            authoritativeSource: 'js',
            rootComparisonAvailable: true,
            exactMatch: true,
            onlyExpectedDiffs: true,
            missingWrapperCount: 0,
            rejectedFairyCount: 0,
            unexpectedJsOnlyCount: 0,
            unexpectedFairyOnlyCount: 0,
            nativeBestMoveStatus: 'accepted',
            nativeBestMoveReason: 'fairy_bestmove_is_timur_legal'
        },
        ...overrides
    };
}

test('shadow log entry kompakt ve okunabilir karar ozeti uretir', () => {
    const entry = buildFairyShadowLogEntry(buildMetadata(), {
        moveIndex: 12,
        sideToMove: COLORS.BLACK
    });

    assert.equal(entry.moveIndex, 12);
    assert.equal(entry.sideToMove, COLORS.BLACK);
    assert.equal(entry.status, 'in_sync');
    assert.equal(entry.severity, 'ok');
    assert.equal(entry.rootComparisonAvailable, true);
    assert.equal(entry.rootMoveCount, 48);
    assert.equal(entry.jsAiMove, 'd3d4');
    assert.equal(entry.fairyBestMove, 'd3d4');
    assert.equal(formatFairyShadowLogLine(entry), '#12 black in_sync ok JS=d3d4 Fairy=d3d4');
});

test('shadow log report mismatch ve red sebeplerini sayar', () => {
    const accepted = buildFairyShadowLogEntry(buildMetadata(), { moveIndex: 1 });
    const rejected = buildFairyShadowLogEntry(buildMetadata({
        fairyBestMove: 'c2d1',
        fairyAccepted: false,
        fairyRejectedReason: 'picket_minimum_distance_rule',
        fallbackUsed: true,
        fairySelectedMove: 'd3d4',
        fairyMatchesJsMove: false,
        shadowMode: {
            ...buildMetadata().shadowMode,
            status: 'bestmove_only_rejected',
            rootComparisonAvailable: false,
            exactMatch: false,
            nativeBestMoveStatus: 'rejected',
            nativeBestMoveReason: 'picket_minimum_distance_rule'
        }
    }), { moveIndex: 2 });
    const rootError = buildFairyShadowLogEntry(buildMetadata({
        rootMovesAvailable: false,
        rootMoveCount: 0,
        rootMovesError: 'fairy_root_moves_timeout',
        shadowMode: {
            ...buildMetadata().shadowMode,
            status: 'bestmove_only_accepted',
            rootComparisonAvailable: false,
            exactMatch: false
        }
    }), { moveIndex: 3 });

    const report = buildFairyShadowLogReport([accepted, rejected, rootError]);

    assert.equal(report.sampleCount, 3);
    assert.equal(report.acceptedCount, 2);
    assert.equal(report.rejectedCount, 1);
    assert.equal(report.matchCount, 2);
    assert.equal(report.mismatchCount, 1);
    assert.equal(report.rootComparisonCount, 1);
    assert.equal(report.rootMovesErrorCount, 1);
    assert.deepEqual(report.rejectionReasons, [
        { reason: 'picket_minimum_distance_rule', count: 1 }
    ]);
    assert.deepEqual(report.statusCounts, [
        { status: 'bestmove_only_accepted', count: 1 },
        { status: 'bestmove_only_rejected', count: 1 },
        { status: 'in_sync', count: 1 }
    ]);
    assert.equal(report.problemMoves.length, 2);
    assert.equal(report.problemMoves[0].moveIndex, 2);
});

test('shadow log append limiti eski kayitlari dusurur', () => {
    const first = buildFairyShadowLogEntry(buildMetadata({ jsAiMove: 'a1a2' }), { moveIndex: 1 });
    const second = buildFairyShadowLogEntry(buildMetadata({ jsAiMove: 'b1b2' }), { moveIndex: 2 });
    const third = buildFairyShadowLogEntry(buildMetadata({ jsAiMove: 'c1c2' }), { moveIndex: 3 });

    const log = appendFairyShadowLogEntry(
        appendFairyShadowLogEntry(
            appendFairyShadowLogEntry([], first, { maxEntries: 2 }),
            second,
            { maxEntries: 2 }
        ),
        third,
        { maxEntries: 2 }
    );

    assert.deepEqual(log.map((entry) => entry.moveIndex), [2, 3]);
});
