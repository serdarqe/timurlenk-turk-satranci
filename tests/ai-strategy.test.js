import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import {
    analyzeRepetitionRisk,
    buildPositionHash,
    evaluateWinningEndgame,
    getAdaptiveSearchDepth,
    scoreRepetitionPenalty
} from '../src/ai/AiStrategy.js';

test('buildPositionHash tas sirasi degisse de ayni sonucu verir', () => {
    const hashA = buildPositionHash({
        currentTurn: COLORS.BLACK,
        board: {
            pieces: [
                { type: 'rook', color: COLORS.BLACK, row: 1, col: 1, pawnType: null, stage: null, hasMoved: true },
                { type: 'king', color: COLORS.WHITE, row: 0, col: 0, pawnType: null, stage: null, hasMoved: false }
            ]
        }
    });

    const hashB = buildPositionHash({
        currentTurn: COLORS.BLACK,
        board: {
            pieces: [
                { type: 'king', color: COLORS.WHITE, row: 0, col: 0, pawnType: null, stage: null, hasMoved: false },
                { type: 'rook', color: COLORS.BLACK, row: 1, col: 1, pawnType: null, stage: null, hasMoved: true }
            ]
        }
    });

    assert.equal(hashA, hashB);
});

test('buildPositionHash fidye hakki degisince farkli olur', () => {
    const baseState = {
        currentTurn: COLORS.BLACK,
        ransomMoveUsed: {
            [COLORS.WHITE]: false,
            [COLORS.BLACK]: false
        },
        board: {
            pieces: [
                { type: 'king', color: COLORS.WHITE, row: 0, col: 0, pawnType: null, stage: null, hasMoved: false },
                { type: 'rook', color: COLORS.BLACK, row: 1, col: 1, pawnType: null, stage: null, hasMoved: true }
            ]
        }
    };

    const usedState = {
        ...baseState,
        ransomMoveUsed: {
            [COLORS.WHITE]: true,
            [COLORS.BLACK]: false
        }
    };

    assert.notEqual(buildPositionHash(baseState), buildPositionHash(usedState));
});

test('scoreRepetitionPenalty kazanan tarafta geri alma hamlesini agir cezalandirir', () => {
    const nextHash = 'repeat-hash';
    const winningPenalty = scoreRepetitionPenalty({
        nextHash,
        recentPositionHashes: [nextHash],
        recentMoves: [{ fromRow: 2, fromCol: 5, toRow: 2, toCol: 3, color: COLORS.BLACK }],
        move: { fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 },
        isWinningSide: true
    });

    const neutralPenalty = scoreRepetitionPenalty({
        nextHash: 'fresh-hash',
        recentPositionHashes: [],
        recentMoves: [{ fromRow: 2, fromCol: 5, toRow: 2, toCol: 3, color: COLORS.BLACK }],
        move: { fromRow: 2, fromCol: 3, toRow: 4, toCol: 3 },
        isWinningSide: false
    });

    assert.ok(winningPenalty < neutralPenalty);
    assert.ok(winningPenalty <= -300);
});

test('analyzeRepetitionRisk geri alma ve tekrar sinyalini ayri ayri tasir', () => {
    const risk = analyzeRepetitionRisk({
        nextHash: 'same-hash',
        recentPositionHashes: ['same-hash'],
        recentMoves: [{ fromRow: 2, fromCol: 5, toRow: 2, toCol: 3, color: COLORS.BLACK }],
        move: { fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 },
        searchHistoryHashes: ['other-hash', 'same-hash']
    });

    assert.equal(risk.isImmediateReverse, true);
    assert.equal(risk.repeatsRecentPosition, true);
    assert.equal(risk.repeatsSearchHistory, true);
    assert.ok(risk.severity >= 5);
});

test('analyzeRepetitionRisk ayni tasin ileri geri rota tekrarini yakalar', () => {
    const risk = analyzeRepetitionRisk({
        nextHash: 'fresh-hash',
        recentPositionHashes: [],
        recentMoves: [
            { color: COLORS.BLACK, fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 },
            { color: COLORS.WHITE, fromRow: 7, fromCol: 3, toRow: 6, toCol: 3 },
            { color: COLORS.BLACK, fromRow: 2, fromCol: 5, toRow: 2, toCol: 3 },
            { color: COLORS.WHITE, fromRow: 6, fromCol: 3, toRow: 5, toCol: 3 },
            { color: COLORS.BLACK, fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 }
        ],
        move: { fromRow: 2, fromCol: 5, toRow: 2, toCol: 3, color: COLORS.BLACK }
    });

    assert.equal(risk.repeatsMoveRoute, true);
    assert.ok(risk.routeRepeatCount >= 2);
    assert.ok(risk.severity >= 3);
});

