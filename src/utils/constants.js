// src/utils/constants.js
export const PIECE_TYPES = {
    KING: 'king',
    VIZIER: 'vizier',
    SEA_MONSTER: 'sea_monster',
    GENERAL: 'general',
    KNIGHT: 'knight',
    LION: 'lion',
    ELEPHANT: 'elephant',
    CAMEL: 'camel',
    DABBABA: 'dabbaba',
    BULL: 'bull',
    REVEALER: 'revealer',
    GIRAFFE: 'giraffe',
    PICKET: 'picket',
    ROOK: 'rook',
    PAWN: 'pawn',
    PRINCE: 'prince',
    ADVENTITIOUS_KING: 'adventitious_king'
};

export const PAWN_TYPES = {
    PAWN_OF_PAWNS: 'pawn_of_pawns',
    PAWN_OF_DABBABAS: 'pawn_of_dabbabas',
    PAWN_OF_CAMELS: 'pawn_of_camels',
    PAWN_OF_ELEPHANTS: 'pawn_of_elephants',
    PAWN_OF_GENERALS: 'pawn_of_generals',
    PAWN_OF_KINGS: 'pawn_of_kings',
    PAWN_OF_VIZIERS: 'pawn_of_viziers',
    PAWN_OF_SEA_MONSTERS: 'pawn_of_sea_monsters',
    PAWN_OF_GIRAFFES: 'pawn_of_giraffes',
    PAWN_OF_PICKETS: 'pawn_of_pickets',
    PAWN_OF_KNIGHTS: 'pawn_of_knights',
    PAWN_OF_LIONS: 'pawn_of_lions',
    PAWN_OF_BULLS: 'pawn_of_bulls',
    PAWN_OF_REVEALERS: 'pawn_of_revealers',
    PAWN_OF_ROOKS: 'pawn_of_rooks'
};

export const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

export const FORMATIONS = {
    MASCULINE: 'masculine',
    FEMININE: 'feminine',
    FULL: 'full'
};

export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    TUTORIAL: 'tutorial'
};

export const DIFFICULTY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

export const PIECE_VALUES = {
    [PIECE_TYPES.KING]: 10000,
    [PIECE_TYPES.PRINCE]: 1000,
    [PIECE_TYPES.ADVENTITIOUS_KING]: 1000,
    [PIECE_TYPES.ROOK]: 100,
    [PIECE_TYPES.GIRAFFE]: 80,
    [PIECE_TYPES.PICKET]: 60,
    [PIECE_TYPES.KNIGHT]: 60,
    [PIECE_TYPES.LION]: 58,
    [PIECE_TYPES.BULL]: 56,
    [PIECE_TYPES.REVEALER]: 52,
    [PIECE_TYPES.CAMEL]: 50,
    [PIECE_TYPES.DABBABA]: 30,
    [PIECE_TYPES.ELEPHANT]: 25,
    [PIECE_TYPES.GENERAL]: 20,
    [PIECE_TYPES.VIZIER]: 15,
    [PIECE_TYPES.SEA_MONSTER]: 15,
    [PIECE_TYPES.PAWN]: 10
};
