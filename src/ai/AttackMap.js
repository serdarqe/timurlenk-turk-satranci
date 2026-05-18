import { COLORS, PIECE_VALUES } from '../utils/constants.js';
import { GameRules } from '../game/GameRules.js';
import { MoveValidator } from '../game/MoveValidator.js';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function buildSquareKey(row, col) {
    return `${row}:${col}`;
}

function buildPieceKey(piece) {
    return `${piece.color}:${piece.type}:${piece.row}:${piece.col}:${piece.pawnType || ''}`;
}

function createColorBuckets() {
    return {
        [COLORS.WHITE]: [],
        [COLORS.BLACK]: []
    };
}

function withTemporaryTurn(state, color, callback) {
    const previousTurn = state.currentTurn;
    state.currentTurn = color;
    try {
        return callback();
    } finally {
        state.currentTurn = previousTurn;
    }
}

function getBoard(stateOrBoard) {
    return stateOrBoard?.board || stateOrBoard;
}

function canTemporarilyClear(board, occupant, piece) {
    return Boolean(
        occupant
        && occupant !== piece
        && occupant.color === piece.color
        && typeof board._setAt === 'function'
    );
}

function piecePotentiallyTouchesSquare(board, piece, row, col) {
    const occupant = board.getPieceAt(row, col);
    const shouldClear = canTemporarilyClear(board, occupant, piece);

    if (shouldClear) board._setAt(row, col, null);
    try {
        return piece.getPotentialMoves(board).some((move) => move.row === row && move.col === col);
    } finally {
        if (shouldClear) board._setAt(row, col, occupant);
    }
}

export function getPotentialAttackersToSquare(stateOrBoard, row, col, attackerColor) {
    const board = getBoard(stateOrBoard);
    if (!board?.pieces) return [];

    const occupant = board.getPieceAt(row, col);
    return board.pieces.filter((piece) => (
        piece !== occupant
        && piece.color === attackerColor
        && piecePotentiallyTouchesSquare(board, piece, row, col)
    ));
}

function buildLegalMoveCache(state) {
    const cache = new Map();
    if (!state?.board?.pieces) return cache;

    for (const color of [COLORS.WHITE, COLORS.BLACK]) {
        withTemporaryTurn(state, color, () => {
            const validator = new MoveValidator(state);
            for (const piece of state.board.pieces.filter((candidate) => candidate.color === color)) {
                cache.set(buildPieceKey(piece), validator.getLegalMoves(piece.row, piece.col));
            }
        });
    }

    return cache;
}

export function getLegalAttackersToSquare(state, row, col, attackerColor, legalMoveCache = null) {
    if (!state?.board?.pieces) return [];

    const occupant = state.board.getPieceAt(row, col);
    if (occupant?.color === attackerColor) return [];

    const cache = legalMoveCache || buildLegalMoveCache(state);
    return state.board.pieces.filter((piece) => (
        piece.color === attackerColor
        && (cache.get(buildPieceKey(piece)) || []).some((move) => move.row === row && move.col === col)
    ));
}

export function getSupportersToSquare(stateOrBoard, row, col, supporterColor) {
    return getPotentialAttackersToSquare(stateOrBoard, row, col, supporterColor);
}

export function isSquareAttackedByPotential(stateOrBoard, row, col, attackerColor) {
    return getPotentialAttackersToSquare(stateOrBoard, row, col, attackerColor).length > 0;
}

function createSquareInfo(state, row, col, legalMoveCache) {
    const occupant = state.board.getPieceAt(row, col);
    const pseudoAttackers = createColorBuckets();
    const legalAttackers = createColorBuckets();
    const defenders = createColorBuckets();

    for (const color of [COLORS.WHITE, COLORS.BLACK]) {
        pseudoAttackers[color] = getPotentialAttackersToSquare(state, row, col, color);
        legalAttackers[color] = getLegalAttackersToSquare(state, row, col, color, legalMoveCache);
        defenders[color] = occupant?.color === color
            ? pseudoAttackers[color].filter((piece) => piece !== occupant)
            : [];
    }

    return {
        key: buildSquareKey(row, col),
        row,
        col,
        occupant,
        pseudoAttackers,
        legalAttackers,
        defenders
    };
}

