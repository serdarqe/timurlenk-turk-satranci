const SHOW_PIECE_LETTERS_KEY = 'show_piece_letters';
const SHOW_ADVANTAGE_METER_KEY = 'show_advantage_meter';
const ANALYTICS_INSTALL_ID_KEY = 'analytics_install_id';

function readBooleanPreference(key, fallbackValue) {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) return fallbackValue;
        return stored === 'true';
    } catch (error) {
        console.warn(`Preference read failed for ${key}:`, error);
        return fallbackValue;
    }
}

function writeBooleanPreference(key, value) {
    try {
        localStorage.setItem(key, value ? 'true' : 'false');
    } catch (error) {
        console.warn(`Preference write failed for ${key}:`, error);
    }

    return value;
}

function readStringPreference(key, fallbackValue = null) {
    try {
        const stored = localStorage.getItem(key);
        return stored ?? fallbackValue;
    } catch (error) {
        console.warn(`Preference read failed for ${key}:`, error);
        return fallbackValue;
    }
}

function writeStringPreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn(`Preference write failed for ${key}:`, error);
    }

    return value;
}

export const userPreferences = {
    getShowPieceLetters() {
        return readBooleanPreference(SHOW_PIECE_LETTERS_KEY, false);
    },

    setShowPieceLetters(enabled) {
        return writeBooleanPreference(SHOW_PIECE_LETTERS_KEY, Boolean(enabled));
    },

    toggleShowPieceLetters() {
        return this.setShowPieceLetters(!this.getShowPieceLetters());
    },

    getShowAdvantageMeter() {
        return readBooleanPreference(SHOW_ADVANTAGE_METER_KEY, true);
    },

    setShowAdvantageMeter(enabled) {
        return writeBooleanPreference(SHOW_ADVANTAGE_METER_KEY, Boolean(enabled));
    },

    toggleShowAdvantageMeter() {
        return this.setShowAdvantageMeter(!this.getShowAdvantageMeter());
    },

    getAnalyticsInstallId() {
        return readStringPreference(ANALYTICS_INSTALL_ID_KEY, null);
    },

    setAnalyticsInstallId(value) {
        return writeStringPreference(ANALYTICS_INSTALL_ID_KEY, value);
    }
};
