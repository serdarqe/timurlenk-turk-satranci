import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { GameState } from '../src/game/GameState.js';
import { King } from '../src/game/PieceFactory.js';
import { collectTimurLegalMoves } from '../src/fairy/FairyTimurAdapter.js';
import { stateToFairyFen } from '../src/fairy/FairyFen.js';
import {
    evaluateCitadelOffboardNativeSmoke,
    getCitadelOffboardNativeSmokeCases
} from '../src/fairy/FairyCitadelOffboardNativeSmoke.js';
import { COLORS } from '../src/utils/constants.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const singleThreadVendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');

export async function runCitadelOffboardNativeSmoke() {
    const engine = await createEngine();
    try {
        await initializeTimurVariant(engine);
        const results = [];

        for (const smokeCase of getCitadelOffboardNativeSmokeCases()) {
            const state = buildCitadelState(smokeCase.color);
            const jsMoves = collectTimurLegalMoves(state);
            const jsMovePresent = jsMoves.some((move) => move.uci === smokeCase.jsMoveId);
            const fen = stateToFairyFen(state);
            const nativeRootMoves = await getNativeRootMoves(engine, fen);

            results.push({
                id: smokeCase.id,
                fen,
                jsMovePresent,
                nativeRootMoves
            });
        }

        return evaluateCitadelOffboardNativeSmoke(results);
    } finally {
        shutdownEngine(engine);
    }
}

function buildCitadelState(currentTurn) {
    const state = new GameState();
    state.currentTurn = currentTurn;
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    return state;
}

export async function createEngine() {
    const stockfishJs = path.join(singleThreadVendorRoot, 'stockfish.js');
    const stockfishWasm = path.join(singleThreadVendorRoot, 'stockfish.wasm');
    const requireFromArtifact = createRequire(path.join(singleThreadVendorRoot, 'uci.js'));
    const Stockfish = requireFromArtifact('./stockfish.js');
    const lines = [];
    lines.waiters = [];

    const stockfish = await Stockfish({
        locateFile: (filename) => path.join(singleThreadVendorRoot, filename),
        mainScriptUrlOrBlob: stockfishJs,
        wasmBinary: fs.readFileSync(stockfishWasm)
    });

    stockfish.addMessageListener((line) => {
        const text = String(line);
        lines.push(text);
        lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
    });

    return {
        stockfish,
        lines
    };
}

export async function initializeTimurVariant(engine) {
    engine.stockfish.postMessage('uci');
    await waitForLine(engine.lines, (line) => line.includes('uciok'));

    engine.stockfish.postMessage('isready');
    await waitForLine(engine.lines, (line) => line.includes('readyok'));

    engine.stockfish.postMessage('setoption name UCI_Variant value timur');
    engine.stockfish.postMessage('isready');
    await waitForLine(engine.lines, (line) => line.includes('readyok'));
}

export async function getNativeRootMoves(engine, fen) {
    const startIndex = engine.lines.length;
    engine.stockfish.postMessage('ucinewgame');
    engine.stockfish.postMessage(`position fen ${fen}`);
    engine.stockfish.postMessage('go perft 1');
    await waitForLine(engine.lines, (line, index) => index >= startIndex && /^Nodes searched:\s+\d+/i.test(line), 20000);

    return parsePerftRootMoves(engine.lines.slice(startIndex));
}

export function parsePerftRootMoves(lines) {
    return [...new Set(lines
        .map(parsePerftRootMove)
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parsePerftRootMove(line) {
    const text = String(line || '').trim().toLowerCase();
    return text.match(/^(citadel_exchange:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@(blackcitadel|whitecitadel)):\s+\d+/)?.[1]
        || text.match(/^(royal_swap:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@ransom):\s+\d+/)?.[1]
        || text.match(/^(pawn_cycle:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@(stage2|stage3|adventitious)):\s+\d+/)?.[1]
        || text.match(/^([a-k](?:10|[1-9])@(blackcitadel|whitecitadel)):\s+\d+/)?.[1]
        || text.match(/^([a-k](?:10|[1-9])(?:[a-k](?:10|[1-9]))[a-z]*):\s+\d+/)?.[1]
        || null;
}

function waitForLine(lines, predicate, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const existingIndex = lines.findIndex((line, index) => predicate(line, index));
        if (existingIndex >= 0) {
            resolve(lines[existingIndex]);
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error(`Beklenen Fairy cevabi gelmedi (${timeoutMs}ms).`));
        }, timeoutMs);

        lines.waiters.push((line) => {
            const index = lines.length - 1;
            if (!predicate(line, index)) return false;
            clearTimeout(timeout);
            resolve(line);
            return true;
        });
    });
}

export function shutdownEngine(engine) {
    try {
        engine?.stockfish?.postMessage?.('quit');
        engine?.stockfish?.terminate?.();
    } catch {
        // Smoke test shutdown errors are not relevant to rule evidence.
    }
}
