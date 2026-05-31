import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function collectFairyWasmRebuildEvidence({
    sourcePath,
    bundles = []
} = {}) {
    const sourceInfo = readSourceInfo(sourcePath);
    const bundleReports = bundles.map((bundle) => inspectBundle(bundle, sourceInfo));
    const wasmRebuilt = Boolean(sourceInfo.ok)
        && bundleReports.length > 0
        && bundleReports.every((bundle) => bundle.ok);

    return {
        wasmRebuilt,
        sourcePath,
        sourceSha256: sourceInfo.sha256,
        sourceLastModifiedAt: sourceInfo.lastModifiedAt,
        bundles: bundleReports,
        blockers: wasmRebuilt ? [] : ['wasm_rebuild_evidence_missing']
    };
}

collectFairyWasmRebuildEvidence.hashFile = hashFile;

export function hashFile(filePath) {
    return crypto.createHash('sha256')
        .update(fs.readFileSync(filePath))
        .digest('hex');
}

function inspectBundle(bundle, sourceInfo) {
    const manifest = readManifest(bundle.manifestPath);
    const wasmPath = path.join(bundle.rootDir, 'stockfish.wasm');
    const wasmInfo = readFileInfo(wasmPath);
    const manifestGeneratedAt = manifest.generatedAt || null;
    const manifestGeneratedAfterSource = isSameOrAfter(manifestGeneratedAt, sourceInfo.lastModifiedAt);
    const wasmModifiedAfterSource = isSameOrAfter(wasmInfo.lastModifiedAt, sourceInfo.lastModifiedAt);
    const sourceHashMatches = manifest.nativeSource?.variantCppSha256 === sourceInfo.sha256;
    const sourceMarkerPresent = manifest.nativeSource?.citadelDrawSourceMarker === true;
    const hasWasmArtifact = wasmInfo.exists && wasmInfo.size > 0;
    const ok = Boolean(
        manifest.ok
        && hasWasmArtifact
        && sourceHashMatches
        && sourceMarkerPresent
        && manifestGeneratedAfterSource
        && wasmModifiedAfterSource
    );

    return {
        bundle: bundle.bundle || manifest.bundle || path.basename(bundle.rootDir || ''),
        manifestPath: bundle.manifestPath,
        rootDir: bundle.rootDir,
        ok,
        sourceHashMatches,
        sourceMarkerPresent,
        manifestGeneratedAt,
        manifestGeneratedAfterSource,
        wasmPath,
        wasmSize: wasmInfo.size,
        wasmLastModifiedAt: wasmInfo.lastModifiedAt,
        wasmModifiedAfterSource
    };
}

function readSourceInfo(sourcePath) {
    const info = readFileInfo(sourcePath);
    return {
        ...info,
        ok: info.exists && info.size > 0,
        sha256: info.exists ? hashFile(sourcePath) : null
    };
}

function readFileInfo(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return {
            exists: false,
            size: 0,
            lastModifiedAt: null
        };
    }

    const stat = fs.statSync(filePath);
    return {
        exists: true,
        size: stat.size,
        lastModifiedAt: stat.mtime.toISOString()
    };
}

function readManifest(manifestPath) {
    if (!manifestPath || !fs.existsSync(manifestPath)) {
        return {
            ok: false
        };
    }

    return {
        ok: true,
        ...JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    };
}

function isSameOrAfter(value, baseline) {
    if (!value || !baseline) return false;
    return new Date(value).getTime() >= new Date(baseline).getTime();
}
