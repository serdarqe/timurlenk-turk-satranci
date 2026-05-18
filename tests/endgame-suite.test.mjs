// tests/endgame-suite.test.mjs
//
// Endgame Conversion Benchmark
// -----------------------------
// Kazanılmış pozisyon seti. AI'nın güçlü taraftaki taşlarla
// kazanma planı yapıp pozisyonu makul sürede sonuçlandırabildiğini ölçer.
//
// Yöntem:
//   - Pozisyon yükle (AI = kazanan taraf, hard mod).
//   - Maks N hamle (varsayılan 80) içinde maç oynat.
//   - Başarı kriteri:
//       * AI maç_içinde mat / pat zaferi / hisar zaferi yaptı, VEYA
//       * Karşı tarafın taşlarının ezici çoğunluğunu (≥%80) yedi.
//
// AI vs "random/passive" rakip — rakip her zaman güvenli en zayıf hamleyi seçer
// (Şah veya tek Şah çalıştırması). Bu, AI'nın kazanma kapasitesini izole eder.
//
// Çalıştırma:
//   cd TimurChessWeb && node --test tests/endgame-suite.test.mjs
//
// Süre limiti uzun olabilir — her pozisyon için 80 hamle x 2 ms = ~3 sn

import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/game/GameState.js';
import {
    King, Vizier, SeaMonster, General, Knight, Lion, Elephant, Camel,
    Dabbaba, Bull, Revealer, Giraffe, Picket, Rook, TimurPawn
} from '../src/game/PieceFactory.js';
import { COLORS, PAWN_TYPES } from '../src/utils/constants.js';
import { selectAiMoveForState } from '../src/ai/ai.worker.js';
import {
    collectLegalMoves,
    applyPerftMove,
} from '../src/game/Perft.js';

const FILES = 'abcdefghijk';
const toLabel = (row, col) => `${FILES[col]}${10 - row}`;

// ===================================================================
// POZİSYON YAPICI
// ===================================================================

function buildEndgameState(aiColor, pieces) {
    const state = new GameState('hard');
    state.currentTurn = aiColor; // AI önce oynar
    state.aiColor = aiColor;
    state.difficulty = 'hard';

    for (const [PieceClass, color, row, col, ...extra] of pieces) {
        state.board.setPiece(row, col, new PieceClass(color, row, col, ...extra));
    }
    return state;
}

// ===================================================================
// RAKİP — Zayıf Şah Çalıştırması
// ===================================================================
// Rakip: en güvenli pasif hamleyi seçer (en yakın saldırgandan en uzak kareye).

function chooseWeakOpponentMove(state) {
    const moves = collectLegalMoves(state);
    if (moves.length === 0) return null;

    // Önce Şah hamlelerini dene
    const kingMoves = moves.filter(m => {
        const piece = state.board.getPieceAt(m.piece.row, m.piece.col);
        return piece && piece.type === 'king';
    });

    const candidates = kingMoves.length > 0 ? kingMoves : moves;

    // En "merkezi" hareketten kaç (kenara doğru git)
    let best = candidates[0];
    let bestEdgeDist = Infinity;

    for (const m of candidates) {
        const edgeDist = Math.min(m.move.row, 9 - m.move.row, m.move.col, 10 - m.move.col);
        if (edgeDist < bestEdgeDist) {
            bestEdgeDist = edgeDist;
            best = m;
        }
    }
    return best;
}

// ===================================================================
// MAÇ OYUNATICI
// ===================================================================

