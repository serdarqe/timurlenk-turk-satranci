import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const sourceRoot = path.join(workspaceRoot, 'Satranc Motoru', 'fairy-stockfish.wasm-nnue');
const makefilePath = path.join(sourceRoot, 'src', 'emscripten', 'Makefile');
const sourcePublicDir = path.join(sourceRoot, 'src', 'emscripten', 'public');
const singleThreadVendorDir = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const threadedVendorDir = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const reportPath = path.join(projectRoot, 'FAIRY_SINGLE_THREAD_READINESS.md');

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function commandPath(command) {
  const result = spawnSync('where.exe', [command], {
    cwd: projectRoot,
    encoding: 'utf8'
  });

  if (result.status !== 0) return null;
  return String(result.stdout || '').trim().split(/\r?\n/).find(Boolean) || null;
}

function artifactStatus(dirPath) {
  const jsPath = path.join(dirPath, 'stockfish.js');
  const wasmPath = path.join(dirPath, 'stockfish.wasm');
  const workerPath = path.join(dirPath, 'stockfish.worker.js');
  const uciPath = path.join(dirPath, 'uci.js');
  const packagePath = path.join(dirPath, 'package.json');
  const jsText = readText(jsPath);

  const exists = fs.existsSync(dirPath);
  const hasJs = fs.existsSync(jsPath);
  const hasWasm = fs.existsSync(wasmPath);
  const hasWorker = fs.existsSync(workerPath);
  const hasUci = fs.existsSync(uciPath);
  const hasPackage = fs.existsSync(packagePath);
  const mentionsSharedArrayBuffer = /\bSharedArrayBuffer\b/.test(jsText);
  const mentionsPthread = /SharedArrayBuffer|Atomics\.|USE_PTHREADS|PROXY_TO_PTHREAD|runningWorkers|pthread/.test(jsText);
  const looksSingleThread = exists && hasJs && hasWasm && !hasWorker && !mentionsSharedArrayBuffer && !mentionsPthread;

  return {
    dirPath,
    exists,
    hasJs,
    hasWasm,
    hasWorker,
    hasUci,
    hasPackage,
    jsSize: hasJs ? fs.statSync(jsPath).size : 0,
    wasmSize: hasWasm ? fs.statSync(wasmPath).size : 0,
    mentionsSharedArrayBuffer,
    mentionsPthread,
    looksSingleThread
  };
}

function makeCheck(label, ok, note, level = ok ? 'pass' : 'fail') {
  return { label, ok, note, level: ok ? 'pass' : level };
}

function icon(check) {
  if (check.level === 'pass') return '[OK]';
  if (check.level === 'warn') return '[WARN]';
  return '[FAIL]';
}

function markdownStatus(check) {
  if (check.level === 'pass') return 'OK';
  if (check.level === 'warn') return 'Uyari';
  return 'Hata';
}

function formatArtifact(name, status) {
  return [
    `### ${name}`,
    '',
    `- Klasor: \`${status.dirPath}\``,
    `- Durum: ${status.exists ? 'var' : 'yok'}`,
    `- stockfish.js: ${status.hasJs ? `${status.jsSize} byte` : 'yok'}`,
    `- stockfish.wasm: ${status.hasWasm ? `${status.wasmSize} byte` : 'yok'}`,
    `- stockfish.worker.js: ${status.hasWorker ? 'var' : 'yok'}`,
    `- uci.js: ${status.hasUci ? 'var' : 'yok'}`,
    `- package.json: ${status.hasPackage ? 'var' : 'yok'}`,
    `- SharedArrayBuffer izi: ${status.mentionsSharedArrayBuffer ? 'var' : 'yok'}`,
    `- PThread/Atomics izi: ${status.mentionsPthread ? 'var' : 'yok'}`,
    `- Tek-thread gorunumu: ${status.looksSingleThread ? 'EVET' : 'HAYIR'}`
  ].join('\n');
}

