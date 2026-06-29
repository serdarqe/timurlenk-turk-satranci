import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    BOARD_THEMES,
    PIECE_SKINS,
    SKIN_THEME_PAIRS,
    THEME_SKIN_PAIRS
} from '../src/utils/ThemeManager.js';

function readProjectFile(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('board themes and piece skins have matching visual pairs', () => {
    assert.equal(THEME_SKIN_PAIRS[BOARD_THEMES.BLACK_WHITE], PIECE_SKINS.BOLD);
    assert.equal(SKIN_THEME_PAIRS[PIECE_SKINS.BOLD], BOARD_THEMES.BLACK_WHITE);
    assert.equal(THEME_SKIN_PAIRS[BOARD_THEMES.GREEN_WHITE], PIECE_SKINS.BOLD);

    assert.equal(THEME_SKIN_PAIRS[BOARD_THEMES.SAMARKAND], PIECE_SKINS.HERITAGE);
    assert.equal(SKIN_THEME_PAIRS[PIECE_SKINS.HERITAGE], BOARD_THEMES.SAMARKAND);

    assert.equal(THEME_SKIN_PAIRS[BOARD_THEMES.SILK_ROAD], PIECE_SKINS.WARRIOR);
    assert.equal(SKIN_THEME_PAIRS[PIECE_SKINS.WARRIOR], BOARD_THEMES.SILK_ROAD);
    assert.equal(BOARD_THEMES.KHORASAN, undefined);
});

test('settings UI applies board and piece themes as pairs', () => {
    const mainSource = readProjectFile('src/main.js');
    const settingsMarkup = readProjectFile('index.html');
    const i18nSource = readProjectFile('src/utils/i18n.js');
    const themeCss = readProjectFile('src/styles/themes.css');

    assert.match(mainSource, /themeManager\.setBoardThemePair\(btn\.dataset\.boardTheme\)/);
    assert.match(mainSource, /themeManager\.setPieceSkinPair\(btn\.dataset\.pieceSkin\)/);
    assert.match(mainSource, /PieceRenderer\.refreshAllPieces\(\)/);
    assert.doesNotMatch(settingsMarkup, /khorasan|theme_khorasan|Horasan/i);
    assert.doesNotMatch(i18nSource, /theme_khorasan|Horasan|Khorasan/);
    assert.doesNotMatch(themeCss, /khorasan|Khorasan|HORASAN/i);
});
