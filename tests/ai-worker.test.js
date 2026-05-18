import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook, TimurPawn } from '../src/game/PieceFactory.js';
import { COLORS, FORMATIONS, PAWN_TYPES } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import { buildPositionHash } from '../src/ai/AiStrategy.js';
import { evaluateStateForBlack } from '../src/ai/AiEvaluation.js';
import {
    buildSearchMoveRiskContext,
    createAiSearchMemory,
    createBlackPerspectiveStateForWhiteAi,
    evaluateOpponentReplyThreat,
    evaluateTacticalContinuationForBlack,
    evaluateTacticalContinuationDetailsForBlack,
    normalizeAiRecentPositionHashes,
    scoreTerminalStateForBlack,
    selectAiMoveAnalysisForState,
    selectAiMoveForState,
    selectOpeningCandidateIfSafe
} from '../src/ai/ai.worker.js';

const files = 'abcdefghijk';

function toSquare(row, col) {
    return `${files[col]}${10 - row}`;
}

function createPhaseTwoSearchState() {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.openingHistory = [{ openingId: 'manual_break' }];
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    state.board.setPiece(6, 5, new Rook(COLORS.BLACK, 6, 5));
    state.board.setPiece(4, 8, new Rook(COLORS.WHITE, 4, 8));
    state.board.setPiece(7, 4, new TimurPawn(COLORS.WHITE, 7, 4, PAWN_TYPES.PAWN_OF_KINGS));
    return state;
}

test('ai worker kok adaylari tekrar riskini hata vermeden hesaplar', () => {
    const state = new GameState('easy');
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));
    state.board.setPiece(2, 3, new Rook(COLORS.BLACK, 2, 3));

    const nextHash = buildPositionHash(state);
    state.aiRecentPositionHashes = [nextHash];
    state.aiRecentMoves = [
        { fromRow: 2, fromCol: 3, toRow: 2, toCol: 5, color: COLORS.BLACK }
    ];

    const riskContext = buildSearchMoveRiskContext(
        state,
        { origRow: 2, origCol: 5 },
        {
            piece: { color: COLORS.BLACK },
            move: { row: 2, col: 3, specialMove: null }
        },
        getAIProfile('easy')
    );

    assert.equal(riskContext.nextHash, nextHash);
    assert.ok(riskContext.repetitionRisk.severity >= 2);
    assert.ok(riskContext.repetitionPenalty < 0);
});

test('ai worker snapshotlardan tekrar hash hafizasini uretir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.aiColor = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));

    const snapshot = {
        currentTurn: COLORS.BLACK,
        board: {
            pieces: [
                { type: 'king', color: COLORS.WHITE, row: 0, col: 0, pawnType: null, stage: null, hasMoved: false },
                { type: 'king', color: COLORS.BLACK, row: 9, col: 10, pawnType: null, stage: null, hasMoved: false }
            ]
        }
    };
    state.aiRecentPositionHashes = [];
    state.aiRecentPositionSnapshots = [snapshot];

    normalizeAiRecentPositionHashes(state);

    assert.deepEqual(state.aiRecentPositionHashes, [buildPositionHash(snapshot)]);
});

test('terminal oyun sonu skorları arama icin belirleyici sinyal uretir', () => {
    const blackWin = new GameState('hard');
    blackWin.status = 'game_over';
    blackWin.winner = COLORS.BLACK;

    const whiteWin = new GameState('hard');
    whiteWin.status = 'game_over';
    whiteWin.winner = COLORS.WHITE;

    const draw = new GameState('hard');
    draw.status = 'game_over';
    draw.winner = 'Draw (Hisar)';

    assert.ok(scoreTerminalStateForBlack(blackWin, getAIProfile('hard')) > 100000);
    assert.ok(scoreTerminalStateForBlack(whiteWin, getAIProfile('hard')) < -100000);
    assert.equal(scoreTerminalStateForBlack(draw, getAIProfile('hard')), 0);
});

