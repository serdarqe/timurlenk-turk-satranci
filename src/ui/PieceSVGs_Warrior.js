// src/ui/PieceSVGs_Warrior.js
// Savaşçı Skin — Köşeli, geometrik, askeri tarz
// Tüm taşlar CSS değişkenleri kullanır: --p1 (gövde), --p2 (aksesuar), --p3 (çerçeve)

export const PIECE_SVGS_WARRIOR = {

    KING: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="33,85 36,65 64,65 67,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="30,65 28,36 38,46 44,30 50,42 56,30 62,46 72,36 70,65" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <rect x="47" y="8" width="6" height="20" rx="1" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <rect x="41" y="13" width="18" height="6" rx="1" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <rect x="32" y="59" width="36" height="5" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    PRINCE: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="36,85 38,62 62,62 64,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="32,62 30,38 43,48 50,32 57,48 70,38 68,62" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <circle cx="50" cy="24" r="7" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <rect x="34" y="56" width="32" height="5" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    ADVENTITIOUS_KING: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="33,85 36,65 64,65 67,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="30,65 28,36 38,46 44,30 50,42 56,30 62,46 72,36 70,65" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <polygon points="50,6 58,20 50,34 42,20" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
        <rect x="32" y="59" width="36" height="5" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    VIZIER: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="34,85 37,55 40,42 50,12 60,42 63,55 66,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <polygon points="43,52 50,24 57,52" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <rect x="36" y="62" width="28" height="5" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
        <circle cx="50" cy="10" r="3" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
    </svg>`,

    GENERAL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="28,85 30,62 28,55 72,55 70,62 72,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="34,55 36,42 50,34 64,42 66,55" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <polygon points="46,34 50,10 54,34" fill="var(--p2)" stroke="var(--p3)" stroke-width="2"/>
        <line x1="28" y1="55" x2="72" y2="55" stroke="var(--p2)" stroke-width="2"/>
    </svg>`,

    KNIGHT: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <path d="M38,85 L36,62 L32,50 L28,40 L32,30 L38,20 L44,14 L48,18 L54,12 L58,20 L62,32 L64,44 L66,56 L68,62 L66,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <circle cx="42" cy="28" r="3.5" fill="var(--p2)"/>
        <polygon points="28,40 22,34 30,34" fill="var(--p2)" stroke="var(--p3)" stroke-width="1.5"/>
    </svg>`,

    ELEPHANT: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="85" width="56" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="26,85 28,55 24,45 28,38 34,28 42,22 50,20 58,22 66,28 72,38 76,45 72,55 74,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <line x1="38" y1="30" x2="30" y2="14" stroke="var(--p2)" stroke-width="4" stroke-linecap="square"/>
        <line x1="62" y1="30" x2="70" y2="14" stroke="var(--p2)" stroke-width="4" stroke-linecap="square"/>
        <circle cx="44" cy="38" r="3" fill="var(--p2)"/>
        <circle cx="56" cy="38" r="3" fill="var(--p2)"/>
    </svg>`,

    CAMEL: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="85" width="44" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <path d="M36,85 L38,62 L36,50 L40,36 L46,24 L50,16 L54,20 L58,30 L62,42 L64,55 L66,62 L64,85 Z" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <circle cx="50" cy="12" r="5" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <circle cx="48" cy="11" r="1.5" fill="var(--p2)"/>
        <polygon points="44,20 50,16 46,26" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    DABBABA: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="85" width="50" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="30" y="32" width="40" height="53" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5"/>
        <rect x="30" y="18" width="10" height="16" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="45" y="18" width="10" height="16" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="60" y="18" width="10" height="16" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <line x1="30" y1="50" x2="70" y2="50" stroke="var(--p2)" stroke-width="2.5"/>
        <line x1="30" y1="68" x2="70" y2="68" stroke="var(--p2)" stroke-width="2.5"/>
    </svg>`,

    GIRAFFE: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="40,85 42,58 44,38 47,22 53,22 56,38 58,58 60,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <circle cx="50" cy="14" r="7" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <circle cx="48" cy="13" r="2" fill="var(--p2)"/>
        <polygon points="44,28 46,34 48,28" fill="var(--p2)"/>
        <polygon points="52,34 54,40 56,34" fill="var(--p2)"/>
        <polygon points="48,42 50,48 52,42" fill="var(--p2)"/>
    </svg>`,

    PICKET: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="44,85 44,52 36,34 50,8 64,34 56,52 56,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <line x1="50" y1="85" x2="50" y2="14" stroke="var(--p2)" stroke-width="2.5"/>
        <polygon points="50,8 42,28 58,28" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    ROOK: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="22" y="85" width="56" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="28,85 30,44 70,44 72,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <rect x="26" y="22" width="12" height="24" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="44" y="22" width="12" height="24" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="62" y="22" width="12" height="24" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <rect x="42" y="56" width="16" height="10" fill="var(--p2)" stroke="var(--p3)" stroke-width="1"/>
    </svg>`,

    PAWN: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="85" width="40" height="9" rx="1" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
        <polygon points="38,85 40,65 38,55 42,44 46,36 50,32 54,36 58,44 62,55 60,65 62,85" fill="var(--p1)" stroke="var(--p3)" stroke-width="2.5" stroke-linejoin="miter"/>
        <circle cx="50" cy="24" r="7" fill="var(--p1)" stroke="var(--p3)" stroke-width="2"/>
    </svg>`
};
