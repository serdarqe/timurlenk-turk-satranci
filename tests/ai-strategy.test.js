import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import {
    analyzeRepetitionRisk,
    analyzeMatingNetState,
    buildPositionHash,
    evaluateWinningEndgame,
    getAdaptiveSearchDepth,
    isInMatingNet,
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

test('analyzeMatingNetState rakip sahi kenarda ve dusuk mobilitede mat agi sayar', () => {
    const netState = new GameState();
    netState.currentTurn = COLORS.BLACK;
    netState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    netState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));
    netState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));

    const openState = new GameState();
    openState.currentTurn = COLORS.BLACK;
    openState.board.setPiece(4, 5, new King(COLORS.WHITE, 4, 5));
    openState.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));
    openState.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));

    const net = analyzeMatingNetState(netState, COLORS.BLACK);
    const open = analyzeMatingNetState(openState, COLORS.BLACK);

    assert.equal(net.active, true);
    assert.equal(isInMatingNet(netState, COLORS.BLACK), true);
    assert.equal(open.active, false);
    assert.ok(net.score > open.score);
    assert.ok(net.reasons.includes('edge-box') || net.reasons.includes('corner-box'));
});

test('scoreRepetitionPenalty mat aginda tekrar cezasini kontrollu yumusatir', () => {
    const params = {
        nextHash: 'fresh-hash',
        recentPositionHashes: ['fresh-hash'],
        recentMoves: [
            { color: COLORS.BLACK, fromRow: 0, fromCol: 2, toRow: 0, toCol: 5 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 5, toRow: 0, toCol: 2 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 2, toRow: 0, toCol: 5 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 5, toRow: 0, toCol: 2 }
        ],
        move: { fromRow: 0, fromCol: 2, toRow: 0, toCol: 5, color: COLORS.BLACK },
        isWinningSide: true,
        profile: getAIProfile('hard')
    };

    const normalPenalty = scoreRepetitionPenalty(params);
    const matingNetPenalty = scoreRepetitionPenalty({
        ...params,
        inMatingNet: true,
        matingNet: {
            active: true,
            score: 520,
            opponentMobility: 1
        }
    });

    assert.ok(normalPenalty < -1000);
    assert.ok(matingNetPenalty > normalPenalty);
    assert.ok(matingNetPenalty >= -70);
});

test('scoreRepetitionPenalty mat aginda agir rota dongusunu tamamen bedava birakmaz', () => {
    const penalty = scoreRepetitionPenalty({
        nextHash: 'loop-hash',
        recentPositionHashes: ['loop-hash'],
        recentMoves: [
            { color: COLORS.BLACK, fromRow: 0, fromCol: 2, toRow: 0, toCol: 5 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 5, toRow: 0, toCol: 2 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 2, toRow: 0, toCol: 5 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 5, toRow: 0, toCol: 2 },
            { color: COLORS.BLACK, fromRow: 0, fromCol: 2, toRow: 0, toCol: 5 }
        ],
        move: { fromRow: 0, fromCol: 2, toRow: 0, toCol: 5, color: COLORS.BLACK },
        isWinningSide: true,
        profile: getAIProfile('hard'),
        matingNet: {
            active: true,
            score: 260,
            opponentMobility: 5
        }
    });

    assert.ok(penalty < 0);
    assert.ok(penalty >= -180);
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

    const hardProfile = getAIProfile('hard');
    assert.equal(getAdaptiveSearchDepth(crowdedState, 'hard'), hardProfile.depth.base);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'hard'), hardProfile.depth.sparseEndgame);
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

    const easyProfile = getAIProfile('easy');
    const mediumProfile = getAIProfile('medium');
    const hardProfile = getAIProfile('hard');

    assert.equal(getAdaptiveSearchDepth(crowdedState, 'easy'), easyProfile.depth.base);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'easy'), easyProfile.depth.sparseEndgame);
    assert.equal(getAdaptiveSearchDepth(crowdedState, 'medium'), mediumProfile.depth.base);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'medium'), mediumProfile.depth.sparseEndgame);
    assert.equal(getAdaptiveSearchDepth(crowdedState, 'hard'), hardProfile.depth.base);
    assert.equal(getAdaptiveSearchDepth(sparseState, 'hard'), hardProfile.depth.sparseEndgame);
});
