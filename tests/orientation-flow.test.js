import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');
const orientationManagerSource = fs.readFileSync(path.join(projectRoot, 'src', 'utils', 'OrientationManager.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
const historicalCss = fs.readFileSync(path.join(projectRoot, 'src', 'styles', 'historical-theme.css'), 'utf8');

test('app boots in portrait and hides the old main-menu orientation switch', () => {
  assert.match(mainSource, /orientationManager\.init\(\{\s*forcePortrait:\s*true\s*\}\)/);
  assert.match(orientationManagerSource, /init\(options\s*=\s*\{\}\)/);
  assert.match(orientationManagerSource, /options\.forcePortrait[\s\S]*ORIENTATIONS\.PORTRAIT/);
  assert.match(indexHtml, /id="btn-orientation-toggle"[\s\S]*hidden[\s\S]*aria-hidden="true"[\s\S]*tabindex="-1"/);
  assert.match(historicalCss, /#btn-orientation-toggle\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important/);
});

test('non-game screens force portrait while in-game settings keep the toggle path', () => {
  assert.match(mainSource, /function forcePortraitOutsideGame/);
  assert.match(mainSource, /if \(screenElement !== gameView\)\s*\{\s*forcePortraitOutsideGame\(\);/);
  assert.match(mainSource, /async function toggleOrientationFromSettings\(\)/);
  assert.match(mainSource, /source:\s*'game_settings'/);
});
