// src/tutorial/ScriptedMatch.js
// ─────────────────────────────────────────────────────────
// Predetermined move sequence for the "Oynayarak Öğren"
// (Play & Learn) guided match.
//
// Instead of using the full opening setup, the scripted match uses a sparse
// teaching position. This keeps the focus on the piece being taught and
// prevents “target square is already occupied” dead ends on mobile.
// ─────────────────────────────────────────────────────────

import { COLORS, PAWN_TYPES } from '../utils/constants.js';
import {
    Camel,
    Dabbaba,
    Elephant,
    General,
    King,
    Knight,
    Picket,
    Rook,
    TimurPawn,
    Vizier
} from '../game/PieceFactory.js';

function resetBoard(board) {
    board.grid = Array.from({ length: 10 }, () => Array(11).fill(null));
    board.citadelBlack = null;
    board.citadelWhite = null;
    board.pieces = [];
}

function place(board, piece) {
    board.setPiece(piece.row, piece.col, piece);
}

export function setupScriptedMatchBoard(board) {
    resetBoard(board);

    // White teaching pieces
    place(board, new King(COLORS.WHITE, 9, 5));
    place(board, new TimurPawn(COLORS.WHITE, 7, 0, PAWN_TYPES.PAWN_OF_PAWNS));
    place(board, new TimurPawn(COLORS.WHITE, 7, 9, PAWN_TYPES.PAWN_OF_KNIGHTS));
    place(board, new Picket(COLORS.WHITE, 8, 2));
    place(board, new General(COLORS.WHITE, 8, 4));
    place(board, new Vizier(COLORS.WHITE, 8, 6));
    place(board, new Dabbaba(COLORS.WHITE, 9, 8));
    place(board, new Knight(COLORS.WHITE, 8, 9));
    place(board, new Camel(COLORS.WHITE, 9, 9));
    place(board, new Rook(COLORS.WHITE, 8, 10));
    place(board, new Elephant(COLORS.WHITE, 9, 10));

    // Black response pieces and targets
    place(board, new Elephant(COLORS.BLACK, 0, 0));
    place(board, new Rook(COLORS.BLACK, 1, 0));
    place(board, new Knight(COLORS.BLACK, 1, 1));
    place(board, new General(COLORS.BLACK, 1, 3));
    place(board, new King(COLORS.BLACK, 1, 4));
    place(board, new Vizier(COLORS.BLACK, 1, 6));
    place(board, new TimurPawn(COLORS.BLACK, 2, 0, PAWN_TYPES.PAWN_OF_PAWNS));
    place(board, new TimurPawn(COLORS.BLACK, 2, 1, PAWN_TYPES.PAWN_OF_DABBABAS));
    place(board, new TimurPawn(COLORS.BLACK, 2, 10, PAWN_TYPES.PAWN_OF_ROOKS));
    place(board, new TimurPawn(COLORS.BLACK, 3, 9, PAWN_TYPES.PAWN_OF_KNIGHTS));
    place(board, new TimurPawn(COLORS.BLACK, 4, 9, PAWN_TYPES.PAWN_OF_PICKETS));
}

