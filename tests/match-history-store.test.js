import test from 'node:test';
import assert from 'node:assert/strict';

import {
    addMatchHistoryRecord,
    buildMatchHistoryRecord,
    clearMatchHistoryRecords,
    getMatchHistoryRecords
} from '../src/storage/MatchHistoryStore.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';

function installLocalStorageMock() {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (key) => store.get(key) || null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear()
    };
}

test('match history keeps latest record first and de-duplicates game ids', () => {
    installLocalStorageMock();
    clearMatchHistoryRecords();

    addMatchHistoryRecord({ gameId: 'g_1', resultLabel: 'A', moves: [] });
    addMatchHistoryRecord({ gameId: 'g_2', resultLabel: 'B', moves: [] });
    addMatchHistoryRecord({ gameId: 'g_1', resultLabel: 'A2', moves: [] });

    const records = getMatchHistoryRecords();
    assert.equal(records.length, 2);
    assert.equal(records[0].gameId, 'g_1');
    assert.equal(records[0].resultLabel, 'A2');
});

test('buildMatchHistoryRecord stores setup, result, and compact moves', () => {
    installLocalStorageMock();

    const record = buildMatchHistoryRecord({
        sessionMeta: {
            gameId: 'g_test',
            formation: FORMATIONS.MASCULINE,
            difficulty: 'hard',
            aiPersonaId: 'ulu_bey',
            aiBotId: 'bot_10_demir_pence',
            aiBotLevel: 10,
            aiBotStars: 4,
            localColor: COLORS.BLACK,
            aiColor: COLORS.WHITE,
            timeControl: '5m'
        },
        gameState: {
            winner: COLORS.BLACK,
            resultType: 'timeout_win',
            aiPersonaId: 'ulu_bey',
            aiBotId: 'bot_10_demir_pence',
            timeControl: '5m',
            analysisStatus: 'ready',
            analysisReport: {
                summary: {
                    whiteAccuracy: 76,
                    blackAccuracy: 84,
                    winner: COLORS.BLACK,
                    resultType: 'timeout_win'
                },
                phases: { white: [], black: [] },
                timurInsights: { white: {}, black: {} },
                criticalMoments: [
                    { index: 1, quality: 'good' }
                ],
                moves: [
                    { index: 1, quality: 'good', notation: 'a2 -> a3' }
                ]
            },
            moveHistory: [
                {
                    index: 1,
                    moveNumber: 1,
                    color: COLORS.WHITE,
                    notation: 'a2 -> a3'
                }
            ]
        }
    });

    assert.equal(record.gameId, 'g_test');
    assert.equal(record.resultType, 'timeout_win');
    assert.equal(record.aiPersonaId, 'ulu_bey');
    assert.equal(record.aiPersonaLabel, 'Uluğ Bey');
    assert.equal(record.aiBotId, 'bot_10_demir_pence');
    assert.equal(record.aiBotLevel, 10);
    assert.equal(record.aiBotStars, 4);
    assert.equal(record.playerColor, COLORS.BLACK);
    assert.equal(record.aiColor, COLORS.WHITE);
    assert.equal(record.timeControl, '5m');
    assert.equal(record.moves[0].notation, 'a2 -> a3');
    assert.equal(record.analysisStatus, 'ready');
    assert.equal(record.analysisSummary.blackAccuracy, 84);
    assert.equal(record.analysisReport.summary.whiteAccuracy, 76);
    assert.equal(record.analysisReport.criticalMoments[0].index, 1);
    assert.equal(record.analysisReport.moves[0].notation, 'a2 -> a3');
});
