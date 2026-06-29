import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GameState } from '../../src/game/GameState.js';
import { collectLegalMoves, applyPerftMove } from '../../src/game/Perft.js';
import { COLORS, FORMATIONS, PIECE_VALUES } from '../../src/utils/constants.js';
import { getAIProfile } from '../../src/ai/AIProfiles.js';
import { getAIPersonaLabel } from '../../src/ai/AIPersonas.js';
import { evaluateStateForBlack } from '../../src/ai/AiEvaluation.js';
import { selectAiMoveAnalysisForState } from '../../src/ai/ai.worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const FILES = 'abcdefghijk';

const DEFAULT_MAX_PLIES = 32;
const DEFAULT_THINK_MS = 25;
const DEFAULT_OUTPUT_MD = 'exports/ai-matrix-report.md';
const DEFAULT_OUTPUT_JSON = 'exports/ai-matrix-report.json';

const PERSONAS = Object.freeze(['timur', 'beyazid', 'ulu_bey', 'saray_veziri']);
const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);
const FORMATION_IDS = Object.freeze([FORMATIONS.MASCULINE, FORMATIONS.FEMININE, FORMATIONS.FULL]);
const AI_COLORS = Object.freeze([COLORS.BLACK, COLORS.WHITE]);
const OPPONENT_POLICIES = Object.freeze(['booklike', 'pressure', 'greedy']);

const PREFERRED_OPENING_MOVES = Object.freeze([
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
    'f4>f5',
    'c4>c5',
    'i4>i5'
]);

