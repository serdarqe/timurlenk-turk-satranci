import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import { CITADEL_DRAW_NATIVE_SOURCE_MARKERS } from '../src/fairy/FairyCitadelDrawNativeSourceMarkers.js';

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

test('citadel_draw native source markers exist before the rule can be promoted', () => {
    const source = fs.readFileSync(variantSourcePath, 'utf8');

    for (const marker of CITADEL_DRAW_NATIVE_SOURCE_MARKERS) {
        assert.equal(source.includes(marker), true, marker);
    }
});