function getPieceThreatValue(piece) {
    if (!piece || GameRules.isRoyalType(piece.type)) return 0;
    return PIECE_VALUES[piece.type] || 0;
}

function buildPieceReport(piece, squareInfo) {
    const enemyColor = getOppositeColor(piece.color);
    const value = getPieceThreatValue(piece);
    const pseudoAttackers = squareInfo.pseudoAttackers[enemyColor] || [];
    const legalAttackers = squareInfo.legalAttackers[enemyColor] || [];
    const defenders = squareInfo.defenders[piece.color] || [];

    return {
        piece,
        key: squareInfo.key,
        type: piece.type,
        color: piece.color,
        row: piece.row,
        col: piece.col,
        value,
        pseudoAttackers,
        legalAttackers,
        defenders,
        pseudoAttackerCount: pseudoAttackers.length,
        legalAttackerCount: legalAttackers.length,
        defenderCount: defenders.length,
        isHanging: value > 0 && legalAttackers.length > 0 && defenders.length <= 1,
        isContested: value > 0 && legalAttackers.length > 0 && defenders.length > 1
    };
}

function isSafeRoyalEscape(state, royal, move, enemyColor) {
    if (!state.board.isValidCoord(move.row, move.col)) return false;

    const target = state.board.getPieceAt(move.row, move.col);
    if (target?.color === royal.color) return false;

    const startRow = royal.row;
    const startCol = royal.col;
    const moveData = state.board.movePiece(startRow, startCol, move.row, move.col);
    if (!moveData) return false;

    try {
        return !isSquareAttackedByPotential(state, move.row, move.col, enemyColor);
    } finally {
        state.board.undoMove(startRow, startCol, move.row, move.col, moveData);
    }
}

function buildRoyalSafety(state, attackMap, royal) {
    const enemyColor = getOppositeColor(royal.color);
    const square = attackMap.getSquare(royal.row, royal.col);
    const potentialEscapes = royal.getPotentialMoves(state.board)
        .filter((move) => state.board.isValidCoord(move.row, move.col));
    const safeEscapeSquares = [];
    const unsafeEscapeSquares = [];

    for (const move of potentialEscapes) {
        if (isSafeRoyalEscape(state, royal, move, enemyColor)) safeEscapeSquares.push({ row: move.row, col: move.col });
        else unsafeEscapeSquares.push({ row: move.row, col: move.col });
    }

    return {
        type: royal.type,
        color: royal.color,
        row: royal.row,
        col: royal.col,
        attacked: square.pseudoAttackers[enemyColor].length > 0,
        legalAttacked: square.legalAttackers[enemyColor].length > 0,
        attackCount: square.pseudoAttackers[enemyColor].length,
        legalAttackCount: square.legalAttackers[enemyColor].length,
        escapeCount: potentialEscapes.length,
        safeEscapeCount: safeEscapeSquares.length,
        unsafeEscapeCount: unsafeEscapeSquares.length,
        safeEscapeSquares,
        unsafeEscapeSquares
    };
}

export function buildAttackMap(state) {
    const squares = new Map();
    const legalMoveCache = buildLegalMoveCache(state);
    const attackMap = {
        version: 2,
        squares,
        pieceReports: [],
        royalSafety: {
            [COLORS.WHITE]: [],
            [COLORS.BLACK]: []
        },
        getSquare(row, col) {
            return squares.get(buildSquareKey(row, col)) || createSquareInfo(state, row, col, legalMoveCache);
        }
    };

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 11; col++) {
            const square = createSquareInfo(state, row, col, legalMoveCache);
            squares.set(square.key, square);
        }
    }

    attackMap.pieceReports = state.board.pieces
        .filter((piece) => state.board.isValidCoord(piece.row, piece.col))
        .map((piece) => buildPieceReport(piece, attackMap.getSquare(piece.row, piece.col)));

    for (const royal of state.board.pieces.filter((piece) => GameRules.isRoyalType(piece.type))) {
        if (!state.board.isValidCoord(royal.row, royal.col)) continue;
        attackMap.royalSafety[royal.color].push(buildRoyalSafety(state, attackMap, royal));
    }

    return attackMap;
}