test('beyaz AI siyah perspektife gecerken tekrar pozisyon hafizasini da aynalar', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.WHITE;
    state.aiColor = COLORS.WHITE;
    state.playerColor = COLORS.BLACK;
    state.aiBotId = 'bot_15_aksak_demir';
    state.board.setPiece(8, 1, new King(COLORS.WHITE, 8, 1));
    state.board.setPiece(1, 1, new King(COLORS.BLACK, 1, 1));

    const snapshot = {
        currentTurn: COLORS.WHITE,
        ransomMoveUsed: {
            [COLORS.WHITE]: false,
            [COLORS.BLACK]: true
        },
        citadelExchangeUsed: {
            [COLORS.WHITE]: true,
            [COLORS.BLACK]: false
        },
        board: {
            pieces: [
                { type: 'king', color: COLORS.WHITE, row: 8, col: 1, pawnType: null, stage: null, hasMoved: false },
                { type: 'king', color: COLORS.BLACK, row: 1, col: 1, pawnType: null, stage: null, hasMoved: false }
            ]
        }
    };
    state.aiRecentPositionSnapshots = [snapshot];
    state.aiRecentPositionHashes = [buildPositionHash(snapshot)];

    const mirroredState = createBlackPerspectiveStateForWhiteAi(state);

    assert.equal(mirroredState.aiRecentPositionHashes.length, 1);
    assert.equal(mirroredState.aiBotId, 'bot_15_aksak_demir');
    assert.notEqual(mirroredState.aiRecentPositionHashes[0], state.aiRecentPositionHashes[0]);
    assert.match(mirroredState.aiRecentPositionHashes[0], /^z2:[0-9a-f]{16}$/);
    assert.equal(
        mirroredState.aiRecentPositionHashes[0],
        buildPositionHash(mirroredState.aiRecentPositionSnapshots[0])
    );
    assert.equal(mirroredState.aiRecentPositionSnapshots[0].currentTurn, COLORS.BLACK);
    assert.equal(mirroredState.aiRecentPositionSnapshots[0].ransomMoveUsed[COLORS.WHITE], true);
    assert.equal(mirroredState.aiRecentPositionSnapshots[0].citadelExchangeUsed[COLORS.BLACK], true);
});

test('AI rakibin bir sonraki hamlede alabilecegi savunmasiz tasi risk olarak gorur', () => {
    const exposed = new GameState('medium');
    exposed.currentTurn = COLORS.WHITE;
    exposed.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    exposed.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    exposed.board.setPiece(4, 0, new Rook(COLORS.WHITE, 4, 0));
    exposed.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const safe = new GameState('medium');
    safe.currentTurn = COLORS.WHITE;
    safe.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    safe.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    safe.board.setPiece(5, 0, new Rook(COLORS.WHITE, 5, 0));
    safe.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const exposedThreat = evaluateOpponentReplyThreat(exposed, COLORS.BLACK, getAIProfile('medium'));
    const safeThreat = evaluateOpponentReplyThreat(safe, COLORS.BLACK, getAIProfile('medium'));

    assert.ok(exposedThreat.penalty < safeThreat.penalty);
    assert.ok(exposedThreat.bestCaptureValue > 0);
    assert.equal(exposedThreat.bestReply?.target?.type, 'rook');
});

test('rakip cevap riski zorluk arttikca daha sert hesaplanir', () => {
    const state = new GameState('medium');
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 0, new Rook(COLORS.WHITE, 4, 0));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const easyThreat = evaluateOpponentReplyThreat(state, COLORS.BLACK, getAIProfile('easy'));
    const mediumThreat = evaluateOpponentReplyThreat(state, COLORS.BLACK, getAIProfile('medium'));
    const hardThreat = evaluateOpponentReplyThreat(state, COLORS.BLACK, getAIProfile('hard'));

    assert.ok(mediumThreat.penalty < easyThreat.penalty);
    assert.ok(hardThreat.penalty < mediumThreat.penalty);
});

