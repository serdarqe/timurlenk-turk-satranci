import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    BOARD_THEMES,
    PIECE_SKINS,
    THEME_SKIN_PAIRS
} from '../src/utils/ThemeManager.js';

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('green-white board theme is available as a separate board option', () => {
    const themeManager = read('src/utils/ThemeManager.js');
    const index = read('index.html');
    const i18n = read('src/utils/i18n.js');
    const themesCss = read('src/styles/themes.css');

    assert.equal(BOARD_THEMES.GREEN_WHITE, 'green-white');
    assert.equal(THEME_SKIN_PAIRS[BOARD_THEMES.GREEN_WHITE], PIECE_SKINS.BOLD);
    assert.match(themeManager, /GREEN_WHITE:\s*'green-white'/);
    assert.match(index, /data-board-theme="green-white"/);
    assert.match(i18n, /'settings\.theme_green_white': 'Yeşil Beyaz'/);
    assert.match(i18n, /'settings\.theme_green_white': 'Green White'/);
    assert.match(themesCss, /data-board-theme="green-white"/);
    assert.match(themesCss, /--board-light:\s*hsl\(45,\s*35%,\s*92%\)/);
    assert.match(themesCss, /--board-dark:\s*hsl\(132,\s*28%,\s*42%\)/);
});
