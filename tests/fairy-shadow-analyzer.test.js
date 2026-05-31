import test from 'node:test';
import assert from 'node:assert/strict';

import {
    analyzeFairyShadowRecords,
    extractFairyShadowEntriesFromRecord,
    summarizeFairyShadowAnalysis
} from '../src/fairy/FairyShadowAnalyzer.js';
import { COLORS } from '../src/utils/constants.js';

function buildShadowDebug(overrides = {}) {
    return {
        enabled: true,
        mode: 'shadow',
        fairyBestMove: 'd3d4',
        fairyAccepted: true,
        fairyRejectedReason: null,
        fairyMatchesJsMove: true,
        jsAiMove: 'd3d4',
        rootMovesAvailable: true,
        rootMoveCount: 48,
        shadowMode: {
            enabled: true,
            status: 'in_sync',
            rootComparisonAvailable: true,
            unexpectedJsOnlyCount: 0,
            unexpectedFairyOnlyCount: 0,
            nativeBestMoveStatus: 'accepted',
            nativeBestMoveReason: 'fairy_bestmove_is_timur_legal'
        },
        ...overrides
    };
}

test('extractFairyShadowEntriesFromRecord moves icindeki fairyDebug alanlarini toplar', () => {
    const entries = extractFairyShadowEntriesFromRecord({
        gameId: 'g_shadow',
        resultType: 'checkmate',
        moves: [
            {
                index: 1,
                color: COLORS.WHITE,
                fairyDebug: buildShadowDebug()
            },
            {
                index: 2,
                color: COLORS.BLACK,
                fairyDebug: buildShadowDebug({
                    fairyBestMove: 'c2d1',
                    fairyAccepted: false,
                    fairyRejectedReason: 'picket_minimum_distance_rule',
                    fairyMatchesJsMove: false,
                    shadowMode: {
                        enabled: true,
                        status: 'bestmove_only_rejected',
                        rootComparisonAvailable: false,
                        unexpectedJsOnlyCount: 0,
                        unexpectedFairyOnlyCount: 0,
                        nativeBestMoveStatus: 'rejected',
                        nativeBestMoveReason: 'picket_minimum_distance_rule'
                    }
                })
            }
        ]
    });

    assert.equal(entries.length, 2);
    assert.equal(entries[0].gameId, 'g_shadow');
    assert.equal(entries[0].moveIndex, 1);
    assert.equal(entries[1].severity, 'mismatch');
    assert.equal(entries[1].rejectionReason, 'picket_minimum_distance_rule');
});

test('analyzeFairyShadowRecords shadow verisi olan ve olmayan oyunlari ayirir', () => {
    const analysis = analyzeFairyShadowRecords([
        {
            gameId: 'g_shadow',
            resultType: 'checkmate',
            winner: COLORS.BLACK,
            moves: [
                { index: 1, color: COLORS.WHITE, fairyDebug: buildShadowDebug() },
                {
                    index: 2,
                    color: COLORS.BLACK,
                    fairyDebug: buildShadowDebug({
                        fairyAccepted: false,
                        fairyRejectedReason: 'picket_minimum_distance_rule',
                        fairyMatchesJsMove: false,
                        shadowMode: {
                            enabled: true,
                            status: 'bestmove_only_rejected',
                            rootComparisonAvailable: false,
                            nativeBestMoveStatus: 'rejected',
                            nativeBestMoveReason: 'picket_minimum_distance_rule'
                        }
                    })
                }
            ]
        },
        {
            id: 'ai_vs_ai_no_shadow',
            resultType: 'max_moves_draw',
            winner: 'draw',
            moveCount: 280,
            moves: [
                { index: 1, notation: 'e3 -> e4', ai: { difficulty: 'easy' } }
            ]
        }
    ]);

    assert.equal(analysis.gameCount, 2);
    assert.equal(analysis.gamesWithShadowData, 1);
    assert.equal(analysis.gamesWithoutShadowData, 1);
    assert.equal(analysis.moveCount, 3);
    assert.equal(analysis.shadow.sampleCount, 2);
    assert.equal(analysis.shadow.mismatchCount, 1);
    assert.deepEqual(analysis.shadow.rejectionReasons, [
        { reason: 'picket_minimum_distance_rule', count: 1 }
    ]);
    assert.deepEqual(analysis.resultTypeCounts, [
        { resultType: 'checkmate', count: 1 },
        { resultType: 'max_moves_draw', count: 1 }
    ]);
    assert.equal(analysis.problemGames[0].gameId, 'g_shadow');
});

test('summarizeFairyShadowAnalysis shadow verisi yoksa acik uyarı verir', () => {
    const analysis = analyzeFairyShadowRecords([
        {
            id: 'ai_vs_ai_no_shadow',
            resultType: 'threefold_repetition',
            winner: 'draw',
            moveCount: 120,
            moves: []
        }
    ]);

    const summary = summarizeFairyShadowAnalysis(analysis);

    assert.equal(analysis.shadow.sampleCount, 0);
    assert.equal(summary.includes('Shadow verisi bulunamadi'), true);
    assert.equal(summary.includes('Okunan mac: 1'), true);
});

