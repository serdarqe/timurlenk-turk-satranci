import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reportPath = path.join(projectRoot, 'FAIRY_STOCKFISH_PRODUCTION_READINESS.md');

const requiredFiles = [
  'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.js',
  'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.wasm',
  'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.worker.js',
  'fairy-poc/vendor/fairy-stockfish-nnue.wasm/package.json',
  'fairy-poc/timur-draft.variants.ini',
  'fairy-poc/timur-piece-map.json',
  'src/fairy/FairyDebugEngine.js',
  'src/fairy/FairyFen.js',
  'src/fairy/FairyTimurAdapter.js',
  'scripts/compare-fairy-timur-moves.mjs',
  'scripts/compare-fairy-piece-positions.mjs',
  'scripts/validate-fairy-bestmove.mjs',
  'scripts/prepare-fairy-webview-assets.mjs',
  'scripts/check-fairy-webview-assets.mjs',
  'scripts/serve-fairy-smoke.mjs',
  'scripts/check-fairy-singlethread-readiness.mjs',
  'scripts/build-fairy-singlethread-artifact.mjs',
  'scripts/check-fairy-native-source.mjs',
  'public/fairy/stockfish.js',
  'public/fairy/stockfish.wasm',
  'public/fairy/stockfish.worker.js',
  'public/fairy/timur-draft.variants.ini',
  'public/fairy/manifest.json',
  'public/fairy-smoke.html',
  'tests/fairy-timur-adapter.test.js',
  'tests/fairy-bestmove-gate.test.js',
  'tests/fairy-debug-engine.test.js',
  'tests/fairy-special-rules.test.js',
  'tests/fairy-hybrid-policy.test.js'
];

function rel(target) {
  return path.join(projectRoot, target);
}

function fileExists(target) {
  return fs.existsSync(rel(target));
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(rel(target), 'utf8'));
}

function runNode(label, args, expectation) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 120000
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const exitOk = result.status === 0;
  const expectationOk = expectation ? expectation(output) : true;

  return {
    label,
    status: exitOk && expectationOk ? 'pass' : 'fail',
    note: exitOk
      ? (expectationOk ? 'Komut basarili ve beklenen sinyal alindi.' : 'Komut basarili ama beklenen sinyal bulunamadi.')
      : `Komut hata koduyla bitti: ${result.status}`,
    output
  };
}

