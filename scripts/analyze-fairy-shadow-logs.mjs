import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyzeFairyShadowRecords,
  summarizeFairyShadowAnalysis
} from '../src/fairy/FairyShadowAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const defaultInput = path.join(
  workspaceRoot,
  'Al vs Al ( Otomasyon)',
  'runs',
  'ai-vs-ai-280-mate-net-closure',
  'matches'
);

function getArgValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJsonRecords(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input bulunamadi: ${inputPath}`);
  }

  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    return fs.readdirSync(inputPath)
      .filter((name) => /\.(json|jsonl)$/i.test(name))
      .sort((a, b) => a.localeCompare(b))
      .flatMap((name) => readJsonRecords(path.join(inputPath, name)));
  }

  const raw = fs.readFileSync(inputPath, 'utf8').trim();
  if (!raw) return [];

  if (/\.jsonl$/i.test(inputPath)) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  if (Array.isArray(parsed.games)) return parsed.games;
  return [parsed];
}

function main() {
  const input = path.resolve(getArgValue('--input', defaultInput));
  const records = readJsonRecords(input);
  const analysis = analyzeFairyShadowRecords(records);

  if (hasFlag('--json')) {
    console.log(JSON.stringify({ input, ...analysis }, null, 2));
    return;
  }

  console.log(`Input: ${input}`);
  console.log(summarizeFairyShadowAnalysis(analysis));
}

main();
