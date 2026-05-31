import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    collectFairyWasmRebuildEvidence
} from '../src/fairy/FairyWasmRebuildEvidence.js';

function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'fairy-wasm-evidence-'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function setMtime(filePath, isoDate) {
    const date = new Date(isoDate);
    fs.utimesSync(filePath, date, date);
}

function createBundleFixture({
    rootDir,
    bundle = 'singlethread',
    sourceHash,
    generatedAt,
    wasmMtime,
    sourceMarker = true
}) {
    const bundleDir = path.join(rootDir, bundle);
    fs.mkdirSync(bundleDir, { recursive: true });

    const wasmPath = path.join(bundleDir, 'stockfish.wasm');
    fs.writeFileSync(wasmPath, 'wasm-bytes');
    setMtime(wasmPath, wasmMtime);

    const manifestPath = path.join(bundleDir, 'manifest.json');
    writeJson(manifestPath, {
        generatedAt,
        bundle,
        artifacts: [
            {
                name: 'stockfish.wasm',
                bytes: fs.statSync(wasmPath).size
            }
        ],
        nativeSource: {
            variantCppSha256: sourceHash,
            citadelDrawSourceMarker: sourceMarker
        }
    });

    return {
        bundle,
        rootDir: bundleDir,
        manifestPath
    };
}

test('WASM rebuild evidence passes when manifest and artifact are newer than native source', () => {
    const tempDir = makeTempDir();
    const sourcePath = path.join(tempDir, 'variant.cpp');
    fs.writeFileSync(sourcePath, '// TIMUR_NATIVE_CITADEL_DRAW_SOURCE_MARKER\n', 'utf8');
    setMtime(sourcePath, '2026-05-19T10:00:00.000Z');

    const sourceHash = collectFairyWasmRebuildEvidence.hashFile(sourcePath);
    const bundle = createBundleFixture({
        rootDir: tempDir,
        sourceHash,
        generatedAt: '2026-05-19T10:05:00.000Z',
        wasmMtime: '2026-05-19T10:04:00.000Z'
    });

    const evidence = collectFairyWasmRebuildEvidence({
        sourcePath,
        bundles: [bundle]
    });

    assert.equal(evidence.wasmRebuilt, true);
    assert.deepEqual(evidence.blockers, []);
    assert.equal(evidence.bundles[0].ok, true);
    assert.equal(evidence.bundles[0].sourceHashMatches, true);
    assert.equal(evidence.bundles[0].manifestGeneratedAfterSource, true);
    assert.equal(evidence.bundles[0].wasmModifiedAfterSource, true);
});

test('WASM rebuild evidence blocks stale manifests even when artifact exists', () => {
    const tempDir = makeTempDir();
    const sourcePath = path.join(tempDir, 'variant.cpp');
    fs.writeFileSync(sourcePath, '// TIMUR_NATIVE_CITADEL_DRAW_SOURCE_MARKER\n', 'utf8');
    setMtime(sourcePath, '2026-05-19T10:00:00.000Z');

    const sourceHash = collectFairyWasmRebuildEvidence.hashFile(sourcePath);
    const bundle = createBundleFixture({
        rootDir: tempDir,
        sourceHash,
        generatedAt: '2026-05-19T09:59:00.000Z',
        wasmMtime: '2026-05-19T10:04:00.000Z'
    });

    const evidence = collectFairyWasmRebuildEvidence({
        sourcePath,
        bundles: [bundle]
    });

    assert.equal(evidence.wasmRebuilt, false);
    assert.deepEqual(evidence.blockers, ['wasm_rebuild_evidence_missing']);
    assert.equal(evidence.bundles[0].ok, false);
    assert.equal(evidence.bundles[0].manifestGeneratedAfterSource, false);
}
);
