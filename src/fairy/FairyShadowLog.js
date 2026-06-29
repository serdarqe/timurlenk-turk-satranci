const DEFAULT_PROBLEM_LIMIT = 12;

export function buildFairyShadowLogEntry(metadata, context = {}) {
    if (!metadata?.enabled) return null;

    const shadowMode = metadata.shadowMode || {};
    const status = shadowMode.status || inferShadowStatus(metadata);
    const rejectionReason = metadata.fairyAccepted
        ? null
        : (metadata.fairyRejectedReason || shadowMode.nativeBestMoveReason || null);
    const entry = {
        moveIndex: toNullableNumber(context.moveIndex),
        sideToMove: context.sideToMove || null,
        mode: metadata.mode || 'shadow',
        depth: toNullableNumber(metadata.depth),
        status,
        severity: classifyShadowSeverity(metadata, shadowMode, status),
        rootComparisonAvailable: Boolean(shadowMode.rootComparisonAvailable),
        rootMovesAvailable: Boolean(metadata.rootMovesAvailable),
        rootMoveCount: toNumber(metadata.rootMoveCount, 0),
        rootMoveThinkMs: toNullableNumber(metadata.rootMoveThinkMs),
        rootMovesError: metadata.rootMovesError || null,
        jsAiMove: metadata.jsAiMove || context.jsAiMove || null,
        fairyBestMove: metadata.fairyBestMove || null,
        fairySelectedMove: metadata.fairySelectedMove || null,
        fairyAccepted: Boolean(metadata.fairyAccepted),
        rejectionReason,
        fallbackUsed: Boolean(metadata.fallbackUsed),
        fairyMatchesJsMove: Boolean(metadata.fairyMatchesJsMove),
        fairyThinkMs: toNullableNumber(metadata.fairyThinkMs),
        hybridApplied: Boolean(metadata.hybridApplied),
        appliedToGame: Boolean(metadata.appliedToGame),
        timeout: Boolean(metadata.timeout),
        errorCode: metadata.errorCode || null,
        diffCounts: {
            missingWrapperCount: toNumber(shadowMode.missingWrapperCount, 0),
            rejectedFairyCount: toNumber(shadowMode.rejectedFairyCount, 0),
            unexpectedJsOnlyCount: toNumber(shadowMode.unexpectedJsOnlyCount, 0),
            unexpectedFairyOnlyCount: toNumber(shadowMode.unexpectedFairyOnlyCount, 0)
        }
    };

    return entry;
}

export function appendFairyShadowLogEntry(entries, entry, options = {}) {
    if (!entry) return Array.isArray(entries) ? [...entries] : [];

    const maxEntries = Math.max(1, Math.round(Number(options.maxEntries || 200)));
    const nextEntries = [...(Array.isArray(entries) ? entries : []), entry];
    return nextEntries.slice(-maxEntries);
}

export function buildFairyShadowLogReport(values, options = {}) {
    const entries = normalizeEntries(values);
    const problemLimit = Math.max(1, Math.round(Number(options.problemLimit || DEFAULT_PROBLEM_LIMIT)));
    const problemMoves = entries
        .filter((entry) => entry.severity !== 'ok')
        .slice(0, problemLimit)
        .map((entry) => ({
            moveIndex: entry.moveIndex,
            sideToMove: entry.sideToMove,
            status: entry.status,
            severity: entry.severity,
            jsAiMove: entry.jsAiMove,
            fairyBestMove: entry.fairyBestMove,
            rejectionReason: entry.rejectionReason,
            rootMovesError: entry.rootMovesError,
            errorCode: entry.errorCode
        }));

    return {
        sampleCount: entries.length,
        acceptedCount: entries.filter((entry) => entry.fairyAccepted).length,
        rejectedCount: entries.filter((entry) => !entry.fairyAccepted).length,
        matchCount: entries.filter((entry) => entry.fairyMatchesJsMove).length,
        mismatchCount: entries.filter((entry) => entry.severity === 'mismatch').length,
        warningCount: entries.filter((entry) => entry.severity === 'warning').length,
        errorCount: entries.filter((entry) => entry.severity === 'error').length,
        expectedDifferenceCount: entries.filter((entry) => entry.severity === 'expected').length,
        rootComparisonCount: entries.filter((entry) => entry.rootComparisonAvailable).length,
        rootMovesAvailableCount: entries.filter((entry) => entry.rootMovesAvailable).length,
        rootMovesErrorCount: entries.filter((entry) => entry.rootMovesError).length,
        hybridAppliedCount: entries.filter((entry) => entry.hybridApplied).length,
        timeoutCount: entries.filter((entry) => entry.timeout).length,
        statusCounts: countBy(entries, 'status').map(([status, count]) => ({ status, count })),
        rejectionReasons: countReasons(entries).map(([reason, count]) => ({ reason, count })),
        problemMoves,
        lastStatus: entries.at(-1)?.status || null
    };
}

export function formatFairyShadowLogLine(entry) {
    if (!entry) return 'Fairy shadow log: empty';

    const moveLabel = entry.moveIndex == null ? '#?' : `#${entry.moveIndex}`;
    const side = entry.sideToMove || 'unknown';
    const jsMove = entry.jsAiMove || '-';
    const fairyMove = entry.fairyBestMove || '-';
    return `${moveLabel} ${side} ${entry.status} ${entry.severity} JS=${jsMove} Fairy=${fairyMove}`;
}

function normalizeEntries(values) {
    if (!Array.isArray(values)) return [];

    return values
        .map((value, index) => isShadowLogEntry(value)
            ? value
            : buildFairyShadowLogEntry(value, { moveIndex: index + 1 }))
        .filter(Boolean);
}

function isShadowLogEntry(value) {
    return Boolean(value?.status && value?.severity && Object.hasOwn(value, 'fairyAccepted'));
}

function inferShadowStatus(metadata) {
    if (metadata.timeout || metadata.errorCode) return 'probe_failed';
    if (metadata.fairyAccepted) return 'bestmove_only_accepted';
    return 'bestmove_only_rejected';
}

function classifyShadowSeverity(metadata, shadowMode, status) {
    if (metadata.automationShadow || status === 'automation_probe_not_run' || status === 'probe_not_run') {
        return 'ok';
    }

    if (metadata.timeout || metadata.errorCode || status === 'probe_failed') {
        return 'error';
    }

    if (
        !metadata.fairyAccepted
        || status === 'mismatch'
        || status === 'bestmove_only_rejected'
        || toNumber(shadowMode.unexpectedJsOnlyCount, 0) > 0
        || toNumber(shadowMode.unexpectedFairyOnlyCount, 0) > 0
    ) {
        return 'mismatch';
    }

    if (metadata.rootMovesError) {
        return 'warning';
    }

    if (status === 'expected_differences') {
        return 'expected';
    }

    return 'ok';
}

function countBy(entries, key) {
    const counts = new Map();
    for (const entry of entries) {
        const value = entry[key] || 'unknown';
        counts.set(value, (counts.get(value) || 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

function countReasons(entries) {
    const counts = new Map();
    for (const entry of entries) {
        if (!entry.rejectionReason) continue;
        counts.set(entry.rejectionReason, (counts.get(entry.rejectionReason) || 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function toNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value) {
    return Number.isFinite(value) ? value : null;
}
