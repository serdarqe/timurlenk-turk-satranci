import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '..');
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

const REQUIRED_CITADEL_SPECIAL_MOVE_SOURCE_MARKERS = Object.freeze([
    'TIMUR_CITADEL_SPECIAL_MOVE_SKELETON',
    'TimurCitadelTarget',
    'TIMUR_CITADEL_TARGET_BLACK',
    'TIMUR_CITADEL_TARGET_WHITE',
    'TimurCitadelSpecialMove',
    'timur_citadel_anchor_square',
    'timur_make_citadel_special_move',
    'timur_try_make_citadel_special_move',
    'TIMUR_CITADEL_SKELETON_NOT_WIRED_TO_MOVEGEN'
]);

const REQUIRED_CITADEL_APPLY_RESULT_REVERT_SOURCE_MARKERS = Object.freeze([
    'TIMUR_CITADEL_APPLY_RESULT_REVERT_SKELETON',
    'TimurCitadelResolution',
    'TIMUR_CITADEL_RESOLUTION_DRAW',
    'TimurCitadelStateSnapshot',
    'timur_resolve_citadel_special_result',
    'timur_apply_citadel_special_move_skeleton',
    'timur_revert_citadel_special_move_skeleton',
    'TIMUR_CITADEL_APPLY_RESULT_REVERT_NOT_WIRED_TO_POSITION_STATE'
]);

const REQUIRED_CITADEL_TOKEN_STRATEGY_SOURCE_MARKERS = Object.freeze([
    'TIMUR_CITADEL_OFFBOARD_TOKEN_STRATEGY',
    'TIMUR_CITADEL_BLACK_NATIVE_TOKEN',
    'TIMUR_CITADEL_WHITE_NATIVE_TOKEN',
    'a10@blackcitadel',
    'k1@whitecitadel',
    'timur_citadel_native_token',
    'TIMUR_CITADEL_TOKEN_STRATEGY_NOT_WIRED_TO_UCI'
]);

const REQUIRED_CITADEL_PERFT_OUTPUT_SOURCE_MARKERS = Object.freeze([
    'TIMUR_CITADEL_PERFT1_TOKEN_OUTPUT',
    'timur_citadel_native_perft_root_token',
    'depth <= 1',
    'sync_cout << citadelToken << ": " << 1 << sync_endl',
    'TIMUR_CITADEL_PERFT1_ONLY_NOT_SEARCH_BESTMOVE'
]);

test('native source has a safe citadel special-move skeleton', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of REQUIRED_CITADEL_SPECIAL_MOVE_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('native source has a citadel apply-result-revert skeleton without state mutation', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of REQUIRED_CITADEL_APPLY_RESULT_REVERT_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('native source defines the citadel off-board token strategy before UCI wiring', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of REQUIRED_CITADEL_TOKEN_STRATEGY_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('native search source emits citadel tokens only for perft 1 smoke output', () => {
    const source = fs.readFileSync(searchSourcePath, 'utf8');

    for (const marker of REQUIRED_CITADEL_PERFT_OUTPUT_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('citadel special-move skeleton is not wired into normal move generation yet', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');
    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromStart > 0, true, 'Position::moves_from must exist');
    assert.equal(movesFromBody.includes('timur_try_make_citadel_special_move'), false);
    assert.equal(source.includes('TIMUR_CITADEL_SKELETON_NOT_WIRED_TO_MOVEGEN'), true);
});

test('citadel apply-result-revert skeleton is not wired into Position state yet', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');
    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromBody.includes('timur_apply_citadel_special_move_skeleton'), false);
    assert.equal(movesFromBody.includes('timur_revert_citadel_special_move_skeleton'), false);
    assert.equal(source.includes('TIMUR_CITADEL_APPLY_RESULT_REVERT_NOT_WIRED_TO_POSITION_STATE'), true);
});

test('citadel token strategy is not wired into native UCI output yet', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');
    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromBody.includes('timur_citadel_native_token'), false);
    assert.equal(source.includes('TIMUR_CITADEL_TOKEN_STRATEGY_NOT_WIRED_TO_UCI'), true);
});