function getHangingValue(report) {
    return report.defenderCount <= 1 ? report.value : report.value * 0.35;
}

function buildOverloadedDefenders(reports, defenderColor) {
    const defenderLoads = new Map();

    for (const report of reports) {
        if (report.color !== defenderColor || report.value <= 0 || report.legalAttackerCount <= 0) continue;
        if (report.defenderCount !== 1) continue;

        const defender = report.defenders[0];
        const key = buildPieceKey(defender);
        const load = defenderLoads.get(key) || {
            defender,
            targets: [],
            value: 0
        };
        load.targets.push(report);
        load.value += report.value;
        defenderLoads.set(key, load);
    }

    return [...defenderLoads.values()]
        .filter((load) => load.targets.length >= 2)
        .map((load) => ({
            type: load.defender.type,
            row: load.defender.row,
            col: load.defender.col,
            targetCount: load.targets.length,
            targetValue: load.value,
            targets: load.targets.map((target) => ({
                type: target.type,
                row: target.row,
                col: target.col,
                value: target.value
            }))
        }));
}

export function summarizeAttackMapForColor(attackMap, perspectiveColor = COLORS.BLACK) {
    const enemyColor = getOppositeColor(perspectiveColor);
    let ownHangingValue = 0;
    let ownContestedValue = 0;
    let enemyHangingValue = 0;
    let enemyContestedValue = 0;
    let pseudoOwnHangingValue = 0;
    let pseudoEnemyHangingValue = 0;

    for (const report of attackMap.pieceReports) {
        if (report.value <= 0) continue;

        const isOwnPiece = report.color === perspectiveColor;
        const hangingValue = getHangingValue(report);

        if (report.pseudoAttackerCount > 0 && report.defenderCount <= 1) {
            if (isOwnPiece) pseudoOwnHangingValue += hangingValue;
            else pseudoEnemyHangingValue += hangingValue;
        }

        if (report.legalAttackerCount <= 0) continue;

        if (isOwnPiece) {
            if (report.defenderCount <= 1) ownHangingValue += hangingValue;
            else ownContestedValue += hangingValue;
        } else if (report.defenderCount <= 1) {
            enemyHangingValue += hangingValue;
        } else {
            enemyContestedValue += hangingValue;
        }
    }

    const ownOverloadedDefenders = buildOverloadedDefenders(attackMap.pieceReports, perspectiveColor);
    const enemyOverloadedDefenders = buildOverloadedDefenders(attackMap.pieceReports, enemyColor);
    const overloadedOwnDefenderValue = ownOverloadedDefenders.reduce((total, defender) => total + defender.targetValue, 0);
    const overloadedEnemyDefenderValue = enemyOverloadedDefenders.reduce((total, defender) => total + defender.targetValue, 0);
    const rawScore = (
        enemyHangingValue
        + enemyContestedValue
        + overloadedEnemyDefenderValue * 0.18
        - ownHangingValue
        - ownContestedValue
        - overloadedOwnDefenderValue * 0.18
    );

    return {
        ownHangingValue,
        ownContestedValue,
        enemyHangingValue,
        enemyContestedValue,
        legalOwnHangingValue: ownHangingValue,
        legalEnemyHangingValue: enemyHangingValue,
        pseudoOwnHangingValue,
        pseudoEnemyHangingValue,
        overloadedDefenders: ownOverloadedDefenders,
        overloadedEnemyDefenders: enemyOverloadedDefenders,
        overloadedDefenderValue: overloadedOwnDefenderValue,
        overloadedOwnDefenderValue,
        overloadedEnemyDefenderValue,
        royalSafety: {
            own: attackMap.royalSafety[perspectiveColor],
            enemy: attackMap.royalSafety[enemyColor]
        },
        rawScore
    };
}
