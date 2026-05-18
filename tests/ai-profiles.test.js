import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { King, Rook, TimurPawn, Vizier } from '../src/game/PieceFactory.js';
import { COLORS, PAWN_TYPES } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import {
    buildBoardThreatMap,
    buildEvaluationBreakdownForBlack,
    evaluateStateForBlack,
    scoreMoveHeuristicForBlack,
    evaluateStaticExchangeForMove,
    analyzeTacticalMotifsForMove
} from '../src/ai/AiEvaluation.js';
import { selectMoveFromCandidates } from '../src/ai/AISelectionPolicy.js';
import { scoreCandidateDecisionStyle } from '../src/ai/AIStylePolicy.js';

test('AI profilleri beklenen karakter farklarini tasir', () => {
    const easy = getAIProfile('easy');
    const medium = getAIProfile('medium');
    const hard = getAIProfile('hard');

    assert.equal(easy.id, 'easy');
    assert.equal(medium.id, 'medium');
    assert.equal(hard.id, 'hard');

    assert.ok(easy.selection.scoreWindow > medium.selection.scoreWindow);
    assert.ok(hard.selection.alwaysPickBest);
    assert.ok(hard.weights.winningEndgame > medium.weights.winningEndgame);
    assert.ok(medium.weights.mobility > easy.weights.mobility);
    assert.ok(hard.search.rootMoveLimit >= medium.search.rootMoveLimit);
    assert.ok(hard.search.branchMoveLimit <= hard.search.rootMoveLimit);
});

test('bot profili mevcut zorluk profilini bot ayarlariyla birlestirir', () => {
    const botProfile = getAIProfile('medium', 'ulu_bey', 'bot_15_aksak_demir');
    const normalHard = getAIProfile('hard', 'timur');

    assert.equal(botProfile.botId, 'bot_15_aksak_demir');
    assert.equal(botProfile.baseId, 'hard');
    assert.equal(botProfile.personaId, 'timur');
    assert.ok(botProfile.decisionStyle.precision >= normalHard.decisionStyle.precision);
    assert.ok(botProfile.decisionStyle.conversion >= normalHard.decisionStyle.conversion);
});

test('bot profilleri seviyeye gore arama ve hata modelini kademeli guclendirir', () => {
    const levelOne = getAIProfile('easy', 'timur', 'bot_01_cirak_alp');
    const levelSeven = getAIProfile('medium', 'ulu_bey', 'bot_07_ulug_bey');
    const levelFifteen = getAIProfile('hard', 'timur', 'bot_15_aksak_demir');

    assert.ok(levelSeven.botRating > levelOne.botRating);
    assert.ok(levelFifteen.botRating > levelSeven.botRating);
    assert.ok(levelSeven.depth.base >= levelOne.depth.base);
    assert.ok(levelFifteen.depth.base > levelSeven.depth.base);
    assert.ok(levelSeven.search.rootMoveLimit > levelOne.search.rootMoveLimit);
    assert.ok(levelFifteen.search.branchMoveLimit > levelSeven.search.branchMoveLimit);
    assert.ok(levelSeven.selection.preferBestProbability > levelOne.selection.preferBestProbability);
    assert.ok(levelFifteen.selection.maxReplyCaptureValue < levelSeven.selection.maxReplyCaptureValue);
    assert.ok(levelFifteen.weights.winningEndgame > levelSeven.weights.winningEndgame);
});

test('dort ve bes yildiz botlar ayni hard tabandan farkli guc seviyesine ayrisir', () => {
    const levelTen = getAIProfile('hard', 'timur', 'bot_10_demir_pence');
    const levelFifteen = getAIProfile('hard', 'timur', 'bot_15_aksak_demir');

    assert.equal(levelTen.baseId, 'hard');
    assert.equal(levelFifteen.baseId, 'hard');
    assert.ok(levelFifteen.depth.sparseEndgame > levelTen.depth.sparseEndgame);
    assert.ok(levelFifteen.search.rootMoveLimit > levelTen.search.rootMoveLimit);
    assert.ok(levelFifteen.selection.alwaysPickBest);
    assert.equal(levelTen.selection.alwaysPickBest, false);
    assert.ok(levelFifteen.decisionStyle.precision > levelTen.decisionStyle.precision);
});

