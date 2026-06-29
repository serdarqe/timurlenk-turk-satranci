import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { CITADEL_NATIVE_MODEL_SOURCE_MARKERS } from '../src/fairy/FairyCitadelNativeModel.js';

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

test('citadel native C++ source contains the off-board model contract markers', () => {
    const combinedSource = [
        fs.readFileSync(variantSourcePath, 'utf8'),
        fs.readFileSync(positionHeaderPath, 'utf8')
    ].join('\n');

    for (const marker of CITADEL_NATIVE_MODEL_SOURCE_MARKERS) {
        assert.equal(combinedSource.includes(marker), true, marker);
    }
});
