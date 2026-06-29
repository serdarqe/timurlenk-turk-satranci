import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('black-white board theme is available as the fourth board option', () => {
    const themeManager = read('src/utils/ThemeManager.js');
    const index = read('index.html');
    const i18n = read('src/utils/i18n.js');
    const themesCss = read('src/styles/themes.css');
    const menuCss = read('src/styles/menu.css');

    assert.match(themeManager, /BLACK_WHITE:\s*'black-white'/);
    assert.match(themeManager, /readPref\(BOARD_THEME_KEY,\s*BOARD_THEMES\.BLACK_WHITE\)/);
    assert.match(index, /data-board-theme="black-white"/);
    assert.match(i18n, /'settings\.theme_black_white': 'Siyah Beyaz'/);
    assert.match(i18n, /'settings\.theme_black_white': 'Black White'/);
    assert.match(themesCss, /data-board-theme="black-white"/);
    assert.match(themesCss, /:root:not\(\[data-board-theme\]\)/);
    assert.match(themesCss, /--board-light:\s*hsl\(42,\s*22%,\s*90%\)/);
    assert.match(themesCss, /--board-dark:\s*hsl\(220,\s*8%,\s*20%\)/);
    assert.match(menuCss, /data-board-theme="black-white"[\s\S]*theme-choice-btn\.active/);
});
