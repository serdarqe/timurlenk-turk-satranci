import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GameState } from '../../src/game/GameState.js';
import { collectLegalMoves, applyPerftMove } from '../../src/game/Perft.js';
import { COLORS, PIECE_VALUES } from '../../src/utils/constants.js';
import { getAIProfile } from '../../src/ai/AIProfiles.js';
import { selectAiMoveAnalysisForState } from '../../src/ai/ai.worker.js';
import {
    OPENING_BOOKS,
    getOpeningBookMove,
    mirrorBookMoveForBlack
} from '../../src/ai/OpeningBook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const FILES = 'abcdefghijk';

const DEFAULT_MAX_PLIES = 12;
const DEFAULT_THINK_MS = 35;
const DEFAULT_OUTPUT_MD = 'exports/opening-safety-report.md';
const DEFAULT_OUTPUT_JSON = 'exports/opening-safety-report.json';

const BOOK_TO_BOT = Object.freeze({
    center_pawn: 'bot_06_genc_emir',
    double_knight_pressure: 'bot_09_beyazid',
    pawn_fortress: 'bot_12_hisar_bekcisi',
    active_camel: 'bot_07_ulug_bey',
    rook_corridor: 'bot_13_timur',
    timur_siege: 'bot_15_aksak_demir',
    feminine_council: 'bot_13_timur',
    feminine_fortress: 'bot_12_hisar_bekcisi',
    full_lion_gate: 'bot_13_timur',
    full_revealer_shield: 'bot_07_ulug_bey'
});

const OPPONENT_POLICIES = Object.freeze(['booklike', 'pressure', 'greedy']);

const PREFERRED_WHITE_OPENING_MOVES = Object.freeze([
    'e3>e4',
    'b2>c4',
    'j2>i4',
    'f3>f4',
    'g3>g4',
    'd3>d4',
    'h3>h4',
    'k3>k4',
    'a3>a4',
    'b3>b4',
    'j3>j4',
    'k2>k3',
    'b1>c4',
    'g2>f1',
    'g2>h1',
    'b1>b4',
    'j1>j4',
    'f4>f5',
    'c4>c5',
    'i4>i5',
    'd1>b4'
]);

function parseArgs(argv = process.argv.slice(2)) {
    const options = {
        maxPlies: DEFAULT_MAX_PLIES,
        thinkMs: DEFAULT_THINK_MS,
        outputMd: DEFAULT_OUTPUT_MD,
        outputJson: DEFAULT_OUTPUT_JSON,
        policies: OPPONENT_POLICIES,
        verbose: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === '--max-plies' && next) {
            options.maxPlies = Number(next);
            i += 1;
        } else if (arg === '--think-ms' && next) {
            options.thinkMs = Number(next);
            i += 1;
        } else if (arg === '--output' && next) {
            options.outputMd = next;
            i += 1;
        } else if (arg === '--json' && next) {
            options.outputJson = next;
            i += 1;
        } else if (arg === '--policies' && next) {
            options.policies = next.split(',').map((item) => item.trim()).filter(Boolean);
            i += 1;
        } else if (arg === '--verbose') {
            options.verbose = true;
        }
    }

    options.maxPlies = Number.isFinite(options.maxPlies) && options.maxPlies > 0
        ? Math.floor(options.maxPlies)
        : DEFAULT_MAX_PLIES;
    options.thinkMs = Number.isFinite(options.thinkMs) && options.thinkMs > 0
        ? Math.floor(options.thinkMs)
        : DEFAULT_THINK_MS;
    options.policies = options.policies.length ? options.policies : OPPONENT_POLICIES;
    return options;
}

function silenceKnownGameLogs() {
    const originalLog = console.log;
    console.log = (...args) => {
        if (args.length === 1 && args[0] === 'Pawn promoted to prince!') return;
        originalLog(...args);
    };
    return () => {
        console.log = originalLog;
    };
}

