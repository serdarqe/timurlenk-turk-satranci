import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CITADEL_DRAW_NATIVE_SOURCE_MARKERS } from '../src/fairy/FairyCitadelDrawNativeSourceMarkers.js';
import {
    CITADEL_EXCHANGE_NATIVE_POSITION_MARKERS,
    CITADEL_EXCHANGE_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyCitadelExchangeNativeSourceMarkers.js';
import { CITADEL_NATIVE_MODEL_SOURCE_MARKERS } from '../src/fairy/FairyCitadelNativeModel.js';
import {
    ROYAL_SWAP_NATIVE_POSITION_MARKERS,
    ROYAL_SWAP_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyRoyalSwapNativeSourceMarkers.js';
import {
    PAWN_CYCLE_NATIVE_POSITION_MARKERS,
    PAWN_CYCLE_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyPawnCycleNativeSourceMarkers.js';

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
const positionHeaderPath = path.resolve(
    rootDir,
    '..',
    'Satranc Motoru',
    'fairy-stockfish.wasm-nnue',
    'src',
    'position.h'
);
const searchSourcePath = path.resolve(
    rootDir,
    '..',
    'Satranc Motoru',
    'fairy-stockfish.wasm-nnue',
    'src',
    'search.cpp'
);

const source = fs.readFileSync(sourcePath, 'utf8');
const positionHeader = fs.readFileSync(positionHeaderPath, 'utf8');
const searchSource = fs.readFileSync(searchSourcePath, 'utf8');

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
    ['stalemate is win', 'v->stalemateValue = VALUE_MATE;'],
    ['dabbaba piece', 'v->add_piece(DABBABA, \'d\', "D");'],
    ['camel piece', 'v->add_piece(CAMEL, \'c\', "C");'],
    ['picket native registration', 'v->add_piece(PICKET, \'t\');'],
    ['prince movement support', 'v->add_piece(PRINCE, \'q\', "K");'],
    ['adventitious king movement support', 'v->add_piece(ADVENTITIOUS_KING, \'a\', "K");'],
    ['full timur fixed promotion set', 'v->promotionPieceTypes[WHITE] = piece_set(WAZIR) | SEA_MONSTER | FERS | KNIGHT | LION | ALFIL | CAMEL | DABBABA | BULL | REVEALER | GIRAFFE | PICKET | ROOK | PRINCE;'],
    ['special-rule wrapper phase note', 'Citadel exchange/draw, pawn subtype cycle and adventitious-king royal logic'],
    ...CITADEL_DRAW_NATIVE_SOURCE_MARKERS.map((marker) => [`citadel draw source marker ${marker}`, marker]),
    ...CITADEL_EXCHANGE_NATIVE_SOURCE_MARKERS.map((marker) => [`citadel exchange source marker ${marker}`, marker]),
    ...ROYAL_SWAP_NATIVE_SOURCE_MARKERS.map((marker) => [`royal swap source marker ${marker}`, marker]),
    ...PAWN_CYCLE_NATIVE_SOURCE_MARKERS.map((marker) => [`pawn cycle source marker ${marker}`, marker]),
    ...CITADEL_NATIVE_MODEL_SOURCE_MARKERS.map((marker) => [`citadel native model source marker ${marker}`, marker]),
    ['giraffe custom piece id', 'const PieceType GIRAFFE = timur_custom_piece(9);'],
    ['giraffe native registration', 'v->add_piece(GIRAFFE, \'z\');'],
    ['giraffe midgame value', 'v->pieceValue[MG][GIRAFFE] = 980;'],
    ['giraffe endgame value', 'v->pieceValue[EG][GIRAFFE] = 1040;']
];
const positionChecks = [
    ['giraffe native helper', 'timur_giraffe_attacks_bb'],
    ['giraffe native detector', 'is_timur_giraffe_piece'],
    ['giraffe attacks hook', 'if (is_timur_giraffe_piece(var, pt))'],
    ['giraffe empty diagonal leg rule', 'diagonalLeg == SQ_NONE || (occupied & diagonalLeg)'],
    ['giraffe minimum straight distance', 'if (step >= 3)'],
    ['picket native helper', 'timur_picket_attacks_bb'],
    ['picket native detector', 'is_timur_picket_piece'],
    ['picket attacks hook', 'if (is_timur_picket_piece(var, pt))'],
    ['picket minimum diagonal distance', 'if (step >= 2)'],
    ['citadel special move skeleton marker', 'TIMUR_CITADEL_SPECIAL_MOVE_SKELETON'],
    ['citadel special move target enum', 'enum TimurCitadelTarget'],
    ['citadel black target', 'TIMUR_CITADEL_TARGET_BLACK'],
    ['citadel white target', 'TIMUR_CITADEL_TARGET_WHITE'],
    ['citadel special move struct', 'struct TimurCitadelSpecialMove'],
    ['citadel anchor helper', 'timur_citadel_anchor_square'],
    ['citadel special move constructor', 'timur_make_citadel_special_move'],
    ['citadel special move try helper', 'timur_try_make_citadel_special_move'],
    ['citadel not wired marker', 'TIMUR_CITADEL_SKELETON_NOT_WIRED_TO_MOVEGEN'],
    ['citadel apply result revert skeleton marker', 'TIMUR_CITADEL_APPLY_RESULT_REVERT_SKELETON'],
    ['citadel resolution enum', 'enum TimurCitadelResolution'],
    ['citadel draw resolution', 'TIMUR_CITADEL_RESOLUTION_DRAW'],
    ['citadel state snapshot', 'struct TimurCitadelStateSnapshot'],
    ['citadel result resolver', 'timur_resolve_citadel_special_result'],
    ['citadel apply skeleton helper', 'timur_apply_citadel_special_move_skeleton'],
    ['citadel revert skeleton helper', 'timur_revert_citadel_special_move_skeleton'],
    ['citadel apply result revert not wired marker', 'TIMUR_CITADEL_APPLY_RESULT_REVERT_NOT_WIRED_TO_POSITION_STATE'],
    ['citadel offboard token strategy marker', 'TIMUR_CITADEL_OFFBOARD_TOKEN_STRATEGY'],
    ['citadel black native token constant', 'TIMUR_CITADEL_BLACK_NATIVE_TOKEN'],
    ['citadel white native token constant', 'TIMUR_CITADEL_WHITE_NATIVE_TOKEN'],
    ['citadel black native token value', 'a10@blackcitadel'],
    ['citadel white native token value', 'k1@whitecitadel'],
    ['citadel native token helper', 'timur_citadel_native_token'],
    ['citadel native perft token helper', 'timur_citadel_native_perft_root_token'],
    ['citadel token not wired marker', 'TIMUR_CITADEL_TOKEN_STRATEGY_NOT_WIRED_TO_UCI'],
    ...CITADEL_EXCHANGE_NATIVE_POSITION_MARKERS.map((marker) => [`citadel exchange position marker ${marker}`, marker]),
    ...ROYAL_SWAP_NATIVE_POSITION_MARKERS.map((marker) => [`royal swap position marker ${marker}`, marker]),
    ...PAWN_CYCLE_NATIVE_POSITION_MARKERS.map((marker) => [`pawn cycle position marker ${marker}`, marker])
];
const searchChecks = [
    ['citadel perft1 token output marker', 'TIMUR_CITADEL_PERFT1_TOKEN_OUTPUT'],
    ['citadel perft token helper call', 'timur_citadel_native_perft_root_token(pos)'],
    ['royal swap perft token helper call', 'timur_royal_swap_native_perft_root_token(pos)'],
    ['pawn cycle perft token helper call', 'timur_pawn_of_pawns_cycle_native_perft_root_token(pos)'],
    ['citadel perft1 depth guard', 'depth <= 1'],
    ['citadel perft token output line', 'sync_cout << citadelToken << ": " << 1 << sync_endl'],
    ['royal swap perft token output line', 'sync_cout << royalSwapToken << ": " << 1 << sync_endl'],
    ['pawn cycle perft token output line', 'sync_cout << pawnCycleToken << ": " << 1 << sync_endl'],
    ['citadel perft not search marker', 'TIMUR_CITADEL_PERFT1_ONLY_NOT_SEARCH_BESTMOVE']
];

const failures = [
    ...checks.filter(([, needle]) => !source.includes(needle)),
    ...positionChecks.filter(([, needle]) => !positionHeader.includes(needle)),
    ...searchChecks.filter(([, needle]) => !searchSource.includes(needle))
];

if (source.includes('v->add_piece(IMMOBILE_PIECE, \'z\');')) {
    failures.push(['giraffe no longer immobile', 'remove v->add_piece(IMMOBILE_PIECE, \'z\');']);
}

if (failures.length > 0) {
    console.error('Fairy native source check failed:');
    for (const [label, needle] of failures) {
        console.error(`- ${label}: missing ${needle}`);
    }
    process.exit(1);
}

console.log(`Fairy native Timur source check passed (${checks.length + positionChecks.length + searchChecks.length}/${checks.length + positionChecks.length + searchChecks.length}).`);
console.log(`Source: ${sourcePath}`);
console.log(`Position: ${positionHeaderPath}`);
console.log(`Search: ${searchSourcePath}`);
