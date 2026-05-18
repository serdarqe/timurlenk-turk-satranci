import { COLORS } from '../utils/constants.js';

const MASK_64 = (1n << 64n) - 1n;
const FNV_OFFSET_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const HASH_PREFIX = 'z2';

function hashToken(token) {
    let hash = FNV_OFFSET_64;
    const text = String(token);

    for (let i = 0; i < text.length; i++) {
        hash ^= BigInt(text.charCodeAt(i));
        hash = (hash * FNV_PRIME_64) & MASK_64;
    }

    // Final avalanche keeps neighboring tokens from producing overly similar keys.
    hash ^= hash >> 33n;
    hash = (hash * 0xff51afd7ed558ccdn) & MASK_64;
    hash ^= hash >> 33n;
    hash = (hash * 0xc4ceb9fe1a85ec53n) & MASK_64;
    hash ^= hash >> 33n;

    return hash & MASK_64;
}

function getPieces(stateLike) {
    return stateLike?.board?.pieces || stateLike?.pieces || [];
}

function getFlag(stateLike, key, color) {
    return Boolean(stateLike?.[key]?.[color]);
}

function pieceToken(piece, row = piece?.row, col = piece?.col) {
    return [
        'piece',
        piece?.type || '',
        piece?.color || '',
        row,
        col,
        piece?.pawnType || '',
        piece?.stage ?? '',
        piece?.hasMoved ? 1 : 0,
        piece?.isPromoted ? 1 : 0
    ].join('|');
}

function stateToken(kind, ...parts) {
    return [kind, ...parts].join('|');
}

export function parseZobristHash(hash) {
    if (typeof hash === 'bigint') return hash & MASK_64;
    if (typeof hash !== 'string') return 0n;

    const normalized = hash.startsWith(`${HASH_PREFIX}:`)
        ? hash.slice(HASH_PREFIX.length + 1)
        : hash;

    return BigInt(`0x${normalized || '0'}`) & MASK_64;
}

export function formatZobristHash(hashValue) {
    return `${HASH_PREFIX}:${(hashValue & MASK_64).toString(16).padStart(16, '0')}`;
}

export function xorZobristPiece(hashValue, piece, coordOverride = {}) {
    if (!piece) return hashValue & MASK_64;

    const row = coordOverride.row ?? piece.row;
    const col = coordOverride.col ?? piece.col;
    return (hashValue ^ hashToken(pieceToken(piece, row, col))) & MASK_64;
}

export function xorZobristTurn(hashValue, color) {
    if (!color) return hashValue & MASK_64;
    return (hashValue ^ hashToken(stateToken('turn', color))) & MASK_64;
}

export function xorZobristFormation(hashValue, formation) {
    if (!formation) return hashValue & MASK_64;
    return (hashValue ^ hashToken(stateToken('formation', formation))) & MASK_64;
}

export function xorZobristFlag(hashValue, flagName, color, enabled) {
    if (!enabled) return hashValue & MASK_64;
    return (hashValue ^ hashToken(stateToken('flag', flagName, color))) & MASK_64;
}

export function buildZobristHashValue(stateLike) {
    let hash = 0n;

    for (const piece of getPieces(stateLike)) {
        hash = xorZobristPiece(hash, piece);
    }

    hash = xorZobristTurn(hash, stateLike?.currentTurn || '');
    hash = xorZobristFormation(hash, stateLike?.formation || '');
    hash = xorZobristFlag(hash, 'ransom', COLORS.WHITE, getFlag(stateLike, 'ransomMoveUsed', COLORS.WHITE));
    hash = xorZobristFlag(hash, 'ransom', COLORS.BLACK, getFlag(stateLike, 'ransomMoveUsed', COLORS.BLACK));
    hash = xorZobristFlag(hash, 'citadel_exchange', COLORS.WHITE, getFlag(stateLike, 'citadelExchangeUsed', COLORS.WHITE));
    hash = xorZobristFlag(hash, 'citadel_exchange', COLORS.BLACK, getFlag(stateLike, 'citadelExchangeUsed', COLORS.BLACK));

    return hash & MASK_64;
}

export function buildZobristHash(stateLike) {
    return formatZobristHash(buildZobristHashValue(stateLike));
}