test('hard AI rakibin buyuk cevap tehdidini ciddi blunder riski sayar', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 0, new Rook(COLORS.WHITE, 4, 0));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const threat = evaluateOpponentReplyThreat(state, COLORS.BLACK, getAIProfile('hard'));

    assert.ok(threat.bestCaptureValue >= 100);
    assert.ok(threat.penalty <= -180);
});

test('zor AI derinlik bitse bile taktik alma dizisini daha ileri hesaplar', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.WHITE;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 0, new Rook(COLORS.WHITE, 4, 0));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const easyScore = evaluateTacticalContinuationForBlack(state, getAIProfile('easy'));
    const hardScore = evaluateTacticalContinuationForBlack(state, getAIProfile('hard'));

    assert.ok(hardScore < easyScore - 40);
});

test('zor AI quiescence aramasinda kraliyet tehdidi kuran sessiz hamleyi de hesaplar', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(4, 1, new King(COLORS.WHITE, 4, 1));
    state.board.setPiece(8, 8, new King(COLORS.BLACK, 8, 8));
    state.board.setPiece(6, 4, new Rook(COLORS.BLACK, 6, 4));

    const staticScore = evaluateStateForBlack(state, getAIProfile('hard'));
    const continuationScore = evaluateTacticalContinuationForBlack(state, getAIProfile('hard'));

    assert.ok(continuationScore > staticScore + 40);
});

test('faz 7 quiescence v2 negatif SEE yakalamayi atlar ve buyuk tasi kurtarir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 0, new Rook(COLORS.WHITE, 4, 0));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    state.board.setPiece(4, 6, new TimurPawn(COLORS.WHITE, 4, 6, PAWN_TYPES.PAWN_OF_KINGS));

    const staticScore = evaluateStateForBlack(state, getAIProfile('hard'));
    const details = evaluateTacticalContinuationDetailsForBlack(state, getAIProfile('hard'));

    assert.ok(Number.isFinite(details.score));
    assert.ok(Number.isFinite(staticScore));
    assert.ok(details.stats.quiescenceNodes > 0);
    assert.ok(details.stats.quiescenceNegativeSeeSkips > 0);
    assert.ok(details.stats.quiescenceRescueMoves > 0);
    assert.ok(details.stats.quiescenceNodeLimit > 0);
});

test('faz 7 quiescence v2 hisar tehdidini taktik devam hamlesi sayar', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(8, 10, new King(COLORS.BLACK, 8, 10));

    const details = evaluateTacticalContinuationDetailsForBlack(state, getAIProfile('hard'));

    assert.ok(details.stats.quiescenceCitadelThreatMoves > 0);
    assert.ok(details.stats.quiescenceCandidateMoves > 0);
});

test('ai worker uzun oyunlarda 120 hamle tempo bilgisini adaylara tasir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.openingHistory = [{ openingId: 'manual_break' }];
    state.moveHistory = Array.from({ length: 124 }, (_, index) => ({ index: index + 1 }));
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    state.board.setPiece(6, 4, new Rook(COLORS.WHITE, 6, 4));

    const analysis = selectAiMoveAnalysisForState(state, { maxThinkMs: 80 });
    const candidates = analysis?.searchInfo?.candidates || [];

    assert.ok(candidates.length > 0);
    assert.ok(candidates.every((candidate) => candidate.metadata?.moveCount === 124));
    assert.ok(candidates.some((candidate) => Number.isFinite(candidate.styleAdjustment?.components?.pace)));
});

