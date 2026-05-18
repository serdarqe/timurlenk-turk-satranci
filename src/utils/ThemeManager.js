// src/utils/ThemeManager.js

const BOARD_THEME_KEY = 'board_theme';
const PIECE_SKIN_KEY = 'piece_skin';

export const BOARD_THEMES = {
    SAMARKAND: 'samarkand',
    SILK_ROAD: 'silk-road',
    KHORASAN: 'khorasan'
};

export const PIECE_SKINS = {
    CLASSIC: 'classic',
    WARRIOR: 'warrior',
    DYNASTY: 'dynasty'
};

function readPref(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
}

function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export const themeManager = {
    getBoardTheme() {
        return readPref(BOARD_THEME_KEY, BOARD_THEMES.SAMARKAND);
    },

    setBoardTheme(theme) {
        writePref(BOARD_THEME_KEY, theme);
        this._applyBoardTheme(theme);
    },

    getPieceSkin() {
        return readPref(PIECE_SKIN_KEY, PIECE_SKINS.CLASSIC);
    },

    setPieceSkin(skin) {
        writePref(PIECE_SKIN_KEY, skin);
        this._applyPieceSkin(skin);
    },

    _applyBoardTheme(theme) {
        document.documentElement.dataset.boardTheme = theme ?? this.getBoardTheme();
    },

    _applyPieceSkin(skin) {
        document.documentElement.dataset.pieceSkin = skin ?? this.getPieceSkin();
    },

    applyAll() {
        this._applyBoardTheme(this.getBoardTheme());
        this._applyPieceSkin(this.getPieceSkin());
    }
};