test('sampled automation probe raporu placeholder ve JS/Fairy ayrismalarini ayirir', () => {
    const analysis = analyzeFairyShadowRecords([
        {
            id: 'sampled_match',
            resultType: 'max_moves_draw',
            winner: 'draw',
            scenario: {
                kind: 'classic',
                timeControl: '15m',
                white: { difficulty: 'hard', personaId: 'timur' },
                black: { difficulty: 'medium', personaId: 'beyazid' }
            },
            moves: [
                {
                    index: 1,
                    color: COLORS.WHITE,
                    ai: { difficulty: 'hard', personaId: 'timur' },
                    fairyDebug: buildShadowDebug({
                        mode: 'automation_shadow',
                        automationShadow: true,
                        jsAiMove: 'e3e4',
                        fairyBestMove: null,
                        fairyAccepted: false,
                        fairyRejectedReason: 'fairy_probe_not_run_in_automation',
                        fairyMatchesJsMove: false,
                        shadowMode: {
                            enabled: true,
                            status: 'automation_probe_not_run',
                            rootComparisonAvailable: false,
                            nativeBestMoveStatus: 'not_run',
                            nativeBestMoveReason: 'fairy_probe_not_run_in_automation'
                        }
                    })
                },
                {
                    index: 2,
                    color: COLORS.BLACK,
                    ai: { difficulty: 'medium', personaId: 'beyazid' },
                    fairyDebug: buildShadowDebug({
                        mode: 'automation_sampled_probe',
                        jsAiMove: 'e8e7',
                        fairyBestMove: 'e8e7',
                        fairyAccepted: true,
                        fairyMatchesJsMove: true
                    })
                },
                {
                    index: 3,
                    color: COLORS.WHITE,
                    ai: { difficulty: 'hard', personaId: 'timur' },
                    fairyDebug: buildShadowDebug({
                        mode: 'automation_sampled_probe',
                        jsAiMove: 'd3d4',
                        fairyBestMove: 'h3h4',
                        fairyAccepted: true,
                        fairyMatchesJsMove: false,
                        shadowMode: {
                            enabled: true,
                            status: 'expected_differences',
                            rootComparisonAvailable: false,
                            nativeBestMoveStatus: 'accepted',
                            nativeBestMoveReason: 'fairy_bestmove_is_timur_legal'
                        }
                    })
                },
                {
                    index: 4,
                    color: COLORS.BLACK,
                    ai: { difficulty: 'medium', personaId: 'beyazid' },
                    fairyDebug: buildShadowDebug({
                        mode: 'automation_sampled_probe',
                        jsAiMove: 'c2c3',
                        fairyBestMove: 'c2d1',
                        fairyAccepted: false,
                        fairyRejectedReason: 'picket_minimum_distance_rule',
                        fairyMatchesJsMove: false,
                        shadowMode: {
                            enabled: true,
                            status: 'bestmove_only_rejected',
                            rootComparisonAvailable: false,
                            nativeBestMoveStatus: 'rejected',
                            nativeBestMoveReason: 'picket_minimum_distance_rule'
                        }
                    })
                }
            ]
        }
    ]);

    assert.equal(analysis.automationProbe.placeholderCount, 1);
    assert.equal(analysis.automationProbe.sampledProbeCount, 3);
    assert.equal(analysis.automationProbe.sampledAcceptedCount, 2);
    assert.equal(analysis.automationProbe.sampledRejectedCount, 1);
    assert.equal(analysis.automationProbe.sampledDifferenceCount, 2);
    assert.equal(analysis.automationProbe.probeCoverageRate, 0.75);

    const hardRow = analysis.automationProbe.byDifficulty.find((entry) => entry.difficulty === 'hard');
    const mediumRow = analysis.automationProbe.byDifficulty.find((entry) => entry.difficulty === 'medium');
    assert.deepEqual(hardRow, {
        difficulty: 'hard',
        total: 2,
        sampled: 1,
        placeholder: 1,
        accepted: 1,
        rejected: 0,
        differences: 1
    });
    assert.deepEqual(mediumRow, {
        difficulty: 'medium',
        total: 2,
        sampled: 2,
        placeholder: 0,
        accepted: 1,
        rejected: 1,
        differences: 1
    });
    assert.equal(analysis.automationProbe.differenceMoves.length, 2);
    assert.equal(analysis.automationProbe.differenceMoves[0].personaId, 'timur');

    const summary = summarizeFairyShadowAnalysis(analysis);
    assert.equal(summary.includes('Gercek sampled probe: 3'), true);
    assert.equal(summary.includes('JS/Fairy farki: 2'), true);
});