export const SCRIPTED_MATCH = [

    // ══════════════════════════════════════════════════════
    // PHASE 1 — TEMEL TAŞ HAREKETLERİ (Basic Piece Moves)
    // ══════════════════════════════════════════════════════

    // ── Step 1: Piyon Hareketi ─────────────────────────
    {
        id: 'step_1',
        phase: 'basics',
        teachingPiece: 'pawn',
        instruction: {
            tr: '♟ PİYON — İleri 1 kare yürür. Geri gidemez! Karşı tarafa ulaşırsa kendi taşına terfi eder.\n\nAt Piyonunu bir kare ileri taşıyın.',
            en: '♟ PAWN — Moves 1 square forward. Cannot go back! Promotes when reaching the far side.\n\nAdvance the Pawn of Knights one square forward.'
        },
        from: { row: 7, col: 9 },   // White Pawn of Knights
        to: { row: 6, col: 9 },
        hint: {
            tr: '💡 Sağ taraftaki piyonu (sütun 9) bir kare ileri taşıyın.',
            en: '💡 Move the right-side pawn (column 9) one square forward.'
        },
        aiMove: {
            from: { row: 2, col: 0 },  // Black Pawn of Pawns
            to: { row: 3, col: 0 }
        }
    },

    // ── Step 2: At Hareketi ────────────────────────────
    {
        id: 'step_2',
        phase: 'basics',
        teachingPiece: 'knight',
        instruction: {
            tr: '♞ AT — 2+1 kare L şeklinde zıplar. Aradaki taşları atlayabilir!\n\nAtınızı geliştirin: L şeklinde zıplayarak sahaya çıkın.',
            en: '♞ KNIGHT — Jumps in an L-shape (2+1). Can leap over other pieces!\n\nDevelop your Knight: jump it into the field.'
        },
        from: { row: 8, col: 9 },   // White Knight (right)
        to: { row: 6, col: 8 },
        hint: {
            tr: '💡 Sağ Atı (8,9) seçip (6,8) karesine L şeklinde atlayın.',
            en: '💡 Select the right Knight (8,9) and jump to (6,8) in an L-shape.'
        },
        aiMove: {
            from: { row: 2, col: 10 },  // Black Pawn of Rooks
            to: { row: 3, col: 10 }
        }
    },

    // ── Step 3: Deve Hareketi ──────────────────────────
    {
        id: 'step_3',
        phase: 'basics',
        teachingPiece: 'camel',
        instruction: {
            tr: '🐪 DEVE — 3+1 kare uzun L şeklinde zıplar. At\'tan daha uzun menzile sahiptir!\n\nDevenizi sahaya sürerek uzun menzilli kontrolü hissedin.',
            en: '🐪 CAMEL — Jumps in a long L-shape (3+1). Longer range than the Knight!\n\nBring your Camel into play to feel the long-range control.'
        },
        from: { row: 9, col: 9 },   // White Camel (right)
        to: { row: 6, col: 10 },
        hint: {
            tr: '💡 Deve (9,9) 3+1 kare atlayarak (6,10) a gidin.',
            en: '💡 Camel (9,9) leaps 3+1 squares to (6,10).'
        },
        aiMove: {
            from: { row: 1, col: 1 },  // Black Knight (left)
            to: { row: 3, col: 2 }
        }
    },

    // ── Step 4: Fil Hareketi ───────────────────────────
    {
        id: 'step_4',
        phase: 'basics',
        teachingPiece: 'elephant',
        instruction: {
            tr: '🐘 FİL — Tam 2 kare çapraz zıplar. Aradaki taşı atlayabilir!\n\nModern satrançtaki filden çok farklıdır. Fili sahaya getirin.',
            en: '🐘 ELEPHANT — Jumps exactly 2 squares diagonally. Can leap over pieces!\n\nVery different from the modern chess bishop. Bring the Elephant into play.'
        },
        from: { row: 9, col: 10 },  // White Elephant (right)
        to: { row: 7, col: 8 },
        hint: {
            tr: '💡 Fil (9,10) 2 kare çapraz zıplayarak (7,8) e gidin.',
            en: '💡 Elephant (9,10) leaps 2 squares diagonally to (7,8).'
        },
        aiMove: {
            from: { row: 2, col: 1 },  // Black Pawn of Dabbabas
            to: { row: 3, col: 1 }
        }
    },

    // ── Step 5: Dabbaba Hareketi ───────────────────────
    {
        id: 'step_5',
        phase: 'basics',
        teachingPiece: 'dabbaba',
        instruction: {
            tr: '🏰 DABBABA — Tam 2 kare yatay veya dikey zıplar. Filin düz versiyonudur.\n\nDabbaba\'yı hareket ettirerek hem öğrenin hem Kale\'nin önünü açın.',
            en: '🏰 DABBABA — Jumps exactly 2 squares orthogonally. The straight version of the Elephant.\n\nMove the Dabbaba to learn it and also clear the Rook\'s path.'
        },
        from: { row: 9, col: 8 },   // White Dabbaba (right)
        to: { row: 9, col: 6 },
        hint: {
            tr: '💡 Dabbaba (9,8) 2 kare sola atlayarak (9,6) ya gidin.',
            en: '💡 Dabbaba (9,8) jumps 2 squares left to (9,6).'
        },
        aiMove: {
            from: { row: 0, col: 0 },  // Black Elephant (left)
            to: { row: 2, col: 2 }
        }
    },

    // ── Step 6: Kale Hareketi ──────────────────────────
    {
        id: 'step_6',
        phase: 'basics',
        teachingPiece: 'rook',
        instruction: {
            tr: '♜ KALE — Yatay ve dikey sınırsız gider. En güçlü taşlardan biri!\n\nDabbaba\'nın açtığı yoldan Kale\'yi aktif hale getirin.',
            en: '♜ ROOK — Moves unlimited horizontally and vertically. One of the strongest pieces!\n\nActivate the Rook through the path cleared by the Dabbaba.'
        },
        from: { row: 8, col: 10 },  // White Rook (right)
        to: { row: 8, col: 8 },
        hint: {
            tr: '💡 Kale (8,10) düz sola giderek (8,8) e taşıyın.',
            en: '💡 Move the Rook (8,10) straight left to (8,8).'
        },
        aiMove: {
            from: { row: 1, col: 0 },  // Black Rook (left)
            to: { row: 1, col: 1 }
        }
    },

    // ══════════════════════════════════════════════════════
    // PHASE 2 — ÖZEL TAŞLAR (Special Pieces)
    // ══════════════════════════════════════════════════════

    // ── Step 7: Gözcü (Picket) Hareketi ──────────────
    {
        id: 'step_7',
        phase: 'special',
        teachingPiece: 'picket',
        instruction: {
            tr: '👁 GÖZCÜ — Çapraz sınırsız gider ama en az 2 kare gitmelidir. 1 kare çapraz gidemez!\n\nGözcünüzü aktif hale getirin.',
            en: '👁 PICKET — Moves unlimited diagonally but MUST go at least 2 squares. Cannot move just 1 diagonal!\n\nActivate your Picket.'
        },
        from: { row: 8, col: 8 },   // White Picket (right) — already moved rook here, so let's use left picket
        // Actually the right picket is at (8,8) originally. The rook just moved there.
        // Let's use the left Picket at (8,2)
        from: { row: 8, col: 2 },
        to: { row: 6, col: 4 },
        hint: {
            tr: '💡 Sol Gözcüyü (8,2) seçip en az 2 kare çapraz (6,4) e taşıyın.',
            en: '💡 Select the left Picket (8,2) and move at least 2 squares diagonally to (6,4).'
        },
        aiMove: {
            from: { row: 1, col: 3 },  // Black General
            to: { row: 2, col: 4 }
        }
    },

    // ── Step 8: Bakan (General/Ferz) Hareketi ─────────
    {
        id: 'step_8',
        phase: 'special',
        teachingPiece: 'general',
        instruction: {
            tr: '⚔ BAKAN — Sadece çapraz 1 kare hareket eder. Vezir\'in çapraz karşılığıdır.\n\nBakan + Vezir birlikte Şah\'ın hareket alanını kaplar. Bakanı geliştirin.',
            en: '⚔ GENERAL — Moves only 1 square diagonally. The diagonal counterpart of the Vizier.\n\nGeneral + Vizier together cover the King\'s movement range. Develop the General.'
        },
        from: { row: 8, col: 4 },   // White General
        to: { row: 7, col: 3 },
        hint: {
            tr: '💡 Bakanı (8,4) bir kare çapraz sol-ileri (7,3) e taşıyın.',
            en: '💡 Move the General (8,4) one diagonal step forward-left to (7,3).'
        },
        aiMove: {
            from: { row: 1, col: 6 },  // Black Vizier
            to: { row: 2, col: 6 }
        }
    },

    // ── Step 9: Vezir Hareketi ─────────────────────────
    {
        id: 'step_9',
        phase: 'special',
        teachingPiece: 'vizier',
        instruction: {
            tr: '👑 VEZİR — Sadece yatay ve dikey 1 kare hareket eder. Modern satranç kraliçesinden çok daha zayıftır!\n\nVeziri güvenli bir konuma taşıyın.',
            en: '👑 VIZIER — Moves only 1 square orthogonally. Much weaker than the modern chess queen!\n\nMove the Vizier to a safe position.'
        },
        from: { row: 8, col: 6 },   // White Vizier (masculine)
        to: { row: 7, col: 6 },
        hint: {
            tr: '💡 Vezir (8,6) bir kare ileri (7,6) taşıyın.',
            en: '💡 Move the Vizier (8,6) one square forward to (7,6).'
        },
        aiMove: {
            from: { row: 3, col: 1 },  // Black pawn
            to: { row: 4, col: 1 }
        }
    },

    // ══════════════════════════════════════════════════════
    // PHASE 3 — TAKTİKSEL OYUN (Tactics & Captures)
    // ══════════════════════════════════════════════════════

    // ── Step 10: İlk Taş Yeme (At ile Piyon Alma) ────
    {
        id: 'step_10',
        phase: 'tactics',
        teachingPiece: 'knight',
        instruction: {
            tr: '⚡ TAŞ YEME — Taşınızı düşman taşın üzerine taşıyarak onu alırsınız. Yenilen taş oyundan çıkar.\n\nAtınız düşman piyonunu yiyebilir! Taş üstünlüğü kazanın.',
            en: '⚡ CAPTURING — You capture by moving your piece onto an enemy piece. The captured piece is removed.\n\nYour Knight can capture the enemy pawn! Gain material advantage.'
        },
        from: { row: 6, col: 8 },   // White Knight
        to: { row: 4, col: 9 },   // Capture black pawn that advanced
        isCapture: true,
        hint: {
            tr: '💡 At (6,8) ile düşman piyonu (4,9) yiyin. L şeklinde zıplayarak alabilirsiniz.',
            en: '💡 Capture the enemy pawn at (4,9) with your Knight (6,8). Jump in an L-shape.'
        },
        aiMove: {
            from: { row: 3, col: 2 },  // Black Knight
            to: { row: 5, col: 1 }
        }
    },

    // ── Step 11: Piyon ile Çapraz Yeme ────────────────
    {
        id: 'step_11',
        phase: 'tactics',
        teachingPiece: 'pawn',
        instruction: {
            tr: '♟ PİYON YER — Piyon düz ilerler ama taş yerken ÇAPRAZ 1 kare yer.\n\nPiyonunuzla düşman piyonunu çapraz yiyin!',
            en: '♟ PAWN CAPTURES — Pawns move straight forward but capture DIAGONALLY 1 square.\n\nCapture the enemy pawn diagonally with your pawn!'
        },
        from: { row: 7, col: 0 },   // White Pawn of Pawns
        to: { row: 6, col: 0 },   // Advance first (no capture available; let's adjust)
        // Actually, let's have player pawn advance to set up next capture
        hint: {
            tr: '💡 Sol piyonu (7,0) bir kare ileri (6,0) taşıyın.',
            en: '💡 Advance the left pawn (7,0) one square forward to (6,0).'
        },
        aiMove: {
            from: { row: 1, col: 1 },  // Black rook lane helper
            to: { row: 1, col: 2 }
        }
    },

    // ── Step 12: Kale ile Uzun Mesafe Hareketi ────────
    {
        id: 'step_12',
        phase: 'tactics',
        teachingPiece: 'rook',
        instruction: {
            tr: '♜ KALE KONTROLÜ — Kale açık yatay ve dikey hatlarda hızla baskı kurar.\n\nKalenizi merkeze kaydırarak saldırı hattını hazırlayın!',
            en: '♜ ROOK CONTROL — The Rook creates pressure quickly on open ranks and files.\n\nSlide your Rook toward the center to prepare the attack!'
        },
        from: { row: 8, col: 8 },   // White Rook (moved here in step 6)
        to: { row: 8, col: 5 },
        hint: {
            tr: '💡 Kale (8,8) düz sola giderek merkeze, (8,5) e taşıyın.',
            en: '💡 Move the Rook (8,8) straight left toward the center, to (8,5).'
        },
        aiMove: {
            from: { row: 2, col: 2 },  // Black Elephant
            to: { row: 4, col: 4 }
        }
    },

    // ── Step 13: Deve ile Capture ─────────────────────
    {
        id: 'step_13',
        phase: 'tactics',
        teachingPiece: 'camel',
        instruction: {
            tr: '🐪 DEVE SALDIRISI — Deve uzun L zıplaması ile beklenmedik yerlerden saldırabilir.\n\nDeveniz ile ilerideki düşman piyonunu yakalayın!',
            en: '🐪 CAMEL ATTACK — The Camel can attack from unexpected positions with its long L-jump.\n\nCapture the advanced enemy pawn with your Camel!'
        },
        from: { row: 6, col: 10 },  // White Camel
        to: { row: 3, col: 9 },
        hint: {
            tr: '💡 Deve (6,10) 3+1 atlayarak (3,9) daki düşman piyonunu alın.',
            en: '💡 Camel (6,10) leaps 3+1 to capture the enemy pawn at (3,9).'
        },
        aiMove: {
            from: { row: 2, col: 6 },  // Black Vizier
            to: { row: 3, col: 6 }
        }
    },

    // ══════════════════════════════════════════════════════
    // PHASE 4 — ŞAH VE MAT (Check & Checkmate)
    // ══════════════════════════════════════════════════════

    // ── Step 14: Kale ile Şah Çekme ──────────────────
    {
        id: 'step_14',
        phase: 'endgame',
        teachingPiece: 'rook',
        instruction: {
            tr: '👑 ŞAH! — Rakip Şah\'a saldırmak = Şah çekmek. Şah, tehditten kurtulmak zorundadır.\n\nKale ile düşman Şah\'a ŞAH çekin!',
            en: '👑 CHECK! — Attacking the enemy King = Check. The King MUST escape the threat.\n\nCheck the enemy King with your Rook!'
        },
        from: { row: 8, col: 5 },   // White Rook
        to: { row: 1, col: 5 },
        hint: {
            tr: '💡 Kale (8,5) ile açık dikey hattı kullanıp (1,5) e gidin ve Şah çekin!',
            en: '💡 Use the open file and move the Rook from (8,5) to (1,5) to give check!'
        },
        aiMove: {
            from: { row: 1, col: 4 },  // Black King moves to escape
            to: { row: 0, col: 4 }
        }
    },

    // ── Step 15: Final — Mat Pozisyonu ────────────────
    {
        id: 'step_15',
        phase: 'endgame',
        teachingPiece: 'rook',
        instruction: {
            tr: '🏆 MAT! — Şah kaçamıyorsa, oyun biter. Bu oyunun nihai hedefidir.\n\nKale ile son hamleyi yapın ve düşmanı MAT edin!',
            en: '🏆 CHECKMATE! — If the King cannot escape, the game is over. This is the ultimate goal.\n\nMake the final move with the Rook and CHECKMATE the enemy!'
        },
        from: { row: 1, col: 5 },   // White Rook
        to: { row: 0, col: 5 },
        hint: {
            tr: '💡 Kale (1,5) ile son hatta çıkıp (0,5) karesine gelin ve mat ağını kapatın!',
            en: '💡 Bring the Rook from (1,5) to the back rank at (0,5) and close the mating net!'
        },
        // No AI move — game over, player wins!
        successMessage: {
            tr: '🎉 TEBRİKLER!\n\nTimurlenk Satrancının temel taşlarını ve taktiklerini öğrendiniz:\n\n♟ Piyon — ileri yürür, çapraz yer\n♞ At — 2+1 L zıplaması\n🐪 Deve — 3+1 uzun L zıplaması\n🐘 Fil — 2 çapraz zıplama\n🏰 Dabbaba — 2 düz zıplama\n♜ Kale — sınırsız düz hareket\n👁 Gözcü — en az 2 çapraz\n⚔ Bakan — 1 çapraz\n👑 Vezir — 1 düz\n\nArtık gerçek bir savaşa hazırsınız!',
            en: '🎉 CONGRATULATIONS!\n\nYou have learned the basic pieces and tactics of Timur Chess:\n\n♟ Pawn — moves forward, captures diagonally\n♞ Knight — 2+1 L-jump\n🐪 Camel — 3+1 long L-jump\n🐘 Elephant — 2 diagonal leap\n🏰 Dabbaba — 2 orthogonal leap\n♜ Rook — unlimited straight\n👁 Picket — min 2 diagonal\n⚔ General — 1 diagonal\n👑 Vizier — 1 orthogonal\n\nNow you are ready for real battle!'
        }
    }
];

// Phase descriptions shown as section headers during playback
export const PHASE_INFO = {
    basics: {
        tr: 'BÖLÜM 1: Temel Taş Hareketleri',
        en: 'CHAPTER 1: Basic Piece Movements'
    },
    special: {
        tr: 'BÖLÜM 2: Özel Taşlar',
        en: 'CHAPTER 2: Special Pieces'
    },
    tactics: {
        tr: 'BÖLÜM 3: Taktiksel Oyun',
        en: 'CHAPTER 3: Tactical Play'
    },
    endgame: {
        tr: 'BÖLÜM 4: Şah ve Mat',
        en: 'CHAPTER 4: Check & Checkmate'
    }
};