function parseCsv(value, fallback) {
    if (!value) return [...fallback];
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseArgs(argv = process.argv.slice(2)) {
    const options = {
        maxPlies: DEFAULT_MAX_PLIES,
        thinkMs: DEFAULT_THINK_MS,
        outputMd: DEFAULT_OUTPUT_MD,
        outputJson: DEFAULT_OUTPUT_JSON,
        personas: [...PERSONAS],
        difficulties: [...DIFFICULTIES],
        formations: [...FORMATION_IDS],
        aiColors: [...AI_COLORS],
        policies: [...OPPONENT_POLICIES],
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
        } else if (arg === '--personas' && next) {
            options.personas = parseCsv(next, PERSONAS);
            i += 1;
        } else if (arg === '--difficulties' && next) {
            options.difficulties = parseCsv(next, DIFFICULTIES);
            i += 1;
        } else if (arg === '--formations' && next) {
            options.formations = parseCsv(next, FORMATION_IDS);
            i += 1;
        } else if (arg === '--ai-colors' && next) {
            options.aiColors = parseCsv(next, AI_COLORS);
            i += 1;
        } else if (arg === '--policies' && next) {
            options.policies = parseCsv(next, OPPONENT_POLICIES);
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
    return options;
}

function silenceKnownGameLogs() {
    const originalLog = console.log;
    console.log = (...args) => {
        const text = args.join(' ');
        if (text.includes('Pawn promoted') || text.includes('Pawn of Pawns reached')) return;
        originalLog(...args);
    };
    return () => {
        console.log = originalLog;
    };
}

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
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

function moveKey(moveObj) {
    return `${coordToSquare(moveObj.piece.row, moveObj.piece.col)}>${coordToSquare(moveObj.move.row, moveObj.move.col)}`;
}

function pieceValue(piece) {
    return PIECE_VALUES[piece?.type] ?? 0;
}

function materialValue(state, color) {
    return state.board.pieces
        .filter((piece) => piece.color === color)
        .reduce((total, piece) => total + pieceValue(piece), 0);
}

function materialBalanceForAi(state, aiColor) {
    const opponentColor = getOppositeColor(aiColor);
    return materialValue(state, aiColor) - materialValue(state, opponentColor);
}

function evalForAi(state, aiColor, profile) {
    const blackScore = evaluateStateForBlack(state, profile);
    return aiColor === COLORS.BLACK ? blackScore : -blackScore;
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

function scoreOpponentMove(state, moveObj, policy, aiColor) {
    const opponentColor = getOppositeColor(aiColor);
    const target = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    const captureValue = target?.color === aiColor ? pieceValue(target) : 0;
    const movingValue = pieceValue(moveObj.piece);
    const centerDistance = Math.abs(moveObj.move.col - 5) + Math.abs(moveObj.move.row - 4.5);
    const centerScore = Math.max(0, 10 - centerDistance);
    const forwardScore = opponentColor === COLORS.WHITE
        ? Math.max(0, moveObj.piece.row - moveObj.move.row)
        : Math.max(0, moveObj.move.row - moveObj.piece.row);
    const royalPenalty = movingValue >= 1000 ? -80 : 0;

    if (policy === 'greedy') {
        return (captureValue * 100) + centerScore + forwardScore + royalPenalty;
    }

    if (policy === 'pressure') {
        return (captureValue * 45) + (forwardScore * 9) + (centerScore * 5) - (movingValue * 0.04) + royalPenalty;
    }

    const preferredIndex = opponentColor === COLORS.WHITE
        ? PREFERRED_OPENING_MOVES.indexOf(moveKey(moveObj))
        : -1;
    const preferredScore = preferredIndex >= 0 ? 140 - preferredIndex : 0;
    return preferredScore + (captureValue * 30) + (centerScore * 2) + forwardScore + royalPenalty;
}

function chooseOpponentMove(state, policy, aiColor) {
    const opponentColor = getOppositeColor(aiColor);
    const legalMoves = collectLegalMoves(state, opponentColor);
    if (!legalMoves.length) return null;

    if (policy === 'booklike' && opponentColor === COLORS.WHITE) {
        for (const preferred of PREFERRED_OPENING_MOVES) {
            const match = legalMoves.find((moveObj) => moveKey(moveObj) === preferred);
            if (match) return match;
        }
    }

    return legalMoves
        .map((moveObj) => ({
            moveObj,
            score: scoreOpponentMove(state, moveObj, policy, aiColor)
        }))
        .sort((a, b) => b.score - a.score)[0]?.moveObj || legalMoves[0];
}

function findChosenCandidate(searchInfo, moveObj) {
    if (!Array.isArray(searchInfo?.candidates)) return null;
    return searchInfo.candidates.find((candidate) => sameMove(candidate.move, moveObj)) || null;
}

function getAiMoveContext(analysis, moveObj) {
    const candidate = findChosenCandidate(analysis?.searchInfo, moveObj);
    const metadata = candidate?.metadata || {};
    return {
        usedOpeningBook: Boolean(moveObj?.openingBook || analysis?.searchInfo?.usedOpeningBook),
        openingId: moveObj?.openingId || null,
        score: Number.isFinite(candidate?.score) ? Number(candidate.score.toFixed(2)) : null,
        dangerLevel: candidate?.tacticalRisk?.dangerLevel ?? 0,
        staticExchangeScore: Number.isFinite(candidate?.staticExchange?.score)
            ? Number(candidate.staticExchange.score.toFixed(2))
            : null,
        exchangeDebt: Number.isFinite(candidate?.staticExchange?.exchangeDebt)
            ? Number(candidate.staticExchange.exchangeDebt.toFixed(2))
            : Number.isFinite(metadata.exchangeDebt) ? Number(metadata.exchangeDebt.toFixed(2)) : 0,
        replyCaptureValue: candidate?.opponentReplyThreat?.bestCaptureValue ?? 0,
        tempoLoss: Boolean(metadata.tempoLoss),
        candidateCount: analysis?.searchInfo?.candidateCount ?? null,
        timedOut: Boolean(analysis?.searchInfo?.timedOut),
        mateFound: Boolean(analysis?.searchInfo?.mateFound),
        miniTablebase: Boolean(analysis?.searchInfo?.miniTablebase)
    };
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
        openingBook: Boolean(extras.usedOpeningBook),
        openingId: extras.openingId || null
    });
}

function applyAndMeasure(state, moveObj, color, aiColor, profile, extras = {}) {
    const beforeBalance = materialBalanceForAi(state, aiColor);
    const beforeEval = evalForAi(state, aiColor, profile);
    const details = getMoveDetails(moveObj);
    const capturedPiece = state.board.getPieceAt(moveObj.move.row, moveObj.move.col);
    const captured = capturedPiece?.color !== color ? capturedPiece : null;

    applyPerftMove(state, moveObj);
    recordAppliedMove(state, details, color, captured, extras);

    return {
        details,
        captured,
        beforeBalance,
        afterBalance: materialBalanceForAi(state, aiColor),
        beforeEval,
        afterEval: evalForAi(state, aiColor, profile)
    };
}

async function createScenarioState({ formation, difficulty, personaId, aiColor }) {
    const state = await GameState.createInitialState(formation);
    state.formation = formation;
    state.difficulty = difficulty;
    state.aiPersonaId = personaId;
    state.aiBotId = null;
    state.aiColor = aiColor;
    state.playerColor = getOppositeColor(aiColor);
    state.currentTurn = COLORS.WHITE;
    state.timeControl = '15';
    return state;
}

function createInitialMetrics(state, aiColor, profile) {
    const initialAiMaterial = materialValue(state, aiColor);
    const initialOpponentMaterial = materialValue(state, getOppositeColor(aiColor));
    const initialBalance = initialAiMaterial - initialOpponentMaterial;
    const initialEval = evalForAi(state, aiColor, profile);
    return {
        initialAiMaterial,
        initialOpponentMaterial,
        minMaterialBalance: initialBalance,
        maxMaterialBalance: initialBalance,
        minEval: initialEval,
        maxEval: initialEval,
        aiLossEvents: [],
        opponentLossEvents: [],
        aiMoves: 0,
        opponentMoves: 0,
        aiCaptures: 0,
        opponentCaptures: 0,
        bookMoves: 0,
        unsafeAiMoves: 0,
        tempoLossMoves: 0,
        timedOutMoves: 0,
        candidateCounts: [],
        openingIds: new Map(),
        moves: []
    };
}

function updateMetrics(metrics, ply, color, aiColor, applied, aiContext = null) {
    metrics.minMaterialBalance = Math.min(metrics.minMaterialBalance, applied.afterBalance);
    metrics.maxMaterialBalance = Math.max(metrics.maxMaterialBalance, applied.afterBalance);
    metrics.minEval = Math.min(metrics.minEval, applied.afterEval);
    metrics.maxEval = Math.max(metrics.maxEval, applied.afterEval);

    if (color === aiColor) {
        metrics.aiMoves += 1;
        if (aiContext?.usedOpeningBook) {
            metrics.bookMoves += 1;
            if (aiContext.openingId) {
                metrics.openingIds.set(aiContext.openingId, (metrics.openingIds.get(aiContext.openingId) || 0) + 1);
            }
        }
        if ((aiContext?.dangerLevel ?? 0) > 0 || (aiContext?.exchangeDebt ?? 0) > 20 || (aiContext?.replyCaptureValue ?? 0) > 60) {
            metrics.unsafeAiMoves += 1;
        }
        if (aiContext?.tempoLoss) metrics.tempoLossMoves += 1;
        if (aiContext?.timedOut) metrics.timedOutMoves += 1;
        if (Number.isFinite(aiContext?.candidateCount)) metrics.candidateCounts.push(aiContext.candidateCount);
    }

    if (color === aiColor && applied.captured) metrics.aiCaptures += 1;
    if (color !== aiColor && applied.captured) metrics.opponentCaptures += 1;

    if (applied.captured) {
        const event = {
            ply,
            by: color,
            piece: applied.captured.type,
            value: pieceValue(applied.captured),
            notation: applied.details.notation
        };
        if (applied.captured.color === aiColor) metrics.aiLossEvents.push(event);
        if (applied.captured.color !== aiColor) metrics.opponentLossEvents.push(event);
    }

    metrics.moves.push({
        ply,
        color,
        notation: applied.details.notation,
        captured: applied.captured?.type || null,
        aiMove: color === aiColor,
        openingBook: Boolean(aiContext?.usedOpeningBook),
        openingId: aiContext?.openingId || null,
        aiScore: aiContext?.score ?? null,
        dangerLevel: aiContext?.dangerLevel ?? null,
        exchangeDebt: aiContext?.exchangeDebt ?? null,
        replyCaptureValue: aiContext?.replyCaptureValue ?? null
    });
}

function sumLoss(events) {
    return events.reduce((total, event) => total + event.value, 0);
}

function buildFlags(summary) {
    const flags = [];
    const isHard = summary.difficulty === 'hard';
    const isMedium = summary.difficulty === 'medium';
    const materialLimit = isHard ? -45 : (isMedium ? -75 : -110);
    const evalLimit = isHard ? -140 : (isMedium ? -220 : -320);
    const majorLossLimit = isHard ? 50 : (isMedium ? 60 : 90);
    const unsafeLimit = isHard ? 0 : (isMedium ? 1 : 3);
    const tempoLimit = isHard ? 0 : (isMedium ? 2 : 4);

    if (summary.illegalMove) flags.push('illegal_ai_move');
    if (summary.stoppedReason === 'ai_no_choice') flags.push('ai_no_choice');
    if (summary.result === 'loss') flags.push('terminal_loss');
    if (summary.aiRoyalLossCount > 0) flags.push('ai_royal_lost');
    if (summary.minMaterialBalance <= materialLimit) flags.push('material_drop');
    if (summary.minEval <= evalLimit) flags.push('eval_drop');
    if (summary.aiMaxLoss >= majorLossLimit && summary.aiLoss > summary.opponentLoss + 20) {
        flags.push('uncompensated_major_loss');
    }
    if (summary.unsafeAiMoves > unsafeLimit) flags.push('unsafe_ai_moves');
    if (summary.tempoLossMoves > tempoLimit) flags.push('tempo_loss');
    if (summary.bookMoves >= 3 && summary.aiLoss > summary.opponentLoss + 20) flags.push('book_overfit_loss');

    return flags;
}

async function runScenario(settings, scenario) {
    const profile = getAIProfile(scenario.difficulty, scenario.personaId);
    const state = await createScenarioState(scenario);
    const metrics = createInitialMetrics(state, scenario.aiColor, profile);
    let illegalMove = null;
    let stoppedReason = 'max_plies';

    for (let ply = 1; ply <= settings.maxPlies; ply += 1) {
        if (state.isGameOver?.()) {
            stoppedReason = 'game_over';
            break;
        }

        const color = state.currentTurn;
        let moveObj = null;
        let aiContext = null;

        if (color === scenario.aiColor) {
            const analysis = selectAiMoveAnalysisForState(state, { maxThinkMs: settings.thinkMs });
            const choice = analysis?.move || null;
            if (!choice) {
                stoppedReason = 'ai_no_choice';
                break;
            }
            moveObj = resolveLegalMove(state, choice, color);
            if (!moveObj) {
                illegalMove = { ply, color, requested: choice.openingId || 'ai_move' };
                stoppedReason = 'illegal_ai_move';
                break;
            }
            aiContext = getAiMoveContext(analysis, choice);
        } else {
            moveObj = chooseOpponentMove(state, scenario.policy, scenario.aiColor);
            if (!moveObj) {
                stoppedReason = 'opponent_no_choice';
                break;
            }
        }

        const applied = applyAndMeasure(state, moveObj, color, scenario.aiColor, profile, aiContext || {});
        updateMetrics(metrics, ply, color, scenario.aiColor, applied, aiContext);
    }

    const finalAiMaterial = materialValue(state, scenario.aiColor);
    const finalOpponentMaterial = materialValue(state, getOppositeColor(scenario.aiColor));
    const aiLoss = metrics.initialAiMaterial - finalAiMaterial;
    const opponentLoss = metrics.initialOpponentMaterial - finalOpponentMaterial;
    const avgCandidateCount = metrics.candidateCounts.length
        ? metrics.candidateCounts.reduce((sum, count) => sum + count, 0) / metrics.candidateCounts.length
        : 0;

    let result = 'unfinished';
    if (state.status === 'game_over') {
        if (state.winner === scenario.aiColor) result = 'win';
        else if (state.winner === getOppositeColor(scenario.aiColor)) result = 'loss';
        else result = 'draw';
    }

    const summary = {
        ...scenario,
        personaLabel: getAIPersonaLabel(scenario.personaId, 'tr'),
        maxPlies: settings.maxPlies,
        thinkMs: settings.thinkMs,
        pliesPlayed: metrics.moves.length,
        stoppedReason,
        result,
        winner: state.winner || null,
        aiLoss,
        opponentLoss,
        aiMaxLoss: Math.max(0, ...metrics.aiLossEvents.map((event) => event.value)),
        opponentMaxLoss: Math.max(0, ...metrics.opponentLossEvents.map((event) => event.value)),
        aiMajorLossCount: metrics.aiLossEvents.filter((event) => event.value >= 50).length,
        aiRoyalLossCount: metrics.aiLossEvents.filter((event) => event.value >= 1000).length,
        aiCaptures: metrics.aiCaptures,
        opponentCaptures: metrics.opponentCaptures,
        materialBalance: finalAiMaterial - finalOpponentMaterial,
        minMaterialBalance: Number(metrics.minMaterialBalance.toFixed(2)),
        maxMaterialBalance: Number(metrics.maxMaterialBalance.toFixed(2)),
        finalEval: Number(evalForAi(state, scenario.aiColor, profile).toFixed(2)),
        minEval: Number(metrics.minEval.toFixed(2)),
        maxEval: Number(metrics.maxEval.toFixed(2)),
        bookMoves: metrics.bookMoves,
        openingIds: Object.fromEntries(metrics.openingIds.entries()),
        unsafeAiMoves: metrics.unsafeAiMoves,
        tempoLossMoves: metrics.tempoLossMoves,
        timedOutMoves: metrics.timedOutMoves,
        avgCandidateCount: Number(avgCandidateCount.toFixed(2)),
        illegalMove,
        moves: metrics.moves
    };
    summary.flags = buildFlags(summary);
    return summary;
}

function buildScenarios(options) {
    const scenarios = [];
    for (const personaId of options.personas) {
        for (const difficulty of options.difficulties) {
            for (const formation of options.formations) {
                for (const aiColor of options.aiColors) {
                    for (const policy of options.policies) {
                        scenarios.push({ personaId, difficulty, formation, aiColor, policy });
                    }
                }
            }
        }
    }
    return scenarios;
}

export async function runAiMatrixBenchmark(options = {}) {
    const settings = {
        maxPlies: options.maxPlies || DEFAULT_MAX_PLIES,
        thinkMs: options.thinkMs || DEFAULT_THINK_MS
    };
    const scenarios = buildScenarios({
        personas: options.personas || PERSONAS,
        difficulties: options.difficulties || DIFFICULTIES,
        formations: options.formations || FORMATION_IDS,
        aiColors: options.aiColors || AI_COLORS,
        policies: options.policies || OPPONENT_POLICIES
    });
    const results = [];

    for (const scenario of scenarios) {
        results.push(await runScenario(settings, scenario));
    }

    return {
        generatedAt: new Date().toISOString(),
        settings: {
            ...settings,
            personas: options.personas || PERSONAS,
            difficulties: options.difficulties || DIFFICULTIES,
            formations: options.formations || FORMATION_IDS,
            aiColors: options.aiColors || AI_COLORS,
            policies: options.policies || OPPONENT_POLICIES
        },
        results
    };
}

function average(values) {
    const numeric = values.filter(Number.isFinite);
    if (!numeric.length) return 0;
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function groupBy(results, getKey) {
    const groups = new Map();
    for (const result of results) {
        const key = getKey(result);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(result);
    }
    return groups;
}

function summarizeGroup(items) {
    const flagged = items.filter((item) => item.flags.length);
    return {
        scenarios: items.length,
        flagged: flagged.length,
        wins: items.filter((item) => item.result === 'win').length,
        losses: items.filter((item) => item.result === 'loss').length,
        draws: items.filter((item) => item.result === 'draw').length,
        avgFinalMaterial: Number(average(items.map((item) => item.materialBalance)).toFixed(2)),
        avgMinMaterial: Number(average(items.map((item) => item.minMaterialBalance)).toFixed(2)),
        avgFinalEval: Number(average(items.map((item) => item.finalEval)).toFixed(2)),
        avgBookMoves: Number(average(items.map((item) => item.bookMoves)).toFixed(2)),
        avgUnsafeMoves: Number(average(items.map((item) => item.unsafeAiMoves)).toFixed(2)),
        avgTempoLoss: Number(average(items.map((item) => item.tempoLossMoves)).toFixed(2))
    };
}

function summarizeBenchmark(benchmark) {
    const results = benchmark.results;
    const flagged = results.filter((result) => result.flags.length);
    const byDifficulty = Object.fromEntries([...groupBy(results, (item) => item.difficulty)]
        .map(([key, items]) => [key, summarizeGroup(items)]));
    const byPersona = Object.fromEntries([...groupBy(results, (item) => item.personaId)]
        .map(([key, items]) => [key, summarizeGroup(items)]));
    const byPersonaDifficulty = Object.fromEntries([...groupBy(results, (item) => `${item.personaId}/${item.difficulty}`)]
        .map(([key, items]) => [key, summarizeGroup(items)]));

    return {
        scenarioCount: results.length,
        flaggedCount: flagged.length,
        illegalCount: results.filter((result) => result.illegalMove).length,
        terminalLossCount: results.filter((result) => result.result === 'loss').length,
        avgFinalMaterial: Number(average(results.map((result) => result.materialBalance)).toFixed(2)),
        avgMinMaterial: Number(average(results.map((result) => result.minMaterialBalance)).toFixed(2)),
        avgBookMoves: Number(average(results.map((result) => result.bookMoves)).toFixed(2)),
        avgUnsafeMoves: Number(average(results.map((result) => result.unsafeAiMoves)).toFixed(2)),
        byDifficulty,
        byPersona,
        byPersonaDifficulty,
        topRisks: flagged
            .sort((a, b) => (
                a.minMaterialBalance - b.minMaterialBalance
                || b.unsafeAiMoves - a.unsafeAiMoves
            ))
            .slice(0, 12)
            .map((result) => ({
                personaId: result.personaId,
                difficulty: result.difficulty,
                formation: result.formation,
                aiColor: result.aiColor,
                policy: result.policy,
                flags: result.flags,
                minMaterialBalance: result.minMaterialBalance,
                aiLoss: result.aiLoss,
                opponentLoss: result.opponentLoss
            }))
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

function scenarioTable(results) {
    const rows = [
        '| Persona | Difficulty | Formation | AI color | Opponent | Plies | Result | Book | Min mat | Final mat | AI lost | Opp lost | Unsafe | Tempo | Openings | Flags |',
        '| --- | --- | --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |'
    ];

    for (const result of results) {
        rows.push([
            result.personaId,
            result.difficulty,
            result.formation,
            result.aiColor,
            result.policy,
            result.pliesPlayed,
            result.result,
            result.bookMoves,
            result.minMaterialBalance,
            result.materialBalance,
            result.aiLoss,
            result.opponentLoss,
            result.unsafeAiMoves,
            result.tempoLossMoves,
            formatOpeningIds(result.openingIds),
            formatFlags(result.flags)
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }

    return rows.join('\n');
}

function groupTable(summary, groupTitle, groups) {
    const rows = [
        `### ${groupTitle}`,
        '',
        '| Group | Scenarios | Flags | W/L/D | Avg min mat | Avg final mat | Avg eval | Avg book | Avg unsafe | Avg tempo |',
        '| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |'
    ];

    for (const [key, item] of Object.entries(groups)) {
        rows.push([
            key,
            item.scenarios,
            item.flagged,
            `${item.wins}/${item.losses}/${item.draws}`,
            item.avgMinMaterial,
            item.avgFinalMaterial,
            item.avgFinalEval,
            item.avgBookMoves,
            item.avgUnsafeMoves,
            item.avgTempoLoss
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }

    return rows.join('\n');
}

function riskMarkdown(summary) {
    if (!summary.topRisks.length) return '- No risk flags in this run.';
    return summary.topRisks.map((risk) => (
        `- ${risk.personaId}/${risk.difficulty}/${risk.formation}/${risk.aiColor}/${risk.policy}: `
        + `${risk.flags.join(', ')} | min material ${risk.minMaterialBalance}, AI lost ${risk.aiLoss}, opponent lost ${risk.opponentLoss}`
    )).join('\n');
}

export function renderAiMatrixMarkdown(benchmark) {
    const summary = summarizeBenchmark(benchmark);
    const sortedResults = [...benchmark.results].sort((a, b) => (
        a.personaId.localeCompare(b.personaId)
        || a.difficulty.localeCompare(b.difficulty)
        || a.formation.localeCompare(b.formation)
        || a.aiColor.localeCompare(b.aiColor)
        || a.policy.localeCompare(b.policy)
    ));

    return [
        '# AI Character Difficulty Matrix',
        '',
        `Generated: ${benchmark.generatedAt}`,
        `Max plies: ${benchmark.settings.maxPlies}`,
        `AI think ms: ${benchmark.settings.thinkMs}`,
        `Personas: ${benchmark.settings.personas.join(', ')}`,
        `Difficulties: ${benchmark.settings.difficulties.join(', ')}`,
        `Formations: ${benchmark.settings.formations.join(', ')}`,
        `AI colors: ${benchmark.settings.aiColors.join(', ')}`,
        `Opponent policies: ${benchmark.settings.policies.join(', ')}`,
        '',
        '## Summary',
        '',
        `- Scenarios: ${summary.scenarioCount}`,
        `- Flagged scenarios: ${summary.flaggedCount}`,
        `- Illegal AI moves: ${summary.illegalCount}`,
        `- Terminal AI losses: ${summary.terminalLossCount}`,
        `- Average min material: ${summary.avgMinMaterial}`,
        `- Average final material: ${summary.avgFinalMaterial}`,
        `- Average book moves: ${summary.avgBookMoves}`,
        `- Average unsafe AI moves: ${summary.avgUnsafeMoves}`,
        '',
        groupTable(summary, 'By difficulty', summary.byDifficulty),
        '',
        groupTable(summary, 'By persona', summary.byPersona),
        '',
        groupTable(summary, 'By persona and difficulty', summary.byPersonaDifficulty),
        '',
        '## Top Risk Scenarios',
        '',
        riskMarkdown(summary),
        '',
        '## Scenario Details',
        '',
        scenarioTable(sortedResults),
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
        benchmark = await runAiMatrixBenchmark(options);
    } finally {
        restoreLogs();
    }

    const markdown = renderAiMatrixMarkdown(benchmark);
    const summary = summarizeBenchmark(benchmark);
    const mdPath = writeOutput(options.outputMd, markdown);
    const jsonPath = writeOutput(options.outputJson, JSON.stringify({ ...benchmark, summary }, null, 2));

    console.log(`AI matrix scenarios: ${summary.scenarioCount}`);
    console.log(`Flagged: ${summary.flaggedCount}, illegal: ${summary.illegalCount}, terminal losses: ${summary.terminalLossCount}`);
    console.log(`Average min material: ${summary.avgMinMaterial}, average unsafe moves: ${summary.avgUnsafeMoves}`);
    console.log(`Markdown: ${mdPath}`);
    console.log(`JSON: ${jsonPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
