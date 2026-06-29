// src/utils/ThemeManager.js

const BOARD_THEME_KEY = 'board_theme';
const PIECE_SKIN_KEY = 'piece_skin';

export const BOARD_THEMES = {
    SAMARKAND: 'samarkand',
    SILK_ROAD: 'silk-road',
    BLACK_WHITE: 'black-white',
    GREEN_WHITE: 'green-white'
};

export const PIECE_SKINS = {
    HERITAGE: 'heritage',
    WARRIOR: 'warrior',
    BOLD: 'bold'
};

export const THEME_SKIN_PAIRS = {
    [BOARD_THEMES.BLACK_WHITE]: PIECE_SKINS.BOLD,
    [BOARD_THEMES.GREEN_WHITE]: PIECE_SKINS.BOLD,
    [BOARD_THEMES.SAMARKAND]: PIECE_SKINS.HERITAGE,
    [BOARD_THEMES.SILK_ROAD]: PIECE_SKINS.WARRIOR
};

export const SKIN_THEME_PAIRS = {
    [PIECE_SKINS.BOLD]: BOARD_THEMES.BLACK_WHITE,
    [PIECE_SKINS.HERITAGE]: BOARD_THEMES.SAMARKAND,
    [PIECE_SKINS.WARRIOR]: BOARD_THEMES.SILK_ROAD
};

function readPref(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch { return fallback; }
}

function writePref(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function normalizeBoardTheme(theme) {
    return Object.values(BOARD_THEMES).includes(theme) ? theme : BOARD_THEMES.BLACK_WHITE;
}

export const themeManager = {
    getBoardTheme() {
        return normalizeBoardTheme(readPref(BOARD_THEME_KEY, BOARD_THEMES.BLACK_WHITE));
    },

    getPairedPieceSkin(theme = this.getBoardTheme()) {
        return THEME_SKIN_PAIRS[theme] || PIECE_SKINS.BOLD;
    },

    getPairedBoardTheme(skin = this.getPieceSkin()) {
        return SKIN_THEME_PAIRS[skin] || BOARD_THEMES.BLACK_WHITE;
    },

    setBoardTheme(theme) {
        const normalizedTheme = normalizeBoardTheme(theme);
        writePref(BOARD_THEME_KEY, normalizedTheme);
        this._applyBoardTheme(normalizedTheme);
    },

    setBoardThemePair(theme) {
        const normalizedTheme = normalizeBoardTheme(theme);
        const pairedSkin = this.getPairedPieceSkin(normalizedTheme);
        this.setBoardTheme(normalizedTheme);
        this.setPieceSkin(pairedSkin);
        return { boardTheme: normalizedTheme, pieceSkin: pairedSkin };
    },

    getPieceSkin() {
        const saved = readPref(PIECE_SKIN_KEY, PIECE_SKINS.BOLD);
        return Object.values(PIECE_SKINS).includes(saved) ? saved : PIECE_SKINS.BOLD;
    },

    setPieceSkin(skin) {
        writePref(PIECE_SKIN_KEY, skin);
        this._applyPieceSkin(skin);
    },

    setPieceSkinPair(skin) {
        const pairedTheme = this.getPairedBoardTheme(skin);
        this.setPieceSkin(skin);
        this.setBoardTheme(pairedTheme);
        return { boardTheme: pairedTheme, pieceSkin: skin };
    },

    _applyBoardTheme(theme) {
        document.documentElement.dataset.boardTheme = normalizeBoardTheme(theme ?? this.getBoardTheme());
    },

    _applyPieceSkin(skin) {
        document.documentElement.dataset.pieceSkin = skin ?? this.getPieceSkin();
    },

    applyAll() {
        this._applyBoardTheme(this.getBoardTheme());
        this._applyPieceSkin(this.getPieceSkin());
    }
};
