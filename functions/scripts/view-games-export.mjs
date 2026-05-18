import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = path.resolve(process.cwd(), 'exports', 'games.jsonl');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        limit: 10
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--help' || value === '-h') {
            args.help = true;
        } else if (value === '--input' && argv[index + 1]) {
            args.inputPath = path.resolve(process.cwd(), argv[index + 1]);
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
Export goruntuleme araci

Kullanim:
  node functions/scripts/view-games-export.mjs

Opsiyonlar:
  --input <path>   Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --limit <n>      Gosterilecek oyun sayisi (varsayilan: 10)
  --help           Bu yardimi goster
`);
}

function toLines(raw) {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function formatGame(game, index) {
    const moveCount = game?.game?.moveCount ?? game?.moves?.length ?? 0;
    const duration = game?.game?.durationSeconds ?? '-';
    const winner = game?.game?.winner ?? '-';
    const resultType = game?.game?.resultType ?? '-';
    const difficulty = game?.game?.difficulty ?? '-';
    const mode = game?.game?.mode ?? '-';
    const gameId = game?.gameId ?? '-';

    return [
        `${index + 1}. ${gameId}`,
        `   mod: ${mode} | zorluk: ${difficulty} | kazanan: ${winner} | sonuc: ${resultType}`,
        `   hamle: ${moveCount} | sure(sn): ${duration}`,
        `   ozel: swap=${game?.flags?.hasRoyalSwap ? 'evet' : 'hayir'}, hisar=${game?.flags?.hasCitadelExchange ? 'evet' : 'hayir'}, piyon-dongu=${game?.flags?.hasPawnCycle ? 'evet' : 'hayir'}`
    ].join('\n');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const raw = await fs.readFile(args.inputPath, 'utf8');
    const lines = toLines(raw);
    const games = lines.map((line) => JSON.parse(line));
    const visibleGames = games.slice(0, Math.max(args.limit, 1));

    console.log(`Dosya: ${args.inputPath}`);
    console.log(`Toplam oyun: ${games.length}`);
    console.log('');

    visibleGames.forEach((game, index) => {
        console.log(formatGame(game, index));
        console.log('');
    });
}

main().catch((error) => {
    console.error('Export goruntuleme basarisiz oldu.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