function getLicenseStatus() {
  try {
    const packageInfo = readJson('fairy-poc/vendor/fairy-stockfish-nnue.wasm/package.json');
    return packageInfo.license || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getGplReleaseStatus() {
  try {
    const packageInfo = readJson('package.json');
    const required = [
      'LICENSE',
      'THIRD_PARTY_NOTICES.md',
      'SOURCE_DISTRIBUTION.md',
      'OPEN_SOURCE_RELEASE_GUIDE.md',
      'FAIRY_GPL_RELEASE_DECISION.md'
    ];
    return packageInfo.license === 'GPL-3.0-only' && required.every((target) => fileExists(target));
  } catch {
    return false;
  }
}

function makeCheck(label, status, note) {
  return { label, status, note };
}

function statusIcon(status) {
  if (status === 'pass') return '[OK]';
  if (status === 'manual') return '[MANUAL]';
  if (status === 'warn') return '[WARN]';
  return '[FAIL]';
}

function markdownStatus(status) {
  if (status === 'pass') return 'OK';
  if (status === 'manual') return 'Manuel karar gerekli';
  if (status === 'warn') return 'Uyari';
  return 'Hata';
}

function buildReport({ checks, commandChecks, license, gplReady, pocReady, productionReady }) {
  const allChecks = [...checks, ...commandChecks];
  const lines = [];
  lines.push('# Fairy-Stockfish Production Readiness Raporu');
  lines.push('');
  lines.push(`Olusturma zamani: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Karar');
  lines.push('');
  lines.push(`- POC teknik kapisi: ${pocReady ? 'GECTI' : 'KALDI'}`);
  lines.push(`- Dogrudan production entegrasyonu: ${productionReady ? 'HAZIR' : 'HAZIR DEGIL'}`);
  lines.push('');
  lines.push('Kisa yorum: Fairy-Stockfish arama motoru olarak kontrollu entegrasyon deneyinden Fairy-first fork moduna tasindi. WebView smoke sayfasi, public asset paketi, tek-thread build yolu, performans olcumu, pasif debug/shadow entegrasyonu, GPL acik kaynak yayin karari, JS legal fallback kapili Fairy fork karari ve native Timur kaynak varyanti baslangici hazirlandi. Ancak Android cihaz/WebView uzun stres sonucu tamamlanmadan release production karari alinmamali.');
  lines.push('');
  lines.push('## Otomatik Kontroller');
  lines.push('');
  lines.push('| Kontrol | Durum | Not |');
  lines.push('|---|---|---|');
  for (const check of allChecks) {
    lines.push(`| ${check.label} | ${markdownStatus(check.status)} | ${check.note.replace(/\|/g, '/')} |`);
  }
  lines.push('');
  lines.push('## Manuel Karar Gerektirenler');
  lines.push('');
  lines.push('| Alan | Durum | Neden |');
  lines.push('|---|---|---|');
  lines.push('| Android WebView WASM stabilitesi | Kismi | `public/fairy-smoke.html` hazir. Emulator/WebView icinde worker, wasm load ve uzun dusunme sonucu manuel smoke gate olarak dogrulanmali. |');
  lines.push('| Tek-thread WASM artifact | Hazir | `SharedArrayBuffer` hatasina karsi tek-thread artifact `fairy-poc/vendor/fairy-stockfish-singlethread.wasm/` altinda hazir. Android WebView smoke tekrar kosulmali. |');
  lines.push('| Performans butcesi | Olculdu | `FAIRY_PERFORMANCE_BUDGET_REPORT.md` depth 1-8 tek-thread POC olcumlerini tutuyor; Android uzun stres testi yine de gerekli. |');
  lines.push(`| Lisans karari | ${gplReady ? 'Tamamlandi' : 'Bekliyor'} | Paket lisansi: ${license}. Proje yayin yolu ${gplReady ? 'GPL acik kaynak olarak netlesti.' : 'henuz tamamlanmadi.'} |`);
  lines.push('| Ozel Timur kurallari | Test kapisi var | Zürafa, Haberci, hisar, sah degisimi, hisar degisimi, pawn-of-pawns, kraliyet hiyerarsisi ve royal capture icin adapter/JS uyum testi eklendi. |');
  lines.push('| Fairy fork karar katmani | Varsayilan acik | Fairy hamlesi birincil adaydir; JS legal/policy filtresinden gecmezse JS fallback kullanilir. Android uzun stres karari tamamlanmadan release production onayi verilmemeli. |');
  lines.push('');
  lines.push('## Bir Sonraki Guvenli Adim');
  lines.push('');
  lines.push('1. Fairy fork modu varsayilan acik; release oncesi Android cihaz/WebView uzun stres testi kos.');
  lines.push('2. Android emulator icinde `fairy-smoke.html` izole WebView testini kos ve sonucu kaydet.');
  lines.push('3. Oyunda `?fairyFork=0` ile JS-only fallback, `?fairyFork=1` ile Fairy-first karsilastirmasi yap.');
  lines.push('4. Firestore/mac kayitlarinda `fairyForkEnabled`, `hybridApplied`, `fairyRejectedReason` alanlarini ornek oyunlarda dogrula.');
  lines.push('5. Sonraki guvenli adim Android WebView icinde uzun Fairy fork smoke ve Firestore kayit ornegi dogrulamasi.');
  lines.push('');
  lines.push('## Komut Ozetleri');
  lines.push('');
  for (const check of commandChecks) {
    lines.push(`### ${check.label}`);
    lines.push('');
    lines.push('```text');
    lines.push(tail(check.output, 24));
    lines.push('```');
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function tail(text, lineCount) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-lineCount).join('\n');
}

function main() {
  const missingFiles = requiredFiles.filter((target) => !fileExists(target));
  const artifactSizes = [
    'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.js',
    'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.wasm',
    'fairy-poc/vendor/fairy-stockfish-nnue.wasm/stockfish.worker.js'
  ].map((target) => ({ target, size: fileExists(target) ? fs.statSync(rel(target)).size : 0 }));

  const license = getLicenseStatus();
  const gplReady = getGplReleaseStatus();
  const checks = [
    makeCheck(
      'POC dosya yapisi',
      missingFiles.length === 0 ? 'pass' : 'fail',
      missingFiles.length === 0 ? 'Gerekli POC dosyalari mevcut.' : `Eksik dosyalar: ${missingFiles.join(', ')}`
    ),
    makeCheck(
      'WASM artifact dosyalari',
      artifactSizes.every((entry) => entry.size > 0) ? 'pass' : 'fail',
      artifactSizes.map((entry) => `${entry.target.split('/').at(-1)}=${entry.size} byte`).join(', ')
    ),
    makeCheck(
      'GPL lisans ve yayin karari',
      license === 'GPL-3.0' && gplReady ? 'pass' : 'manual',
      license === 'GPL-3.0' && gplReady
        ? 'Fairy GPL-3.0 ve proje GPL-3.0-only acik kaynak yayin dosyalari hazir.'
        : `Fairy paketi lisansi: ${license}. GPL yayin dokumanlari tamamlanmali.`
    ),
    makeCheck(
      'Android uzun WebView stres karari',
      'manual',
      'Production default icin uzun cihaz/WebView smoke ve stres sonucu manuel olarak tamamlanmali.'
    )
  ];

  const commandChecks = [
    runNode(
      'Adapter ve bestmove gate unit testleri',
      ['--test', 'tests/fairy-timur-adapter.test.js', 'tests/fairy-bestmove-gate.test.js', 'tests/fairy-debug-engine.test.js'],
      (output) => output.includes('pass 9')
    ),
    runNode(
      'Ozel Timur kurallari derin testleri',
      ['--test', 'tests/fairy-special-rules.test.js'],
      (output) => output.includes('pass 11')
    ),
    runNode(
      'Hibrit Fairy karar katmani testleri',
      ['--test', 'tests/fairy-hybrid-policy.test.js'],
      (output) => output.includes('pass 9')
    ),
    runNode(
      'Baslangic legal hamle karsilastirmasi',
      ['scripts/compare-fairy-timur-moves.mjs'],
      (output) => output.includes('POC beklenen fark disi: yok')
    ),
    runNode(
      'Izole tas pozisyonlari karsilastirmasi',
      ['scripts/compare-fairy-piece-positions.mjs'],
      (output) => output.includes('Beklenmeyen farkli pozisyon: 0')
    ),
    runNode(
      'Gercek Fairy WASM bestmove gate',
      ['scripts/validate-fairy-bestmove.mjs'],
      (output) => output.includes('Karar: kabul') && output.includes('Kaynak: fairy')
    ),
    runNode(
      'WebView public asset ve smoke sayfasi kontrolu',
      ['scripts/check-fairy-webview-assets.mjs'],
      (output) => output.includes('[OK] public/fairy-smoke.html') && output.includes('[OK] Native Timur variant select')
    ),
    runNode(
      'Tek thread WASM build yolu kontrolu',
      ['scripts/check-fairy-singlethread-readiness.mjs'],
      (output) => output.includes('Makefile single-thread target: OK')
    ),
    runNode(
      'Native Fairy Timur kaynak kontrolu',
      ['scripts/check-fairy-native-source.mjs'],
      (output) => output.includes('Fairy native Timur source check passed')
    ),
    runNode(
      'Native Fairy Timur bestmove kontrolu',
      ['scripts/validate-fairy-native-timur.mjs'],
      (output) => output.includes('Variant: timur') && output.includes('Bestmove: bestmove')
    )
  ];

  const automaticPass = [...checks.filter((check) => check.status !== 'manual'), ...commandChecks]
    .every((check) => check.status === 'pass');
  const manualClearance = checks.every((check) => check.status !== 'manual');
  const pocReady = automaticPass;
  const productionReady = automaticPass && manualClearance;

  const report = buildReport({ checks, commandChecks, license, gplReady, pocReady, productionReady });
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log('Fairy-Stockfish production readiness');
  console.log(`POC teknik kapisi: ${pocReady ? 'GECTI' : 'KALDI'}`);
  console.log(`Production entegrasyonu: ${productionReady ? 'HAZIR' : 'HAZIR DEGIL'}`);
  console.log(`Rapor: ${reportPath}`);
  console.log('');

  for (const check of [...checks, ...commandChecks]) {
    console.log(`${statusIcon(check.status)} ${check.label}: ${check.note}`);
  }

  if (!pocReady) {
    process.exitCode = 1;
  }
}

main();
