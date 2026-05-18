// src/ai/MateSearch.js
//
// Zorlu Mat Arama (Forced Mate Search)
// =====================================
// Endgame pozisyonlarında zorunlu mat dizisini arar.
// Normal arama derinliğinin yetmediği yerlerde, az taşlı pozisyon için
// özel olarak "her hamle mat ile sonuçlanır mı" sorgusunu çalıştırır.
//
// Algoritma:
//   - Iterative deepening (2, 4, 6, 8, ... 16)
//   - Maximizer (AI): herhangi bir hamle mat ile sonuçlanıyorsa yeter
//   - Minimizer (rakip): TÜM hamleler mat ile sonuçlanmalı
//   - İlk bulunan = en kısa mat (iterative deepening sayesinde)
//
// Sadece az taşlı pozisyonlarda çağrılır; aksi takdirde maliyetli.

import { collectLegalMoves, applyPerftMove, revertPerftMove } from '../game/Perft.js';
import { COLORS, PIECE_TYPES, PIECE_VALUES } from '../utils/constants.js';

const ROYAL_TYPES = new Set(['king', 'prince', 'adventitious_king']);

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function isPawnPromotionMove(piece, move) {
    return (
        piece?.type === PIECE_TYPES.PAWN
        && ((piece.color === COLORS.BLACK && move?.row === 9) || (piece.color === COLORS.WHITE && move?.row === 0))
    );
}

function getPawnPromotionDistance(piece, row = piece?.row) {
    if (!piece || !Number.isFinite(row)) return 9;
    return piece.color === COLORS.BLACK
        ? Math.max(0, 9 - row)
        : Math.max(0, row);
}

function scoreMateSearchMove(state, moveObj, perspectiveColor) {
    const { piece, move } = moveObj;
    const target = state.board.getPieceAt(move.row, move.col);
    const opponentColor = getOppositeColor(piece.color);
    const opponentRoyals = state.board.pieces.filter((candidate) =>
        candidate.color === opponentColor && ROYAL_TYPES.has(candidate.type)
    );
    let score = 0;

    if (target && target.color !== piece.color) {
        score += 1400 + (PIECE_VALUES[target.type] || 0) * 8;
    }
    if (target && ROYAL_TYPES.has(target.type)) score += 6000;
    if (move.specialMove) score += 1200;

    if (piece.type === PIECE_TYPES.PAWN) {
        const beforeDistance = getPawnPromotionDistance(piece);
        const afterDistance = getPawnPromotionDistance(piece, move.row);
        if (isPawnPromotionMove(piece, move)) {
            score += 2600;
        } else if (afterDistance < beforeDistance) {
            const urgency = Math.max(0, 7 - afterDistance);
            score += urgency * urgency * 42;
            if (afterDistance <= 2) score += (3 - afterDistance) * 420;
        }
    }

    if (opponentRoyals.length) {
        const closestRoyalDistance = Math.min(
            ...opponentRoyals.map((royal) => Math.abs(move.row - royal.row) + Math.abs(move.col - royal.col))
        );
        score += Math.max(0, 12 - closestRoyalDistance) * 36;
    }

    // Prefer the mating side's forcing moves first; the defender's move order
    // still matters because a fast escape refutes the line sooner.
    return piece.color === perspectiveColor ? score : score * 0.65;
}

function getOrderedLegalMoves(state, sideToMove, perspectiveColor) {
    return collectLegalMoves(state, sideToMove)
        .sort((a, b) => scoreMateSearchMove(state, b, perspectiveColor) - scoreMateSearchMove(state, a, perspectiveColor));
}

function resolveTerminalWinner(state) {
    if (state?.winner === COLORS.WHITE || state?.winner === COLORS.BLACK) return state.winner;
    if (state?.winner || state?.isDraw) return 'draw';
    return null;
}

/**
 * Pozisyon mat aramaya uygun mu?
 * Çok taşlı pozisyonlar için arama maliyeti astronomik olur.
 */
export function isPositionMateSearchEligible(state, perspectiveColor) {
    if (!state?.board?.pieces) return false;
    const pieces = state.board.pieces;
    if (pieces.length > 9) return false;

    let ownNonRoyals = 0;
    let opponentNonRoyals = 0;
    const opponentColor = getOppositeColor(perspectiveColor);

    for (const p of pieces) {
        if (ROYAL_TYPES.has(p.type)) continue;
        if (p.color === perspectiveColor) ownNonRoyals++;
        else if (p.color === opponentColor) opponentNonRoyals++;
    }

    // Üstün tarafta en az 1 taş + rakipte ≤2 taş = mat-arama mantıklı
    return ownNonRoyals >= 1 && opponentNonRoyals <= 2;
}

/**
 * Maksimum derinlik bu pozisyon için ne olmalı?
 * Az taş = daha derin arama yapılabilir (branching factor düşük).
 */