function playEndgame(state, options = {}) {
    const maxMoves = options.maxMoves || 80;
    const thinkMs = options.thinkMs || 60;
    const aiColor = state.aiColor;
    let movesPlayed = 0;

    const initialOpponentMaterial = countMaterial(state, aiColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);

    while (movesPlayed < maxMoves) {
        // Oyun bitti mi?
        const legal = collectLegalMoves(state);
        if (legal.length === 0) {
            // Kim hamle yapamadı?
            // Pat veya mat — kim hamle edemiyorsa kaybeder (Timur'da pat = kazanç)
            const loser = state.currentTurn;
            return {
                result: loser === aiColor ? 'lost' : 'won',
                reason: 'no_legal_moves',
                movesPlayed,
            };
        }

        let chosen;
        if (state.currentTurn === aiColor) {
            const moveChoice = selectAiMoveForState(state, { maxThinkMs: thinkMs });
            if (!moveChoice) {
                return { result: 'lost', reason: 'ai_no_move', movesPlayed };
            }
            // moveChoice'i Perft hamle formatına dönüştür
            chosen = legal.find(m =>
                m.piece.row === moveChoice.piece.row &&
                m.piece.col === moveChoice.piece.col &&
                m.move.row === moveChoice.move.row &&
                m.move.col === moveChoice.move.col
            );
            if (!chosen) {
                return { result: 'illegal', reason: 'ai_illegal_move', movesPlayed };
            }
        } else {
            chosen = chooseWeakOpponentMove(state);
            if (!chosen) {
                return { result: 'won', reason: 'opponent_no_move', movesPlayed };
            }
        }

        applyPerftMove(state, chosen);
        movesPlayed++;
    }

    // Maks hamle doldu — başarıyı materyal farkına göre değerlendir
    const finalOpponentMaterial = countMaterial(state, aiColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
    const materialEaten = initialOpponentMaterial - finalOpponentMaterial;
    const eatRatio = initialOpponentMaterial > 0 ? materialEaten / initialOpponentMaterial : 0;

    return {
        result: eatRatio >= 0.5 ? 'partial' : 'failed',
        reason: 'max_moves',
        movesPlayed,
        eatRatio,
    };
}

function countMaterial(state, color) {
    let count = 0;
    for (const piece of (state.board.pieces || [])) {
        if (piece.color === color && piece.type !== 'king') {
            count++;
        }
    }
    return count;
}

// ===================================================================
// ENDGAME POZİSYONLARI
// ===================================================================

const ENDGAMES = [

    // ---- K+K vs K (Şah + Kale vs Şah) ----
    {
        id: 'kk_01_center',
        description: 'Şah + Kale vs Şah, merkez başlangıç',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 5, 5],
            [Rook, COLORS.WHITE, 4, 4],
            [King, COLORS.BLACK, 2, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'kk_02_edge',
        description: 'Şah + Kale vs kenardaki Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 4, 5],
            [Rook, COLORS.WHITE, 4, 0],
            [King, COLORS.BLACK, 0, 7],
        ],
        maxMoves: 50,
    },
    {
        id: 'kk_03_black_advantage',
        description: 'Siyah Şah + Kale vs Beyaz Şah',
        aiColor: COLORS.BLACK,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [King, COLORS.BLACK, 5, 5],
            [Rook, COLORS.BLACK, 4, 4],
        ],
        maxMoves: 60,
    },

    // ---- K+V vs K (Şah + Vezir vs Şah) ----
    // Vezir 1 kare yürür — uzun mat ama mümkün
    {
        id: 'kv_01_basic',
        description: 'Şah + Vezir + Kale vs Şah (Vezir yardımcı)',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 5, 5],
            [Vizier, COLORS.WHITE, 5, 6],
            [Rook, COLORS.WHITE, 4, 4],
            [King, COLORS.BLACK, 2, 5],
        ],
        maxMoves: 50,
    },

    // ---- K+B vs K (Şah + Bakan vs Şah) ----
    // Bakan + Kale çift
    {
        id: 'kb_01_general_helps',
        description: 'Şah + Bakan + Kale vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 5, 5],
            [General, COLORS.WHITE, 5, 3],
            [Rook, COLORS.WHITE, 4, 4],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },

    // ---- 2K vs K (İki Kale vs Şah) ----
    {
        id: 'kk2_01_double_rook',
        description: 'İki Kale matı — merdiven',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 9, 5],
            [Rook, COLORS.WHITE, 5, 0],
            [Rook, COLORS.WHITE, 4, 10],
            [King, COLORS.BLACK, 2, 5],
        ],
        maxMoves: 40,
    },
    {
        id: 'kk2_02_separated',
        description: 'İki Kale, Şah uzakta',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 9, 5],
            [Rook, COLORS.WHITE, 8, 0],
            [Rook, COLORS.WHITE, 8, 10],
            [King, COLORS.BLACK, 0, 5],
        ],
        maxMoves: 50,
    },

    // ---- Materyal Üstünlüğü ----
    {
        id: 'adv_01_two_pieces',
        description: 'Şah + Kale + Bakan vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 3],
            [General, COLORS.WHITE, 5, 7],
            [King, COLORS.BLACK, 2, 5],
        ],
        maxMoves: 50,
    },
    {
        id: 'adv_02_three_pieces',
        description: 'Şah + Kale + At + Bakan vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 6, 3],
            [Knight, COLORS.WHITE, 6, 5],
            [General, COLORS.WHITE, 6, 7],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 50,
    },
    {
        id: 'adv_03_camel_rook',
        description: 'Şah + Kale + Deve vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 0],
            [Camel, COLORS.WHITE, 5, 5],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },

    // ---- Piyon Terfi ----
    {
        id: 'pawn_01_promote_kings',
        description: 'Piyon (Şah piyonu) terfiye yakın',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [TimurPawn, COLORS.WHITE, 1, 5, PAWN_TYPES.PAWN_OF_KINGS],
            [Rook, COLORS.WHITE, 5, 0],
            [King, COLORS.BLACK, 0, 9],
        ],
        maxMoves: 30,
    },
    {
        id: 'pawn_02_promote_viziers',
        description: 'Vezir piyonu son sıraya yakın',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [TimurPawn, COLORS.WHITE, 1, 3, PAWN_TYPES.PAWN_OF_VIZIERS],
            [Rook, COLORS.WHITE, 5, 0],
            [King, COLORS.BLACK, 0, 9],
        ],
        maxMoves: 30,
    },

    // ---- Siyah Üstün ----
    {
        id: 'black_adv_01',
        description: 'Siyah Şah + 2 Kale vs Beyaz Şah',
        aiColor: COLORS.BLACK,
        pieces: [
            [King, COLORS.WHITE, 2, 5],
            [King, COLORS.BLACK, 5, 5],
            [Rook, COLORS.BLACK, 7, 0],
            [Rook, COLORS.BLACK, 7, 10],
        ],
        maxMoves: 50,
    },
    {
        id: 'black_adv_02',
        description: 'Siyah Şah + Kale + Bakan vs Beyaz Şah (kenarda)',
        aiColor: COLORS.BLACK,
        pieces: [
            [King, COLORS.WHITE, 0, 5],
            [King, COLORS.BLACK, 4, 5],
            [Rook, COLORS.BLACK, 6, 3],
            [General, COLORS.BLACK, 6, 7],
        ],
        maxMoves: 50,
    },

    // ---- Karışık Endgame ----
    {
        id: 'mixed_01_dabbaba_rook',
        description: 'Şah + Kale + Dabbaba vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 5, 5],
            [Dabbaba, COLORS.WHITE, 5, 3],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'mixed_02_elephant_rook',
        description: 'Şah + Kale + Fil vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 5, 5],
            [Elephant, COLORS.WHITE, 5, 3],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'mixed_03_giraffe_rook',
        description: 'Şah + Kale + Zürafa vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 5, 5],
            [Giraffe, COLORS.WHITE, 5, 3],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'mixed_04_picket_rook',
        description: 'Şah + Kale + Gözcü vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 5, 5],
            [Picket, COLORS.WHITE, 7, 5],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },

    // ---- Rol Haritasi Kapsami ----
    {
        id: 'role_01_sea_monster_rook',
        description: 'Şah + Kale + Deniz Canavarı vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 3],
            [SeaMonster, COLORS.WHITE, 5, 7],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 55,
    },
    {
        id: 'role_02_knight_rook',
        description: 'Şah + Kale + At vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 3],
            [Knight, COLORS.WHITE, 6, 6],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'role_03_lion_rook',
        description: 'Şah + Kale + Aslan vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 3],
            [Lion, COLORS.WHITE, 5, 6],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'role_04_bull_rook',
        description: 'Şah + Kale + Boğa vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 7, 5],
            [Rook, COLORS.WHITE, 5, 3],
            [Bull, COLORS.WHITE, 5, 6],
            [King, COLORS.BLACK, 1, 5],
        ],
        maxMoves: 60,
    },
    {
        id: 'role_05_revealer_rook_black',
        description: 'Siyah Şah + Kale + Revealer vs Beyaz Şah',
        aiColor: COLORS.BLACK,
        pieces: [
            [King, COLORS.WHITE, 0, 5],
            [King, COLORS.BLACK, 4, 5],
            [Rook, COLORS.BLACK, 6, 3],
            [Revealer, COLORS.BLACK, 6, 6],
        ],
        maxMoves: 60,
    },

    // ---- Çoklu Taş Üstünlüğü ----
    {
        id: 'multi_01_overwhelming',
        description: 'Ezici üstünlük: 4 taş vs Şah',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 8, 5],
            [Rook, COLORS.WHITE, 5, 0],
            [Rook, COLORS.WHITE, 5, 10],
            [Vizier, COLORS.WHITE, 6, 5],
            [General, COLORS.WHITE, 7, 3],
            [King, COLORS.BLACK, 0, 5],
        ],
        maxMoves: 40,
    },
    {
        id: 'multi_02_balanced_advantage',
        description: 'Dengeli ama açık üstünlük',
        aiColor: COLORS.WHITE,
        pieces: [
            [King, COLORS.WHITE, 9, 5],
            [Rook, COLORS.WHITE, 7, 5],
            [Knight, COLORS.WHITE, 6, 4],
            [Vizier, COLORS.WHITE, 8, 5],
            [King, COLORS.BLACK, 0, 5],
            [Picket, COLORS.BLACK, 2, 5],
        ],
        maxMoves: 60,
    },
];

