import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { GameState } from '../src/game/GameState.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';
import {
  collectTimurLegalMoves,
  selectSafeTimurMoveFromFairyBestMove
} from '../src/fairy/FairyTimurAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const vendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const variantPath = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');

function getArgValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

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

async function withFairyTimur(callback) {
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

  try {
    stockfish.postMessage('uci');
    await waitForLine(lines, (line) => line.includes('uciok'));

    stockfish.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'));

    stockfish.FS.writeFile('/timur-draft.variants.ini', fs.readFileSync(variantPath, 'utf8'));
    stockfish.postMessage('load /timur-draft.variants.ini');
    stockfish.postMessage('setoption name UCI_Variant value timur_poc');
    stockfish.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'));

    stockfish.postMessage('ucinewgame');
    stockfish.postMessage('position startpos');
    return await callback(stockfish, lines);
  } finally {
    try {
      stockfish.postMessage('quit');
      stockfish.terminate?.();
    } catch {
      // Ignore shutdown errors in POC scripts.
    }
  }
}

async function getFairyBestMove(depth) {
  return withFairyTimur(async (stockfish, lines) => {
    stockfish.postMessage(`go depth ${depth}`);
    return waitForLine(lines, (line) => /^bestmove\s+/i.test(line), 30000);
  });
}

async function main() {
  const depth = Number(getArgValue('--depth', '1'));
  const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
  state.currentTurn = COLORS.WHITE;
  const fallbackMove = collectTimurLegalMoves(state)[0] || null;

  const fairyBestMove = process.argv.includes('--mock-bestmove')
    ? getArgValue('--mock-bestmove', '')
    : await getFairyBestMove(depth);

  const decision = selectSafeTimurMoveFromFairyBestMove(state, fairyBestMove, { fallbackMove });

  console.log('Fairy bestmove guvenlik kapisi');
  console.log(`Pozisyon: Eril dizilim, beyaz hamle sirasi`);
  console.log(`Fairy raw bestmove: ${fairyBestMove}`);
  console.log(`Normalize hamle: ${decision.normalizedBestMove || '-'}`);
  console.log(`Karar: ${decision.accepted ? 'kabul' : 'reddet'}`);
  console.log(`Kaynak: ${decision.source}`);
  console.log(`Sebep: ${decision.reason}`);
  console.log(`Secilen hamle: ${decision.selectedMove?.uci || '-'}`);

  if (!decision.accepted && decision.source !== 'fallback') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[HATA]', error);
  process.exitCode = 1;
});