function coordToSquare(row, col) {
    if (row === 0 && col === -1) return 'black-citadel';
    if (row === 9 && col === 11) return 'white-citadel';
    return `${FILES[col] ?? '?'}${10 - row}`;
}

function getMoveDetails(moveObj) {
    const fromRow = moveObj.piece.row;
    const fromCol = moveObj.piece.col;
    const toRow = moveObj.move.row;
    const toCol = moveObj.move.col;
    return {
        fromRow,
        fromCol,
        toRow,
        toCol,
        from: coordToSquare(fromRow, fromCol),
        to: coordToSquare(toRow, toCol),
        notation: `${coordToSquare(fromRow, fromCol)} -> ${coordToSquare(toRow, toCol)}`
    };
}

function moveNotation(moveObj) {
    return getMoveDetails(moveObj).notation;
}

function pieceValue(piece) {
    return PIECE_VALUES[piece?.type] ?? 0;
}

function materialValue(state, color) {
    return state.board.pieces
        .filter((piece) => piece.color === color)
        .reduce((total, piece) => total + pieceValue(piece), 0);
}

function materialSnapshot(state) {
    const black = materialValue(state, COLORS.BLACK);
    const white = materialValue(state, COLORS.WHITE);
    return {
        black,
        white,
        balance: black - white
    };
}

function moveKeyFromSquares(from, to) {
    return `${from}>${to}`;
}

function moveKey(moveObj) {
    return moveKeyFromSquares(
        coordToSquare(moveObj.piece.row, moveObj.piece.col),
        coordToSquare(moveObj.move.row, moveObj.move.col)
    );
}

function sameMove(legalMove, candidateMove) {
    if (!legalMove || !candidateMove) return false;
    return legalMove.piece.row === candidateMove.piece?.row
        && legalMove.piece.col === candidateMove.piece?.col
        && legalMove.move.row === candidateMove.move?.row
        && legalMove.move.col === candidateMove.move?.col
        && (legalMove.move.specialMove || null) === (candidateMove.move?.specialMove || null);
}

function resolveLegalMove(state, candidateMove, color = state.currentTurn) {
    const legalMoves = collectLegalMoves(state, color);
    return legalMoves.find((legalMove) => sameMove(legalMove, candidateMove)) || null;
}

function findPreferredMove(legalMoves) {
    for (const preferred of PREFERRED_WHITE_OPENING_MOVES) {
        const match = legalMoves.find((moveObj) => moveKey(moveObj) === preferred);
        if (match) return match;
    }
    return null;
}

function scoreOpponentMove(state, moveObj, policy) {
    const target = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    const captureValue = target?.color === COLORS.BLACK ? pieceValue(target) : 0;
    const movingValue = pieceValue(moveObj.piece);
    const centerDistance = Math.abs(moveObj.move.col - 5) + Math.abs(moveObj.move.row - 4.5);
    const centerScore = Math.max(0, 10 - centerDistance);
    const forwardScore = Math.max(0, moveObj.piece.row - moveObj.move.row);
    const kingPenalty = movingValue >= 1000 ? -80 : 0;

    if (policy === 'greedy') {
        return (captureValue * 100) + centerScore + forwardScore + kingPenalty;
    }

    if (policy === 'pressure') {
        return (captureValue * 45) + (forwardScore * 9) + (centerScore * 5) - (movingValue * 0.04) + kingPenalty;
    }

    const preferredIndex = PREFERRED_WHITE_OPENING_MOVES.indexOf(moveKey(moveObj));
    const preferredScore = preferredIndex >= 0 ? 140 - preferredIndex : 0;
    return preferredScore + (captureValue * 30) + (centerScore * 2) + forwardScore + kingPenalty;
}

