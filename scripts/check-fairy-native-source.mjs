import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const sourcePath = path.resolve(
    rootDir,
    '..',
    'Satranc Motoru',
    'fairy-stockfish.wasm-nnue',
    'src',
    'variant.cpp'
);

const source = fs.readFileSync(sourcePath, 'utf8');

const checks = [
    ['timur variant function', 'Variant* timur_variant()'],
    ['11x10 rank', 'v->maxRank = RANK_10;'],
    ['11x10 file', 'v->maxFile = FILE_K;'],
    ['historical start FEN', 'ecd5dce/rntzgkvztnr/ppppppppppp/11/11/11/11/PPPPPPPPPPP/RNTZGKVZTNR/ECD5DCE'],
    ['native timur registry', 'add("timur", timur_variant());'],
    ['legacy timur_poc alias', 'add("timur_poc", timur_variant());'],
    ['no pawn double step', 'v->doubleStep = false;'],
    ['no en passant', 'v->enPassantTypes[WHITE] = v->enPassantTypes[BLACK] = NO_PIECE_SET;'],
    ['no castling', 'v->castling = false;'],
    ['threefold repetition', 'v->nFoldRule = 3;'],
    ['50 move rule', 'v->nMoveRule = 50;'],
    ['mandatory promotion', 'v->mandatoryPawnPromotion = true;'],
    ['promotion rank white', 'v->promotionRegion[WHITE] = Rank10BB;'],
    ['promotion rank black', 'v->promotionRegion[BLACK] = Rank1BB;'],
    ['dabbaba piece', 'v->add_piece(DABBABA, \'d\', "D");'],
    ['camel piece', 'v->add_piece(CAMEL, \'c\', "C");'],
    ['picket piece', 'v->add_piece(PICKET, \'t\', "B");'],
    ['giraffe placeholder', 'v->add_piece(IMMOBILE_PIECE, \'z\');']
];

const failures = checks.filter(([, needle]) => !source.includes(needle));

if (failures.length > 0) {
    console.error('Fairy native source check failed:');
    for (const [label, needle] of failures) {
        console.error(`- ${label}: missing ${needle}`);
    }
    process.exit(1);
}

console.log(`Fairy native Timur source check passed (${checks.length}/${checks.length}).`);
console.log(`Source: ${sourcePath}`);