test('zor profil daha derin arar ve guvenli adaya daha cok tolerans verir', () => {
    const medium = getAIProfile('medium');
    const hard = getAIProfile('hard');

    assert.ok(hard.depth.base >= medium.depth.base + 3);
    assert.ok(hard.search.rootMoveLimit >= 36);
    assert.ok(hard.search.branchMoveLimit >= 14);
    assert.ok(hard.selection.maxReplyCaptureValue <= 16);
    assert.ok(hard.selection.unsafeScoreTolerance >= 45);
});

test('kolay ve orta profil hata payini korurken dogru hamleye daha yakin durur', () => {
    const easy = getAIProfile('easy');
    const medium = getAIProfile('medium');

    assert.equal(easy.selection.mode, 'biased');
    assert.ok(easy.selection.preferBestProbability > 0.55);
    assert.ok(easy.selection.preferBestProbability < medium.selection.preferBestProbability);
    assert.ok(medium.selection.preferBestProbability >= 0.88);
    assert.ok(medium.selection.scoreWindow < 8);
});

test('zor profil kazanilan son oyunu kolay profilden daha sert puanlar', () => {
    const state = new GameState('hard');
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(0, 2, new Rook(COLORS.BLACK, 0, 2));
    state.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));

    const easyScore = evaluateStateForBlack(state, getAIProfile('easy'));
    const hardScore = evaluateStateForBlack(state, getAIProfile('hard'));

    assert.ok(hardScore > easyScore);
});

test('tehdit haritasi savunmasiz kendi tasini risk rakip tasini firsat gorur', () => {
    const exposedOwn = new GameState('medium');
    exposedOwn.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    exposedOwn.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    exposedOwn.board.setPiece(4, 0, new Vizier(COLORS.BLACK, 4, 0));
    exposedOwn.board.setPiece(4, 4, new Rook(COLORS.WHITE, 4, 4));

    const exposedEnemy = new GameState('medium');
    exposedEnemy.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    exposedEnemy.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    exposedEnemy.board.setPiece(4, 0, new Vizier(COLORS.WHITE, 4, 0));
    exposedEnemy.board.setPiece(4, 4, new Rook(COLORS.BLACK, 4, 4));

    const ownThreatMap = buildBoardThreatMap(exposedOwn, COLORS.BLACK, getAIProfile('medium'));
    const enemyThreatMap = buildBoardThreatMap(exposedEnemy, COLORS.BLACK, getAIProfile('medium'));

    assert.ok(ownThreatMap.ownHangingValue >= 15);
    assert.ok(ownThreatMap.netScore < 0);
    assert.ok(enemyThreatMap.enemyHangingValue >= 15);
    assert.ok(enemyThreatMap.netScore > 0);
});

test('degerlendirme motoru v2 skoru adlandirilmis bilesenlere ayirir', () => {
    const state = new GameState('hard');
    const blackRook = new Rook(COLORS.BLACK, 4, 5);
    blackRook.hasMoved = true;

    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 5, blackRook);
    state.board.setPiece(6, 4, new TimurPawn(COLORS.BLACK, 6, 4, PAWN_TYPES.PAWN_OF_KINGS));
    state.board.setPiece(6, 6, new TimurPawn(COLORS.BLACK, 6, 6, PAWN_TYPES.PAWN_OF_VIZIERS));

    const breakdown = buildEvaluationBreakdownForBlack(state, getAIProfile('hard'));

    assert.equal(breakdown.total, evaluateStateForBlack(state, getAIProfile('hard')));
    assert.ok(Number.isFinite(breakdown.components.material));
    assert.ok(Number.isFinite(breakdown.components.piecePosition));
    assert.ok(Number.isFinite(breakdown.components.attackDefense));
    assert.ok(Number.isFinite(breakdown.components.pieceSafety));
    assert.ok(Number.isFinite(breakdown.components.royalSafety));
    assert.ok(Number.isFinite(breakdown.components.centerControl));
    assert.ok(Number.isFinite(breakdown.components.tempo));
    assert.ok(Number.isFinite(breakdown.components.development));
    assert.ok(Number.isFinite(breakdown.components.strategicPlan));
    assert.ok(Number.isFinite(breakdown.components.pawnStructure));
});