function chooseOpponentMove(state, policy) {
    const legalMoves = collectLegalMoves(state, COLORS.WHITE);
    if (!legalMoves.length) return null;

    if (policy === 'booklike') {
        const preferredMove = findPreferredMove(legalMoves);
        if (preferredMove) return preferredMove;
    }

    return legalMoves
        .map((moveObj) => ({
            moveObj,
            score: scoreOpponentMove(state, moveObj, policy)
        }))
        .sort((a, b) => b.score - a.score)[0]?.moveObj || legalMoves[0];
}

function buildForcedOpeningProfile(book) {
    const baseProfile = getAIProfile(book.difficulty || 'medium', book.personaId || 'timur');
    return {
        ...baseProfile,
        id: `${baseProfile.id}:forced:${book.id}`,
        openingBookPreferences: Object.freeze([book.id])
    };
}

async function createScenarioState(book) {
    const state = await GameState.createInitialState(book.formation);
    state.formation = book.formation;
    state.difficulty = book.difficulty || 'medium';
    state.aiPersonaId = book.personaId || 'timur';
    state.aiBotId = BOOK_TO_BOT[book.id] || null;
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.WHITE;
    state.timeControl = '15';
    return state;
}

function recordAppliedMove(state, details, color, capturedPiece, extras = {}) {
    state.moveHistory.push({
        index: state.moveHistory.length + 1,
        color,
        from: { row: details.fromRow, col: details.fromCol },
        to: { row: details.toRow, col: details.toCol },
        notation: details.notation,
        capturedPiece: capturedPiece
            ? {
                type: capturedPiece.type,
                color: capturedPiece.color,
                value: pieceValue(capturedPiece)
            }
            : null,
        openingBook: Boolean(extras.openingBook),
        openingId: extras.openingId || null,
        openingName: extras.openingName || null,
        openingMoveIndex: extras.openingMoveIndex ?? null,
        openingLineId: extras.openingLineId || null,
        openingTransition: Boolean(extras.openingTransition)
    });
}

function applyAndMeasure(state, moveObj, color, extras = {}) {
    const before = materialSnapshot(state);
    const details = getMoveDetails(moveObj);
    const capturedPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    const captured = capturedPiece?.color !== color ? capturedPiece : null;
    applyPerftMove(state, moveObj);
    recordAppliedMove(state, details, color, captured, extras);
    const after = materialSnapshot(state);
    return {
        before,
        after,
        captured,
        details
    };
}

function makeInitialMetrics(state) {
    const material = materialSnapshot(state);
    return {
        initialBlack: material.black,
        initialWhite: material.white,
        minBalance: material.balance,
        maxBalance: material.balance,
        blackLossEvents: [],
        whiteLossEvents: [],
        captures: []
    };
}

function updateMetrics(metrics, ply, color, moveObj, applied) {
    metrics.minBalance = Math.min(metrics.minBalance, applied.after.balance);
    metrics.maxBalance = Math.max(metrics.maxBalance, applied.after.balance);

    if (applied.captured) {
        const event = {
            ply,
            by: color,
            piece: applied.captured.type,
            value: pieceValue(applied.captured),
            notation: applied.details.notation
        };
        metrics.captures.push(event);
        if (applied.captured.color === COLORS.BLACK) metrics.blackLossEvents.push(event);
        if (applied.captured.color === COLORS.WHITE) metrics.whiteLossEvents.push(event);
    }
}

function addFlag(flags, condition, flag) {
    if (condition) flags.push(flag);
}

function buildFlags(summary, mode) {
    const flags = [];
    const isHard = summary.difficulty === 'hard';
    const materialLimit = isHard ? -35 : (summary.difficulty === 'medium' ? -55 : -80);
    const majorLossLimit = isHard ? 50 : 60;

    addFlag(flags, Boolean(summary.illegalMove), 'illegal_move');
    addFlag(flags, summary.bookMoves === 0, 'no_book_move');
    addFlag(flags, mode === 'raw_book' && summary.bookMoves < Math.min(2, summary.bookLength), 'raw_book_exits_early');
    addFlag(flags, mode === 'integrated_ai' && summary.bookMoves < 1, 'ai_rejects_book_immediately');
    addFlag(flags, summary.minMaterialBalance <= materialLimit, 'early_material_drop');
    addFlag(
        flags,
        summary.blackMajorLossCount > 0
            && summary.blackMaxLoss >= majorLossLimit
            && summary.blackLoss > summary.whiteLoss + 20,
        'black_major_piece_lost'
    );
    addFlag(flags, summary.blackRoyalLossCount > 0, 'black_royal_lost');
    return flags;
}

