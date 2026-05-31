import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { getPromotionParityCases } from '../src/fairy/FairyPromotionParity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const vendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const jsonMode = process.argv.includes('--json');
const variant = 'timur';
const fromTo = 'e9e10';
const promotionFen = '10k/4P6/11/11/11/11/11/11/11/5K5 w - - 0 1';

function waitForLine(lines, predicate, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const existing = lines.find(predicate);
        if (existing) {
            resolve(existing);
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error(`Beklenen Fairy cevabi gelmedi (${timeoutMs}ms).`));
        }, timeoutMs);

        lines.waiters.push((line) => {
            if (!predicate(line)) return false;
            clearTimeout(timeout);
            resolve(line);
            return true;
        });
    });
}

async function createEngine() {
    const stockfishJs = path.join(vendorRoot, 'stockfish.js');
    const requireFromArtifact = createRequire(path.join(vendorRoot, 'uci.js'));
    const Stockfish = requireFromArtifact('./stockfish.js');
    const lines = [];
    lines.waiters = [];

    const stockfish = await Stockfish({
        locateFile: (filename) => path.join(vendorRoot, filename),
        mainScriptUrlOrBlob: stockfishJs,
        wasmBinary: fs.readFileSync(path.join(vendorRoot, 'stockfish.wasm'))
    });

    stockfish.addMessageListener((line) => {
        const text = String(line);
        lines.push(text);
        lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
    });

    return { stockfish, lines };
}

async function runPromotionSmoke() {
    const expectedPromotionMoves = getPromotionParityCases()
        .map((item) => `${fromTo}${item.nativeSuffix}`)
        .sort((a, b) => a.localeCompare(b));
    const { stockfish, lines } = await createEngine();

    try {
        stockfish.postMessage('uci');
        await waitForLine(lines, (line) => line.includes('uciok'));

        stockfish.postMessage('isready');
        await waitForLine(lines, (line) => line.includes('readyok'));

        stockfish.postMessage(`setoption name UCI_Variant value ${variant}`);
        stockfish.postMessage('isready');
        await waitForLine(lines, (line) => line.includes('readyok'));

        stockfish.postMessage('ucinewgame');
        stockfish.postMessage(`position fen ${promotionFen}`);
        stockfish.postMessage('go perft 1');
        await waitForLine(lines, (line) => /^Nodes searched:\s+\d+/i.test(line), 30000);

        const promotionMoves = extractPerftMoves(lines)
            .filter((move) => move.startsWith(fromTo))
            .sort((a, b) => a.localeCompare(b));
        const missingPromotionMoves = expectedPromotionMoves.filter((move) => !promotionMoves.includes(move));

        return {
            ok: missingPromotionMoves.length === 0,
            variant,
            fromTo,
            fen: promotionFen,
            expectedPromotionMoves,
            promotionMoves,
            missingPromotionMoves,
            artifact: vendorRoot
        };
    } finally {
        try {
            stockfish.postMessage('quit');
            stockfish.terminate?.();
        } catch {
            // Ignore shutdown errors in validation scripts.
        }
    }
}

function extractPerftMoves(lines) {
    return lines
        .map((line) => String(line).trim().match(/^([a-k](?:10|[1-9])[a-k](?:10|[1-9])[a-z]?):\s+\d+$/i)?.[1])
        .filter(Boolean)
        .map((move) => move.toLowerCase());
}

runPromotionSmoke()
    .then((result) => {
        if (jsonMode) {
            process.stdout.write(`${JSON.stringify(result)}\n`);
        } else {
            console.log('Fairy native Timur promotion smoke');
            console.log(`Variant: ${result.variant}`);
            console.log(`Position: ${result.fen}`);
            console.log(`Promotion moves: ${result.promotionMoves.join(', ') || 'none'}`);
            console.log(`Missing: ${result.missingPromotionMoves.join(', ') || 'none'}`);
            console.log(`Artifact: ${result.artifact}`);
        }

        if (!result.ok) process.exitCode = 1;
    })
    .catch((error) => {
        if (jsonMode) {
            process.stdout.write(`${JSON.stringify({
                ok: false,
                variant,
                fromTo,
                error: error.message,
                promotionMoves: [],
                missingPromotionMoves: getPromotionParityCases().map((item) => `${fromTo}${item.nativeSuffix}`)
            })}\n`);
        } else {
            console.error('[HATA]', error);
        }
        process.exitCode = 1;
    });
