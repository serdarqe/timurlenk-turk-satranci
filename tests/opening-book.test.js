import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import { MoveValidator } from '../src/game/MoveValidator.js';
import { buildZobristHash } from '../src/game/ZobristHash.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import {
    OPENING_BOOKS,
    buildOpeningBookStatsFromMatches,
    getOpeningBookLines,
    getOpeningBookMove,
    getOpeningRepertoireForProfile,
    mirrorBookMoveForBlack,
    mergeOpeningBookStats,
    squareToCoord
} from '../src/ai/OpeningBook.js';

const files = 'abcdefghijk';

function assertMove(choice, from, to) {
    assert.ok(choice, 'expected an opening-book move');
    assert.equal(files[choice.piece.col] + (10 - choice.piece.row), from);
    assert.equal(files[choice.move.col] + (10 - choice.move.row), to);
}

function applyBookMove(state, from, to) {
    const fromCoord = squareToCoord(from);
    const toCoord = squareToCoord(to);
    state.board.movePiece(fromCoord.row, fromCoord.col, toCoord.row, toCoord.col);
}

function recordMove(state, color, from, to) {
    const fromCoord = squareToCoord(from);
    const toCoord = squareToCoord(to);
    state.moveHistory.push({
        index: state.moveHistory.length + 1,
        color,
        from: fromCoord,
        to: toCoord,
        notation: `${from} -> ${to}`
    });
}

test('zor Timur AI eril dizilimde Timur Kusatmasi ile baslar', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingId, 'timur_siege');
    assertMove(choice, 'e8', 'e7');
});

test('faz 9 acilis secimi pozisyon hash ve kitap istatistigi tasir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingPositionHash, buildZobristHash(state));
    assert.equal(choice.openingStats.openingId, 'timur_siege');
    assert.ok(choice.openingStats.games > 0);
    assert.ok(choice.openingDataScore > 0);
});

test('faz 9 veri destekli kitap zayif istatistikli acilistan daha guvenli repertuvara gecer', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const profile = {
        ...getAIProfile('hard', 'timur'),
        openingBookPreferences: Object.freeze(['timur_siege', 'pawn_fortress'])
    };
    const hash = buildZobristHash(state);
    const bookStats = mergeOpeningBookStats(null, {
        byPosition: {
            [hash]: {
                timur_siege: { games: 24, wins: 2, draws: 1, losses: 21 },
                pawn_fortress: { games: 24, wins: 17, draws: 5, losses: 2 }
            }
        }
    });

    const choice = getOpeningBookMove(state, profile, { bookStats });

    assert.equal(choice.openingId, 'pawn_fortress');
    assertMove(choice, 'f8', 'f7');
    assert.ok(choice.openingStats.score > 0.75);
});

test('faz 9 bot repertuvari bot tercihleri, seviye ve pozisyon hash ile siralanir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const profile = getAIProfile('hard', 'timur', 'bot_15_aksak_demir');
    const repertoire = getOpeningRepertoireForProfile(profile, state);

    assert.equal(repertoire[0].id, 'timur_siege');
    assert.equal(repertoire[0].positionHash, buildZobristHash(state));
    assert.ok(repertoire[0].botFit >= repertoire[1].botFit);
    assert.ok(repertoire.every((entry) => entry.stats && Number.isFinite(entry.stats.score)));
});

test('faz 9 AI-vs-AI maclarindan kitap basari istatistigi uretir', () => {
    const learned = buildOpeningBookStatsFromMatches([
        {
            winner: 'black',
            moves: [
                { color: COLORS.BLACK, openingBook: true, openingId: 'timur_siege', openingPositionHash: 'z2:test-a' }
            ]
        },
        {
            winner: 'white',
            moves: [
                { color: COLORS.BLACK, openingBook: true, openingId: 'timur_siege', openingPositionHash: 'z2:test-a' }
            ]
        },
        {
            resultType: 'max_moves_draw',
            moves: [
                { color: COLORS.BLACK, openingBook: true, openingId: 'pawn_fortress', openingPositionHash: 'z2:test-b' }
            ]
        }
    ]);

    assert.equal(learned.byOpening.timur_siege.games, 2);
    assert.equal(learned.byOpening.timur_siege.score, 0.5);
    assert.equal(learned.byPosition['z2:test-b'].pawn_fortress.draws, 1);
    assert.equal(learned.byPosition['z2:test-b'].pawn_fortress.score, 0.5);
});

test('bot acilis onceligi persona onceliginden once gelir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    const profile = {
        ...getAIProfile('hard', 'timur'),
        botId: 'test_pawn_fortress_bot',
        openingBookPreferences: Object.freeze(['pawn_fortress'])
    };
    const choice = getOpeningBookMove(state, profile);

    assert.equal(choice.openingId, 'pawn_fortress');
    assertMove(choice, 'f8', 'f7');
});