async function runScenario({ book, policy, mode, maxPlies, thinkMs }) {
    const state = await createScenarioState(book);
    const forcedProfile = buildForcedOpeningProfile(book);
    const metrics = makeInitialMetrics(state);
    const openingIds = new Map();
    const moves = [];
    let bookMoves = 0;
    let bookExitPly = null;
    let illegalMove = null;
    let stoppedReason = 'max_plies';

    for (let ply = 1; ply <= maxPlies; ply += 1) {
        if (state.isGameOver?.()) {
            stoppedReason = 'game_over';
            break;
        }

        const color = state.currentTurn;
        let moveObj = null;
        let extras = {};

        if (color === COLORS.WHITE) {
            moveObj = chooseOpponentMove(state, policy);
            if (!moveObj) {
                stoppedReason = 'white_no_legal_moves';
                break;
            }
        } else {
            if (mode === 'raw_book') {
                const choice = getOpeningBookMove(state, forcedProfile);
                if (!choice) {
                    bookExitPly = bookExitPly ?? ply;
                    stoppedReason = 'book_no_choice';
                    break;
                }
                if (choice.openingId !== book.id) {
                    bookExitPly = bookExitPly ?? ply;
                    stoppedReason = `book_switched_to_${choice.openingId}`;
                    break;
                }
                moveObj = resolveLegalMove(state, choice, COLORS.BLACK);
                extras = {
                    openingBook: true,
                    openingId: choice.openingId,
                    openingName: choice.openingName,
                    openingMoveIndex: choice.openingMoveIndex,
                    openingLineId: choice.openingLineId,
                    openingTransition: choice.openingTransition
                };
            } else {
                const analysis = selectAiMoveAnalysisForState(state, { maxThinkMs: thinkMs });
                const choice = analysis?.move || null;
                if (!choice) {
                    stoppedReason = 'ai_no_choice';
                    break;
                }
                moveObj = resolveLegalMove(state, choice, COLORS.BLACK);
                extras = {
                    openingBook: Boolean(choice.openingBook || analysis?.searchInfo?.usedOpeningBook),
                    openingId: choice.openingId || null,
                    openingName: choice.openingName || null,
                    openingMoveIndex: choice.openingMoveIndex ?? null,
                    openingLineId: choice.openingLineId || null,
                    openingTransition: Boolean(choice.openingTransition)
                };
            }

            if (!moveObj) {
                illegalMove = {
                    ply,
                    color,
                    requested: extras.openingId || 'ai_move'
                };
                stoppedReason = 'illegal_black_move';
                break;
            }

            if (extras.openingBook) {
                bookMoves += 1;
                if (extras.openingId) {
                    openingIds.set(extras.openingId, (openingIds.get(extras.openingId) || 0) + 1);
                }
            } else if (bookExitPly == null) {
                bookExitPly = ply;
            }
        }

        const applied = applyAndMeasure(state, moveObj, color, extras);
        updateMetrics(metrics, ply, color, moveObj, applied);
        moves.push({
            ply,
            color,
            notation: applied.details.notation,
            captured: applied.captured?.type || null,
            openingBook: Boolean(extras.openingBook),
            openingId: extras.openingId || null
        });
    }

    const finalMaterial = materialSnapshot(state);
    const blackLoss = metrics.initialBlack - finalMaterial.black;
    const whiteLoss = metrics.initialWhite - finalMaterial.white;
    const blackMajorLosses = metrics.blackLossEvents.filter((event) => event.value >= 50);
    const blackRoyalLosses = metrics.blackLossEvents.filter((event) => event.value >= 1000);
    const summary = {
        mode,
        bookId: book.id,
        bookName: book.name,
        bookLength: book.moves.length,
        formation: book.formation,
        difficulty: book.difficulty,
        personaId: book.personaId,
        botId: BOOK_TO_BOT[book.id] || null,
        policy,
        maxPlies,
        pliesPlayed: moves.length,
        stoppedReason,
        bookMoves,
        bookExitPly,
        openingIds: Object.fromEntries(openingIds.entries()),
        materialBalance: finalMaterial.balance,
        minMaterialBalance: metrics.minBalance,
        maxMaterialBalance: metrics.maxBalance,
        blackLoss,
        whiteLoss,
        blackMaxLoss: Math.max(0, ...metrics.blackLossEvents.map((event) => event.value)),
        whiteMaxLoss: Math.max(0, ...metrics.whiteLossEvents.map((event) => event.value)),
        blackMajorLossCount: blackMajorLosses.length,
        blackRoyalLossCount: blackRoyalLosses.length,
        captures: metrics.captures,
        illegalMove,
        moves
    };
    summary.flags = buildFlags(summary, mode);
    return summary;
}

