import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'public/fairy/stockfish.js',
  'public/fairy/stockfish.wasm',
  'public/fairy/stockfish.worker.js',
  'public/fairy/uci.js',
  'public/fairy/timur-draft.variants.ini',
  'public/fairy/manifest.json',
  'public/fairy-singlethread/stockfish.js',
  'public/fairy-singlethread/stockfish.wasm',
  'public/fairy-singlethread/uci.js',
  'public/fairy-singlethread/timur-draft.variants.ini',
  'public/fairy-singlethread/manifest.json',
  'public/fairy-smoke.html'
];

function absolute(relPath) {
  return path.join(projectRoot, relPath);
}

function checkFile(relPath) {
  const target = absolute(relPath);
  const exists = fs.existsSync(target);
  const size = exists ? fs.statSync(target).size : 0;
  return {
    relPath,
    exists,
    size,
    ok: exists && size > 0
  };
}

function main() {
  const checks = requiredFiles.map(checkFile);
  const smokeHtmlPath = absolute('public/fairy-smoke.html');
  const smokeHtml = fs.existsSync(smokeHtmlPath)
    ? fs.readFileSync(smokeHtmlPath, 'utf8')
    : '';

  const signals = [
    {
      label: 'Dynamic Stockfish script reference',
      ok: smokeHtml.includes('loadScript(`${assetRoot}/stockfish.js`)')
    },
    {
      label: 'Single-thread engine selector',
      ok: smokeHtml.includes("params.get('engine') === 'pthread'") && smokeHtml.includes('fairy-singlethread')
    },
    {
      label: 'Native Timur variant select',
      ok: smokeHtml.includes('variantMode') && smokeHtml.includes('UCI_Variant value timur')
    },
    {
      label: 'Bestmove gate signal',
      ok: smokeHtml.includes('bestmove') && smokeHtml.includes('timurFairyWebViewSmoke')
    },
    {
      label: 'Worker CSP signal',
      ok: smokeHtml.includes("worker-src 'self' blob:")
    }
  ];

  console.log('Fairy WebView asset check');
  for (const check of checks) {
    console.log(`${check.ok ? '[OK]' : '[FAIL]'} ${check.relPath}: ${check.size} bytes`);
  }
  for (const signal of signals) {
    console.log(`${signal.ok ? '[OK]' : '[FAIL]'} ${signal.label}`);
  }

  const failed = [...checks, ...signals].filter((entry) => !entry.ok);
  if (failed.length > 0) {
    console.log('');
    console.log('Run first: npm run fairy:poc:webview:prepare');
    process.exitCode = 1;
  }
}

main();
