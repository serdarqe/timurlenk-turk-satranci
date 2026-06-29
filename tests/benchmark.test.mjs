// tests/benchmark.test.mjs — Engine NPS, depth, çözüm hızı ölçümleri
import test from 'node:test';
import { GameState } from '../src/game/GameState.js';
import { King, Vizier, General, Knight, Rook, TimurPawn } from '../src/game/PieceFactory.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';
import { selectAiMoveAnalysisForState } from '../src/ai/ai.worker.js';
import { perft } from '../src/game/Perft.js';

test('benchmark — gerçek arama metrikleri', async () => {
    console.log('\n=== ENGINE BENCHMARK ===\n');

    // 1) PERFT NPS — saf hamle üretim hızı
    const startState = await GameState.createInitialState(FORMATIONS.MASCULINE);
    startState.currentTurn = COLORS.WHITE;
    const perftStart = Date.now();
    const perftResult = perft(startState, 3);
    const perftTime = Date.now() - perftStart;
    const perftNps = Math.round(perftResult / (perftTime / 1000));
    console.log(`PERFT depth 3 başlangıç pozisyonu : ${perftResult} pozisyon`);
    console.log(`                                   ${perftTime}ms (${perftNps.toLocaleString()} pos/sec)`);

    // 2) ANA ARAMA — bot seviyelerine göre gerçek depth
    const positions = [
        { name: 'Başlangıç (eril)', setup: async () => {
            const s = await GameState.createInitialState(FORMATIONS.MASCULINE);
            s.currentTurn = COLORS.BLACK; s.aiColor = COLORS.BLACK; s.difficulty = 'hard';
            return s;
        }},
        { name: 'Orta oyun (16 taş)', setup: () => {
            const s = new GameState('hard'); s.currentTurn = COLORS.BLACK; s.aiColor = COLORS.BLACK; s.difficulty = 'hard';
            s.board.setPiece(0, 5, new King(COLORS.WHITE, 0, 5));
            s.board.setPiece(9, 5, new King(COLORS.BLACK, 9, 5));
            s.board.setPiece(0, 0, new Rook(COLORS.WHITE, 0, 0));
            s.board.setPiece(0, 10, new Rook(COLORS.WHITE, 0, 10));
            s.board.setPiece(9, 0, new Rook(COLORS.BLACK, 9, 0));
            s.board.setPiece(9, 10, new Rook(COLORS.BLACK, 9, 10));
            s.board.setPiece(1, 4, new General(COLORS.WHITE, 1, 4));
            s.board.setPiece(8, 4, new General(COLORS.BLACK, 8, 4));
            s.board.setPiece(1, 6, new Vizier(COLORS.WHITE, 1, 6));
            s.board.setPiece(8, 6, new Vizier(COLORS.BLACK, 8, 6));
            s.board.setPiece(2, 3, new Knight(COLORS.WHITE, 2, 3));
            s.board.setPiece(7, 3, new Knight(COLORS.BLACK, 7, 3));
            s.board.setPiece(3, 5, new TimurPawn(COLORS.WHITE, 3, 5, 'pawn_of_kings'));
            s.board.setPiece(6, 5, new TimurPawn(COLORS.BLACK, 6, 5, 'pawn_of_kings'));
            s.board.setPiece(3, 4, new TimurPawn(COLORS.WHITE, 3, 4, 'pawn_of_pawns'));
            s.board.setPiece(6, 4, new TimurPawn(COLORS.BLACK, 6, 4, 'pawn_of_pawns'));
            return s;
        }},
        { name: 'Endgame (3 taş)', setup: () => {
            const s = new GameState('hard'); s.currentTurn = COLORS.WHITE; s.aiColor = COLORS.WHITE; s.difficulty = 'hard';
            s.board.setPiece(5, 5, new King(COLORS.WHITE, 5, 5));
            s.board.setPiece(4, 4, new Rook(COLORS.WHITE, 4, 4));
            s.board.setPiece(2, 5, new King(COLORS.BLACK, 2, 5));
            return s;
        }}
    ];

    const thinkTimes = [25, 100, 500, 1000];

    for (const pos of positions) {
        console.log(`\n--- ${pos.name} ---`);
        for (const tms of thinkTimes) {
            const state = await pos.setup();
            const t0 = Date.now();
            const result = selectAiMoveAnalysisForState(state, { maxThinkMs: tms });
            const elapsed = Date.now() - t0;
            const si = result?.searchInfo || {};
            const depth = si.completedDepth || si.depth || si.mateDepth || '-';
            const mate = si.mateFound ? `MAT${si.matePlies}` : '';
            console.log(`  think=${String(tms).padStart(4)}ms  →  gerçek ${String(elapsed).padStart(4)}ms  depth=${depth}  ${mate}`);
        }
    }
});
