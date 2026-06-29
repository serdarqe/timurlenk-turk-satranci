import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const vendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const startFen = 'ecd5dce/rntzgkvztnr/ppppppppppp/11/11/11/11/PPPPPPPPPPP/RNTZGKVZTNR/ECD5DCE w - - 0 1';

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

async function main() {
  const { stockfish, lines } = await createEngine();
  try {
    stockfish.postMessage('uci');
    await waitForLine(lines, (line) => line.includes('uciok'));

    const uciText = lines.join('\n');
    if (!/\btimur\b/.test(uciText)) {
      throw new Error('Native UCI_Variant listesinde timur bulunamadi.');
    }

    stockfish.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'));

    stockfish.postMessage('setoption name UCI_Variant value timur');
    stockfish.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'), 20000);

    stockfish.postMessage('ucinewgame');
    stockfish.postMessage(`position fen ${startFen}`);
    stockfish.postMessage('go depth 1');
    const bestmove = await waitForLine(lines, (line) => /^bestmove\s+\S+/i.test(line), 30000);

    console.log('Fairy native Timur bestmove');
    console.log('Variant: timur');
    console.log(`Bestmove: ${bestmove}`);
    console.log(`Artifact: ${vendorRoot}`);
  } finally {
    try {
      stockfish.postMessage('quit');
      stockfish.terminate?.();
    } catch {
      // Ignore shutdown errors in validation scripts.
    }
  }
}

main().catch((error) => {
  console.error('[HATA]', error);
  process.exitCode = 1;
});
