import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'SOURCE_DISTRIBUTION.md',
  'package.json',
  'public/fairy/package.json',
  'public/fairy/AUTHORS',
  'public/fairy/Copying.txt',
  'public/fairy-singlethread/package.json',
  'public/fairy-singlethread/AUTHORS',
  'public/fairy-singlethread/Copying.txt',
  'fairy-poc/vendor/fairy-stockfish-singlethread.wasm/AUTHORS',
  'fairy-poc/vendor/fairy-stockfish-singlethread.wasm/Copying.txt'
];

const requiredAppNoticeSnippets = [
  'id="licenses-overlay"',
  'id="btn-open-licenses"',
  'Powered by Fairy-Stockfish',
  'https://github.com/fairy-stockfish/Fairy-Stockfish'
];

const requiredI18nKeys = [
  "'menu.open_source_licenses'",
  "'licenses.title'",
  "'licenses.fairy_title'",
  "'licenses.fairy_desc'",
  "'licenses.app_desc'",
  "'licenses.notice_desc'"
];

const forbiddenTrackedPatterns = [
  /^secrets[\\/]/,
  /^exports[\\/]/,
  /^dist[\\/]/,
  /^node_modules[\\/]/,
  /^android[\\/]app[\\/]google-services\.json$/i,
  /^.*keystore.*$/i,
  /^.*service-account.*\.json$/i,
  /^.*firebase-admin.*\.json$/i
];

function rel(target) {
  return path.join(projectRoot, target);
}

function existsWithContent(target) {
  const file = rel(target);
  return fs.existsSync(file) && fs.statSync(file).size > 0;
}

function readText(target) {
  return fs.readFileSync(rel(target), 'utf8');
}

function readJson(target) {
  return JSON.parse(readText(target));
}

function checkRequiredFiles() {
  const missing = requiredFiles.filter((target) => !existsWithContent(target));
  return {
    label: 'GPL required files',
    ok: missing.length === 0,
    detail: missing.length ? `Missing/empty: ${missing.join(', ')}` : 'All required license/source notice files are present.'
  };
}

function checkPackageLicense() {
  const pkg = readJson('package.json');
  return {
    label: 'Root package license',
    ok: pkg.license === 'GPL-3.0-only',
    detail: `package.json license=${pkg.license || 'missing'}`
  };
}

function checkFairyLicenses() {
  const targets = [
    'public/fairy/package.json',
    'public/fairy-singlethread/package.json',
    'fairy-poc/vendor/fairy-stockfish-singlethread.wasm/package.json'
  ];
  const bad = targets.filter((target) => readJson(target).license !== 'GPL-3.0');
  return {
    label: 'Fairy GPL package metadata',
    ok: bad.length === 0,
    detail: bad.length ? `Unexpected license metadata: ${bad.join(', ')}` : 'Fairy package metadata declares GPL-3.0.'
  };
}

function checkGitignore() {
  const gitignore = readText('.gitignore');
  const requiredIgnores = [
    'secrets',
    '*service-account*.json',
    '*firebase-admin*.json',
    'android/app/google-services.json',
    'android/keystore.properties',
    '.env',
    '*.apk',
    '*.aab',
    'android/app/build'
  ];
  const missing = requiredIgnores.filter((entry) => !gitignore.includes(entry));
  return {
    label: 'Secret ignore rules',
    ok: missing.length === 0,
    detail: missing.length ? `Missing .gitignore entries: ${missing.join(', ')}` : 'Secret-related ignore rules are present.'
  };
}

function checkInAppLicenseNotice() {
  const html = readText('index.html');
  const i18n = readText('src/utils/i18n.js');
  const missingHtml = requiredAppNoticeSnippets.filter((snippet) => !html.includes(snippet));
  const missingI18n = requiredI18nKeys.filter((snippet) => !i18n.includes(snippet));
  const missing = [...missingHtml, ...missingI18n];

  return {
    label: 'In-app GPL attribution notice',
    ok: missing.length === 0,
    detail: missing.length
      ? `Missing notice snippets: ${missing.join(', ')}`
      : 'Main menu exposes an open-source/license screen with Fairy-Stockfish attribution.'
  };
}

function checkForbiddenTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30000
  });

  if (result.status !== 0) {
    return {
      label: 'Sensitive tracked file scan',
      ok: true,
      detail: 'Git repo henuz hazir degil ya da git ls-files calismadi; GitHub oncesi komutu git repo icinde tekrar calistir.'
    };
  }

  const trackedFiles = String(result.stdout || '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const suspicious = trackedFiles.filter((relative) => forbiddenTrackedPatterns.some((pattern) => pattern.test(relative)));

  return {
    label: 'Sensitive tracked file scan',
    ok: suspicious.length === 0,
    detail: suspicious.length
      ? `Remove from git before GitHub publish: ${suspicious.slice(0, 12).join(', ')}${suspicious.length > 12 ? '...' : ''}`
      : 'No obvious secret/export/build files are tracked by git.'
  };
}

function main() {
  const checks = [
    checkRequiredFiles(),
    checkPackageLicense(),
    checkFairyLicenses(),
    checkGitignore(),
    checkInAppLicenseNotice(),
    checkForbiddenTrackedFiles()
  ];

  console.log('GPL release readiness');
  for (const check of checks) {
    console.log(`${check.ok ? '[OK]' : '[FAIL]'} ${check.label}: ${check.detail}`);
  }

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`[FAIL] GPL readiness crashed: ${error.message}`);
  process.exitCode = 1;
}
