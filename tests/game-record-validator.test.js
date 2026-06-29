import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndSanitizeGameRecord } from '../functions/src/gameRecordValidator.js';

function createPayload(overrides = {}) {
    return {
        schemaVersion: 1,
        gameId: 'g_test_123',
        createdAt: '2026-04-26T12:00:00.000Z',
        finishedAt: '2026-04-26T12:05:00.000Z',
        app: {
            platform: 'android',
            version: '1.2.10',
            buildNumber: '22',
            locale: 'tr'
        },
        player: {
            installToken: 'anon_install',
            authUid: 'firebase_uid_1',
            recordedBy: 'local_player'
        },
        game: {
            mode: 'ai',
            difficulty: 'hard',
            aiPersonaId: 'timur',
            aiPersonaStyle: 'conqueror',
            aiBotId: 'bot_15_aksak_demir',
            aiBotLevel: 15,
            aiBotStars: 5,
            aiBot: {
                id: 'bot_15_aksak_demir',
                level: 15,
                stars: 5,
                label: 'Aksak Demir'
            },
            formation: 'masculine',
            isOnline: false,
            isScripted: false,
            isPuzzle: false,
            localColor: 'white',
            aiColor: 'black',
            timeControl: '15m',
            whiteTimeLeftMs: 600000,
            blackTimeLeftMs: 580000,
            winner: 'black',
            resultType: 'checkmate',
            moveCount: 1,
            durationSeconds: 300,
            specialEventCount: 1
        },
        flags: {
            hasRoyalSwap: false,
            hasCitadelExchange: false,
            hasPawnCycle: false,
            hasPromotion: true
        },
        analysisSummary: {
            whiteAccuracy: 68,
            blackAccuracy: 74,
            biggestSwingIndex: 1,
            biggestSwingDelta: 240,
            resultType: 'checkmate',
            winner: 'black',
            analysisProfile: 'hard',
            outcomeAdjusted: true,
            rawAccuracy: {
                white: 68,
                black: 60
            }
        },
        moves: [
            {
                index: 1,
                moveNumber: 1,
                color: 'white',
                pieceTypeBefore: 'pawn',
                pieceTypeAfter: 'pawn',
                pawnType: 'pawn_of_kings',
                fromRow: 7,
                fromCol: 5,
                toRow: 6,
                toCol: 5,
                fromLabel: 'f3',
                toLabel: 'f4',
                notation: 'f3 -> f4',
                capturedPieceType: null,
                specialMoveType: null,
                specialTags: ['promotion'],
                isCheck: false,
                resultType: null,
                beforeHash: 'before_hash',
                afterHash: 'after_hash'
            }
        ],
        ...overrides
    };
}

test('validateAndSanitizeGameRecord gecerli payloadi kabul eder', () => {
    const result = validateAndSanitizeGameRecord(createPayload());

    assert.equal(result.ok, true);
    assert.equal(result.record.game.mode, 'ai');
    assert.equal(result.record.game.aiColor, 'black');
    assert.equal(result.record.game.aiPersonaId, 'timur');
    assert.equal(result.record.game.aiBotId, 'bot_15_aksak_demir');
    assert.equal(result.record.game.aiBotLevel, 15);
    assert.equal(result.record.game.aiBotStars, 5);
    assert.deepEqual(result.record.game.aiBot, {
        id: 'bot_15_aksak_demir',
        level: 15,
        stars: 5,
        label: 'Aksak Demir'
    });
    assert.equal(result.record.game.timeControl, '15m');
    assert.equal(result.record.game.whiteTimeLeftMs, 600000);
    assert.equal(result.record.game.blackTimeLeftMs, 580000);
    assert.equal(result.record.moves.length, 1);
    assert.equal(result.record.player.authUid, 'firebase_uid_1');
    assert.equal(result.record.moves[0].notation, 'f3 -> f4');
    assert.equal(result.record.analysisSummary.resultType, 'checkmate');
    assert.equal(result.record.analysisSummary.winner, 'black');
    assert.equal(result.record.analysisSummary.analysisProfile, 'hard');
    assert.equal(result.record.analysisSummary.outcomeAdjusted, true);
    assert.deepEqual(result.record.analysisSummary.rawAccuracy, {
        white: 68,
        black: 60
    });
});

test('validateAndSanitizeGameRecord yasakli alanlari reddeder', () => {
    const payload = createPayload({
        player: {
            installToken: 'anon_install',
            recordedBy: 'local_player',
            email: 'secret@example.com'
        }
    });

    const result = validateAndSanitizeGameRecord(payload);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, 'forbidden_field');
});

test('validateAndSanitizeGameRecord moveCount uyusmazligini reddeder', () => {
    const payload = createPayload({
        game: {
            mode: 'ai',
            difficulty: 'hard',
            formation: 'masculine',
            isOnline: false,
            isScripted: false,
            isPuzzle: false,
            localColor: 'white',
            aiColor: 'black',
            winner: 'black',
            resultType: 'checkmate',
            moveCount: 2,
            durationSeconds: 300,
            specialEventCount: 1
        }
    });

    const result = validateAndSanitizeGameRecord(payload);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, 'move_count_mismatch');
});
