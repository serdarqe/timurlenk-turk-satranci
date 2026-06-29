import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('piece skins are wired without the removed dynasty skin', () => {
    const renderer = read('src/ui/PieceRenderer.js');
    const themeManager = read('src/utils/ThemeManager.js');
    const index = read('index.html');
    const i18n = read('src/utils/i18n.js');
    const css = read('src/styles/pieces.css');
    const boldSvgs = read('src/ui/PieceSVGs_Bold.js');

    assert.match(themeManager, /BOLD:\s*'bold'/);
    assert.match(themeManager, /readPref\(PIECE_SKIN_KEY,\s*PIECE_SKINS\.BOLD\)/);
    assert.match(renderer, /PIECE_SVGS_BOLD/);
    assert.match(renderer, /getCurrentSVGMap\(color\)/);
    assert.match(renderer, /\[PIECE_SKINS\.HERITAGE\]: buildColorSVGMaps\(PIECE_SVGS_HERITAGE\)/);
    assert.match(renderer, /\[PIECE_SKINS\.WARRIOR\]: buildSVGMap\(PIECE_SVGS_WARRIOR\)/);
    assert.match(renderer, /\[PIECE_SKINS\.BOLD\]: buildColorSVGMaps\(PIECE_SVGS_BOLD\)/);
    assert.doesNotMatch(renderer, /PIECE_SVGS_DYNASTY/);
    assert.doesNotMatch(themeManager, /DYNASTY/);

    assert.match(index, /data-piece-skin="heritage"/);
    assert.match(index, /data-piece-skin="warrior"/);
    assert.match(index, /data-piece-skin="bold"/);
    assert.doesNotMatch(index, /data-piece-skin="dynasty"/);
    assert.match(i18n, /'settings\.skin_classic': 'Tarihi'/);
    assert.match(i18n, /'settings\.skin_classic': 'Historical'/);
    assert.match(i18n, /'settings\.skin_bold': 'Klasik'/);
    assert.match(i18n, /'settings\.skin_bold': 'Classic'/);
    assert.doesNotMatch(i18n, /settings\.skin_dynasty/);
    assert.match(css, /data-piece-skin="bold"[\s\S]*filter:\s*none/);
    assert.match(css, /--pc-fill:\s*#f8efd7\s*!important/);
    assert.match(css, /--pc-fill:\s*#171d20\s*!important/);
    assert.match(css, /\[stroke-width="3\.5"\][\s\S]*stroke-width:\s*1\.65\s*!important/);

    assert.match(boldSvgs, /piece-designs-bold\/king\.svg\?raw/);
    assert.match(boldSvgs, /piece-designs-bold\/black\/king\.svg\?raw/);
    assert.match(boldSvgs, /SEA_MONSTER: WHITE_SEA_MONSTER/);
    assert.match(boldSvgs, /SEA_MONSTER: BLACK_SEA_MONSTER/);
});