test('degerlendirme motoru v2 merkez gelisim ve piyon yapisini ayri odullendirir', () => {
    const active = new GameState('hard');
    const activeRook = new Rook(COLORS.BLACK, 4, 5);
    activeRook.hasMoved = true;
    active.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    active.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    active.board.setPiece(4, 5, activeRook);
    active.board.setPiece(5, 4, new TimurPawn(COLORS.BLACK, 5, 4, PAWN_TYPES.PAWN_OF_KINGS));
    active.board.setPiece(5, 6, new TimurPawn(COLORS.BLACK, 5, 6, PAWN_TYPES.PAWN_OF_VIZIERS));

    const passive = new GameState('hard');
    passive.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    passive.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    passive.board.setPiece(9, 1, new Rook(COLORS.BLACK, 9, 1));
    passive.board.setPiece(6, 5, new TimurPawn(COLORS.BLACK, 6, 5, PAWN_TYPES.PAWN_OF_KINGS));
    passive.board.setPiece(7, 5, new TimurPawn(COLORS.BLACK, 7, 5, PAWN_TYPES.PAWN_OF_VIZIERS));

    const activeBreakdown = buildEvaluationBreakdownForBlack(active, getAIProfile('hard'));
    const passiveBreakdown = buildEvaluationBreakdownForBlack(passive, getAIProfile('hard'));

    assert.ok(activeBreakdown.components.centerControl > passiveBreakdown.components.centerControl);
    assert.ok(activeBreakdown.components.development > passiveBreakdown.components.development);
    assert.ok(activeBreakdown.components.strategicPlan > passiveBreakdown.components.strategicPlan + 15);
    assert.ok(activeBreakdown.components.pawnStructure > passiveBreakdown.components.pawnStructure);
    assert.ok(activeBreakdown.total > passiveBreakdown.total);
});

test('degerlendirme motoru v3 oyun fazi ve yeni konumsal bilesenleri raporlar', () => {
    const state = new GameState('hard');
    const blackRook = new Rook(COLORS.BLACK, 4, 5);
    blackRook.hasMoved = true;
    state.currentTurn = COLORS.BLACK;
    state.moveHistory = [{}, {}, {}, {}];
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 5, blackRook);
    state.board.setPiece(6, 4, new TimurPawn(COLORS.BLACK, 6, 4, PAWN_TYPES.PAWN_OF_KINGS));
    state.board.setPiece(6, 6, new TimurPawn(COLORS.BLACK, 6, 6, PAWN_TYPES.PAWN_OF_VIZIERS));
    state.board.setPiece(3, 4, new TimurPawn(COLORS.WHITE, 3, 4, PAWN_TYPES.PAWN_OF_KINGS));
    for (let col = 0; col < 11; col++) {
        if (!state.board.getPieceAt(2, col)) {
            state.board.setPiece(2, col, new TimurPawn(COLORS.BLACK, 2, col, PAWN_TYPES.PAWN_OF_PAWNS));
        }
        if (!state.board.getPieceAt(7, col)) {
            state.board.setPiece(7, col, new TimurPawn(COLORS.WHITE, 7, col, PAWN_TYPES.PAWN_OF_PAWNS));
        }
    }

    const breakdown = buildEvaluationBreakdownForBlack(state, getAIProfile('hard'));
    const phaseTotal = breakdown.phase.weights.opening + breakdown.phase.weights.middle + breakdown.phase.weights.endgame;

    assert.equal(breakdown.phase.label, 'opening');
    assert.ok(Math.abs(phaseTotal - 1) < 0.001);
    assert.ok(Number.isFinite(breakdown.components.pieceSquare));
    assert.ok(Number.isFinite(breakdown.components.phasePosition));
    assert.ok(Number.isFinite(breakdown.components.lineControl));
    assert.ok(Number.isFinite(breakdown.components.weakSquares));
    assert.ok(Number.isFinite(breakdown.components.mobilityQuality));
});

