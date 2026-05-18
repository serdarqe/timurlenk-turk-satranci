import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const root = fs.existsSync(path.join(projectRoot, 'dist'))
  ? path.join(projectRoot, 'dist')
  : path.join(projectRoot, 'public');
const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 4176;
const hostArg = process.argv.find((arg) => arg.startsWith('--host='));
const host = hostArg ? hostArg.split('=')[1] : '127.0.0.1';
const noIsolation = process.argv.includes('--no-isolation');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.worker.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.ini', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

function getMimeType(filePath) {
  if (filePath.endsWith('.worker.js')) return mimeTypes.get('.worker.js');
  return mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
}

function resolveRequestPath(urlPath) {
  const normalizedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relativePath = normalizedPath === '/' ? '/fairy-smoke.html' : normalizedPath;
  const target = path.resolve(root, `.${relativePath}`);
  if (!target.startsWith(root)) {
    return null;
  }
  return target;
}

const server = http.createServer((request, response) => {
  const target = resolveRequestPath(request.url || '/');
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const headers = {
    'content-type': getMimeType(target),
    'cache-control': 'no-store'
  };

  if (!noIsolation) {
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
  }

  response.writeHead(200, headers);
  fs.createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Fairy smoke server running: http://${host}:${port}/fairy-smoke.html`);
  console.log(`Root: ${root}`);
  console.log(`Isolation headers: ${noIsolation ? 'off' : 'on'}`);
});