export async function runOpeningSafetyBenchmark(options = {}) {
    const settings = {
        maxPlies: options.maxPlies || DEFAULT_MAX_PLIES,
        thinkMs: options.thinkMs || DEFAULT_THINK_MS,
        policies: options.policies || OPPONENT_POLICIES
    };
    const results = [];

    for (const book of OPENING_BOOKS) {
        for (const policy of settings.policies) {
            results.push(await runScenario({
                book,
                policy,
                mode: 'raw_book',
                maxPlies: settings.maxPlies,
                thinkMs: settings.thinkMs
            }));
            results.push(await runScenario({
                book,
                policy,
                mode: 'integrated_ai',
                maxPlies: settings.maxPlies,
                thinkMs: settings.thinkMs
            }));
        }
    }

    return {
        generatedAt: new Date().toISOString(),
        settings,
        results
    };
}

function summarizeBenchmark(benchmark) {
    const results = benchmark.results;
    const flagged = results.filter((result) => result.flags.length);
    const illegalCount = results.filter((result) => result.illegalMove).length;
    const integrated = results.filter((result) => result.mode === 'integrated_ai');
    const raw = results.filter((result) => result.mode === 'raw_book');
    const totalBookMoves = integrated.reduce((sum, result) => sum + result.bookMoves, 0);
    const averageBookMoves = integrated.length ? totalBookMoves / integrated.length : 0;
    const worstMaterial = [...results].sort((a, b) => a.minMaterialBalance - b.minMaterialBalance)[0] || null;
    const majorLosses = results.filter((result) => result.blackMajorLossCount > 0);

    return {
        scenarioCount: results.length,
        rawScenarioCount: raw.length,
        integratedScenarioCount: integrated.length,
        flaggedCount: flagged.length,
        illegalCount,
        averageIntegratedBookMoves: Number(averageBookMoves.toFixed(2)),
        majorLossScenarioCount: majorLosses.length,
        worstMaterial: worstMaterial
            ? {
                mode: worstMaterial.mode,
                bookId: worstMaterial.bookId,
                policy: worstMaterial.policy,
                minMaterialBalance: worstMaterial.minMaterialBalance,
                flags: worstMaterial.flags
            }
            : null
    };
}

function formatFlags(flags) {
    return flags.length ? flags.join(', ') : '-';
}

function formatOpeningIds(openingIds) {
    const entries = Object.entries(openingIds || {});
    if (!entries.length) return '-';
    return entries.map(([id, count]) => `${id}(${count})`).join(', ');
}

