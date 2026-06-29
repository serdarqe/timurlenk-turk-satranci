import process from 'node:process';

import { DEFAULT_INPUT, loadGames } from './games-export-utils.mjs';

function parseArgs(argv) {
    const args = {
        inputPath: DEFAULT_INPUT,
        gameId: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--help' || value === '-h') {
            args.help = true;
        } else if (value === '--input' && argv[index + 1]) {
            args.inputPath = argv[index + 1];
            index += 1;
        } else if (value === '--game-id' && argv[index + 1]) {
            args.gameId = argv[index + 1];
            index += 1;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Tek oyun hamle goruntuleme araci

Kullanim:
  node functions/scripts/view-game-moves.mjs --game-id <oyunId>

Opsiyonlar:
  --input <path>      Okunacak jsonl dosyasi (varsayilan: exports/games.jsonl)
  --game-id <id>      Hamleleri gosterilecek oyun id'si
  --help              Bu yardimi goster
`);
}

function formatMove(move) {
    const index = move?.index ?? '-';
    const moveNumber = move?.moveNumber ?? '-';
    const color = move?.color ?? '-';
    const notation = move?.notation ?? `${move?.fromLabel ?? '?'} -> ${move?.toLabel ?? '?'}`;
    const pieceType = move?.pieceTypeAfter ?? move?.pieceTypeBefore ?? '-';
    const captured = move?.capturedPieceType ? ` | aldi: ${move.capturedPieceType}` : '';
    const specialMove = move?.specialMoveType ? ` | ozel: ${move.specialMoveType}` : '';
    const specialTags = Array.isArray(move?.specialTags) && move.specialTags.length > 0
        ? ` | etiket: ${move.specialTags.join(', ')}`
        : '';
    const result = move?.resultType ? ` | sonuc: ${move.resultType}` : '';
    const check = move?.isCheck ? ' | sah' : '';

    return `${index}. (${moveNumber}/${color}) ${notation} | tas: ${pieceType}${captured}${specialMove}${specialTags}${check}${result}`;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    if (!args.gameId) {
        printHelp();
        process.exitCode = 1;
        return;
    }

    const games = await loadGames(args.inputPath);
    const game = games.find((entry) => entry?.gameId === args.gameId);

    if (!game) {
        console.error(`Oyun bulunamadi: ${args.gameId}`);
        process.exitCode = 1;
        return;
    }

    const moves = Array.isArray(game.moves)
        ? [...game.moves].sort((left, right) => (left?.index ?? 0) - (right?.index ?? 0))
        : [];

    console.log(`Oyun: ${game.gameId}`);
    console.log(`Mod: ${game?.game?.mode ?? '-'} | zorluk: ${game?.game?.difficulty ?? '-'} | kazanan: ${game?.game?.winner ?? '-'} | sonuc: ${game?.game?.resultType ?? '-'}`);
    console.log(`Hamle sayisi: ${moves.length}`);
    console.log('');

    moves.forEach((move) => {
        console.log(formatMove(move));
    });
}

main().catch((error) => {
    console.error('Tek oyun hamle goruntuleme basarisiz oldu.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
