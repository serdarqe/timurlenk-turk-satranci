import { MoveValidator } from '../game/MoveValidator.js';
import { PIECE_TYPES } from '../utils/constants.js';

export const FAIRY_FILES = 'abcdefghijk';

const EXPECTED_POC_REASONS = new Set([
    'giraffe_requires_wrapper',
    'picket_minimum_distance_rule'
]);

export function coordToFairySquare(row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || col < 0 || col >= FAIRY_FILES.length) {
        return null;
    }
    return `${FAIRY_FILES[col]}${10 - row}`;
}

export function fairySquareToCoord(square) {
    const match = String(square || '').toLowerCase().match(/^([a-k])(10|[1-9])$/);
    if (!match) return null;

    const col = FAIRY_FILES.indexOf(match[1]);
    const rank = Number(match[2]);
    const row = 10 - rank;

    if (row < 0 || row > 9 || col < 0 || col > 10) return null;
    return { row, col };
}

export function moveToFairyUci(fromRow, fromCol, toRow, toCol) {
    const from = coordToFairySquare(fromRow, fromCol);
    const to = coordToFairySquare(toRow, toCol);
    if (!from || !to) return null;
    return `${from}${to}`;
}

function buildUnsupportedMoveId(piece, move) {
    const from = coordToFairySquare(piece.row, piece.col) || `r${piece.row}c${piece.col}`;
    const target = stateSafeTargetLabel(move.row, move.col);
    const special = move.specialMove ? `:${move.specialMove}` : '';
    return `${from}->${target}${special}`;
}

function stateSafeTargetLabel(row, col) {
    if (row === 0 && col === -1) return 'citadel:black';
    if (row === 9 && col === 11) return 'citadel:white';
    return `r${row}c${col}`;
}

export function parseFairyUciMove(uci) {
    const match = String(uci || '').toLowerCase().match(/^([a-k](?:10|[1-9]))([a-k](?:10|[1-9]))([a-z]*)$/);
    if (!match) return null;

    const from = fairySquareToCoord(match[1]);
    const to = fairySquareToCoord(match[2]);
    if (!from || !to) return null;

    return {
        uci: `${match[1]}${match[2]}${match[3] || ''}`,
        from,
        to,
        suffix: match[3] || ''
    };
}

export function normalizeFairyBestMove(bestMoveLine) {
    const text = String(bestMoveLine || '').trim().toLowerCase();
    if (!text) return null;

    const tokens = text.split(/\s+/);
    const moveToken = tokens[0] === 'bestmove' ? tokens[1] : tokens[0];
    if (!moveToken || moveToken === '(none)' || moveToken === '0000') return null;
    return moveToken;
}

export function collectTimurLegalMoves(state) {
    const validator = new MoveValidator(state);
    const moves = [];
    const pieces = state.board.pieces
        .filter((piece) => piece.color === state.currentTurn)
        .filter((piece) => state.board.isValidCoord(piece.row, piece.col))
        .sort((a, b) => a.row - b.row || a.col - b.col || a.type.localeCompare(b.type));

    for (const piece of pieces) {
        const legalMoves = validator.getLegalMoves(piece.row, piece.col);

        for (const move of legalMoves) {
            const uci = moveToFairyUci(piece.row, piece.col, move.row, move.col);
            const unsupported = !uci;

            moves.push({
                uci: uci || buildUnsupportedMoveId(piece, move),
                unsupported,
                piece: piece.type,
                from: coordToFairySquare(piece.row, piece.col),
                to: coordToFairySquare(move.row, move.col) || stateSafeTargetLabel(move.row, move.col),
                fromRow: piece.row,
                fromCol: piece.col,
                toRow: move.row,
                toCol: move.col,
                specialMove: move.specialMove || null
            });
        }
    }

    return moves.sort((a, b) => a.uci.localeCompare(b.uci));
}

export function reconcileFairyMovesWithTimurRules(state, fairyMoves, options = {}) {
    const jsMoves = options.jsMoves || collectTimurLegalMoves(state);
    const normalizedFairyMoves = normalizeFairyMoves(fairyMoves);
    const jsByUci = new Map(jsMoves
        .filter((move) => !move.unsupported)
        .map((move) => [move.uci, move]));
    const fairySet = new Set(normalizedFairyMoves);

    const acceptedMoves = normalizedFairyMoves
        .filter((uci) => jsByUci.has(uci))
        .map((uci) => jsByUci.get(uci));

    const jsOnlyMoves = jsMoves.filter((move) => move.unsupported || !fairySet.has(move.uci));
    const fairyOnlyMoves = normalizedFairyMoves.filter((uci) => !jsByUci.has(uci));

    const missingWrapperMoves = jsOnlyMoves.map((move) => ({
        ...move,
        reason: classifyJsOnlyMove(state, move)
    }));

    const rejectedFairyMoves = fairyOnlyMoves.map((uci) => ({
        uci,
        reason: classifyFairyOnlyMove(state, uci),
        parsed: parseFairyUciMove(uci)
    }));

    const unexpectedJsOnly = missingWrapperMoves.filter((move) => !isExpectedPocReason(move.reason));
    const unexpectedFairyOnly = rejectedFairyMoves.filter((move) => !isExpectedPocReason(move.reason));

    return {
        jsMoves,
        fairyMoves: normalizedFairyMoves,
        acceptedMoves,
        missingWrapperMoves,
        rejectedFairyMoves,
        unexpectedJsOnly,
        unexpectedFairyOnly,
        exactMatch: missingWrapperMoves.length === 0 && rejectedFairyMoves.length === 0,
        onlyExpectedPocDiffs: unexpectedJsOnly.length === 0 && unexpectedFairyOnly.length === 0,
        stats: {
            jsMoveCount: jsMoves.length,
            fairyMoveCount: normalizedFairyMoves.length,
            acceptedMoveCount: acceptedMoves.length,
            missingWrapperCount: missingWrapperMoves.length,
            rejectedFairyCount: rejectedFairyMoves.length,
            unexpectedJsOnlyCount: unexpectedJsOnly.length,
            unexpectedFairyOnlyCount: unexpectedFairyOnly.length
        }
    };
}

