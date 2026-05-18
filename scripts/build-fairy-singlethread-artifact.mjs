import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const sourceRoot = path.join(workspaceRoot, 'Satranc Motoru', 'fairy-stockfish.wasm-nnue');
const emscriptenRoot = path.join(sourceRoot, 'src', 'emscripten');
const sourcePublicDir = path.join(emscriptenRoot, 'public');
const targetVendorDir = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const reportPath = path.join(projectRoot, 'FAIRY_SINGLE_THREAD_BUILD_RESULT.md');
const localEmsdkRoot = path.join(workspaceRoot, 'tools', 'emsdk');
const localEmscriptenBin = path.join(localEmsdkRoot, 'upstream', 'emscripten');
const localEmsdkNode = path.join(localEmsdkRoot, 'node', '22.16.0_64bit', 'bin', 'node.exe');
const localEmsdkPython = path.join(localEmsdkRoot, 'python', '3.13.3_64bit', 'python.exe');
const wingetMakeBin = path.join(
  process.env.LOCALAPPDATA || '',
  'Microsoft',
  'WinGet',
  'Packages',
  'ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe',
  'bin'
);
const gitUnixToolsBin = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin');

function commandPath(command) {
  const result = spawnSync('where.exe', [command], {
    cwd: projectRoot,
    encoding: 'utf8'
  });

  if (result.status !== 0) return null;
  return String(result.stdout || '').trim().split(/\r?\n/).find(Boolean) || null;
}

function existingFile(...parts) {
  const filePath = path.join(...parts);
  return fs.existsSync(filePath) ? filePath : null;
}

function resolveTool(name) {
  if (name === 'em++') return commandPath('em++') || commandPath('em++.bat') || existingFile(localEmscriptenBin, 'em++.bat');
  if (name === 'emcc') return commandPath('emcc') || commandPath('emcc.bat') || existingFile(localEmscriptenBin, 'emcc.bat');
  if (name === 'make') return commandPath('make') || commandPath('mingw32-make') || existingFile(wingetMakeBin, 'make.exe');
  if (name === 'npm') return commandPath('npm.cmd') || commandPath('npm');
  return commandPath(name);
}

function buildEnv() {
  const pathParts = [
    wingetMakeBin,
    localEmsdkRoot,
    localEmscriptenBin,
    path.dirname(localEmsdkNode),
    path.dirname(localEmsdkPython),
    gitUnixToolsBin,
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32'),
    ...(process.env.PATH || '').split(path.delimiter)
  ].filter((entry) => entry && fs.existsSync(entry));

  return {
    ...process.env,
    PATH: pathParts.join(path.delimiter),
    EMSDK: localEmsdkRoot,
    EMSDK_NODE: localEmsdkNode,
    EMSDK_PYTHON: localEmsdkPython
  };
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeout || 20 * 60 * 1000,
    env: options.env || process.env
  });
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.copyFileSync(from, to);
  return true;
}

function inspectArtifact(dirPath) {
  const jsPath = path.join(dirPath, 'stockfish.js');
  const wasmPath = path.join(dirPath, 'stockfish.wasm');
  const workerPath = path.join(dirPath, 'stockfish.worker.js');
  const jsText = readText(jsPath);
  return {
    hasJs: fs.existsSync(jsPath),
    hasWasm: fs.existsSync(wasmPath),
    hasWorker: fs.existsSync(workerPath),
    jsSize: fs.existsSync(jsPath) ? fs.statSync(jsPath).size : 0,
    wasmSize: fs.existsSync(wasmPath) ? fs.statSync(wasmPath).size : 0,
    mentionsSharedArrayBuffer: /\bSharedArrayBuffer\b/.test(jsText),
    mentionsPthread: /SharedArrayBuffer|Atomics\.|USE_PTHREADS|PROXY_TO_PTHREAD|runningWorkers|pthread/.test(jsText)
  };
}

