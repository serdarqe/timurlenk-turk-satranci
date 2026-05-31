import { PAWN_TYPES, PIECE_TYPES } from '../utils/constants.js';

export const TIMUR_PROMOTION_PARITY_CASES = Object.freeze([
    buildPromotionCase(PAWN_TYPES.PAWN_OF_VIZIERS, PIECE_TYPES.VIZIER, 'v'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_SEA_MONSTERS, PIECE_TYPES.SEA_MONSTER, 's'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_GENERALS, PIECE_TYPES.GENERAL, 'g'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_KNIGHTS, PIECE_TYPES.KNIGHT, 'n'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_LIONS, PIECE_TYPES.LION, 'l'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_ELEPHANTS, PIECE_TYPES.ELEPHANT, 'e'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_CAMELS, PIECE_TYPES.CAMEL, 'c'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_DABBABAS, PIECE_TYPES.DABBABA, 'd'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_BULLS, PIECE_TYPES.BULL, 'b'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_REVEALERS, PIECE_TYPES.REVEALER, 'h'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_GIRAFFES, PIECE_TYPES.GIRAFFE, 'z'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_PICKETS, PIECE_TYPES.PICKET, 't'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_ROOKS, PIECE_TYPES.ROOK, 'r'),
    buildPromotionCase(PAWN_TYPES.PAWN_OF_KINGS, PIECE_TYPES.PRINCE, 'q')
]);

export const PAWN_OF_PAWNS_CYCLE_PARITY = Object.freeze([
    {
        pawnType: PAWN_TYPES.PAWN_OF_PAWNS,
        stageBefore: null,
        kind: 'pawn_cycle',
        stageAfter: 2,
        whiteReturnRow: 7,
        blackReturnRow: 2
    },
    {
        pawnType: PAWN_TYPES.PAWN_OF_PAWNS,
        stageBefore: 2,
        kind: 'pawn_cycle',
        stageAfter: 3,
        whiteReturnRow: 7,
        blackReturnRow: 2
    },
    {
        pawnType: PAWN_TYPES.PAWN_OF_PAWNS,
        stageBefore: 3,
        kind: 'promotion',
        promotedPieceType: PIECE_TYPES.ADVENTITIOUS_KING,
        fairyFen: 'a',
        nativeSuffix: 'a'
    }
]);

const PROMOTION_CASE_BY_PAWN_TYPE = new Map(
    TIMUR_PROMOTION_PARITY_CASES.map((item) => [item.pawnType, item])
);

export function getPromotionParityCases() {
    return TIMUR_PROMOTION_PARITY_CASES.map((item) => ({ ...item }));
}

export function getPromotionParityCase(pawnType) {
    const item = PROMOTION_CASE_BY_PAWN_TYPE.get(pawnType);
    return item ? { ...item } : null;
}

export function getPawnOfPawnsCycleParity() {
    return PAWN_OF_PAWNS_CYCLE_PARITY.map((item) => ({ ...item }));
}

function buildPromotionCase(pawnType, promotedPieceType, fairyFen) {
    return {
        pawnType,
        promotedPieceType,
        fairyFen,
        nativeSuffix: fairyFen
    };
}