test('scoreRepetitionPenalty kazanan hard taraf icin rota tekrarini agir cezalandirir', () => {
    const penalty = scoreRepetitionPenalty({
        nextHash: 'fresh-hash',
        recentPositionHashes: [],
        recentMoves: [
            { color: COLORS.BLACK, fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 },
            { color: COLORS.BLACK, fromRow: 2, fromCol: 5, toRow: 2, toCol: 3 },
            { color: COLORS.BLACK, fromRow: 2, fromCol: 3, toRow: 2, toCol: 5 }
        ],
        move: { fromRow: 2, fromCol: 5, toRow: 2, toCol: 3, color: COLORS.BLACK },
        isWinningSide: true,
        profile: getAIProfile('hard')
    });

    assert.ok(penalty <= -360);
});

test('evaluateWinningEndgame rakibi kenara ve hareketsizlige iten pozisyonu odullendirir', () => {
    const trappedState = new GameState();
    trappedState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    trappedState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));
    trappedState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));

    const freeState = new GameState();
    freeState.board.setPiece(4, 5, new King(COLORS.WHITE, 4, 5));
    freeState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));
    freeState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));

    const trappedScore = evaluateWinningEndgame(trappedState, COLORS.BLACK);
    const freeScore = evaluateWinningEndgame(freeState, COLORS.BLACK);

    assert.ok(trappedScore > freeScore);
});

test('getAdaptiveSearchDepth taslar azalinca derinligi artirir', () => {
    const crowdedState = new GameState('hard');
    crowdedState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    crowdedState.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    crowdedState.board.setPiece(4, 4, new Rook(COLORS.WHITE, 4, 4));
    crowdedState.board.setPiece(5, 5, new Rook(COLORS.BLACK, 5, 5));
    crowdedState.board.setPiece(3, 3, new Rook(COLORS.WHITE, 3, 3));
    crowdedState.board.setPiece(6, 6, new Rook(COLORS.BLACK, 6, 6));
    crowdedState.board.setPiece(2, 2, new Rook(COLORS.WHITE, 2, 2));
    crowdedState.board.setPiece(7, 7, new Rook(COLORS.BLACK, 7, 7));
    crowdedState.board.setPiece(1, 1, new Rook(COLORS.WHITE, 1, 1));
    crowdedState.board.setPiece(8, 8, new Rook(COLORS.BLACK, 8, 8));

    const sparseState = new GameState('hard');
    sparseState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    sparseState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));
    sparseState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));

    assert.equal(getAdaptiveSearchDepth(crowdedState, 'hard'), 5);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'hard'), 7);
});

test('getAdaptiveSearchDepth zorluklara gore planlanan bantlari korur', () => {
    const crowdedState = new GameState('medium');
    crowdedState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    crowdedState.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    crowdedState.board.setPiece(4, 4, new Rook(COLORS.WHITE, 4, 4));
    crowdedState.board.setPiece(5, 5, new Rook(COLORS.BLACK, 5, 5));
    crowdedState.board.setPiece(3, 3, new Rook(COLORS.WHITE, 3, 3));
    crowdedState.board.setPiece(6, 6, new Rook(COLORS.BLACK, 6, 6));
    crowdedState.board.setPiece(2, 2, new Rook(COLORS.WHITE, 2, 2));
    crowdedState.board.setPiece(7, 7, new Rook(COLORS.BLACK, 7, 7));
    crowdedState.board.setPiece(1, 1, new Rook(COLORS.WHITE, 1, 1));
    crowdedState.board.setPiece(8, 8, new Rook(COLORS.BLACK, 8, 8));

    const sparseState = new GameState('medium');
    sparseState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    sparseState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));
    sparseState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));

    assert.equal(getAdaptiveSearchDepth(crowdedState, 'easy'), 1);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'easy'), 2);
    assert.equal(getAdaptiveSearchDepth(crowdedState, 'medium'), 2);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'medium'), 4);
    assert.equal(getAdaptiveSearchDepth(crowdedState, 'hard'), 5);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'hard'), 7);
});
