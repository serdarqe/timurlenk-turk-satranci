import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const variantPath = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');
const reportPath = path.join(projectRoot, 'FAIRY_PERFORMANCE_BUDGET_REPORT.md');

const artifactRoots = {
  singlethread: path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm'),
  pthread: path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm')
};

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function parseDepths() {
  return argValue('--depths', '1,2,3,4')
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function waitForLine(lines, predicate, timeoutMs, label, fromIndex = 0) {
  return new Promise((resolve, reject) => {
    const existing = lines.slice(fromIndex).find(predicate);
    if (existing) {
      resolve(existing);
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error(`${label} zaman asimi (${timeoutMs}ms)`));
    }, timeoutMs);

    lines.waiters.push((line) => {
      if (!predicate(line)) return false;
      clearTimeout(timeout);
      resolve(line);
      return true;
    });
  });
}

function parseInfo(lines) {
  const info = [...lines].reverse().find((line) => /^info\s/.test(line)) || '';
  return {
    depth: Number(info.match(/\bdepth\s+(\d+)/)?.[1] || 0),
    seldepth: Number(info.match(/\bseldepth\s+(\d+)/)?.[1] || 0),
    nodes: Number(info.match(/\bnodes\s+(\d+)/)?.[1] || 0),
    nps: Number(info.match(/\bnps\s+(\d+)/)?.[1] || 0),
    engineTimeMs: Number(info.match(/\btime\s+(\d+)/)?.[1] || 0),
    score: info.match(/\bscore\s+(cp|mate)\s+(-?\d+)/)?.slice(1).join(' ') || '-',
    pv: info.match(/\bpv\s+(.+)$/)?.[1] || '-'
  };
}

function summarizeDepth(depth, attempts) {
  const passed = attempts.filter((attempt) => attempt.ok);
  const elapsedValues = passed.map((attempt) => attempt.elapsedMs);
  const mobileEstimateValues = elapsedValues.map((value) => value * 3);
  return {
    depth,
    ok: passed.length > 0,
    attempts,
    avgMs: average(elapsedValues),
    p95Ms: percentile(elapsedValues, 0.95),
    mobileAvgMs: average(mobileEstimateValues),
    mobileP95Ms: percentile(mobileEstimateValues, 0.95),
    bestmove: passed.at(-1)?.bestmove || '-',
    engineTimeMs: passed.at(-1)?.info.engineTimeMs || 0,
    seldepth: passed.at(-1)?.info.seldepth || 0,
    nodes: passed.at(-1)?.info.nodes || 0,
    score: passed.at(-1)?.info.score || '-'
  };
}

function pickDepth(summaries, maxMobileP95Ms) {
  const safe = summaries
    .filter((summary) => summary.ok && summary.mobileP95Ms !== null && summary.mobileP95Ms <= maxMobileP95Ms)
    .sort((a, b) => b.depth - a.depth);
  return safe[0]?.depth || 1;
}