function buildReport({ status, tools, buildResult, copied, artifact, note }) {
  const lines = [];
  lines.push('# Fairy Single-Thread Build Sonucu');
  lines.push('');
  lines.push(`Olusturma zamani: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Karar');
  lines.push('');
  lines.push(`- Faz 8 build durumu: ${status}`);
  lines.push(`- Not: ${note}`);
  lines.push('');
  lines.push('## Arac Kontrolu');
  lines.push('');
  lines.push('| Arac | Durum | Yol |');
  lines.push('|---|---|---|');
  for (const tool of tools) {
    lines.push(`| ${tool.name} | ${tool.path ? 'Bulundu' : 'Yok'} | ${tool.path || '-'} |`);
  }
  lines.push('');
  lines.push('## Build Komutu');
  lines.push('');
  lines.push('```powershell');
  lines.push(`cd "${emscriptenRoot}"`);
  lines.push('make -C .. emscripten_build ARCH=wasm threads=no');
  lines.push('```');
  lines.push('');
  if (buildResult) {
    lines.push('## Build Ciktisi');
    lines.push('');
    lines.push(`- Exit code: ${buildResult.status}`);
    if (buildResult.error) {
      lines.push(`- Spawn error: ${buildResult.error.message}`);
    }
    lines.push('');
    lines.push('```text');
    lines.push(`${buildResult.stdout || ''}${buildResult.stderr || ''}`.trim().split(/\r?\n/).slice(-80).join('\n'));
    lines.push('```');
    lines.push('');
  }
  lines.push('## Kopyalanan Dosyalar');
  lines.push('');
  lines.push('| Dosya | Durum |');
  lines.push('|---|---|');
  for (const item of copied) {
    lines.push(`| ${item.name} | ${item.ok ? 'Kopyalandi' : 'Yok'} |`);
  }
  lines.push('');
  lines.push('## Artifact Kontrolu');
  lines.push('');
  lines.push(`- Hedef klasor: \`${targetVendorDir}\``);
  lines.push(`- stockfish.js: ${artifact.hasJs ? `${artifact.jsSize} byte` : 'yok'}`);
  lines.push(`- stockfish.wasm: ${artifact.hasWasm ? `${artifact.wasmSize} byte` : 'yok'}`);
  lines.push(`- stockfish.worker.js: ${artifact.hasWorker ? 'var' : 'yok'}`);
  lines.push(`- SharedArrayBuffer izi: ${artifact.mentionsSharedArrayBuffer ? 'var' : 'yok'}`);
  lines.push(`- PThread/Atomics izi: ${artifact.mentionsPthread ? 'var' : 'yok'}`);
  lines.push('');
  lines.push('## Sonraki Adim');
  lines.push('');
  if (status === 'BASARILI') {
    lines.push('Tek-thread artifact hazir. Siradaki adim Android WebView smoke testini bu artifact ile tekrar kosmak.');
  } else {
    lines.push('Build ortami tamamlanmadan tek-thread artifact uretilemez. Emscripten/emsdk ve make araci kurulduktan sonra ayni komut tekrar calistirilir.');
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const tools = [
    { name: 'em++', path: resolveTool('em++') },
    { name: 'emcc', path: resolveTool('emcc') },
    { name: 'make', path: resolveTool('make') },
    { name: 'npm', path: resolveTool('npm') }
  ];

  const missing = tools.filter((tool) => ['em++', 'emcc', 'make', 'npm'].includes(tool.name) && !tool.path);
  const copied = [];
  let buildResult = null;
  let status = 'BASARISIZ';
  let note = '';

  if (!fs.existsSync(emscriptenRoot)) {
    note = `Emscripten kaynak klasoru bulunamadi: ${emscriptenRoot}`;
  } else if (missing.some((tool) => tool.name === 'em++' || tool.name === 'emcc' || tool.name === 'make')) {
    note = `Eksik build araci: ${missing.map((tool) => tool.name).join(', ')}`;
  } else {
    const makeTool = tools.find((tool) => tool.name === 'make')?.path || 'make';
    buildResult = run(makeTool, ['-C', '..', 'emscripten_build', 'ARCH=wasm', 'threads=no'], {
      cwd: emscriptenRoot,
      timeout: 45 * 60 * 1000,
      env: buildEnv()
    });

    if (buildResult.status === 0) {
      ensureCleanDir(targetVendorDir);
      const fileMap = [
        ['stockfish.js', path.join(sourcePublicDir, 'stockfish.js')],
        ['stockfish.wasm', path.join(sourcePublicDir, 'stockfish.wasm')],
        ['uci.js', path.join(sourcePublicDir, 'uci.js')],
        ['package.json', path.join(sourcePublicDir, 'package.json')],
        ['AUTHORS', path.join(sourcePublicDir, 'AUTHORS')],
        ['Copying.txt', path.join(sourcePublicDir, 'Copying.txt')]
      ];

      for (const [name, from] of fileMap) {
        copied.push({ name, ok: copyIfExists(from, path.join(targetVendorDir, name)) });
      }

      const artifact = inspectArtifact(targetVendorDir);
      if (artifact.hasJs && artifact.hasWasm && !artifact.mentionsSharedArrayBuffer && !artifact.mentionsPthread) {
        status = 'BASARILI';
        note = 'Tek-thread artifact uretildi ve vendor klasorune kopyalandi.';
      } else {
        note = 'Build tamamlandi fakat cikan artifact tek-thread kriterlerini gecmedi.';
      }
    } else {
      note = `Build komutu hata koduyla bitti: ${buildResult.status}`;
    }
  }

  const artifact = inspectArtifact(targetVendorDir);
  const report = buildReport({ status, tools, buildResult, copied, artifact, note });
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log('Fairy single-thread build');
  console.log(`Durum: ${status}`);
  console.log(`Not: ${note}`);
  console.log(`Rapor: ${reportPath}`);

  if (status !== 'BASARILI') {
    process.exitCode = 1;
  }
}

main();
