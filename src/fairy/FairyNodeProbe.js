import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { stateToFairyFen } from './FairyFen.js';
import { parseFairyPerftRootMoves } from './FairyDebugEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_ARTIFACT_ROOT = path.join(PROJECT_ROOT, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const DEFAULT_VARIANT_PATH = path.join(PROJECT_ROOT, 'fairy-poc', 'timur-draft.variants.ini');
const DEFAULT_VARIANT = 'timur_poc';
const DEFAULT_TIMEOUT_MS = 3000;

export function createFairyNodeProbe(options = {}) {
    const artifactRoot = options.artifactRoot || DEFAULT_ARTIFACT_ROOT;
    const variantPath = options.variantPath || DEFAULT_VARIANT_PATH;
    const variant = options.variant || DEFAULT_VARIANT;
    const defaultDepth = Math.max(1, Math.round(Number(options.depth || 1)));
    const defaultTimeoutMs = Math.max(250, Math.round(Number(options.timeoutMs || DEFAULT_TIMEOUT_MS)));
    const collectRootMovesByDefault = Boolean(options.collectRootMoves);
    let sessionPromise = null;

    async function getSession() {
        if (!sessionPromise) {
            sessionPromise = createEngineSession({
                artifactRoot,
                variantPath,
                variant,
                timeoutMs: defaultTimeoutMs
            }).catch((error) => {
                sessionPromise = null;
                throw error;
            });
        }

        return sessionPromise;
    }

    async function probe({ gameState, depth, timeoutMs, collectRootMoves } = {}) {
        const resolvedDepth = Math.max(1, Math.round(Number(depth || defaultDepth)));
        const resolvedTimeoutMs = Math.max(250, Math.round(Number(timeoutMs || defaultTimeoutMs)));
        const fen = stateToFairyFen(gameState);
        const session = await getSession();
        const rootProbe = await tryRequestRootMoves(session, fen, {
            timeoutMs: resolvedTimeoutMs,
            collectRootMoves: collectRootMoves ?? collectRootMovesByDefault
        });
        const startIndex = session.lines.length;
        const startedAt = performance.now();

        session.engine.postMessage('ucinewgame');
        session.engine.postMessage(`position fen ${fen}`);
        session.engine.postMessage(`go depth ${resolvedDepth}`);

        const bestmove = await waitForLine(
            session.lines,
            (line) => /^bestmove\s+\S+/i.test(line),
            resolvedTimeoutMs,
            'fairy_node_bestmove',
            startIndex
        );

        const produced = session.lines.slice(startIndex);
        return {
            ok: true,
            bestmove,
            thinkMs: Math.round(performance.now() - startedAt),
            rootMoves: rootProbe.rootMoves,
            rootMoveCount: Array.isArray(rootProbe.rootMoves) ? rootProbe.rootMoves.length : 0,
            rootMoveThinkMs: rootProbe.rootMoveThinkMs,
            rootMovesError: rootProbe.rootMovesError,
            tail: produced.slice(-12),
            artifact: 'node-singlethread',
            variant,
            depth: resolvedDepth
        };
    }

    probe.close = async () => {
        if (!sessionPromise) return;
        try {
            const session = await sessionPromise;
            session.engine.postMessage('quit');
            session.engine.terminate?.();
        } catch {
            // Best-effort shutdown; automation must not fail because teardown failed.
        } finally {
            sessionPromise = null;
        }
    };

    return probe;
}

async function createEngineSession({ artifactRoot, variantPath, variant, timeoutMs }) {
    const requireFromArtifact = createRequire(path.join(artifactRoot, 'uci.js'));
    const Stockfish = requireFromArtifact('./stockfish.js');
    const stockfishJs = path.join(artifactRoot, 'stockfish.js');
    const stockfishWasm = path.join(artifactRoot, 'stockfish.wasm');
    const lines = [];
    lines.waiters = [];

    const engine = await Stockfish({
        locateFile: (filename) => path.join(artifactRoot, filename),
        mainScriptUrlOrBlob: stockfishJs,
        wasmBinary: fs.readFileSync(stockfishWasm)
    });

    engine.addMessageListener((line) => {
        const text = String(line);
        lines.push(text);
        lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
    });

    let startIndex = lines.length;
    engine.postMessage('uci');
    await waitForLine(lines, (line) => line.includes('uciok'), timeoutMs, 'fairy_node_uciok', startIndex);

    startIndex = lines.length;
    engine.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'), timeoutMs, 'fairy_node_readyok', startIndex);

    engine.FS.writeFile('/timur-draft.variants.ini', fs.readFileSync(variantPath, 'utf8'));
    engine.postMessage('load /timur-draft.variants.ini');
    engine.postMessage(`setoption name UCI_Variant value ${variant}`);
    engine.postMessage('setoption name Threads value 1');
    engine.postMessage('setoption name Hash value 16');

    startIndex = lines.length;
    engine.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'), timeoutMs, 'fairy_node_timur_readyok', startIndex);

    return { engine, lines, artifactRoot, variant };
}

async function tryRequestRootMoves(session, fen, options = {}) {
    if (!options.collectRootMoves) {
        return { rootMoves: null, rootMoveThinkMs: null, rootMovesError: null };
    }

    try {
        const startIndex = session.lines.length;
        const startedAt = performance.now();
        session.engine.postMessage('ucinewgame');
        session.engine.postMessage(`position fen ${fen}`);
        session.engine.postMessage('go perft 1');

        await waitForLine(
            session.lines,
            (line) => /^Nodes searched:\s+\d+/i.test(line),
            options.timeoutMs,
            'fairy_node_root_moves',
            startIndex
        );

        return {
            rootMoves: parseFairyPerftRootMoves(session.lines.slice(startIndex)),
            rootMoveThinkMs: Math.round(performance.now() - startedAt),
            rootMovesError: null
        };
    } catch (error) {
        return {
            rootMoves: null,
            rootMoveThinkMs: null,
            rootMovesError: error?.message || 'fairy_node_root_moves_failed'
        };
    }
}

function waitForLine(lines, predicate, timeoutMs, label, fromIndex = 0) {
    return new Promise((resolve, reject) => {
        const existing = lines.slice(fromIndex).find(predicate);
        if (existing) {
            resolve(existing);
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error(`${label}_timeout_${timeoutMs}ms`));
        }, timeoutMs);

        lines.waiters.push((line) => {
            if (!predicate(line)) return false;
            clearTimeout(timeout);
            resolve(line);
            return true;
        });
    });
}
