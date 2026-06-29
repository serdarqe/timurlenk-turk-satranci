import path from 'node:path';
import process from 'node:process';
import { DEFAULT_INPUT, getAiColor, getLocalColor, loadGames, writeJson } from './games-export-utils.mjs';

const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'ai-losses.json');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputPath: DEFAULT_OUTPUT,
        limit: 20,
        difficulty: ''
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
            args.limit = Number.parseInt(argv[index + 1], 10) || 20;
            index += 1;
        } else if (value === '--difficulty' && argv[index + 1]) {
            args.difficulty = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
AI kayip raporu

Kullanim:
  node functions/scripts/report-ai-losses.mjs

Opsiyonlar:
  --input <path>    Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output <path>   Yazilacak json dosyasi (varsayilan: exports/ai-losses.json)
  --limit <n>       Rapora alinacak oyun sayisi (varsayilan: 20)
  --difficulty <x>  Zorluk filtresi (ornegin: easy, medium, hard)
  --help            Bu yardimi goster
`);
}

function summarizeLoss(game) {
    const moveCount = game?.game?.moveCount ?? game?.moves?.length ?? 0;
    return {
        gameId: game.gameId,
        aiColor: getAiColor(game),
        localColor: getLocalColor(game),
        difficulty: game?.game?.difficulty ?? '',
        winner: game?.game?.winner ?? '',
        resultType: game?.game?.resultType ?? '',
        moveCount,
        durationSeconds: game?.game?.durationSeconds ?? 0,
        specialEventCount: game?.game?.specialEventCount ?? 0,
        hasRoyalSwap: game?.flags?.hasRoyalSwap ?? false,
        hasCitadelExchange: game?.flags?.hasCitadelExchange ?? false,
        hasPawnCycle: game?.flags?.hasPawnCycle ?? false
    };
}

function formatItem(item, index) {
    return [
        `${index + 1}. ${item.gameId}`,
        `   zorluk: ${item.difficulty} | AI: ${item.aiColor} | kazanan: ${item.winner} | sonuc: ${item.resultType}`,
        `   hamle: ${item.moveCount} | sure(sn): ${item.durationSeconds} | ozel olay: ${item.specialEventCount}`
    ].join('\n');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const games = await loadGames(args.inputPath);
    const losses = games
        .filter((game) => game?.game?.mode === 'ai')
        .filter((game) => !args.difficulty || (game?.game?.difficulty ?? '').toLowerCase() === args.difficulty)
        .filter((game) => {
            const winner = game?.game?.winner;
            const aiColor = getAiColor(game);
            return winner && winner !== 'draw' && winner !== aiColor;
        })
        .map(summarizeLoss)
        .sort((left, right) => {
            if (right.moveCount !== left.moveCount) return right.moveCount - left.moveCount;
            return right.durationSeconds - left.durationSeconds;
        })
        .slice(0, Math.max(args.limit, 1));

    await writeJson(args.outputPath, losses);

    console.log(`Toplam AI kaybi: ${losses.length}`);
    if (args.difficulty) {
        console.log(`Zorluk filtresi: ${args.difficulty}`);
    }
    console.log(`Rapor: ${args.outputPath}`);
    console.log('');
    losses.forEach((item, index) => {
        console.log(formatItem(item, index));
        console.log('');
    });
}

main().catch((error) => {
    console.error('AI kayip raporu olusturulamadi.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