function buildReport({ artifactName, artifactRoot, runs, timeoutMs, summaries, startedAt, finishedAt }) {
  const budgets = [
    { mode: '5 dk', threshold: 500, depth: pickDepth(summaries, 500), note: 'Hizli cevap ve pil/isi guvenligi oncelikli.' },
    { mode: '15 dk', threshold: 1200, depth: pickDepth(summaries, 1200), note: 'Dengeli kalite ve akicilik.' },
    { mode: '30 dk', threshold: 2500, depth: pickDepth(summaries, 2500), note: 'Daha derin arama ama WebView donmasin.' },
    { mode: 'Suresiz', threshold: 5000, depth: pickDepth(summaries, 5000), note: 'Kalite odakli, yine de sinirsiz bekleme yok.' }
  ];

  const lines = [];
  lines.push('# Fairy Performans ve Sure Butcesi Raporu');
  lines.push('');
  lines.push(`Baslangic: ${startedAt}`);
  lines.push(`Bitis: ${finishedAt}`);
  lines.push('');
  lines.push('## Kapsam');
  lines.push('');
  lines.push('- Bu rapor Faz 11 icin tek-thread Fairy-Stockfish POC performansini olcer.');
  lines.push('- Mevcut JS Timur AI ana motor olarak kalir; Fairy henuz production AI degildir.');
  lines.push('- Olcum masaustu Node ortaminda yapilir, mobil WebView icin guvenli tarafta kalmak adina 3x yavaslama katsayisi kullanilir.');
  lines.push('');
  lines.push('## Artifact');
  lines.push('');
  lines.push(`- Secilen artifact: \`${artifactName}\``);
  lines.push(`- Klasor: \`${artifactRoot}\``);
  lines.push(`- Tekrar sayisi: ${runs}`);
  lines.push(`- Depth timeout: ${timeoutMs}ms`);
  lines.push('');
  lines.push('## Sonuclar');
  lines.push('');
  lines.push('| Depth | Durum | Ortalama | P95 | Mobil tahmini ort. | Mobil tahmini P95 | Engine time | Seldepth | Bestmove | Nodes | Score |');
  lines.push('|---:|---|---:|---:|---:|---:|---:|---:|---|---:|---|');
  for (const summary of summaries) {
    lines.push([
      `| ${summary.depth}`,
      summary.ok ? 'OK' : 'FAIL',
      summary.avgMs === null ? '-' : `${Math.round(summary.avgMs)}ms`,
      summary.p95Ms === null ? '-' : `${Math.round(summary.p95Ms)}ms`,
      summary.mobileAvgMs === null ? '-' : `${Math.round(summary.mobileAvgMs)}ms`,
      summary.mobileP95Ms === null ? '-' : `${Math.round(summary.mobileP95Ms)}ms`,
      summary.engineTimeMs ? `${summary.engineTimeMs}ms` : '-',
      String(summary.seldepth || '-'),
      summary.bestmove,
      String(summary.nodes),
      `${summary.score} |`
    ].join(' | '));
  }
  lines.push('');
  lines.push('## Onerilen Sure Butceleri');
  lines.push('');
  lines.push('| Mod | Guvenli hedef | Onerilen depth | Not |');
  lines.push('|---|---:|---:|---|');
  for (const budget of budgets) {
    lines.push(`| ${budget.mode} | <= ${budget.threshold}ms mobil P95 | ${budget.depth} | ${budget.note} |`);
  }
  lines.push('');
  lines.push('## Yorum');
  lines.push('');
  lines.push('- Depth kararlarini dogrudan production ayari kabul etme; Android WebView icinde ayrica dogrulanmali.');
  lines.push('- Bu POC build nodes alanini 0 raporluyor; sure butcesinde dis elapsed/P95 ve engine time birlikte dikkate alinmali.');
  lines.push('- Tek-thread motor ana thread uzerinde calistigi icin yuksek depth UI donmasi yaratabilir.');
  lines.push('- Faz 12 veya sonraki debug entegrasyonda Fairy hamlesi her zaman JS Timur legal kapisindan gecmelidir.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function createEngine(artifactRoot) {
  const requireFromArtifact = createRequire(path.join(artifactRoot, 'uci.js'));
  const Stockfish = requireFromArtifact('./stockfish.js');
  const stockfishJs = path.join(artifactRoot, 'stockfish.js');
  const stockfishWasm = path.join(artifactRoot, 'stockfish.wasm');
  const lines = [];
  lines.waiters = [];

  const stockfish = await Stockfish({
    locateFile: (filename) => path.join(artifactRoot, filename),
    mainScriptUrlOrBlob: stockfishJs,
    wasmBinary: fs.readFileSync(stockfishWasm)
  });

  stockfish.addMessageListener((line) => {
    const text = String(line);
    lines.push(text);
    lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
  });

  return { stockfish, lines };
}

async function setupTimur(stockfish, lines, timeoutMs) {
  let startIndex = lines.length;
  stockfish.postMessage('uci');
  await waitForLine(lines, (line) => line.includes('uciok'), timeoutMs, 'uciok', startIndex);

  startIndex = lines.length;
  stockfish.postMessage('isready');
  await waitForLine(lines, (line) => line.includes('readyok'), timeoutMs, 'readyok', startIndex);

  stockfish.FS.writeFile('/timur-draft.variants.ini', fs.readFileSync(variantPath, 'utf8'));
  stockfish.postMessage('load /timur-draft.variants.ini');
  stockfish.postMessage('setoption name UCI_Variant value timur_poc');

  startIndex = lines.length;
  stockfish.postMessage('isready');
  await waitForLine(lines, (line) => line.includes('readyok'), timeoutMs, 'timur readyok', startIndex);
}

async function measureDepth(stockfish, lines, depth, timeoutMs) {
  const startIndex = lines.length;
  stockfish.postMessage('ucinewgame');
  stockfish.postMessage('position startpos');
  const startedAt = performance.now();
  stockfish.postMessage(`go depth ${depth}`);
  const bestmove = await waitForLine(
    lines,
    (line) => /^bestmove\s+\S+/.test(line),
    timeoutMs,
    `depth ${depth} bestmove`,
    startIndex
  );
  const elapsedMs = Math.round(performance.now() - startedAt);
  const produced = lines.slice(startIndex);
  return {
    ok: true,
    elapsedMs,
    bestmove,
    info: parseInfo(produced),
    tail: produced.slice(-12)
  };
}

async function main() {
  const artifactName = argValue('--artifact', 'singlethread');
  const artifactRoot = artifactRoots[artifactName];
  const runs = Math.max(1, Number(argValue('--runs', '2')) || 2);
  const timeoutMs = Math.max(1000, Number(argValue('--timeout-ms', '120000')) || 120000);
  const depths = parseDepths();
  const startedAt = new Date().toISOString();

  if (!artifactRoot) throw new Error(`Bilinmeyen artifact: ${artifactName}`);
  for (const file of ['stockfish.js', 'stockfish.wasm', 'uci.js']) {
    const target = path.join(artifactRoot, file);
    if (!fs.existsSync(target)) throw new Error(`Artifact dosyasi eksik: ${target}`);
  }
  if (!fs.existsSync(variantPath)) throw new Error(`Timur varyant dosyasi eksik: ${variantPath}`);

  console.log('Fairy performans olcumu');
  console.log(`Artifact: ${artifactName}`);
  console.log(`Depths: ${depths.join(', ')}`);
  console.log(`Runs: ${runs}`);

  const { stockfish, lines } = await createEngine(artifactRoot);
  const resultsByDepth = new Map(depths.map((depth) => [depth, []]));

  try {
    await setupTimur(stockfish, lines, timeoutMs);
    for (const depth of depths) {
      for (let run = 1; run <= runs; run += 1) {
        try {
          const result = await measureDepth(stockfish, lines, depth, timeoutMs);
          resultsByDepth.get(depth).push(result);
          console.log(`[OK] depth ${depth} run ${run}: ${result.elapsedMs}ms ${result.bestmove}`);
        } catch (error) {
          const result = {
            ok: false,
            elapsedMs: null,
            bestmove: '-',
            info: {},
            error: error.message
          };
          resultsByDepth.get(depth).push(result);
          console.log(`[FAIL] depth ${depth} run ${run}: ${error.message}`);
        }
      }
    }
  } finally {
    try {
      stockfish.postMessage('quit');
      stockfish.terminate?.();
    } catch {
      // Ignore shutdown errors in POC measurement.
    }
  }

  const summaries = depths.map((depth) => summarizeDepth(depth, resultsByDepth.get(depth) || []));
  const finishedAt = new Date().toISOString();
  const report = buildReport({ artifactName, artifactRoot, runs, timeoutMs, summaries, startedAt, finishedAt });
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`Rapor: ${reportPath}`);
  if (summaries.every((summary) => !summary.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[HATA]', error);
  process.exitCode = 1;
});
