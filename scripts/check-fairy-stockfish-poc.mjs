import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');

const fairyRoot = path.join(workspaceRoot, 'Satranc Motoru', 'fairy-stockfish.wasm-nnue');
const fairyPublic = path.join(fairyRoot, 'src', 'emscripten', 'public');
const pocVendor = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const draftVariant = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');
const pieceMap = path.join(projectRoot, 'fairy-poc', 'timur-piece-map.json');

const requiredArtifacts = [
  'stockfish.js',
  'stockfish.wasm',
  'stockfish.worker.js'
];

function exists(target) {
  return fs.existsSync(target);
}

function fileSize(target) {
  if (!exists(target)) return 0;
  return fs.statSync(target).size;
}

function printStatus(label, ok, detail = '') {
  const icon = ok ? '[OK]' : '[--]';
  console.log(`${icon} ${label}${detail ? `: ${detail}` : ''}`);
}

function readDraftStartFen() {
  if (!exists(draftVariant)) return null;
  const text = fs.readFileSync(draftVariant, 'utf8');
  const line = text
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith('startFen'));
  if (!line) return null;
  return line.split('=').slice(1).join('=').trim().split(/\s+/)[0] || null;
}

function countFenRankWidth(rank) {
  let width = 0;
  let digits = '';
  for (const char of rank) {
    if (/\d/.test(char)) {
      digits += char;
      continue;
    }
    if (digits) {
      width += Number(digits);
      digits = '';
    }
    width += 1;
  }
  if (digits) {
    width += Number(digits);
  }
  return width;
}

function validateDraftFen() {
  const boardFen = readDraftStartFen();
  if (!boardFen) {
    printStatus('Timur FEN taslagi', false, 'startFen bulunamadi');
    return;
  }

  const ranks = boardFen.split('/');
  const widths = ranks.map(countFenRankWidth);
  const expectedRankCount = 10;
  const expectedFileCount = 11;
  const rankCountOk = ranks.length === expectedRankCount;
  const widthsOk = widths.every((width) => width === expectedFileCount);

  printStatus(
    'Timur FEN tahta olcusu',
    rankCountOk && widthsOk,
    `${ranks.length} rank, genislikler: ${widths.join(', ')}`
  );
}

function findArtifactBase() {
  const candidates = [
    { label: 'POC vendor', base: pocVendor },
    { label: 'Fairy source public', base: fairyPublic }
  ];

  return candidates.find(({ base }) => requiredArtifacts.every((name) => exists(path.join(base, name)))) || null;
}

