import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const landscapeCss = fs.readFileSync(
    path.join(projectRoot, 'src', 'styles', 'orientation-landscape.css'),
    'utf8'
);
const adManagerSource = fs.readFileSync(
    path.join(projectRoot, 'src', 'utils', 'AdManager.js'),
    'utf8'
);
const mainSource = fs.readFileSync(path.join(projectRoot, 'src', 'main.js'), 'utf8');

test('landscape game gives the board a full-height center lane with side HUD rails', () => {
    assert.match(
        landscapeCss,
        /grid-template-areas:\s*"info\s+board\s+header"\s*"info\s+board\s+\."\s*"info\s+board\s+footer"/
    );
    assert.match(landscapeCss, /#game-view \.board-container\s*\{[\s\S]*grid-area:\s*board/);
    assert.match(landscapeCss, /#game-view \.piece-info-panel\s*\{[\s\S]*grid-area:\s*info/);
    assert.match(landscapeCss, /#game-view \.board-container::before\s*\{[\s\S]*display:\s*none\s*!important/);
});

test('landscape screens fill the safe viewport instead of keeping portrait-width gaps', () => {
    assert.match(landscapeCss, /--landscape-safe-width/);
    assert.match(
        landscapeCss,
        /:root\[data-orientation="landscape"\] body\s*\{[\s\S]*padding:\s*0\s*!important/
    );
    assert.match(
        landscapeCss,
        /#main-menu \.menu-box,[\s\S]*#game-settings-overlay \.game-settings-box,[\s\S]*width:\s*100%\s*!important/
    );
    assert.match(
        landscapeCss,
        /#game-view\s*\{[\s\S]*grid-template-columns:\s*clamp\(108px,\s*14\.5vw,\s*162px\)/
    );
});

test('native adaptive banner is recreated after an orientation preference change', () => {
    assert.match(adManagerSource, /refreshBannerForOrientation/);
    assert.match(adManagerSource, /AdMob\.removeBanner\(\)/);
    assert.match(mainSource, /AdManager\.refreshBannerForOrientation/);
});
