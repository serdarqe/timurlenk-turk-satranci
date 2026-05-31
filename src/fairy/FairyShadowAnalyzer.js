import {
    buildFairyShadowLogEntry,
    buildFairyShadowLogReport,
    formatFairyShadowLogLine
} from './FairyShadowLog.js';

const DEFAULT_PROBLEM_GAME_LIMIT = 12;

export function extractFairyShadowEntriesFromRecord(record) {
    const gameId = getRecordId(record);
    const moves = Array.isArray(record?.moves) ? record.moves : [];

    return moves
        .map((move, index) => {
            const debug = move?.fairyDebug || move?.ai?.fairyDebug || null;
            const sideConfig = getScenarioSideConfig(record, move?.color);
            const entry = debug?.shadowLogEntry
                || buildFairyShadowLogEntry(debug, {
                    moveIndex: getMoveIndex(move, index),
                    sideToMove: move?.color || null,
                    jsAiMove: debug?.jsAiMove || move?.ai?.jsAiMove || null
                });

            if (!entry) return null;
            return {
                ...entry,
                gameId,
                resultType: record?.resultType || record?.game?.resultType || null,
                winner: record?.winner || record?.game?.winner || null,
                scenarioKind: record?.scenario?.kind || record?.game?.scenarioKind || null,
                timeControl: record?.scenario?.timeControl || record?.game?.timeControl || null,
                difficulty: move?.ai?.difficulty || sideConfig?.difficulty || null,
                personaId: move?.ai?.personaId || sideConfig?.personaId || null,
                botId: move?.ai?.botId || sideConfig?.botId || null,
                sideLabel: move?.ai?.sideLabel || sideConfig?.label || null
            };
        })
        .filter(Boolean);
}

export function analyzeFairyShadowRecords(records, options = {}) {
    const normalizedRecords = normalizeRecords(records);
    const allEntries = normalizedRecords.flatMap(extractFairyShadowEntriesFromRecord);
    const shadowReport = buildFairyShadowLogReport(allEntries, options);
    const gamesWithShadowData = new Set(allEntries.map((entry) => entry.gameId).filter(Boolean)).size;

    return {
        mode: 'fairy_shadow_analysis',
        gameCount: normalizedRecords.length,
        moveCount: normalizedRecords.reduce((total, record) => total + getMoveCount(record), 0),
        gamesWithShadowData,
        gamesWithoutShadowData: Math.max(0, normalizedRecords.length - gamesWithShadowData),
        shadow: shadowReport,
        automationProbe: buildAutomationProbeReport(allEntries, options),
        resultTypeCounts: countRecordsBy(normalizedRecords, getResultType, 'resultType'),
        winnerCounts: countRecordsBy(normalizedRecords, getWinner, 'winner'),
        problemGames: buildProblemGames(allEntries, options.problemGameLimit),
        sourceHints: {
            hasShadowData: allEntries.length > 0,
            noShadowDataReason: allEntries.length > 0
                ? null
                : 'records_do_not_contain_fairyDebug_or_shadowLogEntry'
        }
    };
}

export function summarizeFairyShadowAnalysis(analysis) {
    const lines = [
        'Fairy Shadow Analiz Raporu',
        `Okunan mac: ${analysis.gameCount}`,
        `Okunan hamle: ${analysis.moveCount}`,
        `Shadow ornek: ${analysis.shadow.sampleCount}`
    ];

    if (!analysis.shadow.sampleCount) {
        lines.push('Shadow verisi bulunamadi: mac dosyalarinda fairyDebug/shadowLogEntry alani yok.');
        lines.push(`Sonuc dagilimi: ${formatCountList(analysis.resultTypeCounts, 'resultType')}`);
        return lines.join('\n');
    }

    lines.push(`Uyumlu hamle: ${analysis.shadow.matchCount}`);
    lines.push(`Mismatch: ${analysis.shadow.mismatchCount}`);
    lines.push(`Gercek sampled probe: ${analysis.automationProbe.sampledProbeCount}`);
    lines.push(`Placeholder probe: ${analysis.automationProbe.placeholderCount}`);
    lines.push(`Probe kapsami: ${Math.round((analysis.automationProbe.probeCoverageRate || 0) * 1000) / 10}%`);
    lines.push(`JS/Fairy farki: ${analysis.automationProbe.sampledDifferenceCount}`);
    lines.push(`Root karsilastirma: ${analysis.shadow.rootComparisonCount}`);
    lines.push(`Root hata: ${analysis.shadow.rootMovesErrorCount}`);
    lines.push(`Red sebepleri: ${formatCountList(analysis.shadow.rejectionReasons, 'reason')}`);

    if (analysis.problemGames.length) {
        lines.push('Problemli ilk hamleler:');
        for (const entry of analysis.problemGames.slice(0, 8)) {
            lines.push(`- ${entry.gameId || 'unknown'} ${formatFairyShadowLogLine(entry)}`);
        }
    }

    return lines.join('\n');
}

function normalizeRecords(records) {
    if (!Array.isArray(records)) return [];

    return records.flatMap((record) => {
        if (Array.isArray(record)) return normalizeRecords(record);
        if (Array.isArray(record?.records)) return normalizeRecords(record.records);
        if (Array.isArray(record?.games)) return normalizeRecords(record.games);
        return record && typeof record === 'object' ? [record] : [];
    });
}