test('ai worker ilk hamlelerden itibaren plan metriklerini adaylara tasir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.openingHistory = [{ openingId: 'manual_break' }];
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    state.board.setPiece(1, 1, new Rook(COLORS.BLACK, 1, 1));
    state.board.setPiece(2, 4, new TimurPawn(COLORS.BLACK, 2, 4, PAWN_TYPES.PAWN_OF_KINGS));
    state.board.setPiece(7, 6, new TimurPawn(COLORS.WHITE, 7, 6, PAWN_TYPES.PAWN_OF_KINGS));

    const analysis = selectAiMoveAnalysisForState(state, { maxThinkMs: 90 });
    const candidates = analysis?.searchInfo?.candidates || [];

    assert.ok(candidates.length > 0);
    assert.ok(candidates.every((candidate) => Number.isFinite(candidate.metadata?.planProgress)));
    assert.ok(candidates.every((candidate) => Number.isFinite(candidate.metadata?.planDrift)));
    assert.ok(candidates.some((candidate) => candidate.styleAdjustment?.reasons?.includes('style-plan-pressure')));
});

test('ai worker zor acilista kitabi skor penceresi disinda zorlamaz', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const move = selectAiMoveForState(state);

    assert.equal(move.openingId, undefined);
    assert.equal(move.openingBook, undefined);
    assert.equal(move.piece.color, COLORS.BLACK);
    assert.equal(move.move.row, move.piece.row + 1);
    assert.notEqual(`${toSquare(move.piece.row, move.piece.col)}-${toSquare(move.move.row, move.move.col)}`, 'e8-e7');
});

test('ai worker beyaz yapay zeka icin riskli kitap yerine guvenli motor hamlesi secer', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.WHITE;
    state.aiColor = COLORS.WHITE;
    state.playerColor = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const move = selectAiMoveForState(state);

    assert.equal(move.openingId, null);
    assert.notEqual(move.openingBook, true);
    assert.equal(move.piece.color, COLORS.WHITE);
    assert.equal(move.piece.row, 7);
    assert.equal(move.move.row, 6);
    assert.equal(move.move.col, move.piece.col);
});

test('hard AI acilis kitabi kotu kalirsa kitabi kor takip etmez', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const candidates = [
        {
            score: 120,
            move: { piece: { row: 1, col: 4 }, move: { row: 2, col: 4 } },
            tacticalRisk: { dangerLevel: 0 }
        },
        {
            score: 0,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});

test('hard AI kitap hamlesi yuzunden bariz taktik firsati kacirmaz', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const winningCapture = {
        piece: { row: 2, col: 4 },
        move: { row: 5, col: 4 }
    };
    const candidates = [
        {
            score: 100,
            move: winningCapture,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: true }
        },
        {
            score: 74,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});

test('hard AI yakin puanli kitap hamlesi icin taktik firsati kacirmaz', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const winningCapture = {
        piece: { row: 2, col: 4 },
        move: { row: 5, col: 4 }
    };
    const candidates = [
        {
            score: 100,
            move: winningCapture,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: true }
        },
        {
            score: 91,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});

test('hard AI dusuk guvenli gecis kitap hamlesini motor avantajina karsi zorlamaz', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1,
        openingTransition: true,
        openingConfidence: 0.45
    };
    const candidates = [
        {
            score: 100,
            move: { piece: { row: 1, col: 4 }, move: { row: 2, col: 4 } },
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        },
        {
            score: 86,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});

test('hard AI negatif SEE veren kitap hamlesini dogrudan reddeder', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const candidates = [
        {
            score: 104,
            move: { piece: { row: 1, col: 4 }, move: { row: 2, col: 4 } },
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false },
            staticExchange: { score: 0, exchangeDebt: 0, favorable: true }
        },
        {
            score: 100,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: true },
            opponentReplyThreat: { bestCaptureValue: 0 },
            staticExchange: { score: -36, exchangeDebt: 36, favorable: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});

test('medium AI kitap hamlesi yuzunden belirgin taktik firsati kacirmaz', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const captureMove = {
        piece: { row: 2, col: 4 },
        move: { row: 5, col: 4 }
    };
    const candidates = [
        {
            score: 100,
            move: captureMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: true }
        },
        {
            score: 72,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('medium')), null);
});

test('medium AI kitap hamlesi aramadan cok gerideyse kitabi birakir', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const candidates = [
        {
            score: 100,
            move: { piece: { row: 1, col: 4 }, move: { row: 2, col: 4 } },
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        },
        {
            score: 52,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('medium')), null);
});

