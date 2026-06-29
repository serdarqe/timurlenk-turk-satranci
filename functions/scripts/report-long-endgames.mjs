import path from 'node:path';
import process from 'node:process';
import { DEFAULT_INPUT, getAiColor, getLocalColor, loadGames, writeJson } from './games-export-utils.mjs';

const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'long-endgames.json');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputPath: DEFAULT_OUTPUT,
        limit: 20,
        minMoves: 120,
        difficulty: '',
        mode: ''
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
        } else if (value === '--min-moves' && argv[index + 1]) {
            args.minMoves = Number.parseInt(argv[index + 1], 10) || 120;
            index += 1;
        } else if (value === '--difficulty' && argv[index + 1]) {
            args.difficulty = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
        } else if (value === '--mode' && argv[index + 1]) {
            args.mode = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Uzun son oyun raporu

Kullanim:
  node functions/scripts/report-long-endgames.mjs

Opsiyonlar:
  --input <path>       Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output <path>      Yazilacak json dosyasi (varsayilan: exports/long-endgames.json)
  --limit <n>          Rapora alinacak oyun sayisi (varsayilan: 20)
  --min-moves <n>      Uzun oyun esigi (varsayilan: 120)
  --difficulty <x>     Zorluk filtresi (easy, medium, hard)
  --mode <x>           Mod filtresi (ai, online, puzzle...)
  --help               Bu yardimi goster
`);
}

function summarizeGame(game) {
    return {
        gameId: game.gameId,
        mode: game?.game?.mode ?? '',
        difficulty: game?.game?.difficulty ?? '',
        winner: game?.game?.winner ?? '',
        resultType: game?.game?.resultType ?? '',
        moveCount: game?.game?.moveCount ?? game?.moves?.length ?? 0,
        durationSeconds: game?.game?.durationSeconds ?? 0,
        specialEventCount: game?.game?.specialEventCount ?? 0,
        localColor: getLocalColor(game),
        aiColor: game?.game?.mode === 'ai' ? getAiColor(game) : null,
        hasRoyalSwap: game?.flags?.hasRoyalSwap ?? false,
        hasCitadelExchange: game?.flags?.hasCitadelExchange ?? false,
        hasPawnCycle: game?.flags?.hasPawnCycle ?? false
    };
}

function formatItem(item, index) {
    return [
        `${index + 1}. ${item.gameId}`,
        `   mod: ${item.mode} | zorluk: ${item.difficulty} | kazanan: ${item.winner} | sonuc: ${item.resultType}`,
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
    const longGames = games
        .map(summarizeGame)
        .filter((game) => !args.mode || (game.mode ?? '').toLowerCase() === args.mode)
        .filter((game) => !args.difficulty || (game.difficulty ?? '').toLowerCase() === args.difficulty)
        .filter((game) => game.moveCount >= args.minMoves)
        .sort((left, right) => {
            if (right.moveCount !== left.moveCount) return right.moveCount - left.moveCount;
            return right.durationSeconds - left.durationSeconds;
        })
        .slice(0, Math.max(args.limit, 1));

    await writeJson(args.outputPath, longGames);

    console.log(`Toplam uzun oyun: ${longGames.length}`);
    if (args.mode) {
        console.log(`Mod filtresi: ${args.mode}`);
    }
    if (args.difficulty) {
        console.log(`Zorluk filtresi: ${args.difficulty}`);
    }
    console.log(`Rapor: ${args.outputPath}`);
    console.log('');
    longGames.forEach((item, index) => {
        console.log(formatItem(item, index));
        console.log('');
    });
}

main().catch((error) => {
    console.error('Uzun son oyun raporu olusturulamadi.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
