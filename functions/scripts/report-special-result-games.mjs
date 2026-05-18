import path from 'node:path';
import process from 'node:process';
import { DEFAULT_INPUT, getAiColor, getLocalColor, loadGames, writeJson } from './games-export-utils.mjs';

const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'special-result-games.json');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputPath: DEFAULT_OUTPUT,
        limit: 20,
        difficulty: '',
        mode: 'ai',
        resultType: ''
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
        } else if (value === '--mode' && argv[index + 1]) {
            args.mode = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
        } else if (value === '--result-type' && argv[index + 1]) {
            args.resultType = String(argv[index + 1]).trim().toLowerCase();
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Ozel sonuc filtresi raporu

Kullanim:
  node functions/scripts/report-special-result-games.mjs --result-type <type>

Opsiyonlar:
  --input <path>         Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output <path>        Yazilacak json dosyasi
  --limit <n>            Rapora alinacak oyun sayisi (varsayilan: 20)
  --difficulty <x>       Zorluk filtresi (easy, medium, hard)
  --mode <x>             Mod filtresi (varsayilan: ai)
  --result-type <x>      Filtrelenecek sonuc (stalemate_win, citadel_draw...)
  --help                 Bu yardimi goster
`);
}

function summarizeGame(game) {
    const moveCount = game?.game?.moveCount ?? game?.moves?.length ?? 0;
    return {
        gameId: game.gameId,
        mode: game?.game?.mode ?? '',
        difficulty: game?.game?.difficulty ?? '',
        winner: game?.game?.winner ?? '',
        resultType: game?.game?.resultType ?? '',
        moveCount,
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
    if (args.help || !args.resultType) {
        printHelp();
        return;
    }

    const games = await loadGames(args.inputPath);
    const filtered = games
        .map(summarizeGame)
        .filter((game) => !args.mode || (game.mode ?? '').toLowerCase() === args.mode)
        .filter((game) => !args.difficulty || (game.difficulty ?? '').toLowerCase() === args.difficulty)
        .filter((game) => (game.resultType ?? '').toLowerCase() === args.resultType)
        .sort((left, right) => {
            if (right.moveCount !== left.moveCount) return right.moveCount - left.moveCount;
            return right.durationSeconds - left.durationSeconds;
        })
        .slice(0, Math.max(args.limit, 1));

    await writeJson(args.outputPath, filtered);

    console.log(`Toplam ozel sonuc oyunu: ${filtered.length}`);
    console.log(`Sonuc filtresi: ${args.resultType}`);
    if (args.mode) console.log(`Mod filtresi: ${args.mode}`);
    if (args.difficulty) console.log(`Zorluk filtresi: ${args.difficulty}`);
    console.log(`Rapor: ${args.outputPath}`);
    console.log('');

    filtered.forEach((item, index) => {
        console.log(formatItem(item, index));
        console.log('');
    });
}

main().catch((error) => {
    console.error('Ozel sonuc raporu olusturulamadi.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
