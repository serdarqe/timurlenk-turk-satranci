import path from 'node:path';
import process from 'node:process';
import { DEFAULT_INPUT, getAiColor, getLocalColor, loadGames, writeJson } from './games-export-utils.mjs';

const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'ai-struggles.json');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputPath: DEFAULT_OUTPUT,
        limit: 10
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--help' || value === '-h') {
            args.help = true;
        } else if (value === '--input' && argv[index + 1]) {
            args.inputPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        } else if (value === '--output' && argv[index + 1]) {
            args.outputPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        } else if (value === '--limit' && argv[index + 1]) {
            args.limit = Number.parseInt(argv[index + 1], 10) || 10;
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
AI zorlanma raporu

Kullanim:
  node functions/scripts/report-ai-struggles.mjs

Opsiyonlar:
  --input <path>    Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output <path>   Yazilacak json dosyasi (varsayilan: exports/ai-struggles.json)
  --limit <n>       Rapora alinacak oyun sayisi (varsayilan: 10)
  --help            Bu yardimi goster
`);
}

function scoreGame(game) {
    if (game?.game?.mode !== 'ai') return null;

    const winner = game?.game?.winner || 'draw';
    const aiColor = getAiColor(game);
    const moveCount = game?.game?.moveCount ?? game?.moves?.length ?? 0;
    const durationSeconds = game?.game?.durationSeconds ?? 0;
    const specialEventCount = game?.game?.specialEventCount ?? 0;
    const resultType = game?.game?.resultType ?? 'unknown';

    let score = 0;
    const reasons = [];

    if (winner && winner !== 'draw' && winner !== aiColor) {
        score += 100;
        reasons.push('AI kaybetti');
    } else if (winner === 'draw') {
        score += 55;
        reasons.push('Oyun beraberlikle bitti');
    }

    if (moveCount >= 160) {
        score += 25;
        reasons.push('Oyun cok uzadi');
    } else if (moveCount >= 100) {
        score += 12;
        reasons.push('Uzun oyun');
    }

    if (durationSeconds >= 600) {
        score += 20;
        reasons.push('Uzun sureli oyun');
    } else if (durationSeconds >= 300) {
        score += 10;
        reasons.push('Orta-uzun sureli oyun');
    }

    if (specialEventCount >= 40) {
        score += 10;
        reasons.push('Cok sayida ozel olay');
    }

    if (game?.flags?.hasRoyalSwap) {
        score += 5;
        reasons.push('Royal swap kullanildi');
    }

    if (game?.flags?.hasPawnCycle) {
        score += 5;
        reasons.push('Piyon dongusu var');
    }

    if (resultType === 'citadel_draw' || resultType === 'stalemate_win') {
        score += 15;
        reasons.push('Ozel sonuc tipi');
    }

    return {
        gameId: game.gameId,
        score,
        reasons,
        winner,
        aiColor,
        localColor: getLocalColor(game),
        difficulty: game?.game?.difficulty ?? '',
        resultType,
        moveCount,
        durationSeconds,
        specialEventCount,
        hasRoyalSwap: game?.flags?.hasRoyalSwap ?? false,
        hasCitadelExchange: game?.flags?.hasCitadelExchange ?? false,
        hasPawnCycle: game?.flags?.hasPawnCycle ?? false
    };
}

function formatSummary(item, index) {
    return [
        `${index + 1}. ${item.gameId} | skor: ${item.score}`,
        `   zorluk: ${item.difficulty} | AI: ${item.aiColor} | kazanan: ${item.winner} | sonuc: ${item.resultType}`,
        `   hamle: ${item.moveCount} | sure(sn): ${item.durationSeconds} | ozel olay: ${item.specialEventCount}`,
        `   nedenler: ${item.reasons.join(', ')}`
    ].join('\n');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const games = await loadGames(args.inputPath);

    const ranked = games
        .map(scoreGame)
        .filter(Boolean)
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, Math.max(args.limit, 1));

    await writeJson(args.outputPath, ranked);

    console.log(`Toplam aday oyun: ${ranked.length}`);
    console.log(`Rapor: ${args.outputPath}`);
    console.log('');
    ranked.forEach((item, index) => {
        console.log(formatSummary(item, index));
        console.log('');
    });
}

main().catch((error) => {
    console.error('AI zorlanma raporu olusturulamadi.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
