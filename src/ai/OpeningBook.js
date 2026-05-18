import { MoveValidator } from '../game/MoveValidator.js';
import { buildZobristHash } from '../game/ZobristHash.js';
import { COLORS, FORMATIONS } from '../utils/constants.js';

const FILES = 'abcdefghijk';
const OPENING_HISTORY_LIMIT = 18;

function aiStep(move) {
    return Object.freeze({ side: 'ai', move: Object.freeze(move) });
}

function opponentStep(move) {
    return Object.freeze({ side: 'opponent', move: Object.freeze(move) });
}

function openingLine(id, sequence, priority = 0, confidence = 0.82, transition = false) {
    return Object.freeze({
        id,
        priority,
        confidence,
        transition,
        sequence: Object.freeze(sequence)
    });
}

export const OPENING_BOOKS = Object.freeze([
    Object.freeze({
        id: 'center_pawn',
        name: 'Center Pawn',
        formation: FORMATIONS.MASCULINE,
        personaId: 'timur',
        difficulty: 'easy',
        moves: Object.freeze([
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'j2', to: 'i4' }),
            Object.freeze({ from: 'e2', to: 'f3' })
        ])
    }),
    Object.freeze({
        id: 'double_knight_pressure',
        name: 'Double Knight Pressure',
        formation: FORMATIONS.MASCULINE,
        personaId: 'beyazid',
        difficulty: 'medium',
        moves: Object.freeze([
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'd3', to: 'd4' }),
            Object.freeze({ from: 'h3', to: 'h4' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'j2', to: 'i4' })
        ])
    }),
    Object.freeze({
        id: 'full_safe_development',
        name: 'Full Safe Development',
        formation: FORMATIONS.FULL,
        personaId: 'timur',
        difficulty: 'easy',
        weight: 96,
        confidence: 0.82,
        moves: Object.freeze([
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'f4', to: 'f5' }),
            Object.freeze({ from: 'c4', to: 'c5' }),
            Object.freeze({ from: 'i4', to: 'i5' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'h3', to: 'h4' })
        ])
    }),
    Object.freeze({
        id: 'pawn_fortress',
        name: 'Pawn Fortress',
        formation: FORMATIONS.MASCULINE,
        personaId: 'saray_veziri',
        difficulty: 'medium',
        moves: Object.freeze([
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'd3', to: 'd4' }),
            Object.freeze({ from: 'h3', to: 'h4' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'j2', to: 'i4' })
        ])
    }),
    Object.freeze({
        id: 'active_camel',
        name: 'Active Camel',
        formation: FORMATIONS.MASCULINE,
        personaId: 'ulu_bey',
        difficulty: 'medium',
        moves: Object.freeze([
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'd3', to: 'd4' }),
            Object.freeze({ from: 'h3', to: 'h4' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'j2', to: 'i4' }),
            Object.freeze({ from: 'e2', to: 'f3' })
        ])
    }),
    Object.freeze({
        id: 'rook_corridor',
        name: 'Rook Corridor',
        formation: FORMATIONS.MASCULINE,
        personaId: 'timur',
        difficulty: 'hard',
        moves: Object.freeze([
            Object.freeze({ from: 'a3', to: 'a4' }),
            Object.freeze({ from: 'b3', to: 'b4' }),
            Object.freeze({ from: 'a2', to: 'a3' }),
            Object.freeze({ from: 'a3', to: 'b3' }),
            Object.freeze({ from: 'k3', to: 'k4' }),
            Object.freeze({ from: 'j3', to: 'j4' }),
            Object.freeze({ from: 'k2', to: 'k3' })
        ])
    }),
    Object.freeze({
        id: 'timur_siege',
        name: 'Timur Siege',
        formation: FORMATIONS.MASCULINE,
        personaId: 'timur',
        difficulty: 'hard',
        weight: 38,
        confidence: 0.92,
        moves: Object.freeze([
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'g3', to: 'g4' }),
            Object.freeze({ from: 'd3', to: 'd4' }),
            Object.freeze({ from: 'h3', to: 'h4' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'j2', to: 'i4' }),
            Object.freeze({ from: 'b3', to: 'b4' }),
            Object.freeze({ from: 'e2', to: 'f3' })
        ])
    }),
    Object.freeze({
        id: 'feminine_council',
        name: 'Feminine Council',
        formation: FORMATIONS.FEMININE,
        personaId: 'timur',
        difficulty: 'hard',
        weight: 36,
        confidence: 0.9,
        moves: Object.freeze([
            Object.freeze({ from: 'g2', to: 'f1' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'j2', to: 'i4' }),
            Object.freeze({ from: 'f3', to: 'f4' })
        ])
    }),
    Object.freeze({
        id: 'feminine_fortress',
        name: 'Feminine Fortress',
        formation: FORMATIONS.FEMININE,
        personaId: 'saray_veziri',
        difficulty: 'medium',
        weight: 28,
        confidence: 0.84,
        moves: Object.freeze([
            Object.freeze({ from: 'f3', to: 'f4' }),
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'g2', to: 'h1' }),
            Object.freeze({ from: 'b2', to: 'c4' }),
            Object.freeze({ from: 'j2', to: 'i4' })
        ])
    }),
    Object.freeze({
        id: 'full_lion_gate',
        name: 'Full Lion Gate',
        formation: FORMATIONS.FULL,
        personaId: 'timur',
        difficulty: 'hard',
        weight: 40,
        confidence: 0.9,
        moves: Object.freeze([
            Object.freeze({ from: 'b1', to: 'b4' }),
            Object.freeze({ from: 'j1', to: 'j4' }),
            Object.freeze({ from: 'e3', to: 'e4' }),
            Object.freeze({ from: 'f4', to: 'f5' }),
            Object.freeze({ from: 'i1', to: 'h4' })
        ])
    }),
    Object.freeze({
        id: 'full_revealer_shield',
        name: 'Full Revealer Shield',
        formation: FORMATIONS.FULL,
        personaId: 'ulu_bey',
        difficulty: 'medium',
        weight: 30,
        confidence: 0.84,
        maxMoves: 5,
        moves: Object.freeze([
            Object.freeze({ from: 'f4', to: 'f5' }),
            Object.freeze({ from: 'c4', to: 'c5' }),
            Object.freeze({ from: 'i4', to: 'i5' }),
            Object.freeze({ from: 'd1', to: 'b4' })
        ])
    })
]);

