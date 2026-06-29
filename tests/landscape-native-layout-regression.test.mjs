import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const readProjectFile = (relativePath) =>
  readFileSync(resolve(projectRoot, relativePath), 'utf8');

test('landscape layout reserves the exact native banner height', () => {
  const adManager = readProjectFile('src/utils/AdManager.js');
  const landscapeCss = readProjectFile('src/styles/orientation-landscape.css');

  assert.match(adManager, /BannerAdPluginEvents\.SizeChanged/);
  assert.match(adManager, /setupViewportRefreshListener/);
  assert.match(adManager, /--ad-banner-height/);
  assert.match(landscapeCss, /var\(--ad-banner-height/);
});

test('Android uses immersive system bars while the game is landscape', () => {
  const mainActivity = readProjectFile(
    'android/app/src/main/java/com/timurlenk/turkchess/MainActivity.java',
  );

  assert.match(mainActivity, /Configuration\.ORIENTATION_LANDSCAPE/);
  assert.match(mainActivity, /WindowInsetsCompat\.Type\.systemBars\(\)/);
});
