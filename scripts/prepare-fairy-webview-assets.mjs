import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const threadedVendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-nnue.wasm');
const singleThreadVendorRoot = path.join(projectRoot, 'fairy-poc', 'vendor', 'fairy-stockfish-singlethread.wasm');
const variantPath = path.join(projectRoot, 'fairy-poc', 'timur-draft.variants.ini');

const bundles = [
  {
    id: 'pthread',
    source: threadedVendorRoot,
    output: path.join(projectRoot, 'public', 'fairy'),
    artifacts: ['stockfish.js', 'stockfish.wasm', 'stockfish.worker.js', 'uci.js', 'package.json', 'AUTHORS', 'Copying.txt'],
    licenseSource: singleThreadVendorRoot
  },
  {
    id: 'singlethread',
    source: singleThreadVendorRoot,
    output: path.join(projectRoot, 'public', 'fairy-singlethread'),
    artifacts: ['stockfish.js', 'stockfish.wasm', 'uci.js', 'package.json', 'AUTHORS', 'Copying.txt'],
    licenseSource: singleThreadVendorRoot
  }
];

function assertFile(target) {
  if (!fs.existsSync(target) || fs.statSync(target).size <= 0) {
    throw new Error(`Required file missing or empty: ${target}`);
  }
}

function copyArtifact(bundle, name) {
  const licenseFiles = new Set(['AUTHORS', 'Copying.txt']);
  const sourceRoot = licenseFiles.has(name) && bundle.licenseSource
    ? bundle.licenseSource
    : bundle.source;
  const source = path.join(sourceRoot, name);
  const destination = path.join(bundle.output, name);
  assertFile(source);
  fs.copyFileSync(source, destination);
  return {
    name,
    bytes: fs.statSync(destination).size
  };
}

function main() {
  assertFile(variantPath);

  for (const bundle of bundles) {
    fs.mkdirSync(bundle.output, { recursive: true });

    const copied = bundle.artifacts.map((name) => copyArtifact(bundle, name));
    const variantDestination = path.join(bundle.output, 'timur-draft.variants.ini');
    fs.copyFileSync(variantPath, variantDestination);

    const manifest = {
      purpose: 'Fairy-Stockfish WebView smoke test assets. Not wired into production AI.',
      generatedAt: new Date().toISOString(),
      bundle: bundle.id,
      source: path.relative(projectRoot, bundle.source).replace(/\\/g, '/'),
      variant: 'fairy-poc/timur-draft.variants.ini',
      license: 'GPL-3.0',
      artifacts: [
        ...copied,
        {
          name: 'timur-draft.variants.ini',
          bytes: fs.statSync(variantDestination).size
        }
      ]
    };

    fs.writeFileSync(
      path.join(bundle.output, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8'
    );

    console.log(`Fairy WebView assets prepared: ${bundle.id}`);
    console.log(`Output: ${bundle.output}`);
    for (const entry of manifest.artifacts) {
      console.log(`- ${entry.name}: ${entry.bytes} bytes`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