test('degerlendirme motoru v3 kaliteli mobiliteyi hamle sayisindan ayirir', () => {
    const active = new GameState('hard');
    const activeRook = new Rook(COLORS.BLACK, 4, 4);
    active.currentTurn = COLORS.BLACK;
    active.moveHistory = Array.from({ length: 22 }, () => ({}));
    active.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    active.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    active.board.setPiece(4, 4, activeRook);
    active.board.setPiece(5, 4, new TimurPawn(COLORS.BLACK, 5, 4, PAWN_TYPES.PAWN_OF_KINGS));
    active.board.setPiece(4, 8, new TimurPawn(COLORS.WHITE, 4, 8, PAWN_TYPES.PAWN_OF_KINGS));

    const passive = new GameState('hard');
    const passiveRook = new Rook(COLORS.BLACK, 8, 10);
    passive.currentTurn = COLORS.BLACK;
    passive.moveHistory = Array.from({ length: 22 }, () => ({}));
    passive.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    passive.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    passive.board.setPiece(8, 10, passiveRook);
    passive.board.setPiece(8, 9, new TimurPawn(COLORS.BLACK, 8, 9, PAWN_TYPES.PAWN_OF_KINGS));
    passive.board.setPiece(7, 10, new TimurPawn(COLORS.BLACK, 7, 10, PAWN_TYPES.PAWN_OF_VIZIERS));

    const activeBreakdown = buildEvaluationBreakdownForBlack(active, getAIProfile('hard'));
    const passiveBreakdown = buildEvaluationBreakdownForBlack(passive, getAIProfile('hard'));

    assert.ok(activeBreakdown.components.mobilityQuality > passiveBreakdown.components.mobilityQuality + 12);
    assert.ok(activeBreakdown.components.lineControl > passiveBreakdown.components.lineControl);
});

test('sah guvenligi merkezde ileri cikan kraliyeti geride korunan kraliyetten zayif puanlar', () => {
    const sheltered = new GameState('hard');
    sheltered.board.setPiece(8, 5, new King(COLORS.WHITE, 8, 5));
    sheltered.board.setPiece(1, 5, new King(COLORS.BLACK, 1, 5));
    sheltered.board.setPiece(2, 4, new TimurPawn(COLORS.BLACK, 2, 4, PAWN_TYPES.PAWN_OF_KINGS));
    sheltered.board.setPiece(2, 5, new TimurPawn(COLORS.BLACK, 2, 5, PAWN_TYPES.PAWN_OF_VIZIERS));
    sheltered.board.setPiece(2, 6, new TimurPawn(COLORS.BLACK, 2, 6, PAWN_TYPES.PAWN_OF_GENERALS));

    const exposed = new GameState('hard');
    exposed.board.setPiece(8, 5, new King(COLORS.WHITE, 8, 5));
    exposed.board.setPiece(5, 5, new King(COLORS.BLACK, 5, 5));
    exposed.board.setPiece(2, 4, new TimurPawn(COLORS.BLACK, 2, 4, PAWN_TYPES.PAWN_OF_KINGS));
    exposed.board.setPiece(2, 5, new TimurPawn(COLORS.BLACK, 2, 5, PAWN_TYPES.PAWN_OF_VIZIERS));
    exposed.board.setPiece(2, 6, new TimurPawn(COLORS.BLACK, 2, 6, PAWN_TYPES.PAWN_OF_GENERALS));

    const shelteredBreakdown = buildEvaluationBreakdownForBlack(sheltered, getAIProfile('hard'));
    const exposedBreakdown = buildEvaluationBreakdownForBlack(exposed, getAIProfile('hard'));

    assert.ok(shelteredBreakdown.components.royalSafety > exposedBreakdown.components.royalSafety + 40);
    assert.ok(shelteredBreakdown.total > exposedBreakdown.total);
});

test('hamle siralama sahi merkeze surmeyi guvenli hatta kalmaktan daha dusuk gorur', () => {
    const state = new GameState('hard');
    const blackKing = new King(COLORS.BLACK, 1, 5);
    state.board.setPiece(8, 5, new King(COLORS.WHITE, 8, 5));
    state.board.setPiece(1, 5, blackKing);

    const safeGuard = scoreMoveHeuristicForBlack(
        state,
        { piece: blackKing, move: { row: 1, col: 4 } },
        getAIProfile('hard')
    );
    const centerRush = scoreMoveHeuristicForBlack(
        state,
        { piece: blackKing, move: { row: 5, col: 5 } },
        getAIProfile('hard')
    );

    assert.ok(safeGuard > centerRush + 20);
});