export function selectSafeTimurMoveFromFairyBestMove(state, fairyBestMove, options = {}) {
    const jsMoves = options.jsMoves || collectTimurLegalMoves(state);
    const fallbackMove = options.fallbackMove ?? jsMoves.find((move) => !move.unsupported) ?? null;
    const normalizedBestMove = normalizeFairyBestMove(fairyBestMove);

    if (!normalizedBestMove) {
        return buildBestMoveDecision({
            accepted: false,
            source: fallbackMove ? 'fallback' : 'none',
            reason: 'empty_or_none_fairy_bestmove',
            fairyBestMove,
            normalizedBestMove,
            selectedMove: fallbackMove,
            fallbackMove
        });
    }

    const parsed = parseFairyUciMove(normalizedBestMove);
    if (!parsed) {
        return buildBestMoveDecision({
            accepted: false,
            source: fallbackMove ? 'fallback' : 'none',
            reason: 'invalid_fairy_bestmove',
            fairyBestMove,
            normalizedBestMove,
            selectedMove: fallbackMove,
            fallbackMove
        });
    }

    if (parsed.suffix) {
        return buildBestMoveDecision({
            accepted: false,
            source: fallbackMove ? 'fallback' : 'none',
            reason: 'promotion_suffix_requires_wrapper',
            fairyBestMove,
            normalizedBestMove,
            selectedMove: fallbackMove,
            fallbackMove,
            parsed
        });
    }

    const acceptedMove = jsMoves.find((move) => !move.unsupported && move.uci === normalizedBestMove);
    if (acceptedMove) {
        return buildBestMoveDecision({
            accepted: true,
            source: 'fairy',
            reason: 'fairy_bestmove_is_timur_legal',
            fairyBestMove,
            normalizedBestMove,
            selectedMove: acceptedMove,
            fallbackMove,
            parsed
        });
    }

    return buildBestMoveDecision({
        accepted: false,
        source: fallbackMove ? 'fallback' : 'none',
        reason: classifyFairyOnlyMove(state, normalizedBestMove),
        fairyBestMove,
        normalizedBestMove,
        selectedMove: fallbackMove,
        fallbackMove,
        parsed
    });
}

export function classifyJsOnlyMove(state, move) {
    if (move.specialMove === 'royal_swap') return 'royal_swap_requires_wrapper';
    if (move.specialMove === 'citadel_exchange') return 'citadel_exchange_requires_wrapper';
    if (!state.board.isValidCoord(move.toRow, move.toCol)) return 'citadel_requires_wrapper';
    if (move.piece === PIECE_TYPES.GIRAFFE) return 'giraffe_requires_wrapper';
    if (move.piece === PIECE_TYPES.PRINCE || move.piece === PIECE_TYPES.ADVENTITIOUS_KING) {
        return 'royal_hierarchy_requires_wrapper';
    }
    return 'unclassified_js_only_move';
}

export function classifyFairyOnlyMove(state, uci) {
    const parsed = parseFairyUciMove(uci);
    if (!parsed) return 'invalid_fairy_uci';

    const piece = state.board.getPieceAt(parsed.from.row, parsed.from.col);
    if (!piece) return 'fairy_source_square_empty';

    const dRow = Math.abs(parsed.to.row - parsed.from.row);
    const dCol = Math.abs(parsed.to.col - parsed.from.col);

    if (piece.type === PIECE_TYPES.PICKET && dRow === 1 && dCol === 1) {
        return 'picket_minimum_distance_rule';
    }

    if (piece.type === PIECE_TYPES.GIRAFFE) {
        return 'giraffe_requires_wrapper';
    }

    return 'unclassified_fairy_only_move';
}

export function isExpectedPocReason(reason) {
    return EXPECTED_POC_REASONS.has(reason);
}

function normalizeFairyMoves(fairyMoves) {
    return [...new Set(
        (fairyMoves || [])
            .map((move) => String(move || '').trim().toLowerCase())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
}

function buildBestMoveDecision(decision) {
    return {
        accepted: decision.accepted,
        source: decision.source,
        reason: decision.reason,
        fairyBestMove: decision.fairyBestMove,
        normalizedBestMove: decision.normalizedBestMove,
        selectedMove: decision.selectedMove || null,
        fallbackMove: decision.fallbackMove || null,
        parsed: decision.parsed || null
    };
}
