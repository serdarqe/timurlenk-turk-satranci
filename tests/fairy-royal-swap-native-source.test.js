import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ROYAL_SWAP_NATIVE_POSITION_MARKERS,
    ROYAL_SWAP_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyRoyalSwapNativeSourceMarkers.js';
import { getRoyalSwapSourceEvidence } from '../scripts/fairy-native-source-evidence.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '..');
const variantSourcePath = path.resolve(
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

test('royal swap native source markers exist before the rule can be promoted', () => {
    const source = fs.readFileSync(variantSourcePath, 'utf8');

    for (const marker of ROYAL_SWAP_NATIVE_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('royal swap native C++ skeleton exists but is not wired into normal movegen', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of ROYAL_SWAP_NATIVE_POSITION_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }

    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromStart > 0, true, 'Position::moves_from must exist');
    assert.equal(movesFromBody.includes('timur_try_make_royal_swap_plan'), false);
    assert.equal(movesFromBody.includes('timur_apply_royal_swap_skeleton'), false);
    assert.equal(movesFromBody.includes('timur_revert_royal_swap_skeleton'), false);
});

test('royal swap source evidence passes only when variant and position markers exist', () => {
    const evidence = getRoyalSwapSourceEvidence();

    assert.equal(evidence.nativeSourceMarker, true);
    assert.equal(evidence.nativePositionSkeleton, true);
    assert.deepEqual(evidence.missingMarkers, []);
});

test('royal swap native source emits distinct perft smoke tokens without normal movegen promotion', () => {
    const positionSource = fs.readFileSync(positionHeaderPath, 'utf8');
    const searchSource = fs.readFileSync(searchSourcePath, 'utf8');

    for (const marker of [
        'TIMUR_ROYAL_SWAP_PERFT1_TOKEN_OUTPUT',
        'TIMUR_ROYAL_SWAP_WHITE_NATIVE_TOKEN',
        'TIMUR_ROYAL_SWAP_BLACK_NATIVE_TOKEN',
        'royal_swap:f1:e2@ransom',
        'royal_swap:f10:e9@ransom',
        'timur_royal_swap_native_token',
        'timur_royal_swap_native_perft_root_token'
    ]) {
        assert.equal(positionSource.includes(marker), true, marker);
    }

    assert.equal(searchSource.includes('timur_royal_swap_native_perft_root_token(pos)'), true);
    assert.equal(searchSource.includes('sync_cout << royalSwapToken << ": " << 1 << sync_endl'), true);

    const movesFromStart = positionSource.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = positionSource.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = positionSource.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromBody.includes('timur_royal_swap_native_perft_root_token'), false);
});