function buildProblemGames(entries, limit = DEFAULT_PROBLEM_GAME_LIMIT) {
    const maxEntries = Math.max(1, Math.round(Number(limit || DEFAULT_PROBLEM_GAME_LIMIT)));
    return entries
        .filter((entry) => entry.severity !== 'ok')
        .slice(0, maxEntries)
        .map((entry) => ({
            gameId: entry.gameId,
            moveIndex: entry.moveIndex,
            sideToMove: entry.sideToMove,
            status: entry.status,
            severity: entry.severity,
            jsAiMove: entry.jsAiMove,
            fairyBestMove: entry.fairyBestMove,
            rejectionReason: entry.rejectionReason,
            rootMovesError: entry.rootMovesError,
            resultType: entry.resultType,
            winner: entry.winner
        }));
}

function buildAutomationProbeReport(entries = [], options = {}) {
    const sampledEntries = entries.filter(isSampledAutomationProbe);
    const placeholderEntries = entries.filter(isAutomationProbePlaceholder);
    const differenceEntries = sampledEntries.filter(hasJsFairyDifference);
    const differenceLimit = Math.max(1, Math.round(Number(options.differenceMoveLimit || 12)));

    return {
        totalShadowEntries: entries.length,
        placeholderCount: placeholderEntries.length,
        sampledProbeCount: sampledEntries.length,
        sampledAcceptedCount: sampledEntries.filter((entry) => entry.fairyAccepted).length,
        sampledRejectedCount: sampledEntries.filter((entry) => !entry.fairyAccepted).length,
        sampledMismatchCount: sampledEntries.filter((entry) => entry.severity === 'mismatch').length,
        sampledDifferenceCount: differenceEntries.length,
        probeCoverageRate: ratio(sampledEntries.length, entries.length),
        byDifficulty: groupAutomationProbe(entries, 'difficulty', 'difficulty'),
        byPersona: groupAutomationProbe(entries, 'personaId', 'personaId'),
        byBot: groupAutomationProbe(entries, 'botId', 'botId'),
        byScenarioKind: groupAutomationProbe(entries, 'scenarioKind', 'scenarioKind'),
        differenceMoves: differenceEntries.slice(0, differenceLimit).map((entry) => ({
            gameId: entry.gameId,
            moveIndex: entry.moveIndex,
            sideToMove: entry.sideToMove,
            difficulty: entry.difficulty,
            personaId: entry.personaId,
            botId: entry.botId,
            scenarioKind: entry.scenarioKind,
            jsAiMove: entry.jsAiMove,
            fairyBestMove: entry.fairyBestMove,
            fairySelectedMove: entry.fairySelectedMove,
            fairyAccepted: entry.fairyAccepted,
            status: entry.status,
            severity: entry.severity,
            rejectionReason: entry.rejectionReason
        }))
    };
}

function groupAutomationProbe(entries, field, outputKey) {
    const counts = new Map();
    for (const entry of entries) {
        const key = entry[field] || 'unknown';
        const current = counts.get(key) || {
            [outputKey]: key,
            total: 0,
            sampled: 0,
            placeholder: 0,
            accepted: 0,
            rejected: 0,
            differences: 0
        };

        current.total += 1;
        if (isSampledAutomationProbe(entry)) current.sampled += 1;
        if (isAutomationProbePlaceholder(entry)) current.placeholder += 1;
        if (isSampledAutomationProbe(entry) && entry.fairyAccepted) current.accepted += 1;
        if (isSampledAutomationProbe(entry) && !entry.fairyAccepted) current.rejected += 1;
        if (isSampledAutomationProbe(entry) && hasJsFairyDifference(entry)) current.differences += 1;
        counts.set(key, current);
    }

    return [...counts.values()]
        .sort((a, b) => b.total - a.total || String(a[outputKey]).localeCompare(String(b[outputKey])));
}

function isAutomationProbePlaceholder(entry) {
    return entry?.mode === 'automation_shadow' || entry?.status === 'automation_probe_not_run';
}

function isSampledAutomationProbe(entry) {
    return entry?.mode === 'automation_sampled_probe';
}

function hasJsFairyDifference(entry) {
    return Boolean(
        entry?.jsAiMove
        && entry?.fairyBestMove
        && entry.jsAiMove !== entry.fairyBestMove
    );
}

function ratio(value, total) {
    if (!total) return 0;
    return Number((value / total).toFixed(4));
}

function countRecordsBy(records, getter, key) {
    const counts = new Map();
    for (const record of records) {
        const value = getter(record) || 'unknown';
        counts.set(value, (counts.get(value) || 0) + 1);
    }

    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ [key]: value, count }));
}

function getRecordId(record) {
    return record?.gameId || record?.id || record?.game?.gameId || null;
}

function getMoveCount(record) {
    if (Array.isArray(record?.moves)) return record.moves.length;
    if (Number.isFinite(record?.moveCount)) return record.moveCount;
    if (Number.isFinite(record?.game?.moveCount)) return record.game.moveCount;
    return 0;
}

function getMoveIndex(move, index) {
    return Number.isFinite(move?.index) ? move.index : index + 1;
}

function getResultType(record) {
    return record?.resultType || record?.game?.resultType || 'unknown';
}

function getWinner(record) {
    return record?.winner || record?.game?.winner || 'unknown';
}

function getScenarioSideConfig(record, color) {
    if (color === 'white') return record?.scenario?.white || null;
    if (color === 'black') return record?.scenario?.black || null;
    return null;
}

function formatCountList(values, key) {
    if (!values?.length) return '-';
    return values.map((entry) => `${entry[key]}=${entry.count}`).join(', ');
}
