import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { GameState } from '../src/game/GameState.js';
import {
  AdventitiousKing,
  Bull,
  Camel,
  Dabbaba,
  Elephant,
  General,
  Giraffe,
  King,
  Knight,
  Lion,
  Picket,
  Prince,
  Revealer,
  Rook,
  SeaMonster,
  TimurPawn,
  Vizier
} from '../src/game/PieceFactory.js';
import {
  coordToFairySquare,
  collectTimurLegalMoves,
  reconcileFairyMovesWithTimurRules
} from '../src/fairy/FairyTimurAdapter.js';
import { COLORS, PAWN_TYPES, PIECE_TYPES } from '../src/utils/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const vendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const variantPath = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');

const PIECE_TO_FEN = {
  [PIECE_TYPES.KING]: 'k',
  [PIECE_TYPES.VIZIER]: 'v',
  [PIECE_TYPES.SEA_MONSTER]: 's',
  [PIECE_TYPES.GENERAL]: 'g',
  [PIECE_TYPES.KNIGHT]: 'n',
  [PIECE_TYPES.LION]: 'l',
  [PIECE_TYPES.ELEPHANT]: 'e',
  [PIECE_TYPES.CAMEL]: 'c',
  [PIECE_TYPES.DABBABA]: 'd',
  [PIECE_TYPES.BULL]: 'b',
  [PIECE_TYPES.REVEALER]: 'h',
  [PIECE_TYPES.GIRAFFE]: 'z',
  [PIECE_TYPES.PICKET]: 't',
  [PIECE_TYPES.ROOK]: 'r',
  [PIECE_TYPES.PAWN]: 'p',
  [PIECE_TYPES.PRINCE]: 'q',
  [PIECE_TYPES.ADVENTITIOUS_KING]: 'a'
};

const CASES = [
  { id: 'pawn_forward_capture', label: 'Piyon ileri ve capraz alma', piece: (color, row, col) => new TimurPawn(color, row, col, PAWN_TYPES.PAWN_OF_PAWNS), row: 5, col: 5, extras: [{ piece: Dabbaba, color: COLORS.BLACK, row: 4, col: 4 }, { piece: Camel, color: COLORS.BLACK, row: 4, col: 6 }] },
  { id: 'king_center', label: 'Sah tek kare', piece: King, row: 5, col: 5, omitWhiteKing: true },
  { id: 'vizier_center', label: 'Vezir ortogonal tek kare', piece: Vizier, row: 5, col: 5 },
  { id: 'sea_monster_center', label: 'Deniz canavari ortogonal tek kare', piece: SeaMonster, row: 5, col: 5 },
  { id: 'general_center', label: 'General capraz tek kare', piece: General, row: 5, col: 5 },
  { id: 'knight_center', label: 'At', piece: Knight, row: 5, col: 5 },
  { id: 'elephant_center', label: 'Fil/Elephant', piece: Elephant, row: 5, col: 5 },
  { id: 'camel_center', label: 'Deve/Camel', piece: Camel, row: 5, col: 5 },
  { id: 'dabbaba_center', label: 'Dabbaba', piece: Dabbaba, row: 5, col: 5 },
  { id: 'lion_center', label: 'Aslan 3 ortogonal', piece: Lion, row: 5, col: 5 },
  { id: 'bull_center', label: 'Boga 3-2 siçrama', piece: Bull, row: 5, col: 5 },
  { id: 'revealer_center', label: 'Acici/Revealer 3-3 siçrama', piece: Revealer, row: 5, col: 5 },
  { id: 'rook_center', label: 'Kale', piece: Rook, row: 5, col: 5 },
  { id: 'picket_center', label: 'Haberci/Picket minimum 2 capraz', piece: Picket, row: 5, col: 5 },
  { id: 'giraffe_center', label: 'Zurafa ozel hareket', piece: Giraffe, row: 5, col: 5 },
  { id: 'prince_center', label: 'Prens hareketi', piece: Prince, row: 5, col: 5, omitWhiteKing: true },
  { id: 'adventitious_king_center', label: 'Tavsiye/adventitious king hareketi', piece: AdventitiousKing, row: 5, col: 5, omitWhiteKing: true }
];

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