function getMaxMateSearchDepth(state) {
    const totalPieces = state.board.pieces.length;
    if (totalPieces <= 4) return 16; // K+X vs K needs a real mating net.
    if (totalPieces <= 5) return 14;
    if (totalPieces <= 7) return 12;
    return 10;
}

/**
 * Zorlu mat arama (negamax/min-max varyantı).
 *
 * @param {GameState} state         — Mevcut tahta durumu
 * @param {string} perspectiveColor — Mat veren tarafın rengi
 * @param {object} options          — { maxDepth, deadline, maxNodes }
 *
 * @returns {object}
 *   { mate: true, move, plies, nodes }  — mat bulundu
 *   { mate: false, nodes }              — bu derinlikte mat yok
 *   { unknown: true, nodes }            — deadline/budget aşıldı, sonuç belirsiz
 */
export function findForcedMate(state, perspectiveColor, options = {}) {
    const maxDepth = options.maxDepth ?? getMaxMateSearchDepth(state);
    const deadline = options.deadline ?? null;
    const maxNodes = options.maxNodes ?? 500_000;
    const now = typeof options.now === 'function' ? options.now : Date.now;

    const stats = { nodes: 0, aborted: false };

    function searchRecursive(depth, sideToMove) {
        stats.nodes++;
        if (stats.nodes >= maxNodes) {
            stats.aborted = true;
            return { unknown: true };
        }
        if (deadline && now() > deadline) {
            stats.aborted = true;
            return { unknown: true };
        }

        const terminalWinner = resolveTerminalWinner(state);
        if (terminalWinner) {
            return terminalWinner === perspectiveColor
                ? { mate: true, winner: perspectiveColor, plies: 0 }
                : { mate: false, winner: terminalWinner };
        }

        const legalMoves = getOrderedLegalMoves(state, sideToMove, perspectiveColor);

        // Yasal hamle yok = sıradaki taraf kaybeder
        // (Timur'da pat da kazanç sağlar — kim hamle edemezse kaybeder)
        if (legalMoves.length === 0) {
            const winner = getOppositeColor(sideToMove);
            return { mate: true, winner, plies: 0 };
        }

        // Derinlik bitti — sonuç bilinmiyor
        if (depth === 0) {
            return { mate: false };
        }

        const isMaximizing = sideToMove === perspectiveColor;

        if (isMaximizing) {
            // Bir tane bile mat-yapan hamle yeter
            let bestPlies = Infinity;
            let bestMove = null;
            for (const moveObj of legalMoves) {
                const applied = applyPerftMove(state, moveObj);
                const childResult = searchRecursive(depth - 1, getOppositeColor(sideToMove));
                revertPerftMove(state, applied);
                if (childResult.unknown) {
                    // Eğer önceden bir mat bulduysak onu döndür
                    if (bestMove) {
                        return { mate: true, winner: perspectiveColor, plies: bestPlies, move: bestMove };
                    }
                    return { unknown: true };
                }
                if (childResult.mate && childResult.winner === perspectiveColor) {
                    const plies = childResult.plies + 1;
                    if (plies < bestPlies) {
                        bestPlies = plies;
                        bestMove = moveObj;
                    }
                }
            }
            if (bestMove) {
                return { mate: true, winner: perspectiveColor, plies: bestPlies, move: bestMove };
            }
            return { mate: false };
        }

        // Minimizer (rakip): TÜM hamleler mat ile sonuçlanmalı
        let worstPlies = 0;
        for (const moveObj of legalMoves) {
            const applied = applyPerftMove(state, moveObj);
            const childResult = searchRecursive(depth - 1, getOppositeColor(sideToMove));
            revertPerftMove(state, applied);
            if (childResult.unknown) return { unknown: true };
            if (!childResult.mate || childResult.winner !== perspectiveColor) {
                // Bir kaçış bulundu — bu pozisyondan mat yok
                return { mate: false };
            }
            if (childResult.plies > worstPlies) worstPlies = childResult.plies;
        }
        return { mate: true, winner: perspectiveColor, plies: worstPlies + 1 };
    }

    // Iterative deepening — ilk bulunan mat en kısa olanıdır
    let bestResult = null;
    for (let d = 2; d <= maxDepth; d += 2) {
        const result = searchRecursive(d, perspectiveColor);
        if (result.unknown) break;
        if (result.mate && result.winner === perspectiveColor && result.move) {
            bestResult = { ...result, depthSearched: d };
            break;
        }
        // Her derinlik artışında deadline kontrolü
        if (deadline && now() > deadline) break;
    }

    if (bestResult) {
        bestResult.nodes = stats.nodes;
        return bestResult;
    }

    return {
        mate: false,
        nodes: stats.nodes,
        aborted: stats.aborted
    };
}