test('static exchange savunulan yem tasi almayi kotu takas olarak gorur', () => {
    const state = new GameState('hard');
    const blackRook = new Rook(COLORS.BLACK, 4, 4);
    const defendedWhitePawn = new TimurPawn(COLORS.WHITE, 4, 6, PAWN_TYPES.PAWN_OF_KINGS);

    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 4, blackRook);
    state.board.setPiece(4, 6, defendedWhitePawn);
    state.board.setPiece(4, 8, new Rook(COLORS.WHITE, 4, 8));

    const exchange = evaluateStaticExchangeForMove(
        state,
        { piece: blackRook, move: { row: 4, col: 6 } },
        getAIProfile('hard')
    );

    assert.equal(exchange.captures, true);
    assert.equal(exchange.method, 'timur_see_v2');
    assert.ok(exchange.captureValue > 0);
    assert.ok(exchange.recaptureRisk >= 90);
    assert.ok(exchange.captureSequence.length >= 2);
    assert.equal(exchange.leastValuableReply.type, 'rook');
    assert.ok(exchange.score < 0);
    assert.equal(exchange.favorable, false);
});

test('static exchange tam tas degisim zincirini hesaba katar', () => {
    const state = new GameState('hard');
    const attackingRook = new Rook(COLORS.BLACK, 4, 4);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 10, new King(COLORS.WHITE, 0, 10));
    state.board.setPiece(9, 0, new King(COLORS.BLACK, 9, 0));
    state.board.setPiece(4, 0, new Rook(COLORS.BLACK, 4, 0));
    state.board.setPiece(4, 4, attackingRook);
    state.board.setPiece(4, 6, new Rook(COLORS.WHITE, 4, 6));
    state.board.setPiece(4, 8, new Rook(COLORS.WHITE, 4, 8));

    const exchange = evaluateStaticExchangeForMove(
        state,
        { piece: attackingRook, move: { row: 4, col: 6 } },
        getAIProfile('hard')
    );

    assert.equal(exchange.captures, true);
    assert.equal(exchange.method, 'timur_see_v2');
    assert.ok(exchange.sequenceDepth >= 2);
    assert.ok(exchange.captureTreeDepth >= 2);
    assert.ok(exchange.captureSequence.length >= 2);
    assert.equal(exchange.leastValuableReply.color, COLORS.WHITE);
    assert.ok(exchange.score > 60);
    assert.equal(exchange.favorable, true);
});

test('static exchange kraliyet hamlesinde hisar ve sah riskini cezalandirir', () => {
    const state = new GameState('hard');
    const blackKing = new King(COLORS.BLACK, 8, 10);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(8, 10, blackKing);
    state.board.setPiece(9, 10, new TimurPawn(COLORS.WHITE, 9, 10, PAWN_TYPES.PAWN_OF_KINGS));
    state.board.setPiece(9, 6, new Rook(COLORS.WHITE, 9, 6));

    const exchange = evaluateStaticExchangeForMove(
        state,
        { piece: blackKing, move: { row: 9, col: 10 } },
        getAIProfile('hard')
    );

    assert.equal(exchange.method, 'timur_see_v2');
    assert.equal(exchange.captures, true);
    assert.ok(exchange.royalRiskPenalty > 0);
    assert.ok(exchange.citadelRiskPenalty > 0);
    assert.ok(exchange.specialRiskPenalty > 0);
    assert.equal(exchange.favorable, false);
});

test('tehdit haritasi pin yuzunden pseudo ve legal saldiriyi ayirir', () => {
    const state = new GameState('hard');

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 5, new King(COLORS.WHITE, 0, 5));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(1, 5, new Rook(COLORS.WHITE, 1, 5));
    state.board.setPiece(2, 5, new Rook(COLORS.BLACK, 2, 5));
    state.board.setPiece(1, 7, new Vizier(COLORS.BLACK, 1, 7));

    const threatMap = buildBoardThreatMap(state, COLORS.BLACK, getAIProfile('hard'));

    assert.ok(threatMap.pseudoOwnHangingValue > threatMap.legalOwnHangingValue);
    assert.equal(threatMap.ownHangingValue, threatMap.legalOwnHangingValue);
});