function waitForNewLine(lines, startIndex, predicate, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const existing = lines.slice(startIndex).find(predicate);
    if (existing) {
      resolve(existing);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Beklenen yeni Fairy cevabi gelmedi (${timeoutMs}ms).`));
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

    return await callback(stockfish, lines);
  } finally {
    try {
      stockfish.postMessage('quit');
      stockfish.terminate?.();
    } catch {
      // Ignore shutdown errors for POC scripts.
    }
  }
}

function createCaseState(testCase) {
  const state = new GameState();
  state.currentTurn = COLORS.WHITE;

  if (!testCase.omitWhiteKing) {
    state.board.setPiece(9, 10, new King(COLORS.WHITE, 9, 10));
  }
  state.board.setPiece(0, 0, new King(COLORS.BLACK, 0, 0));

  const piece = typeof testCase.piece === 'function' && !testCase.piece.prototype?.getPotentialMoves
    ? testCase.piece(COLORS.WHITE, testCase.row, testCase.col)
    : new testCase.piece(COLORS.WHITE, testCase.row, testCase.col);
  state.board.setPiece(testCase.row, testCase.col, piece);

  for (const extra of testCase.extras || []) {
    state.board.setPiece(extra.row, extra.col, new extra.piece(extra.color, extra.row, extra.col));
  }

  return state;
}

function stateToFairyFen(state) {
  const ranks = [];
  for (let row = 0; row < 10; row++) {
    let rank = '';
    let empty = 0;
    for (let col = 0; col < 11; col++) {
      const piece = state.board.getPieceAt(row, col);
      if (!piece) {
        empty++;
        continue;
      }

      if (empty) {
        rank += String(empty);
        empty = 0;
      }

      const char = PIECE_TO_FEN[piece.type];
      if (!char) {
        throw new Error(`Fairy FEN harfi yok: ${piece.type}`);
      }
      rank += piece.color === COLORS.WHITE ? char.toUpperCase() : char;
    }
    if (empty) rank += String(empty);
    ranks.push(rank);
  }

  const side = state.currentTurn === COLORS.WHITE ? 'w' : 'b';
  return `${ranks.join('/')} ${side} - - 0 1`;
}

function parseFairyPerftMoves(lines, startIndex = 0) {
  return lines
    .slice(startIndex)
    .map((line) => line.trim())
    .map((line) => line.match(/^([a-k][1-9]0?[a-k][1-9]0?[^:]*):\s+\d+$/i))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase())
    .sort((a, b) => a.localeCompare(b));
}

async function getFairyPerftMoves(stockfish, lines, fen) {
  const startIndex = lines.length;
  stockfish.postMessage('ucinewgame');
  stockfish.postMessage(`position fen ${fen}`);
  stockfish.postMessage('go perft 1');
  await waitForNewLine(lines, startIndex, (line) => /^Nodes searched:\s+\d+/.test(line), 20000);
  return parseFairyPerftMoves(lines, startIndex);
}

function formatMoves(moves, limit = 10) {
  if (!moves.length) return '-';
  const sample = moves.slice(0, limit).map((move) => {
    if (typeof move === 'string') return move;
    if (move.piece) return `${move.uci}(${move.reason || move.piece})`;
    return `${move.uci}(${move.reason || 'unknown'})`;
  });
  return `${sample.join(', ')}${moves.length > limit ? `, ... +${moves.length - limit}` : ''}`;
}

async function main() {
  const results = [];

  await withFairyTimur(async (stockfish, lines) => {
    for (const testCase of CASES) {
      const state = createCaseState(testCase);
      const jsMoves = collectTimurLegalMoves(state);
      const fen = stateToFairyFen(state);
      const fairyMoves = await getFairyPerftMoves(stockfish, lines, fen);
      const summary = reconcileFairyMovesWithTimurRules(state, fairyMoves, { jsMoves });

      results.push({
        id: testCase.id,
        label: testCase.label,
        fen,
        summary
      });
    }
  });

  let unexpectedCaseCount = 0;
  console.log('Fairy POC tas pozisyonlari karsilastirmasi\n');

  for (const result of results) {
    const { summary } = result;
    if (!summary.onlyExpectedPocDiffs) unexpectedCaseCount++;

    console.log(`[${summary.onlyExpectedPocDiffs ? 'OK' : 'DIKKAT'}] ${result.id} - ${result.label}`);
    console.log(`  JS: ${summary.stats.jsMoveCount}, Fairy: ${summary.stats.fairyMoveCount}, Ortak: ${summary.stats.acceptedMoveCount}`);
    console.log(`  Beklenmeyen fark: ${summary.onlyExpectedPocDiffs ? 'yok' : 'var'}`);
    if (summary.missingWrapperMoves.length) {
      console.log(`  Wrapper gereken JS hamleleri: ${formatMoves(summary.missingWrapperMoves)}`);
    }
    if (summary.rejectedFairyMoves.length) {
      console.log(`  JS kuraliyla reddedilen Fairy hamleleri: ${formatMoves(summary.rejectedFairyMoves)}`);
    }
    if (summary.unexpectedJsOnly.length) {
      console.log(`  Beklenmeyen JS-only: ${formatMoves(summary.unexpectedJsOnly)}`);
    }
    if (summary.unexpectedFairyOnly.length) {
      console.log(`  Beklenmeyen Fairy-only: ${formatMoves(summary.unexpectedFairyOnly)}`);
    }
  }

  console.log('\nOzet');
  console.log(`- Toplam pozisyon: ${results.length}`);
  console.log(`- Beklenmeyen farkli pozisyon: ${unexpectedCaseCount}`);

  if (unexpectedCaseCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[HATA]', error);
  process.exitCode = 1;
});