test('easy AI kitap yuzunden cok bariz firsati kacirmaz', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const candidates = [
        {
            score: 100,
            move: { piece: { row: 2, col: 4 }, move: { row: 5, col: 4 } },
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: true }
        },
        {
            score: 42,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('easy')), null);
});

test('hard AI seyrek oyun sonunda mini tablebase planini kullanir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(0, 3, new King(COLORS.BLACK, 0, 3));
    state.board.setPiece(3, 0, new Rook(COLORS.BLACK, 3, 0));

    const analysis = selectAiMoveAnalysisForState(state);
    const move = analysis.move;
    const from = toSquare(move.piece.row, move.piece.col);
    const to = toSquare(move.move.row, move.move.col);

    assert.equal(analysis.searchInfo.miniTablebase, true);
    assert.equal(from, 'a7');
    assert.equal(to, 'a6');
});

test('AI deadline dolarsa son tamamlanan iterative derinlikten hamle dondurur', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(0, 3, new King(COLORS.BLACK, 0, 3));
    state.board.setPiece(3, 0, new Rook(COLORS.BLACK, 3, 0));

    let nowCalls = 0;
    const analysis = selectAiMoveAnalysisForState(state, {
        disableEndgameShortcuts: true,
        now: () => (nowCalls++ === 0 ? 0 : 10_000)
    });

    assert.ok(analysis.move);
    assert.ok(analysis.searchInfo.targetDepth > 1);
    assert.equal(analysis.searchInfo.completedDepth, 1);
    assert.equal(analysis.searchInfo.timeExpired, true);
});

test('AI arama hafizasi ikinci aramada transposition ve onceki en iyi hamleyi kullanir', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(1, 1, new King(COLORS.WHITE, 1, 1));
    state.board.setPiece(0, 3, new King(COLORS.BLACK, 0, 3));
    state.board.setPiece(3, 0, new Rook(COLORS.BLACK, 3, 0));

    const searchMemory = createAiSearchMemory();
    const first = selectAiMoveAnalysisForState(state, { searchMemory, disableEndgameShortcuts: true });
    const second = selectAiMoveAnalysisForState(state, { searchMemory, disableEndgameShortcuts: true });

    assert.ok(first.move);
    assert.ok(second.move);
    assert.ok(first.searchInfo.memory.transpositionStores > 0);
    assert.ok(second.searchInfo.memory.transpositionHits > 0);
    assert.equal(second.searchInfo.memory.usedRootHashMove, true);
});

test('faz 2 arama motoru aspiration ve PVS istatistikleri uretir', () => {
    const state = createPhaseTwoSearchState();
    const analysis = selectAiMoveAnalysisForState(state, {
        searchMemory: createAiSearchMemory(),
        maxThinkMs: 3600
    });

    assert.ok(analysis.move);
    assert.ok(analysis.searchInfo.targetDepth >= 2);
    assert.ok(analysis.searchInfo.memory.aspirationWindows > 0);
    assert.ok(analysis.searchInfo.memory.pvsNullWindowSearches > 0);
});

test('faz 2 arama motoru sessiz gec hamleleri indirger ve taktik hamleleri uzatir', () => {
    const state = createPhaseTwoSearchState();
    const analysis = selectAiMoveAnalysisForState(state, {
        searchMemory: createAiSearchMemory(),
        maxThinkMs: 3600
    });

    assert.ok(analysis.move);
    assert.ok(analysis.searchInfo.memory.lateMoveReductions > 0);
    assert.ok(analysis.searchInfo.memory.searchExtensions > 0);
});

