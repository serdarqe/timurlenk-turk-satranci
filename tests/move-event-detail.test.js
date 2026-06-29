import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPieceMovedEventDetail } from '../src/utils/MoveEventDetail.js';
import { COLORS, GAME_STATES } from '../src/utils/constants.js';

test('AI oyun bitiren hamlede gameOver bilgisini event detayina ekler', () => {
    const detail = buildPieceMovedEventDetail({
        gameState: {
            status: GAME_STATES.GAME_OVER,
            winner: COLORS.BLACK,
            resultType: 'checkmate'
        },
        fromRow: 2,
        fromCol: 3,
        toRow: 4,
        toCol: 5,
        movedColor: COLORS.WHITE,
        moveRecord: {
            resultType: 'checkmate',
            specialTags: ['checkmate']
        }
    });

    assert.equal(detail.gameOver, true);
    assert.equal(detail.winner, COLORS.BLACK);
    assert.equal(detail.resultType, 'checkmate');
    assert.deepEqual(detail.specialTags, ['checkmate']);
});

test('AI hamlesiz kalinca oyun bittiyse panel sinyali tasinir', () => {
    const detail = buildPieceMovedEventDetail({
        gameState: {
            status: GAME_STATES.GAME_OVER,
            winner: COLORS.WHITE,
            stalemate: true
        },
        movedColor: COLORS.BLACK,
        noMove: true
    });

    assert.equal(detail.gameOver, true);
    assert.equal(detail.winner, COLORS.WHITE);
    assert.equal(detail.resultType, 'stalemate');
    assert.equal(detail.noMove, true);
});
