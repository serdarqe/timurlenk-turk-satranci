import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { GameState } from '../src/game/GameState.js';
import { COLORS, FORMATIONS } from '../src/utils/constants.js';
import {
  collectTimurLegalMoves,
  reconcileFairyMovesWithTimurRules
} from '../src/fairy/FairyTimurAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const vendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const variantPath = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');

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

function parseFairyPerftMoves(lines) {
  return lines
    .map((line) => line.trim())
    .map((line) => line.match(/^([a-k][1-9]0?[a-k][1-9]0?[^:]*):\s+\d+$/i))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase())
    .sort((a, b) => a.localeCompare(b));
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
      // Ignore shutdown errors in comparison checks.
    }
  }
}

async function getFairyPerftMoves() {
  return withFairyTimur(async (stockfish, lines) => {
    stockfish.postMessage('go perft 1');
    await waitForLine(lines, (line) => /^Nodes searched:\s+\d+/.test(line));
    return parseFairyPerftMoves(lines);
  });
}

async function dumpFairyBoard() {
  const lines = await withFairyTimur(async (stockfish, capturedLines) => {
    const start = capturedLines.length;
    stockfish.postMessage('d');
    await new Promise((resolve) => setTimeout(resolve, 250));
    return capturedLines.slice(start);
  });

  console.log('Fairy timur_poc board dump');
  console.log(lines.join('\n'));
}

function printMoves(title, moves, limit = 24) {
  console.log(`\n${title} (${moves.length})`);
  if (!moves.length) {
    console.log('-');
    return;
  }
  const sample = moves.slice(0, limit).map((move) => {
    if (typeof move === 'string') return move;
    if (move.piece) return `${move.uci} [${move.piece}${move.reason ? `, ${move.reason}` : ''}]`;
    return `${move.uci} [${move.reason || 'unknown'}]`;
  });
  console.log(sample.join(', '));
  if (moves.length > limit) console.log(`... +${moves.length - limit} daha`);
}

async function main() {
  if (process.argv.includes('--dump')) {
    await dumpFairyBoard();
    return;
  }

  const state = await GameState.createInitialState(FORMATIONS.MASCULINE);
  state.currentTurn = COLORS.WHITE;

  const jsMoves = collectTimurLegalMoves(state);
  const fairyMoves = await getFairyPerftMoves();
  const summary = reconcileFairyMovesWithTimurRules(state, fairyMoves, { jsMoves });

  console.log('Fairy vs JS Timur legal hamle karsilastirmasi');
  console.log(`Pozisyon: Eril dizilim, beyaz hamle sirasi`);
  console.log(`JS legal hamle: ${summary.stats.jsMoveCount}`);
  console.log(`Fairy POC perft hamle: ${summary.stats.fairyMoveCount}`);
  console.log(`Ortak hamle: ${summary.stats.acceptedMoveCount}`);
  console.log(`Eslesme: ${summary.exactMatch ? 'tam' : 'fark var'}`);
  console.log(`POC beklenen fark disi: ${summary.onlyExpectedPocDiffs ? 'yok' : 'var'}`);

  printMoves('JS motorunda olup Fairy wrapper isteyenler', summary.missingWrapperMoves);
  printMoves('Fairy motorunda olup JS kuraliyla reddedilenler', summary.rejectedFairyMoves);
  printMoves('Beklenmeyen JS-only farklar', summary.unexpectedJsOnly);
  printMoves('Beklenmeyen Fairy-only farklar', summary.unexpectedFairyOnly);

  console.log('\nNot');
  console.log('- Kalan beklenen farklar: zurafa plain variants.ini ile birebir ifade edilemiyor; picket icin en az 2 kare sarti wrapper veya fork ister.');
  console.log('- Hisar, sah degisimi ve pawn-of-pawns gibi ozel kurallar bu baslangic perft karsilastirmasinda henuz hedeflenmedi.');
}

main().catch((error) => {
  console.error('[HATA]', error);
  process.exitCode = 1;
});