test('faz 5 search engine futility ve reverse futility budamalarini raporlar', () => {
    const state = createPhaseTwoSearchState();
    state.moveHistory = Array.from({ length: 36 }, (_, index) => ({ index: index + 1 }));

    const analysis = selectAiMoveAnalysisForState(state, {
        searchMemory: createAiSearchMemory(),
        maxThinkMs: 3600
    });

    assert.ok(analysis.move);
    assert.ok(analysis.searchInfo.targetDepth >= 2);
    assert.ok(analysis.searchInfo.memory.futilityPrunes > 0);
    assert.ok(analysis.searchInfo.memory.reverseFutilityPrunes > 0);
    assert.ok(analysis.searchInfo.memory.failSoftCutoffs > 0);
});

test('faz 5 search engine taktik hamleleri futility guard ile korur', () => {
    const state = createPhaseTwoSearchState();

    const analysis = selectAiMoveAnalysisForState(state, {
        searchMemory: createAiSearchMemory(),
        maxThinkMs: 3600
    });

    assert.ok(analysis.move);
    assert.ok(analysis.searchInfo.memory.searchExtensions > 0);
    assert.ok(analysis.searchInfo.memory.futilityTacticalGuards > 0);
});

test('faz 6 move ordering v3 capture ve continuation history sinyallerini raporlar', () => {
    const state = createPhaseTwoSearchState();
    const searchMemory = createAiSearchMemory();

    const first = selectAiMoveAnalysisForState(state, {
        searchMemory,
        maxThinkMs: 3600
    });
    const second = selectAiMoveAnalysisForState(state, {
        searchMemory,
        maxThinkMs: 3600
    });

    assert.ok(first.move);
    assert.ok(second.move);
    assert.ok(first.searchInfo.memory.positiveSeeOrders > 0);
    assert.ok(first.searchInfo.memory.positionalOrderBonuses > 0);
    assert.ok(first.searchInfo.memory.continuationHistoryUpdates > 0);
    assert.ok(first.searchInfo.memory.captureHistoryUpdates > 0);
    assert.ok(second.searchInfo.memory.continuationHistorySize > 0);
    assert.ok(second.searchInfo.memory.captureHistorySize > 0);
    assert.ok(second.searchInfo.memory.captureHistoryOrders > 0);
});

test('hard AI static exchange ile savunulan yem tasi almak yerine guvenli hamle secer', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));
    state.board.setPiece(4, 6, new TimurPawn(COLORS.WHITE, 4, 6, PAWN_TYPES.PAWN_OF_KINGS));
    state.board.setPiece(4, 8, new Rook(COLORS.WHITE, 4, 8));

    const analysis = selectAiMoveAnalysisForState(state, {
        searchMemory: createAiSearchMemory()
    });
    const move = analysis.move;

    assert.ok(move);
    assert.notDeepEqual(
        { fromRow: move.piece.row, fromCol: move.piece.col, toRow: move.move.row, toCol: move.move.col },
        { fromRow: 4, fromCol: 4, toRow: 4, toCol: 6 }
    );
    assert.ok(analysis.searchInfo.candidates.some((candidate) => candidate.staticExchange?.score < 0));
});

test('hard AI acilis hamlesi cevapta degerli tas dusuruyorsa kitaptan cikar', () => {
    const openingMove = {
        piece: { row: 1, col: 1 },
        move: { row: 3, col: 2 },
        openingId: 'timur_siege',
        openingName: 'Timur Siege',
        openingMoveIndex: 1
    };
    const candidates = [
        {
            score: 100,
            move: { piece: { row: 1, col: 4 }, move: { row: 2, col: 4 } },
            tacticalRisk: { dangerLevel: 0 },
            opponentReplyThreat: { bestCaptureValue: 0 },
            staticExchange: { score: 0 },
            metadata: { captures: false }
        },
        {
            score: 96,
            move: openingMove,
            tacticalRisk: { dangerLevel: 0 },
            opponentReplyThreat: { bestCaptureValue: 100 },
            staticExchange: { score: -35 },
            metadata: { captures: false }
        }
    ];

    assert.equal(selectOpeningCandidateIfSafe(candidates, openingMove, getAIProfile('hard')), null);
});
