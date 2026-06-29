import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { loadGames, DEFAULT_INPUT, getAiColor, getLocalColor, writeJson } from './games-export-utils.mjs';
import { GameState } from '../../src/game/GameState.js';
import { MoveValidator } from '../../src/game/MoveValidator.js';
import { GameRules } from '../../src/game/GameRules.js';
import { serializeGameStateSnapshot, getCoordinateLabel } from '../../src/analysis/AnalysisSerialization.js';
import { buildPositionHash } from '../../src/ai/AiStrategy.js';
import { COLORS, FORMATIONS, PIECE_TYPES, PIECE_VALUES } from '../../src/utils/constants.js';

const DEFAULT_JSON_OUTPUT = path.resolve(process.cwd(), 'exports', 'game-analysis-report.json');
const DEFAULT_MD_OUTPUT = path.resolve(process.cwd(), 'exports', 'game-analysis-report.md');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputJson: DEFAULT_JSON_OUTPUT,
        outputMd: DEFAULT_MD_OUTPUT
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];

        if (value === '--help' || value === '-h') {
            args.help = true;
        } else if (value === '--input' && argv[index + 1]) {
            args.inputPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        } else if (value === '--output-json' && argv[index + 1]) {
            args.outputJson = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        } else if (value === '--output-md' && argv[index + 1]) {
            args.outputMd = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Oyun kayit analiz raporu

Kullanim:
  node functions/scripts/analyze-game-records.mjs

Opsiyonlar:
  --input <path>         Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output-json <path>   JSON rapor cikti yolu
  --output-md <path>     Markdown rapor cikti yolu
  --help                 Bu yardimi goster
`);
}

function normalizeResultType(value) {
    if (value === 'stalemate') return 'stalemate_win';
    return value || null;
}

function normalizeFormation(value) {
    if (value === FORMATIONS.FEMININE || value === FORMATIONS.FULL || value === FORMATIONS.MASCULINE) {
        return value;
    }
    return FORMATIONS.MASCULINE;
}

function formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
}

function addIssue(issues, type, moveIndex, detail) {
    issues.push({
        type,
        moveIndex,
        detail
    });
}

function collectSideMetrics(moves, color) {
    const sideMoves = moves.filter((move) => move.color === color);
    const openingMoves = sideMoves.slice(0, 8);
    const openingNonPawnTypes = new Set(
        openingMoves
            .map((move) => move.pieceTypeBefore)
            .filter((pieceType) => pieceType && pieceType !== PIECE_TYPES.PAWN)
    );

    let captures = 0;
    let checks = 0;
    let pawnMoves = 0;
    let specialMoves = 0;
    let reversals = 0;

    for (let index = 0; index < sideMoves.length; index += 1) {
        const move = sideMoves[index];
        if (move.capturedPieceType) captures += 1;
        if (move.isCheck) checks += 1;
        if (move.pieceTypeBefore === PIECE_TYPES.PAWN) pawnMoves += 1;
        if (move.specialMoveType || (move.specialTags || []).some((tag) => ['promotion', 'pawn_cycle'].includes(tag))) {
            specialMoves += 1;
        }

        const previousOwnMove = index > 0 ? sideMoves[index - 1] : null;
        if (
            previousOwnMove
            && previousOwnMove.fromRow === move.toRow
            && previousOwnMove.fromCol === move.toCol
            && previousOwnMove.toRow === move.fromRow
            && previousOwnMove.toCol === move.fromCol
        ) {
            reversals += 1;
        }
    }

    const totalMoves = sideMoves.length || 1;

    return {
        totalMoves: sideMoves.length,
        captures,
        checks,
        pawnMoves,
        specialMoves,
        reversals,
        samePieceReversals: reversals,
        openingNonPawnTypes: [...openingNonPawnTypes],
        captureRate: captures / totalMoves,
        checkRate: checks / totalMoves,
        pawnRate: pawnMoves / totalMoves
    };
}

function getNonRoyalMaterialDiffForBlack(pieces = []) {
    let black = 0;
    let white = 0;

    for (const piece of pieces) {
        if (GameRules.isRoyalType(piece.type)) continue;
        const value = PIECE_VALUES[piece.type] || 0;
        if (piece.color === COLORS.BLACK) black += value;
        else white += value;
    }

    return black - white;
}

function buildStyleLabel(metrics, moveCount) {
    const labels = [];

    if (metrics.reversals >= 2) labels.push('tekrara acik');
    if (metrics.captureRate >= 0.22 || metrics.checkRate >= 0.08) labels.push('atak odakli');
    if (metrics.openingNonPawnTypes.length >= 4) labels.push('gelisim odakli');
    if (metrics.pawnRate >= 0.58) labels.push('piyon agirlikli');
    if (moveCount >= 120) labels.push('uzun oyun sabri');

    if (!labels.length) labels.push('dengeli');
    return labels.slice(0, 2);
}

function buildAiBehaviorSummary(gameMeta, aiMetrics, playerMetrics, replayMeta) {
    const notes = [];
    const difficulty = gameMeta?.difficulty || 'medium';
    const winner = gameMeta?.winner || null;
    const resultType = gameMeta?.resultType || null;
    const aiColor = replayMeta.aiColor;
    const aiWon = winner === aiColor;

    if (difficulty === 'easy' && aiMetrics.reversals >= 1) {
        notes.push('kolay seviyede tekrar ve tempo kaybi goruldu');
    }

    if (aiWon && resultType === 'stalemate_win') {
        notes.push('pat zaferini kullanarak oyunu kapatti');
    } else if (aiWon && ['checkmate', 'royal_capture'].includes(resultType)) {
        notes.push('bitirici bir kapanis buldu');
    } else if (!aiWon && winner) {
        notes.push('oyunu savunarak tutmakta zorlandi');
    }

    if (aiMetrics.captureRate > playerMetrics.captureRate + 0.08) {
        notes.push('oyuna daha temasli yaklasti');
    } else if (aiMetrics.captureRate + 0.08 < playerMetrics.captureRate) {
        notes.push('temkinli ve dusuk temasli oynadi');
    }

    if (replayMeta.endgameMoves >= 40) {
        notes.push('son oyunu kapatmasi uzun surdu');
    }

    if (aiMetrics.specialMoves > 0) {
        notes.push('ozel Timur kurallarini aktif kullandi');
    }

    if (replayMeta.firstWinningRepeatMove) {
        notes.push('kazandigi pozisyonda tekrar egilimi gostermeye basladi');
    }

    if (!notes.length) notes.push('profiline uygun dengeli davrandi');
    return notes;
}

function buildImprovementHints(game, playerMetrics, aiMetrics, replayMeta) {
    const hints = [];
    const aiWon = game?.winner === replayMeta.aiColor;
    const aiLost = Boolean(game?.winner && game.winner !== 'draw' && game.winner !== replayMeta.aiColor);

    if (game?.difficulty === 'easy' && aiMetrics.reversals >= 2) {
        hints.push('easy AI icin tekrar ve geri alma cezasi biraz daha artirilmali');
    }

    if (game?.difficulty === 'easy' && aiLost && game?.resultType === 'stalemate_win') {
        hints.push('easy AI pat tuzaklarini savunmada daha erken gormeli');
    }

    if (game?.difficulty === 'easy' && game?.resultType === 'citadel_draw') {
        hints.push('easy AI hisar beraberligine giden cizgileri rakip lehine acmaktan daha cok kacinmali');
    }

    if (game?.difficulty === 'hard' && aiWon && replayMeta.endgameMoves >= 30) {
        hints.push('hard AI kazandigi son oyunu daha hizli kapatmak icin conversion baskisi artirilmali');
    }

    if (replayMeta.endgameStartMaterialDiffForBlack != null && replayMeta.endgameMoves >= 20) {
        hints.push('son oyun baslangicindaki materyal avantaji kapatmaya daha hizli donusturulmeli');
    }

    if (aiMetrics.checks >= 20 && !aiWon) {
        hints.push('AI sah baskisi kuruyor ama bitirici plana cevirmekte zorlanıyor; conversion yerine sadece check ureten cizgiler ayiklanmali');
    }

    if (playerMetrics.captureRate > aiMetrics.captureRate + 0.12) {
        hints.push('AI temasli takaslarda geride kalmis; savunma altinda malzeme koruma agirligi biraz artirilmali');
    }

    if (!hints.length) {
        hints.push('bu oyunda acil tuning sinyali dusuk');
    }

    return hints;
}

function summarizeIssues(issues) {
    const illegalMoves = issues.filter((issue) => issue.type === 'illegal_move').length;
    const hashMismatches = issues.filter((issue) => issue.type === 'hash_mismatch').length;
    const typeMismatches = issues.filter((issue) => issue.type === 'piece_mismatch').length;
    const resultMismatches = issues.filter((issue) => issue.type === 'result_mismatch').length;

    return {
        total: issues.length,
        illegalMoves,
        hashMismatches,
        typeMismatches,
        resultMismatches
    };
}

function buildOverallSummary(reports) {
    const summary = {
        totalGames: reports.length,
        fullyLegalGames: 0,
        totalIllegalMoves: 0,
        totalHashMismatches: 0,
        resultTypes: {},
        difficulties: {},
        aiWins: 0,
        playerWins: 0,
        draws: 0
    };

    for (const report of reports) {
        if (report.legality.allMovesValid && report.legality.hashMismatches === 0) {
            summary.fullyLegalGames += 1;
        }

        summary.totalIllegalMoves += report.legality.illegalMoves;
        summary.totalHashMismatches += report.legality.hashMismatches;

        const resultType = report.game.resultType || 'unknown';
        summary.resultTypes[resultType] = (summary.resultTypes[resultType] || 0) + 1;

        const difficulty = report.game.difficulty || 'unknown';
        summary.difficulties[difficulty] = (summary.difficulties[difficulty] || 0) + 1;

        if (report.game.winner === 'draw') summary.draws += 1;
        else if (report.game.winner === report.ai.color) summary.aiWins += 1;
        else if (report.game.winner === report.player.color) summary.playerWins += 1;
    }

    return summary;
}

function toReplayStateHash(gameState) {
    const snapshot = serializeGameStateSnapshot(gameState);
    return buildPositionHash(snapshot);
}

function buildComputedResult(state) {
    const validator = new MoveValidator(state);
    const currentTurn = state.currentTurn;
    let resultType = null;

    const royalElimination = GameRules.resolveRoyalElimination(state, currentTurn);
    if (royalElimination) {
        resultType = royalElimination;
    } else if (validator.isCheckmate(currentTurn)) {
        state.checkmate = true;
        state.status = 'game_over';
        state.winner = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        resultType = 'checkmate';
    } else if (validator.isStalemate(currentTurn)) {
        state.stalemate = true;
        state.status = 'game_over';
        state.winner = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        resultType = 'stalemate_win';
    } else if (validator.isCheck(currentTurn)) {
        resultType = null;
    }

    if (state.winner === 'Draw (Hisar)') {
        resultType = 'citadel_draw';
    }

    return resultType;
}

async function replayGame(game) {
    const formation = normalizeFormation(game?.game?.formation);
    const state = await GameState.createInitialState(formation);
    state.difficulty = game?.game?.difficulty || 'medium';

    const moves = [...(game?.moves || [])].sort((left, right) => left.index - right.index);
    const issues = [];
    const replayMoves = [];
    const afterPieceCounts = [];
    const seenAfterHashes = new Map();
    let endgameStartMaterialDiffForBlack = null;

    for (const move of moves) {
        const beforeHash = toReplayStateHash(state);
        if (move.beforeHash && move.beforeHash !== beforeHash) {
            addIssue(
                issues,
                'hash_mismatch',
                move.index,
                `Hamle oncesi hash beklenen ${move.beforeHash}, hesaplanan ${beforeHash}`
            );
        }

        if (state.currentTurn !== move.color) {
            addIssue(
                issues,
                'turn_mismatch',
                move.index,
                `Sira ${state.currentTurn} iken kayitli hamle rengi ${move.color}`
            );
        }

        const piece = state.board.getPieceAt(move.fromRow, move.fromCol);
        if (!piece) {
            addIssue(
                issues,
                'piece_mismatch',
                move.index,
                `${move.notation} baslangic karesinde tas bulunamadi`
            );
            break;
        }

        if (piece.color !== move.color || piece.type !== move.pieceTypeBefore) {
            addIssue(
                issues,
                'piece_mismatch',
                move.index,
                `${move.notation} icin beklenen ${move.color}/${move.pieceTypeBefore}, bulunan ${piece.color}/${piece.type}`
            );
        }

        const validator = new MoveValidator(state);
        const legalMoves = validator.getLegalMoves(move.fromRow, move.fromCol);
        const selectedMove = legalMoves.find((candidate) => (
            candidate.row === move.toRow
            && candidate.col === move.toCol
            && (candidate.specialMove || null) === (move.specialMoveType || null)
        ));

        if (!selectedMove) {
            addIssue(
                issues,
                'illegal_move',
                move.index,
                `${move.notation} (${move.specialMoveType || 'normal'}) yasal hamle listesinde yok`
            );
        }

        let capturedPiece = null;
        let activePiece = null;

        if (move.specialMoveType === 'royal_swap') {
            const targetPiece = state.board.getPieceAt(move.toRow, move.toCol);
            const effects = GameRules.applyRoyalSwap(state, piece, targetPiece);
            activePiece = effects?.activePiece || state.board.getPieceAt(move.toRow, move.toCol);
        } else if (move.specialMoveType === 'citadel_exchange') {
            const targetPiece = state.board.getPieceAt(move.toRow, move.toCol);
            const effects = GameRules.applyCitadelExchange(state, piece, targetPiece);
            activePiece = effects?.activePiece || state.board.getPieceAt(move.toRow, move.toCol);
        } else {
            const moveData = state.board.movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
            capturedPiece = moveData?.capturedPiece || null;
            if (capturedPiece) state.addCapture(capturedPiece);

            const postMoveEffects = GameRules.applyPostMoveEffects(state, piece, move.toRow, move.toCol);
            activePiece = postMoveEffects?.activePiece || state.board.getPieceAt(move.toRow, move.toCol);
        }

        state.switchTurn();
        const computedResultType = normalizeResultType(buildComputedResult(state));
        const afterHash = toReplayStateHash(state);

        if (move.afterHash && move.afterHash !== afterHash) {
            addIssue(
                issues,
                'hash_mismatch',
                move.index,
                `Hamle sonrasi hash beklenen ${move.afterHash}, hesaplanan ${afterHash}`
            );
        }

        if ((capturedPiece?.type || null) !== (move.capturedPieceType || null)) {
            addIssue(
                issues,
                'capture_mismatch',
                move.index,
                `${move.notation} icin kayitli yeme ${move.capturedPieceType || '-'}, hesaplanan ${capturedPiece?.type || '-'}`
            );
        }

        if ((activePiece?.type || piece.type) !== move.pieceTypeAfter) {
            addIssue(
                issues,
                'piece_mismatch',
                move.index,
                `${move.notation} sonrasinda beklenen tas tipi ${move.pieceTypeAfter}, hesaplanan ${(activePiece?.type || piece.type)}`
            );
        }

        if (normalizeResultType(move.resultType) !== computedResultType) {
            addIssue(
                issues,
                'result_mismatch',
                move.index,
                `${move.notation} icin kayitli sonuc ${normalizeResultType(move.resultType) || '-'}, hesaplanan ${computedResultType || '-'}`
            );
        }

        const currentHashCount = seenAfterHashes.get(afterHash) || 0;
        seenAfterHashes.set(afterHash, currentHashCount + 1);
        const repeatedPosition = currentHashCount >= 1;

        afterPieceCounts.push({
            moveIndex: move.index,
            pieceCount: state.board.pieces.length
        });

        if (endgameStartMaterialDiffForBlack == null && state.board.pieces.length <= 8) {
            endgameStartMaterialDiffForBlack = getNonRoyalMaterialDiffForBlack(state.board.pieces);
        }

        replayMoves.push({
            index: move.index,
            color: move.color,
            notation: move.notation,
            pieceTypeBefore: move.pieceTypeBefore,
            pieceTypeAfter: move.pieceTypeAfter,
            specialMoveType: move.specialMoveType || null,
            repeatedPosition,
            pieceCountAfter: state.board.pieces.length,
            computedResultType
        });
    }

    const firstEndgame = afterPieceCounts.find((entry) => entry.pieceCount <= 8);
    const endgameMoves = firstEndgame ? (moves.length - firstEndgame.moveIndex + 1) : 0;

    return {
        issues,
        replayMoves,
        endgameMoves,
        endgameStartMaterialDiffForBlack,
        finalState: state
    };
}

function createGameReport(game, replay) {
    const playerColor = getLocalColor(game);
    const aiColor = getAiColor(game);
    const playerMetrics = collectSideMetrics(game.moves, playerColor);
    const aiMetrics = collectSideMetrics(game.moves, aiColor);
    const issueSummary = summarizeIssues(replay.issues);

    const playerStyle = buildStyleLabel(playerMetrics, game?.game?.moveCount || 0);
    const aiStyle = buildStyleLabel(aiMetrics, game?.game?.moveCount || 0);
    const repeatedPositionMoves = replay.replayMoves.filter((move) => move.repeatedPosition).map((move) => move.index);
    const firstWinningRepeatMove = repeatedPositionMoves.find((moveIndex) => {
        const move = replay.replayMoves.find((candidate) => candidate.index === moveIndex);
        return move && game?.game?.winner && move.color === game.game.winner;
    }) || null;
    const aiBehavior = buildAiBehaviorSummary(
        game.game,
        aiMetrics,
        playerMetrics,
        { aiColor, endgameMoves: replay.endgameMoves, firstWinningRepeatMove }
    );
    const improvementHints = buildImprovementHints(
        game.game,
        playerMetrics,
        aiMetrics,
        {
            aiColor,
            endgameMoves: replay.endgameMoves,
            endgameStartMaterialDiffForBlack: replay.endgameStartMaterialDiffForBlack,
            firstWinningRepeatMove
        }
    );

    return {
        gameId: game.gameId,
        game: {
            mode: game?.game?.mode || 'unknown',
            difficulty: game?.game?.difficulty || 'unknown',
            formation: game?.game?.formation || normalizeFormation(game?.game?.formation),
            winner: game?.game?.winner || null,
            resultType: game?.game?.resultType || null,
            moveCount: game?.game?.moveCount || game?.moves?.length || 0,
            durationSeconds: game?.game?.durationSeconds || 0
        },
        player: {
            color: playerColor,
            style: playerStyle,
            metrics: playerMetrics
        },
        ai: {
            color: aiColor,
            style: aiStyle,
            behavior: aiBehavior,
            metrics: aiMetrics
        },
        improvementHints,
        legality: {
            allMovesValid: issueSummary.illegalMoves === 0 && issueSummary.typeMismatches === 0 && issueSummary.resultMismatches === 0,
            illegalMoves: issueSummary.illegalMoves,
            hashMismatches: issueSummary.hashMismatches,
            totalIssues: issueSummary.total,
            sampleIssues: replay.issues.slice(0, 8)
        },
        replay: {
            endgameMoves: replay.endgameMoves,
            endgameStartMaterialDiffForBlack: replay.endgameStartMaterialDiffForBlack,
            repeatedPositionMoves,
            firstWinningRepeatMove
        }
    };
}

function renderOverallInsights(summary) {
    const lines = [];
    lines.push(`- Toplam ${summary.totalGames} oyun incelendi.`);
    lines.push(`- ${summary.fullyLegalGames}/${summary.totalGames} oyunda hamle zinciri ve kayit yapisi tam temiz gorundu.`);
    lines.push(`- Toplam yasal disi hamle tespiti: ${summary.totalIllegalMoves}`);
    lines.push(`- Toplam hash uyusmazligi: ${summary.totalHashMismatches}`);
    lines.push(`- AI galibiyeti: ${summary.aiWins}, oyuncu galibiyeti: ${summary.playerWins}, beraberlik: ${summary.draws}`);
    return lines.join('\n');
}

function renderGameSection(report) {
    const lines = [];
    lines.push(`## ${report.gameId}`);
    lines.push('');
    lines.push(`- Mod: ${report.game.mode}`);
    lines.push(`- Zorluk: ${report.game.difficulty}`);
    lines.push(`- Sonuc: ${report.game.resultType} | Kazanan: ${report.game.winner}`);
    lines.push(`- Hamle: ${report.game.moveCount} | Sure: ${report.game.durationSeconds} sn`);
    lines.push(`- Oyuncu tarzi (${report.player.color}): ${report.player.style.join(', ')}`);
    lines.push(`- AI tarzi (${report.ai.color}): ${report.ai.style.join(', ')}`);
    lines.push(`- AI davranisi: ${report.ai.behavior.join('; ')}`);
    lines.push(`- Oyuncu capture/check orani: ${formatPercent(report.player.metrics.captureRate)} / ${formatPercent(report.player.metrics.checkRate)}`);
    lines.push(`- AI capture/check orani: ${formatPercent(report.ai.metrics.captureRate)} / ${formatPercent(report.ai.metrics.checkRate)}`);
    lines.push(`- Uzayan son oyun uzunlugu: ${report.replay.endgameMoves} hamle`);
    lines.push(`- Son oyun baslangic materyal farki (siyah acisindan): ${report.replay.endgameStartMaterialDiffForBlack ?? '-'}`);
    lines.push(`- Hamle dogrulugu: ${report.legality.allMovesValid ? 'temiz' : 'sorunlu'} | yasal disi: ${report.legality.illegalMoves}, hash uyusmazligi: ${report.legality.hashMismatches}`);

    if (report.replay.repeatedPositionMoves.length) {
        lines.push(`- Tekrar eden pozisyonlar: ${report.replay.repeatedPositionMoves.join(', ')}`);
    }

    if (report.replay.firstWinningRepeatMove) {
        lines.push(`- Kazanan tarafta ilk tekrar sinyali: #${report.replay.firstWinningRepeatMove}`);
    }

    if (report.improvementHints.length) {
        lines.push(`- Gelistirme ipuclari:`);
        for (const hint of report.improvementHints) {
            lines.push(`  - ${hint}`);
        }
    }

    if (report.legality.sampleIssues.length) {
        lines.push(`- Ilk bulgular:`);
        for (const issue of report.legality.sampleIssues) {
            lines.push(`  - #${issue.moveIndex} ${issue.type}: ${issue.detail}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

function buildMarkdownReport(analysisReport) {
    const lines = [];
    lines.push('# Oyun Kayit Analiz Raporu');
    lines.push('');
    lines.push(`Uretim tarihi: ${analysisReport.generatedAt}`);
    lines.push('');
    lines.push('## Genel Sonuc');
    lines.push('');
    lines.push(renderOverallInsights(analysisReport.summary));
    lines.push('');

    for (const gameReport of analysisReport.games) {
        lines.push(renderGameSection(gameReport));
    }

    return lines.join('\n');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const games = await loadGames(args.inputPath);
    const reports = [];

    for (const game of games) {
        const replay = await replayGame(game);
        reports.push(createGameReport(game, replay));
    }

    const analysisReport = {
        generatedAt: new Date().toISOString(),
        inputPath: args.inputPath,
        summary: buildOverallSummary(reports),
        games: reports
    };

    await writeJson(args.outputJson, analysisReport);
    await fs.mkdir(path.dirname(args.outputMd), { recursive: true });
    await fs.writeFile(args.outputMd, buildMarkdownReport(analysisReport), 'utf8');

    console.log(`Analiz edilen oyun: ${reports.length}`);
    console.log(`JSON rapor: ${args.outputJson}`);
    console.log(`Markdown rapor: ${args.outputMd}`);
    console.log(`Tam temiz oyun: ${analysisReport.summary.fullyLegalGames}/${analysisReport.summary.totalGames}`);
    console.log(`Yasal disi hamle: ${analysisReport.summary.totalIllegalMoves}`);
    console.log(`Hash uyusmazligi: ${analysisReport.summary.totalHashMismatches}`);
}

main().catch((error) => {
    console.error('Oyun kayit analizi basarisiz oldu.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
