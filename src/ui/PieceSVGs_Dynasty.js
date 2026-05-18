// src/ui/PieceSVGs_Dynasty.js
// Hanedan Skin — Zarif, yuvarlak, Osmanlı saray estetiği
// Tüm taşlar CSS değişkenleri kullanır: --p1 (gövde), --p2 (aksesuar), --p3 (çerçeve)

export const PIECE_SVGS_DYNASTY = {

    KING: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M33,85 Q34,75 36,65 L64,65 Q66,75 67,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M30,65 Q29,50 32,40 Q36,32 42,28 Q46,38 50,42 Q54,38 58,28 Q64,32 68,40 Q71,50 70,65 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M42,28 Q44,20 50,16 Q56,20 58,28" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M46,16 Q50,6 54,16" fill="none" stroke="var(--p2)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="50" cy="6" r="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <ellipse cx="50" cy="58" rx="16" ry="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
    </svg>`,

    PRINCE: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M36,85 Q37,75 39,65 L61,65 Q63,75 64,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M33,65 Q32,52 36,42 Q40,34 50,26 Q60,34 64,42 Q68,52 67,65 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M44,26 Q47,18 50,14 Q53,18 56,26" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <circle cx="50" cy="12" r="4" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <ellipse cx="50" cy="58" rx="14" ry="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
    </svg>`,

    ADVENTITIOUS_KING: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M33,85 Q34,75 36,65 L64,65 Q66,75 67,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M30,65 Q29,50 32,40 Q36,32 42,28 Q46,38 50,42 Q54,38 58,28 Q64,32 68,40 Q71,50 70,65 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M42,28 Q44,20 50,16 Q56,20 58,28" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <path d="M50,4 L53,12 L61,12 L55,17 L57,25 L50,20 L43,25 L45,17 L39,12 L47,12 Z" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <ellipse cx="50" cy="58" rx="16" ry="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
    </svg>`,

    VIZIER: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M34,85 Q36,70 38,58 Q40,45 44,35 Q48,22 50,14 Q52,22 56,35 Q60,45 62,58 Q64,70 66,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="10" r="4" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <ellipse cx="50" cy="50" rx="10" ry="2.5" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
        <ellipse cx="50" cy="64" rx="12" ry="2.5" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
    </svg>`,

    GENERAL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M28,85 Q29,72 30,62 Q30,58 28,55 L72,55 Q70,58 70,62 Q71,72 72,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M32,55 Q34,45 38,40 Q44,35 50,32 Q56,35 62,40 Q66,45 68,55 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M46,32 Q48,22 50,12 Q52,22 54,32" fill="var(--p2)" stroke="var(--p3)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="50" cy="10" r="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <path d="M28,55 Q50,50 72,55" fill="none" stroke="var(--p2)" stroke-width="1.5"/>
    </svg>`,

    KNIGHT: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M38,85 Q36,72 34,62 Q32,54 28,46 Q26,38 30,30 Q34,22 40,16 Q44,12 48,14 Q52,10 56,14 Q60,18 62,26 Q64,34 66,46 Q68,56 68,64 Q68,74 66,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="40" cy="26" r="3" fill="var(--p2)"/>
        <path d="M28,46 Q24,40 26,34" fill="none" stroke="var(--p2)" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M42,16 Q40,10 42,6" fill="none" stroke="var(--p2)" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    ELEPHANT: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="85" width="56" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M26,85 Q27,68 28,55 Q24,48 26,40 Q30,30 38,24 Q44,20 50,18 Q56,20 62,24 Q70,30 74,40 Q76,48 72,55 Q73,68 74,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M38,28 Q34,18 30,12" fill="none" stroke="var(--p2)" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M62,28 Q66,18 70,12" fill="none" stroke="var(--p2)" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="42" cy="36" r="3" fill="var(--p2)"/>
        <circle cx="58" cy="36" r="3" fill="var(--p2)"/>
    </svg>`,

    CAMEL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M36,85 Q37,72 38,62 Q36,54 38,44 Q40,34 44,26 Q48,18 50,14 Q52,18 56,26 Q60,34 62,44 Q64,54 62,62 Q63,72 64,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="10" r="5" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <circle cx="48" cy="9" r="1.5" fill="var(--p2)"/>
        <path d="M44,18 Q46,22 48,26" fill="none" stroke="var(--p2)" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,

    DABBABA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M30,85 Q30,60 30,40 Q30,34 34,30 L66,30 Q70,34 70,40 Q70,60 70,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M34,30 Q38,20 42,18 Q46,16 50,14 Q54,16 58,18 Q62,20 66,30" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <circle cx="50" cy="12" r="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <ellipse cx="50" cy="50" rx="14" ry="2.5" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
        <ellipse cx="50" cy="68" rx="14" ry="2.5" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
        <path d="M40,38 Q50,34 60,38" fill="none" stroke="var(--p2)" stroke-width="1.5"/>
    </svg>`,

    GIRAFFE: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M40,85 Q41,70 42,58 Q43,48 44,38 Q46,28 48,22 L52,22 Q54,28 56,38 Q57,48 58,58 Q59,70 60,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="14" r="7" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <circle cx="48" cy="13" r="2" fill="var(--p2)"/>
        <circle cx="46" cy="32" r="2" fill="var(--p2)"/>
        <circle cx="54" cy="40" r="2" fill="var(--p2)"/>
        <circle cx="48" cy="50" r="2" fill="var(--p2)"/>
        <circle cx="53" cy="58" r="2" fill="var(--p2)"/>
    </svg>`,

    PICKET: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M44,85 Q44,68 44,52 Q42,42 38,34 Q44,20 50,8 Q56,20 62,34 Q58,42 56,52 Q56,68 56,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <line x1="50" y1="85" x2="50" y2="14" stroke="var(--p2)" stroke-width="2"/>
        <path d="M50,8 Q44,22 40,30 Q50,26 60,30 Q56,22 50,8 Z" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    ROOK: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="85" width="56" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M28,85 Q29,65 30,46 L70,46 Q71,65 72,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <path d="M28,46 Q28,38 30,32 Q34,24 40,22 L40,18 Q44,14 50,14 Q56,14 60,18 L60,22 Q66,24 70,32 Q72,38 72,46 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <circle cx="50" cy="12" r="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <path d="M40,58 Q50,54 60,58" fill="none" stroke="var(--p2)" stroke-width="1.5"/>
        <ellipse cx="50" cy="70" rx="14" ry="2.5" fill="var(--p2)" stroke="var(--p3)" stroke-width="0.8"/>
    </svg>`,

    PAWN: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="4" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <path d="M38,85 Q39,75 40,65 Q38,58 38,52 Q40,44 44,38 Q46,34 48,32 L52,32 Q54,34 56,38 Q60,44 62,52 Q62,58 60,65 Q61,75 62,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="50" cy="24" r="7" fill="var(--p1)" stroke="var(--p3)" stroke-width="1.5"/>
        <circle cx="50" cy="22" r="2" fill="var(--p2)"/>
    </svg>`
};