const OPENING_BOOK_LINES = Object.freeze({
    center_pawn: Object.freeze([
        openingLine('center_pawn_f_file_reply', [
            opponentStep({ from: 'f3', to: 'f4' }),
            aiStep({ from: 'f3', to: 'f4' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'g3', to: 'g4' }),
            opponentStep({ from: 'f5', to: 'f6' }),
            aiStep({ from: 'g4', to: 'f5' })
        ], 36, 0.88),
        openingLine('center_pawn_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'e3', to: 'e4' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'g3', to: 'g4' })
        ], 30),
        openingLine('center_pawn_knight_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'e3', to: 'e4' })
        ], 20)
    ]),
    double_knight_pressure: Object.freeze([
        openingLine('double_knight_mirror_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'j2', to: 'i4' }),
            aiStep({ from: 'j2', to: 'i4' })
        ], 30),
        openingLine('double_knight_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'f3', to: 'f4' }),
            aiStep({ from: 'e3', to: 'e4' })
        ], 20)
    ]),
    pawn_fortress: Object.freeze([
        openingLine('pawn_fortress_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'f3', to: 'f4' }),
            opponentStep({ from: 'g3', to: 'g4' }),
            aiStep({ from: 'e3', to: 'e4' })
        ], 30),
        openingLine('pawn_fortress_knight_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'f3', to: 'f4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'g3', to: 'g4' })
        ], 20)
    ]),
    active_camel: Object.freeze([
        openingLine('active_camel_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'b1', to: 'c4' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'e3', to: 'e4' })
        ], 30),
        openingLine('active_camel_knight_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b1', to: 'c4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'j2', to: 'i4' })
        ], 20)
    ]),
    rook_corridor: Object.freeze([
        openingLine('rook_corridor_flank_reply', [
            opponentStep({ from: 'a3', to: 'a4' }),
            aiStep({ from: 'a3', to: 'a4' }),
            opponentStep({ from: 'b3', to: 'b4' }),
            aiStep({ from: 'b3', to: 'b4' })
        ], 30),
        openingLine('rook_corridor_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'a3', to: 'a4' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b3', to: 'b4' })
        ], 20)
    ]),
    timur_siege: Object.freeze([
        openingLine('timur_siege_f_file_reply', [
            opponentStep({ from: 'f3', to: 'f4' }),
            aiStep({ from: 'f3', to: 'f4' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'g3', to: 'g4' }),
            opponentStep({ from: 'f5', to: 'f6' }),
            aiStep({ from: 'g4', to: 'f5' })
        ], 46, 0.9),
        openingLine('timur_siege_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'e3', to: 'e4' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'j2', to: 'i4' }),
            aiStep({ from: 'j2', to: 'i4' })
        ], 40),
        openingLine('timur_siege_knight_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'e3', to: 'e4' }),
            opponentStep({ from: 'j2', to: 'i4' }),
            aiStep({ from: 'j2', to: 'i4' })
        ], 35),
        openingLine('timur_siege_flank_reply', [
            opponentStep({ from: 'g3', to: 'g4' }),
            aiStep({ from: 'j2', to: 'i4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'b2', to: 'c4' })
        ], 20)
    ]),
    feminine_council: Object.freeze([
        openingLine('feminine_council_camel_pressure_reply', [
            opponentStep({ from: 'b1', to: 'c4' }),
            aiStep({ from: 'a3', to: 'a4' }),
            opponentStep({ from: 'c4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 42, 0.9),
        openingLine('feminine_council_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'g2', to: 'f1' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' })
        ], 34, 0.9),
        openingLine('feminine_council_knight_reply', [
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' }),
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'g2', to: 'f1' })
        ], 28, 0.88)
    ]),
    feminine_fortress: Object.freeze([
        openingLine('feminine_fortress_camel_pressure_reply', [
            opponentStep({ from: 'b1', to: 'c4' }),
            aiStep({ from: 'a3', to: 'a4' }),
            opponentStep({ from: 'c4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 34, 0.84),
        openingLine('feminine_fortress_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'f3', to: 'f4' }),
            opponentStep({ from: 'g3', to: 'g4' }),
            aiStep({ from: 'e3', to: 'e4' })
        ], 28, 0.82),
        openingLine('feminine_fortress_flank_reply', [
            opponentStep({ from: 'h3', to: 'h4' }),
            aiStep({ from: 'g2', to: 'h1' }),
            opponentStep({ from: 'b2', to: 'c4' }),
            aiStep({ from: 'b2', to: 'c4' })
        ], 20, 0.78)
    ]),
    full_lion_gate: Object.freeze([
        openingLine('full_lion_gate_camel_intrusion_reply', [
            opponentStep({ from: 'c1', to: 'd4' }),
            aiStep({ from: 'c4', to: 'c5' }),
            opponentStep({ from: 'd4', to: 'e7' }),
            aiStep({ from: 'd3', to: 'e4' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' }),
            opponentStep({ from: 'd1', to: 'f4' }),
            aiStep({ from: 'c5', to: 'c6' }),
            opponentStep({ from: 'f4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 48, 0.92),
        openingLine('full_lion_gate_pawn_storm_reply', [
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' }),
            opponentStep({ from: 'd1', to: 'f4' }),
            aiStep({ from: 'd1', to: 'f4' }),
            opponentStep({ from: 'c1', to: 'd4' }),
            aiStep({ from: 'f4', to: 'd7' }),
            opponentStep({ from: 'c3', to: 'd4' }),
            aiStep({ from: 'b1', to: 'b4' }),
            opponentStep({ from: 'f4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 44, 0.9),
        openingLine('full_lion_gate_lion_reply', [
            opponentStep({ from: 'b1', to: 'b4' }),
            aiStep({ from: 'b1', to: 'b4' }),
            opponentStep({ from: 'j1', to: 'j4' }),
            aiStep({ from: 'j1', to: 'j4' })
        ], 36, 0.9),
        openingLine('full_lion_gate_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'b1', to: 'b4' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' })
        ], 30, 0.86)
    ]),
    full_revealer_shield: Object.freeze([
        openingLine('full_revealer_shield_camel_intrusion_reply', [
            opponentStep({ from: 'c1', to: 'd4' }),
            aiStep({ from: 'c4', to: 'c5' }),
            opponentStep({ from: 'd4', to: 'e7' }),
            aiStep({ from: 'd3', to: 'e4' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' }),
            opponentStep({ from: 'd1', to: 'f4' }),
            aiStep({ from: 'c5', to: 'c6' }),
            opponentStep({ from: 'f4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 42, 0.88),
        openingLine('full_revealer_shield_pawn_storm_reply', [
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' }),
            opponentStep({ from: 'd1', to: 'f4' }),
            aiStep({ from: 'd1', to: 'f4' }),
            opponentStep({ from: 'c1', to: 'd4' }),
            aiStep({ from: 'f4', to: 'd7' }),
            opponentStep({ from: 'c3', to: 'd4' }),
            aiStep({ from: 'b1', to: 'b4' }),
            opponentStep({ from: 'f4', to: 'd7' }),
            aiStep({ from: 'c3', to: 'd4' })
        ], 36, 0.84),
        openingLine('full_revealer_shield_center_reply', [
            opponentStep({ from: 'e3', to: 'e4' }),
            aiStep({ from: 'f4', to: 'f5' }),
            opponentStep({ from: 'b1', to: 'b4' }),
            aiStep({ from: 'c4', to: 'c5' })
        ], 26, 0.8),
        openingLine('full_revealer_shield_flank_reply', [
            opponentStep({ from: 'j1', to: 'j4' }),
            aiStep({ from: 'i4', to: 'i5' }),
            opponentStep({ from: 'f4', to: 'f5' }),
            aiStep({ from: 'f4', to: 'f5' })
        ], 18, 0.76)
    ])
});

const DIFFICULTY_BOOK_LIMIT = Object.freeze({
    easy: 2,
    medium: 4,
    hard: 7
});

const DIFFICULTY_RANK = Object.freeze({
    easy: 1,
    medium: 2,
    hard: 3
});

const PERSONA_PRIORITIES = Object.freeze({
    timur: Object.freeze(['full_lion_gate', 'feminine_council', 'timur_siege', 'rook_corridor', 'center_pawn']),
    beyazid: Object.freeze(['full_lion_gate', 'feminine_council', 'double_knight_pressure', 'center_pawn']),
    ulu_bey: Object.freeze(['full_revealer_shield', 'feminine_council', 'active_camel', 'pawn_fortress']),
    saray_veziri: Object.freeze(['feminine_fortress', 'full_revealer_shield', 'pawn_fortress', 'center_pawn'])
});

const MIN_OPENING_PIECES = 40;

const DEFAULT_OPENING_BOOK_STATS = Object.freeze({
    byOpening: Object.freeze({
        center_pawn: Object.freeze({ games: 36, wins: 15, draws: 12, losses: 9 }),
        double_knight_pressure: Object.freeze({ games: 34, wins: 16, draws: 9, losses: 9 }),
        pawn_fortress: Object.freeze({ games: 38, wins: 17, draws: 14, losses: 7 }),
        active_camel: Object.freeze({ games: 32, wins: 14, draws: 11, losses: 7 }),
        rook_corridor: Object.freeze({ games: 28, wins: 12, draws: 10, losses: 6 }),
        timur_siege: Object.freeze({ games: 44, wins: 25, draws: 12, losses: 7 }),
        feminine_council: Object.freeze({ games: 24, wins: 13, draws: 7, losses: 4 }),
        feminine_fortress: Object.freeze({ games: 20, wins: 9, draws: 8, losses: 3 }),
        full_lion_gate: Object.freeze({ games: 22, wins: 13, draws: 6, losses: 3 }),
        full_revealer_shield: Object.freeze({ games: 18, wins: 8, draws: 7, losses: 3 })
    }),
    byPosition: Object.freeze({})
});

export function squareToCoord(square) {
    const match = String(square || '').match(/^([a-k])(10|[1-9])$/);
    if (!match) throw new Error(`Invalid board square: ${square}`);

    return {
        row: 10 - Number(match[2]),
        col: FILES.indexOf(match[1])
    };
}

export function coordToSquare(row, col) {
    return `${FILES[col]}${10 - row}`;
}

export function mirrorSquareForBlack(square) {
    const match = String(square || '').match(/^([a-k])(10|[1-9])$/);
    if (!match) throw new Error(`Invalid board square: ${square}`);

    return `${match[1]}${11 - Number(match[2])}`;
}

export function mirrorBookMoveForBlack(move) {
    return {
        ...move,
        from: mirrorSquareForBlack(move.from),
        to: mirrorSquareForBlack(move.to)
    };
}

function getBaseDifficulty(profile, state) {
    return profile?.baseId || profile?.id?.split(':')[0] || state?.difficulty || 'medium';
}

function getDifficultyRank(difficulty) {
    return DIFFICULTY_RANK[difficulty] || DIFFICULTY_RANK.medium;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeOpeningStats(stats = {}, openingId = null, source = 'none') {
    const games = Math.max(0, Math.round(Number(stats.games) || 0));
    const wins = Math.max(0, Math.round(Number(stats.wins) || 0));
    const draws = Math.max(0, Math.round(Number(stats.draws) || 0));
    const losses = Math.max(0, Math.round(Number(stats.losses) || 0));
    const decisiveGames = wins + draws + losses;
    const resolvedGames = Math.max(games, decisiveGames);
    const score = resolvedGames > 0
        ? clamp((wins + (draws * 0.5)) / resolvedGames, 0, 1)
        : 0.5;
    const reliability = clamp(resolvedGames / 24, 0, 1);

    return Object.freeze({
        openingId: stats.openingId || openingId,
        games: resolvedGames,
        wins,
        draws,
        losses,
        score,
        reliability,
        source
    });
}

function mergeStatsEntry(a = {}, b = {}, openingId = null, source = 'merged') {
    return normalizeOpeningStats({
        openingId,
        games: (Number(a.games) || 0) + (Number(b.games) || 0),
        wins: (Number(a.wins) || 0) + (Number(b.wins) || 0),
        draws: (Number(a.draws) || 0) + (Number(b.draws) || 0),
        losses: (Number(a.losses) || 0) + (Number(b.losses) || 0)
    }, openingId, source);
}

function normalizeStatsMap(sourceStats = {}) {
    const byOpening = {};
    Object.entries(sourceStats.byOpening || {}).forEach(([openingId, stats]) => {
        byOpening[openingId] = normalizeOpeningStats(stats, openingId, stats?.source || 'opening');
    });

    const byPosition = {};
    Object.entries(sourceStats.byPosition || {}).forEach(([positionHash, openingMap]) => {
        byPosition[positionHash] = {};
        Object.entries(openingMap || {}).forEach(([openingId, stats]) => {
            byPosition[positionHash][openingId] = normalizeOpeningStats(
                stats,
                openingId,
                stats?.source || 'position'
            );
        });
        byPosition[positionHash] = Object.freeze(byPosition[positionHash]);
    });

    return Object.freeze({
        byOpening: Object.freeze(byOpening),
        byPosition: Object.freeze(byPosition)
    });
}

function resolveStatsSource(bookStats = null) {
    return bookStats || DEFAULT_OPENING_BOOK_STATS;
}

export function mergeOpeningBookStats(baseStats = null, nextStats = null) {
    const base = normalizeStatsMap(resolveStatsSource(baseStats));
    const next = normalizeStatsMap(nextStats || {});
    const byOpening = { ...base.byOpening };

    Object.entries(next.byOpening).forEach(([openingId, stats]) => {
        byOpening[openingId] = byOpening[openingId]
            ? mergeStatsEntry(byOpening[openingId], stats, openingId)
            : stats;
    });

    const byPosition = {};
    Object.entries(base.byPosition).forEach(([positionHash, openingMap]) => {
        byPosition[positionHash] = { ...openingMap };
    });
    Object.entries(next.byPosition).forEach(([positionHash, openingMap]) => {
        byPosition[positionHash] = byPosition[positionHash] || {};
        Object.entries(openingMap).forEach(([openingId, stats]) => {
            byPosition[positionHash][openingId] = byPosition[positionHash][openingId]
                ? mergeStatsEntry(byPosition[positionHash][openingId], stats, openingId)
                : stats;
        });
    });

    Object.keys(byPosition).forEach((positionHash) => {
        byPosition[positionHash] = Object.freeze(byPosition[positionHash]);
    });

    return Object.freeze({
        byOpening: Object.freeze(byOpening),
        byPosition: Object.freeze(byPosition)
    });
}

function getOpeningPositionHash(state) {
    return state ? buildZobristHash(state) : null;
}

function getBookStats(book, bookStats = null, positionHash = null) {
    const stats = normalizeStatsMap(resolveStatsSource(bookStats));
    const positionStats = positionHash
        ? stats.byPosition?.[positionHash]?.[book.id]
        : null;
    const openingStats = stats.byOpening?.[book.id];
    const fallback = normalizeOpeningStats({
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0
    }, book.id, 'fallback');

    return positionStats || openingStats || fallback;
}

function getBookPreferenceScore(book, preferredIds, personaId) {
    const preferenceIndex = preferredIds.includes(book.id) ? preferredIds.indexOf(book.id) : -1;
    const preferenceScore = preferenceIndex >= 0 ? 120 - (preferenceIndex * 20) : 0;
    const personaScore = book.personaId === personaId ? 16 : 0;
    const weightScore = Number(book.weight) || 0;
    return preferenceScore + personaScore + weightScore;
}

function getBookDataScore(stats) {
    if (!stats) return 0;
    const scoreLift = (stats.score - 0.5) * 150;
    const reliabilityLift = stats.reliability * 15;
    return scoreLift + reliabilityLift;
}

function getBookBotFit(book, profile, preferredIds, personaId, stats) {
    const level = Number(profile?.botLevel) || 0;
    const botScale = level ? clamp(level / 15, 0.1, 1) : 0.55;
    const preference = getBookPreferenceScore(book, preferredIds, personaId);
    const dataScore = getBookDataScore(stats);
    const difficultyFit = getDifficultyRank(book.difficulty) <= getDifficultyRank(getBaseDifficulty(profile))
        ? 14
        : -20;
    return Math.round((preference * 0.65) + (dataScore * botScale) + difficultyFit);
}

function orderBooksForProfile(profile, state, bookStats = null, positionHash = null) {
    const personaId = profile?.personaId || state?.aiPersonaId || 'timur';
    const botPreferredIds = Array.isArray(profile?.openingBookPreferences)
        ? profile.openingBookPreferences.filter(Boolean)
        : [];
    const preferredIds = botPreferredIds.length
        ? botPreferredIds
        : (PERSONA_PRIORITIES[personaId] || PERSONA_PRIORITIES.timur);
    const difficulty = getBaseDifficulty(profile, state);
    const maxRank = getDifficultyRank(difficulty);

    return [...OPENING_BOOKS]
        .filter((book) => getDifficultyRank(book.difficulty) <= maxRank)
        .sort((a, b) => {
            const personaPriorityA = preferredIds.includes(a.id) ? preferredIds.indexOf(a.id) : 99;
            const personaPriorityB = preferredIds.includes(b.id) ? preferredIds.indexOf(b.id) : 99;
            const statsA = getBookStats(a, bookStats, positionHash);
            const statsB = getBookStats(b, bookStats, positionHash);
            const scoreA = getBookPreferenceScore(a, preferredIds, personaId) + getBookDataScore(statsA);
            const scoreB = getBookPreferenceScore(b, preferredIds, personaId) + getBookDataScore(statsB);
            if (scoreA !== scoreB) return scoreB - scoreA;

            if (personaPriorityA !== personaPriorityB) return personaPriorityA - personaPriorityB;

            if (a.personaId === personaId && b.personaId !== personaId) return -1;
            if (b.personaId === personaId && a.personaId !== personaId) return 1;

            const weightDiff = (b.weight || 0) - (a.weight || 0);
            if (weightDiff !== 0) return weightDiff;

            return getDifficultyRank(b.difficulty) - getDifficultyRank(a.difficulty);
        });
}

export function getOpeningRepertoireForProfile(profile, state = null, options = {}) {
    const positionHash = options.positionHash || getOpeningPositionHash(state);
    const personaId = profile?.personaId || state?.aiPersonaId || 'timur';
    const botPreferredIds = Array.isArray(profile?.openingBookPreferences)
        ? profile.openingBookPreferences.filter(Boolean)
        : [];
    const preferredIds = botPreferredIds.length
        ? botPreferredIds
        : (PERSONA_PRIORITIES[personaId] || PERSONA_PRIORITIES.timur);

    return Object.freeze(orderBooksForProfile(profile, state, options.bookStats, positionHash)
        .filter((book) => !state?.formation || book.formation === state.formation)
        .map((book, index) => {
            const stats = getBookStats(book, options.bookStats, positionHash);
            return Object.freeze({
                id: book.id,
                name: book.name,
                formation: book.formation,
                difficulty: book.difficulty,
                personaId: book.personaId,
                priority: index + 1,
                positionHash,
                stats,
                dataScore: getBookDataScore(stats),
                botFit: getBookBotFit(book, profile, preferredIds, personaId, stats)
            });
        }));
}

function getBookMoveIndex(book, move) {
    const index = (book.moves || []).findIndex((bookMove) => bookMove.from === move.from && bookMove.to === move.to);
    return index >= 0 ? index : 0;
}

function getLegalChoice(state, book, mirroredMove, moveIndex, line = null, bookStats = null, positionHash = null) {
    const from = squareToCoord(mirroredMove.from);
    const to = squareToCoord(mirroredMove.to);
    const piece = state.board.getPieceAt(from.row, from.col);
    if (!piece || piece.color !== COLORS.BLACK) return null;

    const validator = new MoveValidator(state);
    const legalMove = validator
        .getLegalMoves(from.row, from.col)
        .find((move) => move.row === to.row && move.col === to.col);

    if (!legalMove) return null;

    const stats = getBookStats(book, bookStats, positionHash);
    const baseConfidence = Number.isFinite(line?.confidence) ? line.confidence : (book.confidence ?? 0.75);
    const statsConfidence = 0.45 + (stats.score * 0.5);
    const confidence = clamp(
        (baseConfidence * (line?.transition ? 0.78 : 0.68)) + (statsConfidence * (line?.transition ? 0.22 : 0.32)),
        0.25,
        line?.transition ? 0.58 : 0.98
    );

    return {
        piece,
        move: {
            ...legalMove,
            row: to.row,
            col: to.col
        },
        openingBook: true,
        openingId: book.id,
        openingName: book.name,
        openingMoveIndex: moveIndex + 1,
        openingLineId: line?.id || null,
        openingConfidence: confidence,
        openingPriority: (Number.isFinite(line?.priority) ? line.priority : (book.weight ?? 0))
            + Math.round(getBookDataScore(stats) * 0.3),
        openingTransition: Boolean(line?.transition),
        openingPlan: line?.transition ? 'offbook_transition' : null,
        openingPositionHash: positionHash,
        openingStats: stats,
        openingDataScore: getBookDataScore(stats)
    };
}

function normalizeHistoryEntry(entry) {
    const fromRow = entry?.fromRow ?? entry?.from?.row;
    const fromCol = entry?.fromCol ?? entry?.from?.col;
    const toRow = entry?.toRow ?? entry?.to?.row;
    const toCol = entry?.toCol ?? entry?.to?.col;

    if (
        typeof fromRow !== 'number'
        || typeof fromCol !== 'number'
        || typeof toRow !== 'number'
        || typeof toCol !== 'number'
    ) {
        return null;
    }

    return {
        color: entry?.color || null,
        fromRow,
        fromCol,
        toRow,
        toCol
    };
}

function getOpeningHistory(state) {
    const source = Array.isArray(state?.openingHistory) && state.openingHistory.length
        ? state.openingHistory
        : (Array.isArray(state?.moveHistory) ? state.moveHistory : []);

    return source
        .slice(0, OPENING_HISTORY_LIMIT)
        .map(normalizeHistoryEntry)
        .filter(Boolean);
}

function expectedStepMove(step) {
    return step.side === 'ai'
        ? mirrorBookMoveForBlack(step.move)
        : step.move;
}

function expectedStepColor(step) {
    return step.side === 'ai' ? COLORS.BLACK : COLORS.WHITE;
}

function historyMatchesStep(historyEntry, step) {
    const move = expectedStepMove(step);
    const from = squareToCoord(move.from);
    const to = squareToCoord(move.to);

    return (
        historyEntry?.color === expectedStepColor(step)
        && historyEntry.fromRow === from.row
        && historyEntry.fromCol === from.col
        && historyEntry.toRow === to.row
        && historyEntry.toCol === to.col
    );
}

function buildLinearOpeningLine(book) {
    return openingLine(
        `${book.id}_legacy_linear`,
        (book.moves || []).map(aiStep),
        -100,
        Math.min(book?.confidence ?? 0.72, 0.72)
    );
}

export function getOpeningBookLines(book) {
    const branchLines = OPENING_BOOK_LINES[book?.id] || Object.freeze([]);
    return Object.freeze([...branchLines, buildLinearOpeningLine(book)]);
}

function countAiStepsBefore(sequence, endIndex) {
    return sequence
        .slice(0, endIndex)
        .filter((step) => step.side === 'ai')
        .length;
}

function getBookChoiceFromLine(state, book, line, history, maxBookMoves, bookStats = null, positionHash = null) {
    let historyIndex = 0;

    for (let stepIndex = 0; stepIndex < line.sequence.length; stepIndex++) {
        const step = line.sequence[stepIndex];
        const aiStepCountBefore = countAiStepsBefore(line.sequence, stepIndex);

        if (step.side === 'ai' && aiStepCountBefore >= maxBookMoves) return null;

        const historyEntry = history[historyIndex];
        if (historyEntry) {
            if (!historyMatchesStep(historyEntry, step)) return null;
            historyIndex++;
            continue;
        }

        if (step.side === 'opponent') return null;

        const mirroredMove = mirrorBookMoveForBlack(step.move);
        const moveIndex = getBookMoveIndex(book, step.move);
        return getLegalChoice(state, book, mirroredMove, moveIndex, line, bookStats, positionHash);
    }

    return null;
}

function hasBookMoveProgressed(state, mirroredMove) {
    const from = squareToCoord(mirroredMove.from);
    const to = squareToCoord(mirroredMove.to);
    const pieceStillAtStart = state.board.getPieceAt(from.row, from.col);
    if (pieceStillAtStart?.color === COLORS.BLACK) return false;

    const pieceAtTarget = state.board.getPieceAt(to.row, to.col);
    return pieceAtTarget?.color === COLORS.BLACK;
}

function getBookChoiceInSequence(state, book, moves, bookStats = null, positionHash = null) {
    for (let index = 0; index < moves.length; index++) {
        const mirroredMove = mirrorBookMoveForBlack(moves[index]);
        const choice = getLegalChoice(state, book, mirroredMove, index, null, bookStats, positionHash);
        if (choice) return choice;
        if (!hasBookMoveProgressed(state, mirroredMove)) return null;
    }

    return null;
}

function getBookTransitionChoice(state, book, maxBookMoves, bookStats = null, positionHash = null) {
    const maxConfidence = Math.min(0.55, (book.confidence ?? 0.75) * 0.62);
    const transitionLine = openingLine(
        `${book.id}_offbook_transition`,
        [],
        -250 + (book.weight || 0),
        maxConfidence,
        true
    );

    for (let index = 0; index < Math.min(maxBookMoves, book.moves.length); index++) {
        const mirroredMove = mirrorBookMoveForBlack(book.moves[index]);
        const choice = getLegalChoice(state, book, mirroredMove, index, transitionLine, bookStats, positionHash);
        if (choice) return choice;
    }

    return null;
}

function isSupportedOpeningFormation(formation) {
    return (
        formation === FORMATIONS.MASCULINE
        || formation === FORMATIONS.FEMININE
        || formation === FORMATIONS.FULL
    );
}

function addOpeningStatsCount(target, positionHash, openingId, outcome) {
    if (!openingId) return;

    target.byOpening[openingId] = target.byOpening[openingId] || { games: 0, wins: 0, draws: 0, losses: 0 };
    target.byOpening[openingId].games += 1;
    target.byOpening[openingId][outcome] += 1;

    if (positionHash) {
        target.byPosition[positionHash] = target.byPosition[positionHash] || {};
        target.byPosition[positionHash][openingId] = target.byPosition[positionHash][openingId] || {
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0
        };
        target.byPosition[positionHash][openingId].games += 1;
        target.byPosition[positionHash][openingId][outcome] += 1;
    }
}

function normalizeWinner(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('draw') || text.includes('berabere')) return 'draw';
    if (text === COLORS.WHITE || text.includes('white') || text.includes('beyaz')) return COLORS.WHITE;
    if (text === COLORS.BLACK || text.includes('black') || text.includes('siyah')) return COLORS.BLACK;
    return null;
}

function resolveMatchOutcomeForColor(match, color) {
    const resultText = String(match?.resultType || '').toLowerCase();
    const winner = normalizeWinner(match?.winner);
    if (winner === 'draw' || resultText.includes('draw') || resultText.includes('stalemate')) return 'draws';
    if (winner === color) return 'wins';
    if (winner && winner !== color) return 'losses';
    return 'draws';
}

export function buildOpeningBookStatsFromMatches(matches = []) {
    const rawStats = {
        byOpening: {},
        byPosition: {}
    };

    for (const match of matches || []) {
        for (const move of match?.moves || []) {
            if (!move?.openingBook || !move.openingId) continue;
            const color = move.color || move.movedColor || COLORS.BLACK;
            const outcome = resolveMatchOutcomeForColor(match, color);
            addOpeningStatsCount(rawStats, move.openingPositionHash || move.positionHash || null, move.openingId, outcome);
        }
    }

    return normalizeStatsMap(rawStats);
}

export function getOpeningBookMove(state, profile = null, options = {}) {
    if (!state || state.currentTurn !== COLORS.BLACK || state.isGameOver?.()) return null;

    const formation = state.formation;
    if (!isSupportedOpeningFormation(formation)) return null;
    if ((state.board?.pieces?.length || 0) < MIN_OPENING_PIECES) return null;

    const difficulty = getBaseDifficulty(profile, state);
    const baseMaxBookMoves = DIFFICULTY_BOOK_LIMIT[difficulty] || DIFFICULTY_BOOK_LIMIT.medium;
    const openingHistory = getOpeningHistory(state);
    const positionHash = options.positionHash || getOpeningPositionHash(state);
    const bookStats = options.bookStats || DEFAULT_OPENING_BOOK_STATS;
    const previousTurn = state.currentTurn;
    state.currentTurn = COLORS.BLACK;

    try {
        for (const book of orderBooksForProfile(profile, state, bookStats, positionHash)) {
            if (book.formation !== formation) continue;
            const maxBookMoves = Math.max(baseMaxBookMoves, book.maxMoves || 0);

            if (openingHistory.length > 0) {
                const lines = [...getOpeningBookLines(book)]
                    .sort((a, b) => b.priority - a.priority);
                for (const line of lines) {
                    const choice = getBookChoiceFromLine(
                        state,
                        book,
                        line,
                        openingHistory,
                        maxBookMoves,
                        bookStats,
                        positionHash
                    );
                    if (choice) return choice;
                }
                const transitionChoice = getBookTransitionChoice(state, book, maxBookMoves, bookStats, positionHash);
                if (transitionChoice) return transitionChoice;
                continue;
            }

            const moves = book.moves.slice(0, maxBookMoves);
            const choice = getBookChoiceInSequence(state, book, moves, bookStats, positionHash);
            if (choice) return choice;
        }
    } finally {
        state.currentTurn = previousTurn;
    }

    return null;
}