test('acilis kitabi tamamlanan ilk hamleden sonra siradaki hamleyi onerir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';
    applyBookMove(state, 'e8', 'e7');

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingId, 'timur_siege');
    assertMove(choice, 'f8', 'f7');
});

test('acilis kitabi oyuncunun ilk cevabina gore dallanir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    applyBookMove(state, 'e3', 'e4');
    recordMove(state, COLORS.WHITE, 'e3', 'e4');
    state.currentTurn = COLORS.BLACK;

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingId, 'timur_siege');
    assert.equal(choice.openingLineId, 'timur_siege_center_reply');
    assertMove(choice, 'e8', 'e7');
});

test('acilis kitabi tanimlanmamis oyuncu cevabinda dusuk guvenli plan gecisine doner', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';

    applyBookMove(state, 'k3', 'k4');
    recordMove(state, COLORS.WHITE, 'k3', 'k4');
    state.currentTurn = COLORS.BLACK;

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.ok(choice);
    assert.equal(choice.openingTransition, true);
    assert.ok(choice.openingConfidence < 0.6);
});

test('acilis kitabi ilk hamle bozulduysa ayni varyantta ileri atlamaz', async () => {
    const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';
    state.board.setPiece(3, 2, new Rook(COLORS.BLACK, 3, 2));

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.notEqual(`${choice?.openingId}:${choice?.openingMoveIndex}`, 'timur_siege:2');
});

test('acilis kitabi disil dizilimde ayri repertuvar kullanir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.FEMININE);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.FEMININE;
    state.aiPersonaId = 'timur';

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingId, 'feminine_council');
    assertMove(choice, 'g9', 'f10');
});

test('acilis kitabi tam dizilimde ekstra taslara uygun repertuvar kullanir', async () => {
    const state = await GameState.createInitialState(FORMATIONS.FULL);
    state.currentTurn = COLORS.BLACK;
    state.difficulty = 'hard';
    state.formation = FORMATIONS.FULL;
    state.aiPersonaId = 'timur';

    const choice = getOpeningBookMove(state, getAIProfile('hard', 'timur'));

    assert.equal(choice.openingId, 'full_lion_gate');
    assertMove(choice, 'b10', 'b7');
});

test('acilis kitabi seyrek oyun sonunda devreye girmez', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.formation = FORMATIONS.MASCULINE;
    state.aiPersonaId = 'timur';
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));
    state.board.setPiece(2, 3, new Rook(COLORS.BLACK, 2, 3));

    assert.equal(getOpeningBookMove(state, getAIProfile('hard', 'timur')), null);
});

test('acilis kitabi explicit eril dizilim yoksa devreye girmez', () => {
    const state = new GameState('hard');
    state.currentTurn = COLORS.BLACK;
    state.aiPersonaId = 'timur';
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(2, 1, new King(COLORS.BLACK, 2, 1));
    state.board.setPiece(2, 3, new Rook(COLORS.BLACK, 2, 3));

    assert.equal(getOpeningBookMove(state, getAIProfile('hard', 'timur')), null);
});

test('kitaptaki tum acilis hamleleri siyah aynasinda motor tarafindan legal kabul edilir', async () => {
    for (const book of OPENING_BOOKS) {
        const state = await GameState.createInitialState(book.formation);
        const validator = new MoveValidator(state);

        for (const move of book.moves) {
            const mirrored = mirrorBookMoveForBlack(move);
            const from = squareToCoord(mirrored.from);
            const to = squareToCoord(mirrored.to);
            state.currentTurn = COLORS.BLACK;

            const legalMoves = validator.getLegalMoves(from.row, from.col);
            assert.ok(
                legalMoves.some((legalMove) => legalMove.row === to.row && legalMove.col === to.col),
                `${book.id} ${mirrored.from}->${mirrored.to} motor tarafindan legal olmali`
            );

            state.board.movePiece(from.row, from.col, to.row, to.col);
        }
    }
});

test('dallanan acilis agacindaki tum yollar motor tarafindan legal kabul edilir', async () => {
    for (const book of OPENING_BOOKS) {
        for (const line of getOpeningBookLines(book)) {
            const state = await GameState.createInitialState(book.formation);
            const validator = new MoveValidator(state);

            for (const step of line.sequence) {
                const move = step.side === 'ai' ? mirrorBookMoveForBlack(step.move) : step.move;
                const from = squareToCoord(move.from);
                const to = squareToCoord(move.to);
                state.currentTurn = step.side === 'ai' ? COLORS.BLACK : COLORS.WHITE;

                const legalMoves = validator.getLegalMoves(from.row, from.col);
                assert.ok(
                    legalMoves.some((legalMove) => legalMove.row === to.row && legalMove.col === to.col),
                    `${book.id}/${line.id} ${step.side} ${move.from}->${move.to} motor tarafindan legal olmali`
                );

                state.board.movePiece(from.row, from.col, to.row, to.col);
            }
        }
    }
});