function waitForLine({ lines, predicate, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const existing = lines.find(predicate);
    if (existing) {
      resolve(existing);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Timeout: beklenen UCI cevabi gelmedi (${timeoutMs}ms).`));
    }, timeoutMs);

    lines.waiters.push((line) => {
      if (!predicate(line)) return false;
      clearTimeout(timeout);
      resolve(line);
      return true;
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSmokeTest() {
  const result = await runUciBestmoveTest({
    label: 'chess/depth 1',
    prepare: async (stockfish) => {
      stockfish.postMessage('setoption name UCI_Variant value chess');
      stockfish.postMessage('ucinewgame');
      stockfish.postMessage('position startpos');
    }
  });

  printStatus('Smoke test bestmove', result.ok, result.detail);
}

async function runTimurVariantTest() {
  const draftConfig = fs.readFileSync(draftVariant, 'utf8');
  const virtualVariantPath = '/timur-draft.variants.ini';
  const result = await runUciBestmoveTest({
    label: 'timur_poc/depth 1',
    prepare: async (stockfish, lines) => {
      stockfish.FS.writeFile(virtualVariantPath, draftConfig);
      stockfish.postMessage(`load ${virtualVariantPath}`);
      stockfish.postMessage('setoption name UCI_Variant value timur_poc');
      stockfish.postMessage('isready');
      await waitForLine({ lines, predicate: (line) => line.includes('readyok') });
      stockfish.postMessage('ucinewgame');
      stockfish.postMessage('position startpos');
    },
    timeoutMs: 25000
  });

  printStatus('Timur varyant bestmove', result.ok, result.detail);
  if (!result.ok && result.tail?.length) {
    console.log('\nSon UCI satirlari:');
    for (const line of result.tail) console.log(line);
  }
}

async function runPerftTest() {
  const chessResult = await runUciLineTest({
    label: 'chess/perft 1',
    prepare: async (stockfish) => {
      stockfish.postMessage('setoption name UCI_Variant value chess');
      stockfish.postMessage('ucinewgame');
      stockfish.postMessage('position startpos');
    },
    command: 'go perft 1',
    predicate: (line) => /^Nodes searched:\s+\d+/.test(line),
    timeoutMs: 15000
  });
  printStatus('Chess perft 1', chessResult.ok, chessResult.detail);

  const draftConfig = fs.readFileSync(draftVariant, 'utf8');
  const virtualVariantPath = '/timur-draft.variants.ini';
  const timurResult = await runUciLineTest({
    label: 'timur_poc/perft 1',
    prepare: async (stockfish, lines) => {
      stockfish.FS.writeFile(virtualVariantPath, draftConfig);
      stockfish.postMessage(`load ${virtualVariantPath}`);
      stockfish.postMessage('setoption name UCI_Variant value timur_poc');
      stockfish.postMessage('isready');
      await waitForLine({ lines, predicate: (line) => line.includes('readyok') });
      stockfish.postMessage('ucinewgame');
      stockfish.postMessage('position startpos');
    },
    command: 'go perft 1',
    predicate: (line) => /^Nodes searched:\s+\d+/.test(line),
    timeoutMs: 20000
  });
  printStatus('Timur perft 1', timurResult.ok, timurResult.detail);
  if (timurResult.tail?.length) {
    console.log('\nSon UCI satirlari:');
    for (const line of timurResult.tail) console.log(line);
  }
}

async function runUciBestmoveTest({ label, prepare, timeoutMs = 15000 }) {
  return runUciLineTest({
    label,
    prepare,
    command: 'go depth 1',
    predicate: (line) => /^bestmove\s+\S+/.test(line),
    timeoutMs
  });
}

async function runUciLineTest({ label, prepare, command, predicate, timeoutMs = 15000 }) {
  const artifactBase = findArtifactBase();
  if (!artifactBase) {
    return { ok: false, detail: 'derlenmis WASM motor ciktisi henuz yok' };
  }
  const stockfishJs = path.join(artifactBase.base, 'stockfish.js');
  if (!exists(stockfishJs)) {
    return { ok: false, detail: 'stockfish.js bulunamadi' };
  }

  console.log(`\nUCI test basliyor: Fairy-Stockfish ${label} (${artifactBase.label})`);
  const requireFromArtifact = createRequire(path.join(artifactBase.base, 'uci.js'));
  const Stockfish = requireFromArtifact('./stockfish.js');
  const lines = [];
  lines.waiters = [];

  let stockfish = null;
  try {
    stockfish = await Stockfish({
      locateFile: (filename) => path.join(artifactBase.base, filename),
      mainScriptUrlOrBlob: path.join(artifactBase.base, 'stockfish.js'),
      wasmBinary: fs.readFileSync(path.join(artifactBase.base, 'stockfish.wasm'))
    });
    stockfish.addMessageListener((line) => {
      const text = String(line);
      lines.push(text);
      lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
    });

    stockfish.postMessage('uci');
    await waitForLine({ lines, predicate: (line) => line.includes('uciok') });

    stockfish.postMessage('isready');
    await waitForLine({ lines, predicate: (line) => line.includes('readyok') });

    await prepare(stockfish, lines);
    stockfish.postMessage(command);

    const matchedLine = await Promise.race([
      waitForLine({
        lines,
        predicate,
        timeoutMs
      }),
      new Promise((_, reject) => {
        stockfish.onExit = (code) => reject(new Error(`Motor erken kapandi. exit=${code ?? 'unknown'}`));
      })
    ]);
    await sleep(50);
    return { ok: true, detail: matchedLine, tail: lines.slice(-12) };
  } catch (error) {
    return { ok: false, detail: error.message, tail: lines.slice(-12) };
  } finally {
    try {
      stockfish?.postMessage?.('quit');
      stockfish?.terminate?.();
    } catch {
      // Ignore shutdown errors in smoke checks.
    }
  }
}

console.log('Fairy-Stockfish WASM POC kontrolu\n');
printStatus('Fairy kaynak klasoru', exists(fairyRoot), fairyRoot);
printStatus('Emscripten public klasoru', exists(fairyPublic), fairyPublic);
printStatus('POC vendor motor klasoru', exists(pocVendor), pocVendor);
printStatus('Timur varyant taslagi', exists(draftVariant), draftVariant);
printStatus('Timur tas esleme haritasi', exists(pieceMap), pieceMap);
validateDraftFen();

console.log('\nDerlenmis WASM ciktisi');
for (const { label, base } of [
  { label: 'POC vendor', base: pocVendor },
  { label: 'Fairy source public', base: fairyPublic }
]) {
  console.log(`\n${label}`);
  for (const artifact of requiredArtifacts) {
    const target = path.join(base, artifact);
    const size = fileSize(target);
    printStatus(artifact, size > 0, size > 0 ? `${Math.round(size / 1024)} KB` : 'yok');
  }
}

console.log('\nDurum');
const artifactBase = findArtifactBase();
if (!artifactBase) {
  console.log('- Bu klasorde kaynak kod var, ama oyun icine alinacak derlenmis WASM ciktisi henuz yok.');
  console.log('- Sonraki kontrollu adim: Emscripten ile build almak veya hazir npm paketinden stockfish.js/wasm/worker dosyalarini izole POC alanina almak.');
} else {
  console.log(`- Derlenmis motor dosyalari hazir gorunuyor: ${artifactBase.label}`);
  console.log('- Bir sonraki adim UCI smoke test ve timur varyant yukleme denemesi.');
}

console.log('- Mevcut oyun motoruna entegrasyon yapilmadi; bu komut sadece POC hazirligini kontrol eder.');

if (process.argv.includes('--smoke')) {
  await runSmokeTest();
}

if (process.argv.includes('--timur')) {
  await runTimurVariantTest();
}

if (process.argv.includes('--perft')) {
  await runPerftTest();
}