test('taktik motif analizi cift tehdidi hamle puanina tasir', () => {
    const state = new GameState('hard');
    const blackRook = new Rook(COLORS.BLACK, 4, 5);

    state.currentTurn = COLORS.BLACK;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(4, 5, blackRook);
    state.board.setPiece(4, 2, new Rook(COLORS.WHITE, 4, 2));
    state.board.setPiece(1, 4, new Rook(COLORS.WHITE, 1, 4));

    const forkMove = { piece: blackRook, move: { row: 4, col: 4 } };
    const quietMove = { piece: blackRook, move: { row: 5, col: 5 } };
    const motifs = analyzeTacticalMotifsForMove(state, forkMove, getAIProfile('hard'));

    assert.ok(motifs.forkTargets.length >= 2);
    assert.ok(motifs.score > 50);
    assert.ok(
        scoreMoveHeuristicForBlack(state, forkMove, getAIProfile('hard'))
        > scoreMoveHeuristicForBlack(state, quietMove, getAIProfile('hard')) + 40
    );
});

test('kolay profil en iyiye yakin ikinci hamleyi secebilir', () => {
    const choice = selectMoveFromCandidates(
        [
            { score: 120, move: 'best' },
            { score: 114, move: 'second' },
            { score: 96, move: 'third' }
        ],
        getAIProfile('easy'),
        0.85
    );

    assert.equal(choice.move, 'second');
});

test('kolay profil tekrar riski yuksek adayi varsa daha temiz adayi secer', () => {
    const choice = selectMoveFromCandidates(
        [
            { score: 120, move: 'repeat-risk', repetitionRisk: { severity: 4 } },
            { score: 112, move: 'clean', repetitionRisk: { severity: 0 } }
        ],
        getAIProfile('easy'),
        0.1
    );

    assert.equal(choice.move, 'clean');
});

test('zor profil puan farki olsa bile tas kaybettiren hamleyi birakir', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 100,
                move: 'unsafe-best',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 40 }
            },
            {
                score: 60,
                move: 'safer-plan',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 }
            }
        ],
        getAIProfile('hard')
    );

    assert.equal(choice.move, 'safer-plan');
});

test('kolay profil tehlikeli adayi birakip daha guvenli adayi secer', () => {
    const choice = selectMoveFromCandidates(
        [
            { score: 118, move: 'flashy', tacticalRisk: { dangerLevel: 3 } },
            { score: 112, move: 'safe', tacticalRisk: { dangerLevel: 0 } }
        ],
        getAIProfile('easy'),
        0.2
    );

    assert.equal(choice.move, 'safe');
});

test('kolay profil acilista buyuk tas sicrama borcunu guvenlik riski sayar', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 180,
                move: 'early-major-piece-raid',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                staticExchange: { score: 0, exchangeDebt: 0 },
                styleAdjustment: { components: { opening: -320 } }
            },
            {
                score: 150,
                move: 'solid-pawn-development',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                staticExchange: { score: 0, exchangeDebt: 0 },
                styleAdjustment: { components: { opening: 0 } }
            }
        ],
        getAIProfile('easy'),
        0.1
    );

    assert.equal(choice.move, 'solid-pawn-development');
});

test('orta profil derin rakip cevapta avlanacak tas hamlesini birakir', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 180,
                move: 'uc-hamlede-avlanan-piyon-avi',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                opponentContinuationThreat: { penalty: -260, bestCaptureValue: 60, routeDepth: 3 },
                staticExchange: { score: 0, captures: true, captureValue: 10, exchangeDebt: 0 },
                styleAdjustment: { components: { opening: 0 } },
                metadata: { tempoLoss: 0 }
            },
            {
                score: 150,
                move: 'guvenli-gelisim',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                opponentContinuationThreat: { penalty: 0, bestCaptureValue: 0, routeDepth: 0 },
                staticExchange: { score: 0, captures: false, captureValue: 0, exchangeDebt: 0 },
                styleAdjustment: { components: { opening: 0 } },
                metadata: { tempoLoss: 0 }
            }
        ],
        getAIProfile('medium'),
        0
    );

    assert.equal(choice.move, 'guvenli-gelisim');
});

test('zor profil daima en iyi hamleyi secer', () => {
    const choice = selectMoveFromCandidates(
        [
            { score: 120, move: 'best' },
            { score: 119, move: 'second' },
            { score: 118, move: 'third' }
        ],
        getAIProfile('hard'),
        0.99
    );

    assert.equal(choice.move, 'best');
});

test('zor profil basit tas kaybettirecek riskli hamleyi puani az yuksek diye secmez', () => {
    const choice = selectMoveFromCandidates(
        [
            { score: 130, move: 'hanging-piece', tacticalRisk: { dangerLevel: 3 } },
            { score: 122, move: 'safe-pressure', tacticalRisk: { dangerLevel: 0 } }
        ],
        getAIProfile('hard'),
        0.99
    );

    assert.equal(choice.move, 'safe-pressure');
});

