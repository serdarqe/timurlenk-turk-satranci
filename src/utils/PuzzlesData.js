import { PIECE_TYPES, COLORS } from './constants.js';
import { i18n } from './i18n.js';

export const PUZZLES = [
    {
        id: "mate_in_1_basic",
        title: {
            tr: "Temel Mat (1 Hamlede)",
            en: "Basic Mate (Mate in 1)"
        },
        description: {
            tr: "Siyah Şah'ı tek hamlede mat edin.",
            en: "Checkmate the Black King in one move."
        },
        turn: COLORS.WHITE,
        objective: "MATE_IN_1",
        pieces: [
            [PIECE_TYPES.KING, COLORS.BLACK, 0, 5],
            [PIECE_TYPES.KING, COLORS.WHITE, 2, 5],
            [PIECE_TYPES.ROOK, COLORS.WHITE, 1, 0]
        ]
    },
    {
        id: "mate_in_1_timur",
        title: {
            tr: "Timurlenk Matı (1 Hamlede)",
            en: "Tamerlane Mate (Mate in 1)"
        },
        description: {
            tr: "Bakan (Vizier) ve Kale kullanarak siyah şahı mat edin.",
            en: "Deliver checkmate using the Vizier and Rook."
        },
        turn: COLORS.WHITE,
        objective: "MATE_IN_1",
        pieces: [
            [PIECE_TYPES.KING, COLORS.BLACK, 4, 10],
            [PIECE_TYPES.KING, COLORS.WHITE, 6, 8],
            [PIECE_TYPES.ROOK, COLORS.WHITE, 5, 0],
            [PIECE_TYPES.VIZIER, COLORS.WHITE, 5, 9]
        ]
    },
    {
        id: "mate_in_1_elephant",
        title: {
            tr: "Fil'in Gücü (1 Hamlede)",
            en: "Power of the Elephant (Mate in 1)"
        },
        description: {
            tr: "Fil ve Vezir kullanarak matı bulun.",
            en: "Find the mate using the Elephant and General."
        },
        turn: COLORS.WHITE,
        objective: "MATE_IN_1",
        pieces: [
            [PIECE_TYPES.KING, COLORS.BLACK, 2, 2],
            [PIECE_TYPES.KING, COLORS.WHITE, 9, 5],
            [PIECE_TYPES.GENERAL, COLORS.WHITE, 3, 3],
            [PIECE_TYPES.ELEPHANT, COLORS.WHITE, 6, 0]
        ]
    }
];
