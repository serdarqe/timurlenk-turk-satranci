import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainCss = fs.readFileSync(path.join(projectRoot, 'src', 'styles', 'main.css'), 'utf8');

test('player captured black pieces are lightened only inside the player HUD tray', () => {
    assert.match(mainCss, /#game-view #player-captured \.piece\.black\s*\{/);
    assert.match(mainCss, /#game-view #player-captured \.piece\.black \.piece-img\s*\{[\s\S]*brightness\(1\.18\)/);
    assert.doesNotMatch(mainCss, /#game-view \.piece\.black \.piece-img\s*\{[\s\S]*brightness\(1\.18\)/);
});