function markdownTable(results) {
    const rows = [
        '| Mode | Opening | Policy | Plies | Book moves | Exit ply | Min mat | Final mat | Black lost | White lost | Openings used | Flags |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |'
    ];

    for (const result of results) {
        rows.push([
            result.mode,
            result.bookId,
            result.policy,
            result.pliesPlayed,
            result.bookMoves,
            result.bookExitPly ?? '-',
            result.minMaterialBalance,
            result.materialBalance,
            result.blackLoss,
            result.whiteLoss,
            formatOpeningIds(result.openingIds),
            formatFlags(result.flags)
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }

    return rows.join('\n');
}

function flaggedMarkdown(results) {
    const flagged = results.filter((result) => result.flags.length);
    if (!flagged.length) {
        return '- No risk flags in this run.';
    }

    return flagged.map((result) => {
        const captureSummary = result.captures
            .filter((event) => event.value >= 50 && event.by === COLORS.WHITE)
            .map((event) => `${event.notation} captured ${event.piece}(${event.value})`)
            .slice(0, 3)
            .join('; ');
        return `- ${result.mode}/${result.bookId}/${result.policy}: ${formatFlags(result.flags)}`
            + (captureSummary ? ` | ${captureSummary}` : '');
    }).join('\n');
}

export function renderOpeningSafetyMarkdown(benchmark) {
    const summary = summarizeBenchmark(benchmark);
    const sortedResults = [...benchmark.results].sort((a, b) => (
        a.bookId.localeCompare(b.bookId)
        || a.policy.localeCompare(b.policy)
        || a.mode.localeCompare(b.mode)
    ));

    return [
        '# Opening Safety Benchmark',
        '',
        `Generated: ${benchmark.generatedAt}`,
        `Max plies: ${benchmark.settings.maxPlies}`,
        `AI think ms: ${benchmark.settings.thinkMs}`,
        '',
        '## Summary',
        '',
        `- Scenarios: ${summary.scenarioCount} (${summary.rawScenarioCount} raw book, ${summary.integratedScenarioCount} integrated AI)`,
        `- Flagged scenarios: ${summary.flaggedCount}`,
        `- Illegal moves: ${summary.illegalCount}`,
        `- Average integrated book moves: ${summary.averageIntegratedBookMoves}`,
        `- Major black loss scenarios: ${summary.majorLossScenarioCount}`,
        `- Worst material: ${summary.worstMaterial ? `${summary.worstMaterial.bookId}/${summary.worstMaterial.policy} min ${summary.worstMaterial.minMaterialBalance}` : '-'}`,
        '',
        '## Risk Flags',
        '',
        flaggedMarkdown(sortedResults),
        '',
        '## Detailed Results',
        '',
        markdownTable(sortedResults),
        ''
    ].join('\n');
}

function writeOutput(relativePath, content) {
    const outputPath = path.resolve(projectRoot, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content);
    return outputPath;
}

async function main() {
    const options = parseArgs();
    const restoreLogs = options.verbose ? () => {} : silenceKnownGameLogs();
    let benchmark;
    try {
        benchmark = await runOpeningSafetyBenchmark(options);
    } finally {
        restoreLogs();
    }
    const markdown = renderOpeningSafetyMarkdown(benchmark);
    const summary = summarizeBenchmark(benchmark);
    const mdPath = writeOutput(options.outputMd, markdown);
    const jsonPath = writeOutput(options.outputJson, JSON.stringify({ ...benchmark, summary }, null, 2));

    console.log(`Opening safety scenarios: ${summary.scenarioCount}`);
    console.log(`Flagged: ${summary.flaggedCount}, illegal: ${summary.illegalCount}, major black losses: ${summary.majorLossScenarioCount}`);
    console.log(`Average integrated book moves: ${summary.averageIntegratedBookMoves}`);
    console.log(`Markdown: ${mdPath}`);
    console.log(`JSON: ${jsonPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