function buildReport({ checks, tools, singleThreadArtifact, sourcePublicArtifact, threadedArtifact }) {
  const buildCommand = `cd "${path.join(sourceRoot, 'src', 'emscripten')}" && npm run build -- threads=no`;
  const copyCommand = `Copy-Item -Recurse -Force "${sourcePublicDir}\\*" "${singleThreadVendorDir}"`;

  const lines = [];
  lines.push('# Fairy Single-Thread WASM Readiness Raporu');
  lines.push('');
  lines.push(`Olusturma zamani: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Karar');
  lines.push('');
  lines.push('- Faz 7 amaci: Android WebView icin `SharedArrayBuffer` gerektirmeyen tek-thread Fairy WASM yolunu hazirlamak.');
  lines.push(`- Makefile tek-thread build yolu: ${checks.every((check) => check.ok || check.level === 'warn') ? 'HAZIR' : 'EKSIK'}`);
  lines.push(`- Tek-thread artifact: ${singleThreadArtifact.looksSingleThread ? 'HAZIR' : 'HENUZ HAZIR DEGIL'}`);
  lines.push('');
  lines.push('Kisa yorum: Tek-thread build secenegi kaynak Makefile tarafinda artik olculen bir kapidir. Production entegrasyonu icin tek-thread artifact uretilmeli, `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altina alinmali ve Android WebView smoke tekrar kosulmalidir.');
  lines.push('');
  lines.push('## Otomatik Kontroller');
  lines.push('');
  lines.push('| Kontrol | Durum | Not |');
  lines.push('|---|---|---|');
  for (const check of checks) {
    lines.push(`| ${check.label} | ${markdownStatus(check)} | ${check.note.replace(/\|/g, '/')} |`);
  }
  lines.push('');
  lines.push('## Yerel Build Araclari');
  lines.push('');
  lines.push('| Arac | Durum | Yol |');
  lines.push('|---|---|---|');
  for (const tool of tools) {
    lines.push(`| ${tool.name} | ${tool.path ? 'Bulundu' : 'Yok'} | ${tool.path || '-'} |`);
  }
  lines.push('');
  lines.push(formatArtifact('Beklenen tek-thread artifact', singleThreadArtifact));
  lines.push('');
  lines.push(formatArtifact('Kaynak build public klasoru', sourcePublicArtifact));
  lines.push('');
  lines.push(formatArtifact('Mevcut pthread vendor artifact', threadedArtifact));
  lines.push('');
  lines.push('## Tekrar Uretme Komutlari');
  lines.push('');
  lines.push('Emscripten/emsdk kuruluysa tek-thread build icin:');
  lines.push('');
  lines.push('```powershell');
  lines.push(buildCommand);
  lines.push(copyCommand);
  lines.push('```');
  lines.push('');
  lines.push('Sonra kontrol:');
  lines.push('');
  lines.push('```powershell');
  lines.push('npm run fairy:poc:singlethread:check');
  lines.push('npm run fairy:poc:readiness');
  lines.push('```');
  lines.push('');
  lines.push('## Production Gate');
  lines.push('');
  lines.push('- Tek-thread artifact hazir degilse Fairy ana AI motoruna baglanmayacak.');
  lines.push('- Artifact hazir olsa bile Android WebView smoke gecmeden production kapisi acilmayacak.');
  lines.push('- GPL-3.0 lisans karari yine ayri manuel karar olarak kalacak.');
  return `${lines.join('\n')}\n`;
}

function main() {
  const makefileText = readText(makefilePath);
  const tools = [
    { name: 'em++', path: commandPath('em++') || commandPath('em++.bat') },
    { name: 'emcc', path: commandPath('emcc') || commandPath('emcc.bat') },
    { name: 'make', path: commandPath('make') || commandPath('mingw32-make') }
  ];

  const checks = [
    makeCheck('Fairy kaynak Makefile', fs.existsSync(makefilePath), makefilePath),
    makeCheck('Makefile threads option', /threads\s*\?=\s*yes|threads\s*=\s*yes/.test(makefileText), 'threads degiskeni mevcut.'),
    makeCheck('Makefile single-thread target', /emscripten_build_singlethread/.test(makefileText), 'emscripten_build_singlethread hedefi mevcut.'),
    makeCheck('NO_THREADS flag', /-DNO_THREADS/.test(makefileText), 'Tek-thread build icin NO_THREADS flag mevcut.'),
    makeCheck('PThread disable path', /USE_PTHREADS=0/.test(makefileText), 'Tek-thread build icin USE_PTHREADS=0 yolu mevcut.'),
    makeCheck('PThread normal path', /USE_PTHREADS=1/.test(makefileText), 'Mevcut pthread build yolu korunuyor.'),
    makeCheck('Worker conditional copy', /stockfish\.worker\.js/.test(makefileText) && /Remove-Item|rm -f/.test(makefileText), 'Worker dosyasi tek-thread buildde zorunlu degil.'),
    makeCheck('Emscripten araci', tools.some((tool) => tool.path && /^em/.test(tool.name)), 'em++ veya emcc bulunduysa yerelde build denenebilir.', 'warn')
  ];

  const singleThreadArtifact = artifactStatus(singleThreadVendorDir);
  const sourcePublicArtifact = artifactStatus(sourcePublicDir);
  const threadedArtifact = artifactStatus(threadedVendorDir);
  const report = buildReport({ checks, tools, singleThreadArtifact, sourcePublicArtifact, threadedArtifact });
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log('Fairy single-thread readiness');
  console.log(`Makefile single-thread target: ${/emscripten_build_singlethread/.test(makefileText) ? 'OK' : 'MISSING'}`);
  console.log(`Tek-thread artifact: ${singleThreadArtifact.looksSingleThread ? 'OK' : 'MISSING'}`);
  console.log(`Rapor: ${reportPath}`);
  console.log('');

  for (const check of checks) {
    console.log(`${icon(check)} ${check.label}: ${check.note}`);
  }

  if (!singleThreadArtifact.looksSingleThread) {
    console.log('[WARN] Tek-thread artifact henuz hazir degil. Emscripten ile build edilip vendor klasorune kopyalanmali.');
  }

  const hardFail = checks.some((check) => check.level === 'fail');
  if (hardFail) {
    process.exitCode = 1;
  }
}

main();
