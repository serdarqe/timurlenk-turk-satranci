const FIREBASE_EVENT_PREFIX = 'timur_';
const FIREBASE_PARAM_PREFIX = 'tm_';
const MAX_FIREBASE_NAME_LENGTH = 40;
const MAX_FIREBASE_PARAMS = 25;
const MAX_FIREBASE_STRING_LENGTH = 100;

function sanitizeFirebaseName(rawName, prefix) {
    const normalized = String(rawName || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    const prefixed = `${prefix}${normalized || 'event'}`;
    const safeName = /^[a-z]/.test(prefixed) ? prefixed : `${prefix}x_${normalized || 'event'}`;
    return safeName.slice(0, MAX_FIREBASE_NAME_LENGTH);
}

function normalizeFirebaseValue(value) {
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string') return value.slice(0, MAX_FIREBASE_STRING_LENGTH);
    if (value == null) return undefined;
    return String(value).slice(0, MAX_FIREBASE_STRING_LENGTH);
}

export function mapFirebaseEventName(eventName) {
    return sanitizeFirebaseName(eventName, FIREBASE_EVENT_PREFIX);
}

export function mapFirebaseParams(payload = {}) {
    return Object.fromEntries(
        Object.entries(payload)
            .slice(0, MAX_FIREBASE_PARAMS)
            .map(([key, value]) => [sanitizeFirebaseName(key, FIREBASE_PARAM_PREFIX), normalizeFirebaseValue(value)])
            .filter(([, value]) => value !== undefined)
    );
}

