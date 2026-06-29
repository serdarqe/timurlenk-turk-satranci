import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CITADEL_EXCHANGE_NATIVE_POSITION_MARKERS,
    CITADEL_EXCHANGE_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyCitadelExchangeNativeSourceMarkers.js';
import { getCitadelExchangeSourceEvidence } from '../scripts/fairy-native-source-evidence.mjs';

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

test('citadel exchange native source markers exist before the rule can be promoted', () => {
    const source = fs.readFileSync(variantSourcePath, 'utf8');

    for (const marker of CITADEL_EXCHANGE_NATIVE_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('citadel exchange native C++ skeleton exists but is not wired into movegen', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of CITADEL_EXCHANGE_NATIVE_POSITION_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }

    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromStart > 0, true, 'Position::moves_from must exist');
    assert.equal(movesFromBody.includes('timur_try_make_citadel_exchange_plan'), false);
    assert.equal(movesFromBody.includes('timur_apply_citadel_exchange_skeleton'), false);
    assert.equal(movesFromBody.includes('timur_revert_citadel_exchange_skeleton'), false);
});

test('citadel exchange source evidence passes only when variant and position markers exist', () => {
    const evidence = getCitadelExchangeSourceEvidence();

    assert.equal(evidence.nativeSourceMarker, true);
    assert.equal(evidence.nativePositionSkeleton, true);
    assert.deepEqual(evidence.missingMarkers, []);
});

test('citadel exchange native source emits a distinct perft smoke token without normal movegen promotion', () => {
    const positionSource = fs.readFileSync(positionHeaderPath, 'utf8');
    const searchSource = fs.readFileSync(searchSourcePath, 'utf8');

    for (const marker of [
        'timur_citadel_exchange_native_move_encoding',
        'timur_make_citadel_exchange_native_move',
        'timur_is_citadel_exchange_native_move',
        'return "citadel_exchange:"',
        'timur_square_token(plan.actingRoyalFrom)',
        'timur_square_token(plan.targetRoyalFrom)',
        'timur_citadel_target_label(plan.target)',
        'timur_citadel_exchange_native_token',
        'timur_citadel_exchange_native_perft_root_token'
    ]) {
        assert.equal(positionSource.includes(marker), true, marker);
    }

    assert.equal(searchSource.includes('timur_citadel_exchange_native_perft_root_token(pos)'), true);
    assert.equal(searchSource.includes('sync_cout << exchangeToken << ": " << 1 << sync_endl'), true);

    const movesFromStart = positionSource.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = positionSource.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = positionSource.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromBody.includes('timur_citadel_exchange_native_perft_root_token'), false);
});
