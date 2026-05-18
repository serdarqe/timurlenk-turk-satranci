import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = path.resolve(process.cwd(), 'exports', 'games.jsonl');
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'games.csv');

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        outputPath: DEFAULT_OUTPUT
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
        }
    }

    return args;
}

function printHelp() {
    console.log(`
CSV export araci

Kullanim:
  node functions/scripts/export-games-csv.mjs

Opsiyonlar:
  --input <path>    Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --output <path>   Yazilacak csv dosyasi (varsayilan: exports/games.csv)
  --help            Bu yardimi goster
`);
}

function csvEscape(value) {
    const text = value == null ? '' : String(value);
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
}

function toLines(raw) {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

function toSummaryRow(game) {
    return {
        gameId: game.gameId ?? '',
        mode: game?.game?.mode ?? '',
        difficulty: game?.game?.difficulty ?? '',
        formation: game?.game?.formation ?? '',
        winner: game?.game?.winner ?? '',
        resultType: game?.game?.resultType ?? '',
        moveCount: game?.game?.moveCount ?? game?.moves?.length ?? 0,
        durationSeconds: game?.game?.durationSeconds ?? '',
        specialEventCount: game?.game?.specialEventCount ?? '',
        hasRoyalSwap: game?.flags?.hasRoyalSwap ?? false,
        hasCitadelExchange: game?.flags?.hasCitadelExchange ?? false,
        hasPawnCycle: game?.flags?.hasPawnCycle ?? false,
        hasPromotion: game?.flags?.hasPromotion ?? false,
        whiteAccuracy: game?.analysisSummary?.whiteAccuracy ?? '',
        blackAccuracy: game?.analysisSummary?.blackAccuracy ?? ''
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const raw = await fs.readFile(args.inputPath, 'utf8');
    const rows = toLines(raw)
        .map((line) => JSON.parse(line))
        .map(toSummaryRow);

    const headers = [
        'gameId',
        'mode',
        'difficulty',
        'formation',
        'winner',
        'resultType',
        'moveCount',
        'durationSeconds',
        'specialEventCount',
        'hasRoyalSwap',
        'hasCitadelExchange',
        'hasPawnCycle',
        'hasPromotion',
        'whiteAccuracy',
        'blackAccuracy'
    ];

    const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
    ];

    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, csvLines.join('\n'), 'utf8');

    console.log(`Toplam oyun: ${rows.length}`);
    console.log(`Cikti: ${args.outputPath}`);
}

main().catch((error) => {
    console.error('CSV export basarisiz oldu.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
