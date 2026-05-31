import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PAWN_CYCLE_NATIVE_POSITION_MARKERS,
    PAWN_CYCLE_NATIVE_SOURCE_MARKERS
} from '../src/fairy/FairyPawnCycleNativeSourceMarkers.js';
import { getPawnCycleSourceEvidence } from '../scripts/fairy-native-source-evidence.mjs';

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

test('pawn-of-pawns native source markers exist before the cycle can be promoted', () => {
    const source = fs.readFileSync(variantSourcePath, 'utf8');

    for (const marker of PAWN_CYCLE_NATIVE_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});

test('pawn-of-pawns native C++ skeleton exists but is not wired into normal movegen', () => {
    const source = fs.readFileSync(positionHeaderPath, 'utf8');

    for (const marker of PAWN_CYCLE_NATIVE_POSITION_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }

    const movesFromStart = source.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = source.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = source.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromStart > 0, true, 'Position::moves_from must exist');
    assert.equal(movesFromBody.includes('timur_try_make_pawn_of_pawns_cycle_plan'), false);
    assert.equal(movesFromBody.includes('timur_apply_pawn_of_pawns_cycle_skeleton'), false);
    assert.equal(movesFromBody.includes('timur_revert_pawn_of_pawns_cycle_skeleton'), false);
});

test('pawn-of-pawns source evidence passes only when variant and position markers exist', () => {
    const evidence = getPawnCycleSourceEvidence();

    assert.equal(evidence.nativeSourceMarker, true);
    assert.equal(evidence.nativePositionSkeleton, true);
    assert.deepEqual(evidence.missingMarkers, []);
});

test('pawn-of-pawns native source emits distinct perft smoke tokens without normal movegen promotion', () => {
    const positionSource = fs.readFileSync(positionHeaderPath, 'utf8');
    const searchSource = fs.readFileSync(searchSourcePath, 'utf8');

    for (const marker of [
        'TIMUR_PAWN_OF_PAWNS_PERFT1_TOKEN_OUTPUT',
        'TIMUR_PAWN_OF_PAWNS_STAGE2_NATIVE_TOKEN',
        'TIMUR_PAWN_OF_PAWNS_STAGE3_NATIVE_TOKEN',
        'TIMUR_PAWN_OF_PAWNS_ADVENTITIOUS_NATIVE_TOKEN',
        'pawn_cycle:e10:e3@stage2',
        'pawn_cycle:e1:e8@stage3',
        'pawn_cycle:f10:f10@adventitious',
        'timur_pawn_of_pawns_cycle_native_token',
        'timur_pawn_of_pawns_cycle_native_perft_root_token'
    ]) {
        assert.equal(positionSource.includes(marker), true, marker);
    }

    assert.equal(searchSource.includes('timur_pawn_of_pawns_cycle_native_perft_root_token(pos)'), true);
    assert.equal(searchSource.includes('sync_cout << pawnCycleToken << ": " << 1 << sync_endl'), true);

    const movesFromStart = positionSource.indexOf('inline Bitboard Position::moves_from');
    const movesFromEnd = positionSource.indexOf('inline Bitboard Position::legal_promotion', movesFromStart);
    const movesFromBody = positionSource.slice(movesFromStart, movesFromEnd);

    assert.equal(movesFromBody.includes('timur_pawn_of_pawns_cycle_native_perft_root_token'), false);
});
