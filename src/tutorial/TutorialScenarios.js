// src/tutorial/TutorialScenarios.js
// 12 interactive scenarios that teach the game step by step

export const SCENARIOS = [
    // === SCENARIO 1: King Movement ===
    {
        id: 'king_move',
        title: 'Şah\'ın Hareketi',
        description: 'Şah oyunun en önemli taşıdır. Her yöne <strong>1 kare</strong> hareket edebilir: yatay, dikey ve çapraz.',
        instruction: '👆 Şah\'ı yeşil işaretli karelerden birine taşıyın.',
        boardSize: 5,
        pieces: [
            { type: 'king', color: 'white', row: 2, col: 2 }
        ],
        selectPiece: { row: 2, col: 2 },
        validTargets: [
            { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
            { row: 2, col: 1 }, { row: 2, col: 3 },
            { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 }
        ],
        successMessage: '✅ Harika! Şah her yöne 1 kare gidebilir. Şah mat edilirse oyun kaybedilir!',
        hintMessage: '💡 Şah\'ı seçip yeşil karelerden birine tıklayın.'
    },

    // === SCENARIO 2: Vizier Movement ===
    {
        id: 'vizier_move',
        title: 'Vezir\'in Hareketi',
        description: 'Vezir sadece <strong>yatay ve dikey</strong> yönlerde 1 kare hareket eder. Modern satranç kraliçesinden çok daha zayıftır!',
        instruction: '👆 Vezir\'i yeşil işaretli karelerden birine taşıyın.',
        boardSize: 5,
        pieces: [
            { type: 'vizier', color: 'white', row: 2, col: 2 }
        ],
        selectPiece: { row: 2, col: 2 },
        validTargets: [
            { row: 1, col: 2 }, { row: 2, col: 1 },
            { row: 2, col: 3 }, { row: 3, col: 2 }
        ],
        successMessage: '✅ Doğru! Vezir sadece düz gider (yukarı, aşağı, sola, sağa). Çapraz gidemez!',
        hintMessage: '💡 Vezir çapraz gidemez, sadece yatay/dikey 1 kare.'
    },

    // === SCENARIO 3: General Movement ===
    {
        id: 'general_move',
        title: 'Bakan\'ın Hareketi',
        description: 'Bakan (General) sadece <strong>çapraz</strong> yönlerde 1 kare hareket eder. Vezir\'in çapraz karşılığıdır.',
        instruction: '👆 Bakan\'ı yeşil işaretli karelerden birine taşıyın.',
        boardSize: 5,
        pieces: [
            { type: 'general', color: 'white', row: 2, col: 2 }
        ],
        selectPiece: { row: 2, col: 2 },
        validTargets: [
            { row: 1, col: 1 }, { row: 1, col: 3 },
            { row: 3, col: 1 }, { row: 3, col: 3 }
        ],
        successMessage: '✅ Mükemmel! Bakan sadece çapraz gider. Vezir + Bakan birlikte Şah gibi hareket alanı kaplar.',
        hintMessage: '💡 Bakan sadece çapraz 1 kare gidebilir.'
    },

    // === SCENARIO 4: Knight L-jump ===
    {
        id: 'knight_move',
        title: 'At\'ın Hareketi',
        description: 'At <strong>L şeklinde</strong> hareket eder: 2 kare bir yöne, 1 kare dik yöne. Aradaki taşları <strong>zıplayabilir</strong>!',
        instruction: '👆 At\'ı L şeklinde yeşil karelerden birine atlayın.',
        boardSize: 7,
        pieces: [
            { type: 'knight', color: 'white', row: 3, col: 3 },
            { type: 'pawn', color: 'black', row: 2, col: 3 },
            { type: 'pawn', color: 'black', row: 3, col: 4 }
        ],
        selectPiece: { row: 3, col: 3 },
        validTargets: [
            { row: 1, col: 2 }, { row: 1, col: 4 },
            { row: 2, col: 1 }, { row: 2, col: 5 },
            { row: 4, col: 1 }, { row: 4, col: 5 },
            { row: 5, col: 2 }, { row: 5, col: 4 }
        ],
        successMessage: '✅ Harika! At L şeklinde zıplar ve aradaki taşları atlayabilir — tek zıplayan taşlardan biri!',
        hintMessage: '💡 At, 2+1 kare L şeklinde hareket eder ve üstten zıplar.'
    },

    // === SCENARIO 5: Camel Long L ===
    {
        id: 'camel_move',
        title: 'Deve\'nin Hareketi',
        description: 'Deve, At\'ın uzun versiyonudur: <strong>3+1 kare</strong> L şeklinde hareket eder ve zıplama yapabilir.',
        instruction: '👆 Deve\'yi uzun L hareketi ile yeşil karelerden birine taşıyın.',
        boardSize: 9,
        pieces: [
            { type: 'camel', color: 'white', row: 4, col: 4 }
        ],
        selectPiece: { row: 4, col: 4 },
        validTargets: [
            { row: 1, col: 3 }, { row: 1, col: 5 },
            { row: 3, col: 1 }, { row: 3, col: 7 },
            { row: 5, col: 1 }, { row: 5, col: 7 },
            { row: 7, col: 3 }, { row: 7, col: 5 }
        ],
        successMessage: '✅ Doğru! Deve 3+1 L hareketiyle At\'tan daha uzun menzile sahiptir.',
        hintMessage: '💡 Deve: 3 kare bir yöne + 1 kare dik yöne (veya tersi).'
    },

    // === SCENARIO 6: Elephant Diagonal Jump ===
    {
        id: 'elephant_move',
        title: 'Fil\'in Hareketi',
        description: 'Fil çapraz olarak tam <strong>2 kare</strong> hareket eder. Aradaki taşı <strong>zıplayabilir</strong>!',
        instruction: '👆 Fil\'i 2 kare çapraz atlayarak yeşil kareye taşıyın.',
        boardSize: 5,
        pieces: [
            { type: 'elephant', color: 'white', row: 2, col: 2 },
            { type: 'pawn', color: 'black', row: 1, col: 1 }
        ],
        selectPiece: { row: 2, col: 2 },
        validTargets: [
            { row: 0, col: 0 }, { row: 0, col: 4 },
            { row: 4, col: 0 }, { row: 4, col: 4 }
        ],
        successMessage: '✅ Mükemmel! Fil tam 2 kare çapraz gider ve aradaki taşları zıplar. Modern satrançtaki filden çok farklıdır!',
        hintMessage: '💡 Fil tam 2 kare çapraz gider, ne daha az ne daha fazla.'
    },

    // === SCENARIO 7: Dabbaba ===
    {
        id: 'dabbaba_move',
        title: 'Dabbaba\'nın Hareketi',
        description: 'Dabbaba yatay veya dikey yönde tam <strong>2 kare</strong> hareket eder. Fil\'in düz versiyonudur ve zıplama yapabilir.',
        instruction: '👆 Dabbaba\'yı 2 kare düz atlayarak yeşil kareye taşıyın.',
        boardSize: 5,
        pieces: [
            { type: 'dabbaba', color: 'white', row: 2, col: 2 },
            { type: 'pawn', color: 'black', row: 2, col: 3 }
        ],
        selectPiece: { row: 2, col: 2 },
        validTargets: [
            { row: 0, col: 2 }, { row: 2, col: 0 },
            { row: 2, col: 4 }, { row: 4, col: 2 }
        ],
        successMessage: '✅ Doğru! Dabbaba 2 kare düz gider ve zıplar. Fil ile birlikte "kuşatma birlikleri"ni oluşturur.',
        hintMessage: '💡 Dabbaba tam 2 kare yatay veya dikey gider.'
    },

    // === SCENARIO 8: Rook Unlimited ===
    {
        id: 'rook_move',
        title: 'Kale\'nin Hareketi',
        description: 'Kale yatay ve dikey yönlerde <strong>sınırsız mesafe</strong> gidebilir. En güçlü taşlardan biridir!',
        instruction: '👆 Kale\'yi yeşil karelerden birine taşıyın. Yolda engel olmamalı!',
        boardSize: 7,
        pieces: [
            { type: 'rook', color: 'white', row: 3, col: 0 },
            { type: 'pawn', color: 'white', row: 1, col: 0 }
        ],
        selectPiece: { row: 3, col: 0 },
        validTargets: [
            { row: 2, col: 0 },
            { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
            { row: 3, col: 4 }, { row: 3, col: 5 }, { row: 3, col: 6 },
            { row: 4, col: 0 }, { row: 5, col: 0 }, { row: 6, col: 0 }
        ],
        successMessage: '✅ Harika! Kale düz hatlarda sınırsız gider ama taşları zıplayamaz. Açık hatlardan kullanın!',
        hintMessage: '💡 Kale düz gider, çapraz gidemez. Yolda engel olamaz.'
    },

    // === SCENARIO 9: Capturing ===
    {
        id: 'capture_piece',
        title: 'Taş Yeme (Capture)',
        description: 'Bir taşınızı rakip taşın üzerine taşıyarak onu <strong>yersiniz</strong>. Yenilen taş oyundan çıkar.',
        instruction: '👆 At\'ı siyah piyonun üzerine taşıyarak onu yiyin!',
        boardSize: 5,
        pieces: [
            { type: 'knight', color: 'white', row: 3, col: 2 },
            { type: 'pawn', color: 'black', row: 1, col: 1 },
            { type: 'pawn', color: 'black', row: 1, col: 3 }
        ],
        selectPiece: { row: 3, col: 2 },
        validTargets: [
            { row: 1, col: 1 }, { row: 1, col: 3 }
        ],
        isCapture: true,
        successMessage: '✅ Tebrikler! Rakip taşı yediniz! Yenilen taş tahadan kalkar. Taşları yiyerek rakibi zayıflatın.',
        hintMessage: '💡 Siyah piyonlardan birinin üzerine At\'ı taşıyın.'
    },

    // === SCENARIO 10: Pawn Movement ===
    {
        id: 'pawn_move',
        title: 'Piyon Hareketi',
        description: 'Piyon ileri <strong>1 kare</strong> hareket eder. Çapraz 1 kare ile <strong>taş yer</strong>. Geri gidemez! Karşı sıraya ulaşınca <strong>terfi</strong> eder.',
        instruction: '👆 Beyaz piyonu 1 kare ileri taşıyın, veya siyah piyonu çapraz yiyerek alın.',
        boardSize: 5,
        pieces: [
            { type: 'pawn', color: 'white', row: 3, col: 2, pawnType: 'pawn_of_knights' },
            { type: 'pawn', color: 'black', row: 2, col: 3 }
        ],
        selectPiece: { row: 3, col: 2 },
        validTargets: [
            { row: 2, col: 2 },
            { row: 2, col: 3 }
        ],
        successMessage: '✅ Doğru! Piyon ileri gider, çapraz yer. Her piyon kendi taşına terfi eder (At Piyonu → At).',
        hintMessage: '💡 Piyon düz 1 kare ileri gider veya çapraz 1 kare ile taş yer.'
    },

    // === SCENARIO 11: Check and Checkmate ===
    {
        id: 'checkmate',
        title: 'Şah ve Mat',
        description: 'Rakip Şah\'a saldırı = <strong>Şah</strong>. Şah\'ın kaçacak yeri yoksa = <strong>Mat</strong> = Oyun Biter!',
        instruction: '👆 Kale\'yi hareket ettirerek siyah Şah\'a ŞAH ÇEKİN!',
        boardSize: 5,
        pieces: [
            { type: 'rook', color: 'white', row: 4, col: 0 },
            { type: 'king', color: 'black', row: 0, col: 3 },
            { type: 'rook', color: 'white', row: 2, col: 3 }
        ],
        selectPiece: { row: 4, col: 0 },
        validTargets: [
            { row: 0, col: 0 }
        ],
        successMessage: '✅ MAT! Siyah Şah\'ın kaçacak hiçbir yeri kalmadı. Oyunu kazandınız! Bu, oyundaki nihai hedeftir.',
        hintMessage: '💡 Kale\'yi en üst sıraya taşıyarak Şah\'a saldırın.'
    },

    // === SCENARIO 12: Special Pieces ===
    {
        id: 'special_pieces',
        title: 'Özel Taşlar & Kurallar',
        description: `
            <strong>Zürafa:</strong> 1 çapraz + en az 3 düz gider.<br>
            <strong>Gözcü:</strong> Çapraz sınırsız gider ama en az 2 kare gitmelidir.<br>
            <strong>Pat = Zafer:</strong> Rakibi hamle yapamaz bırakırsan kazanırsın!<br>
            <strong>Hisar:</strong> Şah rakip hisara girerse berabere!
        `,
        instruction: '👆 Gözcü\'yü en az 2 kare çapraz taşıyın.',
        boardSize: 7,
        pieces: [
            { type: 'picket', color: 'white', row: 5, col: 1 }
        ],
        selectPiece: { row: 5, col: 1 },
        validTargets: [
            { row: 3, col: 3 }, { row: 1, col: 5 },
            { row: 3, col: -1 }  // won't render, just filler
        ].filter(t => t.col >= 0),
        successMessage: '✅ Tebrikler! Tüm temel kuralları öğrendiniz! Artık gerçek bir oyuna başlayabilirsiniz. İyi eğlenceler!',
        hintMessage: '💡 Gözcü en az 2 kare çapraz gitmelidir. 1 kare çapraz gidemez!'
    }
];
