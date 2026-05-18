import test from 'node:test';
import assert from 'node:assert/strict';

import { PIECE_TYPES } from '../src/utils/constants.js';
import {
    ENDGAME_PIECE_ROLES,
    ENDGAME_ROLES,
    getEndgameIdealStepDistance,
    getEndgamePieceRole,
    getEndgameSupportStrength,
    isDirectNetHelper,
    isEndgameSupportPiece,
    isPrimaryEndgameFinisher
} from '../src/ai/AIEndgameRoles.js';

test('oyun sonu rol haritasi tum tas tiplerini kapsar', () => {
    for (const type of Object.values(PIECE_TYPES)) {
        assert.ok(
            ENDGAME_PIECE_ROLES[type],
            `${type} icin oyun sonu rol tanimi eksik`
        );
    }
});

test('kale ana bitirici, kisa yardimcilar dogrudan ag yardimcisi olarak ayrilir', () => {
    assert.equal(isPrimaryEndgameFinisher(PIECE_TYPES.ROOK), true);

    for (const type of [PIECE_TYPES.VIZIER, PIECE_TYPES.SEA_MONSTER, PIECE_TYPES.GENERAL]) {
        assert.equal(isDirectNetHelper(type), true, `${type} dogrudan yardimci olmali`);
        assert.equal(isEndgameSupportPiece(type), true, `${type} destek tasi olmali`);
        assert.ok(getEndgameSupportStrength(type) >= 0.65, `${type} destek gucu yuksek olmali`);
        assert.equal(getEndgameIdealStepDistance(type), 1, `${type} yakin ag mesafesi istemeli`);
    }
});

test('sicrayici ve hat kontrol taslari bitirici degil destek rolundedir', () => {
    const supportTypes = [
        PIECE_TYPES.KNIGHT,
        PIECE_TYPES.CAMEL,
        PIECE_TYPES.DABBABA,
        PIECE_TYPES.ELEPHANT,
        PIECE_TYPES.LION,
        PIECE_TYPES.BULL,
        PIECE_TYPES.REVEALER,
        PIECE_TYPES.GIRAFFE,
        PIECE_TYPES.PICKET
    ];

    for (const type of supportTypes) {
        assert.equal(isPrimaryEndgameFinisher(type), false, `${type} ana bitirici olmamali`);
        assert.equal(isEndgameSupportPiece(type), true, `${type} destek olarak sayilmali`);
        assert.ok(getEndgameSupportStrength(type) > 0.3, `${type} destek gucu olmali`);
    }

    assert.equal(getEndgamePieceRole(PIECE_TYPES.GIRAFFE).role, ENDGAME_ROLES.LINE_CONTROLLER);
    assert.equal(getEndgamePieceRole(PIECE_TYPES.PICKET).role, ENDGAME_ROLES.LINE_CONTROLLER);
    assert.equal(getEndgamePieceRole(PIECE_TYPES.KNIGHT).role, ENDGAME_ROLES.LEAPER_BLOCKER);
});

test('piyon oyun sonunda terfi kosucusu olarak ayrilir', () => {
    const pawnRole = getEndgamePieceRole(PIECE_TYPES.PAWN);
    assert.equal(pawnRole.role, ENDGAME_ROLES.PROMOTION_RUNNER);
    assert.equal(isEndgameSupportPiece(PIECE_TYPES.PAWN), false);
});
