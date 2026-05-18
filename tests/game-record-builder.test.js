import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameRecord } from '../src/storage/GameRecordBuilder.js';
import { COLORS } from '../src/utils/constants.js';

function createMoveRecord(overrides = {}) {
    return {
        index: 1,
        moveNumber: 1,
        color: COLORS.WHITE,
        piece: {
            typeBefore: 'pawn',
            typeAfter: 'pawn',
            pawnType: 'pawn_of_kings'
        },
        from: { row: 7, col: 5, label: 'f3' },
        to: { row: 6, col: 5, label: 'f4' },
        notation: 'f3 -> f4',
        capturedPiece: null,
        isCheck: false,
        resultType: null,
        specialMoveType: null,
        specialTags: [],
        snapshots: {
            before: {
                currentTurn: COLORS.WHITE,
                ransomMoveUsed: { white: false, black: false },
                citadelExchangeUsed: { white: false, black: false },
                board: { pieces: [{ type: 'pawn', color: COLORS.WHITE, row: 7, col: 5, pawnType: 'pawn_of_kings', hasMoved: false }] }
            },
            after: {
                currentTurn: COLORS.BLACK,
                ransomMoveUsed: { white: false, black: false },
                citadelExchangeUsed: { white: false, black: false },
                board: { pieces: [{ type: 'pawn', color: COLORS.WHITE, row: 6, col: 5, pawnType: 'pawn_of_kings', hasMoved: true }] }
            }
        },
        ...overrides
    };
}

test('buildGameRecord finished oyunu kompakt payloada cevirir', () => {
    const gameState = {
        difficulty: 'hard',
        aiPersonaId: 'beyazid',
        aiBotId: 'bot_10_demir_pence',
        isScripted: false,
        isPuzzle: false,
        winner: COLORS.BLACK,
        checkmate: true,
        stalemate: false,
        moveHistory: [
            createMoveRecord(),
            createMoveRecord({
                index: 2,
                moveNumber: 1,
                color: COLORS.BLACK,
                specialTags: ['promotion', 'royal_swap'],
                resultType: 'checkmate'
            })
        ],
        analysisReport: {
            summary: {
                whiteAccuracy: 68,
                blackAccuracy: 74,
                biggestSwingIndex: 2,
                biggestSwingDelta: 240
            }
        }
    };

    const record = buildGameRecord({
        gameState,
        sessionMeta: {
            gameId: 'g_test_1',
            createdAt: '2026-04-26T12:00:00.000Z',
            mode: 'ai',
            difficulty: 'hard',
            aiPersonaId: 'beyazid',
            aiBotId: 'bot_10_demir_pence',
            aiBotLevel: 10,
            aiBotStars: 4,
            formation: 'masculine',
            isOnline: false,
            isScripted: false,
            isPuzzle: false,
            localColor: COLORS.WHITE,
            aiColor: COLORS.BLACK,
            recordedBy: 'local_player'
        },
        locale: 'tr',
        installToken: 'anon_install',
        authUid: 'firebase_uid_1',
        appInfo: {
            platform: 'android',
            version: '1.2.10',
            buildNumber: '22'
        }
    });

    assert.equal(record.game.gameId, undefined);
    assert.equal(record.gameId, 'g_test_1');
    assert.equal(record.game.mode, 'ai');
    assert.equal(record.game.aiPersonaId, 'beyazid');
    assert.equal(record.game.aiPersonaStyle, 'bold_attacker');
    assert.equal(record.game.aiBotId, 'bot_10_demir_pence');
    assert.equal(record.game.aiBotLevel, 10);
    assert.equal(record.game.aiBotStars, 4);
    assert.deepEqual(record.game.aiBot, {
        id: 'bot_10_demir_pence',
        level: 10,
        stars: 4,
        label: 'Demir Pençe'
    });
    assert.equal(record.game.localColor, COLORS.WHITE);
    assert.equal(record.game.aiColor, COLORS.BLACK);
    assert.equal(record.game.winner, COLORS.BLACK);
    assert.equal(record.game.resultType, 'checkmate');
    assert.equal(record.flags.hasPromotion, true);
    assert.equal(record.flags.hasRoyalSwap, true);
    assert.equal(record.player.authUid, 'firebase_uid_1');
    assert.equal(record.analysisSummary.biggestSwingIndex, 2);
    assert.equal(record.moves.length, 2);
    assert.equal(record.moves[1].specialMoveType, null);
    assert.equal(record.moves[1].resultType, 'checkmate');
    assert.equal(typeof record.moves[0].beforeHash, 'string');
});