test('zor profil rakibin hemen tas kazanacagi adayi guvenli aday icin birakir', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 130,
                move: 'wins-space-but-drops-piece',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 70 }
            },
            {
                score: 118,
                move: 'keeps-piece-safe',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 }
            }
        ],
        getAIProfile('hard'),
        0.99
    );

    assert.equal(choice.move, 'keeps-piece-safe');
});

test('zor profil agir tas kaybi riskinde puan farki buyuk olsa bile guvenli plani secer', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 260,
                move: 'flashy-but-drops-rook',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 90 },
                staticExchange: { score: -45 },
                metadata: { tempoLoss: 5 }
            },
            {
                score: 120,
                move: 'solid-continuation',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                staticExchange: { score: 0 },
                metadata: { tempoLoss: 0 }
            }
        ],
        getAIProfile('hard'),
        0.99
    );

    assert.equal(choice.move, 'solid-continuation');
});

test('orta profil riskli piyon avi yerine guvenli buyuk tas kazancini secer', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 690,
                move: 'wins-pawn-but-drops-picket',
                tacticalRisk: { dangerLevel: 2 },
                opponentReplyThreat: { bestCaptureValue: 72.5 },
                staticExchange: { captureValue: 10, score: -57.5, exchangeDebt: 57.5 }
            },
            {
                score: 370,
                move: 'clean-rook-capture',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                staticExchange: { captureValue: 100, score: 105, exchangeDebt: 0 },
                metadata: { tempoLoss: true }
            }
        ],
        getAIProfile('medium'),
        0.1
    );

    assert.equal(choice.move, 'clean-rook-capture');
});

test('orta profil dusuk degerli riskli tas avini guvenli plana birakir', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 388,
                move: 'pawn-grab-that-drops-piece',
                tacticalRisk: { dangerLevel: 2 },
                opponentReplyThreat: { bestCaptureValue: 72.5 },
                staticExchange: { captureValue: 10, score: -57.5, exchangeDebt: 57.5 }
            },
            {
                score: 288,
                move: 'safe-development',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 },
                staticExchange: { captureValue: 0, score: 5, exchangeDebt: 0 },
                metadata: { tempoLoss: true }
            }
        ],
        getAIProfile('medium'),
        0.1
    );

    assert.equal(choice.move, 'safe-development');
});

test('zor profil terminal kazanci guvenlik filtresi yuzunden birakmaz', () => {
    const choice = selectMoveFromCandidates(
        [
            {
                score: 180,
                move: 'mate-now',
                tacticalRisk: { dangerLevel: 3 },
                opponentReplyThreat: { bestCaptureValue: 120 },
                metadata: { terminalWin: true }
            },
            {
                score: 160,
                move: 'safe-but-not-mate',
                tacticalRisk: { dangerLevel: 0 },
                opponentReplyThreat: { bestCaptureValue: 0 }
            }
        ],
        getAIProfile('hard'),
        0.99
    );

    assert.equal(choice.move, 'mate-now');
});

test('zor profil tempo kaybettiren sessiz hamleye stil cezasini sert uygular', () => {
    const hard = getAIProfile('hard');
    const safeTempo = scoreCandidateDecisionStyle({
        metadata: {
            givesCheck: false,
            captures: false,
            opponentMobility: 12,
            tempoLoss: 0
        },
        tacticalRisk: { dangerLevel: 0 },
        opponentReplyThreat: { bestCaptureValue: 0 },
        staticExchange: { score: 0 },
        repetitionRisk: { severity: 0 },
        endgamePlan: { score: 0 },
        clockPressure: { bonus: 0 }
    }, hard);
    const badTempo = scoreCandidateDecisionStyle({
        metadata: {
            givesCheck: false,
            captures: false,
            opponentMobility: 12,
            tempoLoss: 8
        },
        tacticalRisk: { dangerLevel: 0 },
        opponentReplyThreat: { bestCaptureValue: 0 },
        staticExchange: { score: 0 },
        repetitionRisk: { severity: 0 },
        endgamePlan: { score: 0 },
        clockPressure: { bonus: 0 }
    }, hard);

    assert.ok(badTempo.score < safeTempo.score - 35);
});