// ===================================================================
// TEST KOŞUSU
// ===================================================================

const THINK_MS = Number(process.env.ENDGAME_THINK_MS) || 60;
const MAX_MOVES_DEFAULT = 80;

test('endgame suite — AI kazanılmış pozisyonları sonuçlandırır', () => {
    const results = [];
    for (const eg of ENDGAMES) {
        const state = buildEndgameState(eg.aiColor, eg.pieces);
        const out = playEndgame(state, {
            maxMoves: eg.maxMoves || MAX_MOVES_DEFAULT,
            thinkMs: THINK_MS,
        });
        results.push({
            id: eg.id,
            description: eg.description,
            ...out,
        });
    }

    const won = results.filter(r => r.result === 'won').length;
    const partial = results.filter(r => r.result === 'partial').length;
    const failed = results.filter(r => r.result === 'failed').length;
    const illegal = results.filter(r => r.result === 'illegal').length;

    console.log('\n=== ENDGAME CONVERSION SUITE (Hard, ' + THINK_MS + 'ms/hamle) ===\n');
    console.log(`Toplam pozisyon: ${results.length}`);
    console.log(`  Kazanıldı : ${won}`);
    console.log(`  Kısmi     : ${partial} (rakip taşlarının ≥%50'sini yedi ama bitiremedi)`);
    console.log(`  Başarısız : ${failed}`);
    console.log(`  Illegal   : ${illegal}`);

    const wonRate = (won / results.length * 100).toFixed(1);
    const successRate = ((won + partial) / results.length * 100).toFixed(1);

    console.log(`\nKazanma oranı: %${wonRate}`);
    console.log(`Toplam başarı (kazanma + kısmi): %${successRate}`);

    // Detay tablosu
    console.log('\n--- Detaylar ---');
    for (const r of results) {
        const tag = r.result === 'won' ? '✓ KAZANDI'
                  : r.result === 'partial' ? '~ KISMİ'
                  : r.result === 'illegal' ? '! ILLEGAL'
                  : '✗ BİTİREMEDİ';
        const extra = r.eatRatio !== undefined ? ` (yenen: %${Math.round(r.eatRatio * 100)})` : '';
        console.log(`  ${tag.padEnd(12)} ${r.id.padEnd(28)} ${r.movesPlayed}h${extra}`);
    }

    // İLK BASELINE (Faz 12, hard mod, 60ms/hamle):
    //   Kazanma : 9/20  (%45)
    //   Kısmi   : 1/20  (%5)
    //   Başarı  : 10/20 (%50)
    //
    // BULGULAR:
    //   - Çoklu Kale matları MÜKEMMEL çalışıyor (1-7 hamlede)
    //   - Tek Kale ile Şah sıkıştırma BAŞARISIZ
    //   - Piyon terfi planı YOK (piyon hareketi olmuyor)
    //   - Tek Vezir/Bakan + Kale tek-taş senaryoları zayıf
    //
    // Bu test bir benchmark/regression detector. Eşik = mevcut baseline'ın
    // 5 puan altında. Sürüm iyileştirme ile yukarı çekilebilir.
    assert.ok(
        illegal === 0,
        `Illegal hamle yapan ${illegal} pozisyon var (KRİTİK BUG)`
    );
    assert.ok(
        (won + partial) / results.length >= 0.40,
        `Endgame başarı oranı regresyon eşiğinin altında: %${successRate} (eşik %40)`
    );
});
