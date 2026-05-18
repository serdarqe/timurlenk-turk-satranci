export const TRANSPOSITION_BOUNDS = Object.freeze({
    EXACT: 'exact',
    LOWER: 'lower',
    UPPER: 'upper'
});

function normalizeBound(bound) {
    return Object.values(TRANSPOSITION_BOUNDS).includes(bound)
        ? bound
        : TRANSPOSITION_BOUNDS.EXACT;
}

export function createTranspositionEntry({
    depth = 0,
    score = 0,
    bound = TRANSPOSITION_BOUNDS.EXACT,
    move = null,
    age = 0
} = {}) {
    return {
        depth: Number.isFinite(depth) ? depth : 0,
        score: Number.isFinite(score) ? score : 0,
        bound: normalizeBound(bound),
        move,
        age: Number.isFinite(age) ? age : 0
    };
}

export function probeTranspositionEntry(table, key, {
    depth = 0,
    alpha = -Infinity,
    beta = Infinity
} = {}) {
    const entry = table instanceof Map ? table.get(key) : null;
    if (!entry) return { entry: null, usable: false, score: null, move: null };

    const normalized = createTranspositionEntry(entry);
    const hasEnoughDepth = normalized.depth >= depth;
    let usable = false;

    if (hasEnoughDepth) {
        if (normalized.bound === TRANSPOSITION_BOUNDS.EXACT) {
            usable = true;
        } else if (normalized.bound === TRANSPOSITION_BOUNDS.LOWER) {
            usable = normalized.score >= beta;
        } else if (normalized.bound === TRANSPOSITION_BOUNDS.UPPER) {
            usable = normalized.score <= alpha;
        }
    }

    return {
        entry: normalized,
        usable,
        score: usable ? normalized.score : null,
        move: normalized.move
    };
}

function shouldReplaceTranspositionEntry(previous, next) {
    if (!previous) return true;
    if (next.depth > previous.depth) return true;
    if (next.depth < previous.depth) return false;
    if (next.bound === TRANSPOSITION_BOUNDS.EXACT && previous.bound !== TRANSPOSITION_BOUNDS.EXACT) return true;
    return next.age >= previous.age;
}

function pruneTranspositionTable(table, maxSize) {
    if (!(table instanceof Map) || !Number.isFinite(maxSize) || table.size <= maxSize) return;

    const removeCount = table.size - maxSize;
    const victims = [...table.entries()]
        .sort(([, a], [, b]) => (
            (a.age ?? 0) - (b.age ?? 0)
            || (a.depth ?? 0) - (b.depth ?? 0)
            || (a.bound === TRANSPOSITION_BOUNDS.EXACT ? 1 : 0) - (b.bound === TRANSPOSITION_BOUNDS.EXACT ? 1 : 0)
        ))
        .slice(0, removeCount);

    victims.forEach(([key]) => table.delete(key));
}

export function storeTranspositionEntry(table, key, entry, {
    maxSize = Infinity,
    age = entry?.age ?? 0
} = {}) {
    if (!(table instanceof Map) || !key) return false;

    const next = createTranspositionEntry({ ...entry, age });
    const previous = table.get(key);
    if (!shouldReplaceTranspositionEntry(previous, next)) {
        pruneTranspositionTable(table, maxSize);
        return false;
    }

    table.set(key, next);
    pruneTranspositionTable(table, maxSize);
    return true;
}

