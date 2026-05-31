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
import { collectFairyWasmRebuildEvidence } from '../src/fairy/FairyWasmRebuildEvidence.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
export const FAIRY_VARIANT_SOURCE_PATH = path.resolve(
    rootDir,
    '..',
    'Satranc Motoru',
    'fairy-stockfish.wasm-nnue',
    'src',
    'variant.cpp'
);
export const FAIRY_POSITION_HEADER_PATH = path.resolve(
    rootDir,
    '..',
    'Satranc Motoru',
    'fairy-stockfish.wasm-nnue',
    'src',
    'position.h'
);

export const FAIRY_WASM_REBUILD_BUNDLES = Object.freeze([
    {
        bundle: 'singlethread',
        rootDir: path.join(rootDir, 'public', 'fairy-singlethread'),
        manifestPath: path.join(rootDir, 'public', 'fairy-singlethread', 'manifest.json')
    }
]);

export function getCitadelDrawSourceEvidence() {
    const source = fs.readFileSync(FAIRY_VARIANT_SOURCE_PATH, 'utf8');
    const missingDrawMarkers = CITADEL_DRAW_NATIVE_SOURCE_MARKERS.filter((marker) => !source.includes(marker));
    const missingModelMarkers = CITADEL_NATIVE_MODEL_SOURCE_MARKERS.filter((marker) => !source.includes(marker));
    const missingMarkers = [
        ...missingDrawMarkers,
        ...missingModelMarkers
    ];

    return {
        nativeSourceMarker: missingMarkers.length === 0,
        nativeModelContract: missingModelMarkers.length === 0,
        missingMarkers,
        missingDrawMarkers,
        missingModelMarkers,
        sourcePath: FAIRY_VARIANT_SOURCE_PATH
    };
}

export function getCitadelExchangeSourceEvidence() {
    const variantSource = fs.readFileSync(FAIRY_VARIANT_SOURCE_PATH, 'utf8');
    const positionHeader = fs.readFileSync(FAIRY_POSITION_HEADER_PATH, 'utf8');
    const missingSourceMarkers = CITADEL_EXCHANGE_NATIVE_SOURCE_MARKERS
        .filter((marker) => !variantSource.includes(marker));
    const missingPositionMarkers = CITADEL_EXCHANGE_NATIVE_POSITION_MARKERS
        .filter((marker) => !positionHeader.includes(marker));
    const missingMarkers = [
        ...missingSourceMarkers,
        ...missingPositionMarkers
    ];

    return {
        nativeSourceMarker: missingMarkers.length === 0,
        nativePositionSkeleton: missingPositionMarkers.length === 0,
        missingMarkers,
        missingSourceMarkers,
        missingPositionMarkers,
        sourcePath: FAIRY_VARIANT_SOURCE_PATH,
        positionHeaderPath: FAIRY_POSITION_HEADER_PATH
    };
}

export function getRoyalSwapSourceEvidence() {
    const variantSource = fs.readFileSync(FAIRY_VARIANT_SOURCE_PATH, 'utf8');
    const positionHeader = fs.readFileSync(FAIRY_POSITION_HEADER_PATH, 'utf8');
    const missingSourceMarkers = ROYAL_SWAP_NATIVE_SOURCE_MARKERS
        .filter((marker) => !variantSource.includes(marker));
    const missingPositionMarkers = ROYAL_SWAP_NATIVE_POSITION_MARKERS
        .filter((marker) => !positionHeader.includes(marker));
    const missingMarkers = [
        ...missingSourceMarkers,
        ...missingPositionMarkers
    ];

    return {
        nativeSourceMarker: missingMarkers.length === 0,
        nativePositionSkeleton: missingPositionMarkers.length === 0,
        missingMarkers,
        missingSourceMarkers,
        missingPositionMarkers,
        sourcePath: FAIRY_VARIANT_SOURCE_PATH,
        positionHeaderPath: FAIRY_POSITION_HEADER_PATH
    };
}

export function getPawnCycleSourceEvidence() {
    const variantSource = fs.readFileSync(FAIRY_VARIANT_SOURCE_PATH, 'utf8');
    const positionHeader = fs.readFileSync(FAIRY_POSITION_HEADER_PATH, 'utf8');
    const missingSourceMarkers = PAWN_CYCLE_NATIVE_SOURCE_MARKERS
        .filter((marker) => !variantSource.includes(marker));
    const missingPositionMarkers = PAWN_CYCLE_NATIVE_POSITION_MARKERS
        .filter((marker) => !positionHeader.includes(marker));
    const missingMarkers = [
        ...missingSourceMarkers,
        ...missingPositionMarkers
    ];

    return {
        nativeSourceMarker: missingMarkers.length === 0,
        nativePositionSkeleton: missingPositionMarkers.length === 0,
        missingMarkers,
        missingSourceMarkers,
        missingPositionMarkers,
        sourcePath: FAIRY_VARIANT_SOURCE_PATH,
        positionHeaderPath: FAIRY_POSITION_HEADER_PATH
    };
}

export function getCitadelDrawWasmRebuildEvidence() {
    return collectFairyWasmRebuildEvidence({
        sourcePath: FAIRY_VARIANT_SOURCE_PATH,
        bundles: FAIRY_WASM_REBUILD_BUNDLES
    });
}
