import {
    collectTimurLegalMoves,
    moveToFairyUci,
    selectSafeTimurMoveFromFairyBestMove
} from './FairyTimurAdapter.js';
import { stateToFairyFen } from './FairyFen.js';
import {
    getClockRemainingMs,
    getTimeControl,
    hasClock,
    TIME_CONTROL_IDS
} from '../game/TimeControls.js';
import { COLORS } from '../utils/constants.js';
import { buildFairyShadowModeReport } from './FairyShadowMode.js';
import {
    appendFairyShadowLogEntry,
    buildFairyShadowLogEntry,
    buildFairyShadowLogReport
} from './FairyShadowLog.js';

const DEBUG_STORAGE_KEY = 'timur_fairy_debug';
const HYBRID_STORAGE_KEY = 'timur_fairy_hybrid';
const FORK_STORAGE_KEY = 'timur_fairy_fork';
const SHADOW_LOG_GLOBAL_KEY = '__TIMUR_FAIRY_SHADOW_LOG__';
const DEFAULT_DEPTH = 4;
const DEFAULT_TIMEOUT_MS = 1200;
const DEFAULT_ROOT_MOVES_TIMEOUT_MS = 5000;
const DEFAULT_SHADOW_LOG_LIMIT = 200;
const DEFAULT_FAIRY_FORK_ENABLED = true;
const ASSET_ROOT = '/fairy-singlethread';
const VARIANT_NAME = 'timur';
const FAIRY_CLOCK_MOVETIME_CAPS = Object.freeze({
    [TIME_CONTROL_IDS.FIVE_MINUTES]: Object.freeze({ easy: 120, medium: 260, hard: 520 }),
    [TIME_CONTROL_IDS.FIFTEEN_MINUTES]: Object.freeze({ easy: 160, medium: 420, hard: 850 }),
    [TIME_CONTROL_IDS.THIRTY_MINUTES]: Object.freeze({ easy: 210, medium: 620, hard: 1200 })
});

let stockfishScriptPromise = null;
let engineSessionPromise = null;
let searchQueue = Promise.resolve();

function hasBrowserRuntime() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readUrlFlag(name) {
    if (!hasBrowserRuntime()) return null;
    try {
        return new URLSearchParams(window.location.search).get(name);
    } catch {
        return null;
    }
}

function readStorageFlag() {
    if (!hasBrowserRuntime()) return null;
    try {
        return window.localStorage?.getItem(DEBUG_STORAGE_KEY) || null;
    } catch {
        return null;
    }
}

function readHybridFlag() {
    if (!hasBrowserRuntime()) return null;
    if (window.__TIMUR_FAIRY_HYBRID__ === true) return '1';
    if (window.__TIMUR_FAIRY_HYBRID__ === false) return '0';
    if (typeof window.__TIMUR_FAIRY_HYBRID__ === 'string') return window.__TIMUR_FAIRY_HYBRID__;

    try {
        const urlFlag = new URLSearchParams(window.location.search).get('fairyHybrid');
        if (urlFlag != null) return urlFlag;
    } catch {
        // Hybrid flags are optional diagnostics, never gameplay blockers.
    }

    try {
        return window.localStorage?.getItem(HYBRID_STORAGE_KEY) || null;
    } catch {
        return null;
    }
}

function readForkFlag() {
    if (!hasBrowserRuntime()) return null;
    if (window.__TIMUR_FAIRY_FORK__ === true) return '1';
    if (window.__TIMUR_FAIRY_FORK__ === false) return '0';
    if (typeof window.__TIMUR_FAIRY_FORK__ === 'string') return window.__TIMUR_FAIRY_FORK__;

    try {
        const urlFlag = new URLSearchParams(window.location.search).get('fairyFork');
        if (urlFlag != null) return urlFlag;
    } catch {
        // Fork flags are optional diagnostics, never gameplay blockers.
    }

    try {
        return window.localStorage?.getItem(FORK_STORAGE_KEY) || null;
    } catch {
        return null;
    }
}

export function isFairyDebugEnabled() {
    if (!hasBrowserRuntime()) return false;
    if (window.__TIMUR_FAIRY_DEBUG__ === true) return true;
    if (window.__TIMUR_FAIRY_DEBUG__ === false) return false;

    const urlFlag = readUrlFlag('fairyDebug');
    if (urlFlag === '1' || urlFlag === 'true') return true;
    if (urlFlag === '0' || urlFlag === 'false') return false;

    const storageFlag = readStorageFlag();
    return storageFlag === '1' || storageFlag === 'true';
}

export function setFairyDebugEnabled(enabled) {
    if (!hasBrowserRuntime()) return false;
    window.__TIMUR_FAIRY_DEBUG__ = Boolean(enabled);
    try {
        window.localStorage?.setItem(DEBUG_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
        // Debug mode should never fail gameplay because storage is unavailable.
    }
    return window.__TIMUR_FAIRY_DEBUG__;
}

export function isFairyHybridEnabled() {
    const flag = String(readHybridFlag() || '').toLowerCase();
    return flag === '1' || flag === 'true' || flag === 'eligible' || flag === 'force';
}

export function isFairyHybridForced() {
    const flag = String(readHybridFlag() || '').toLowerCase();
    return flag === 'force';
}

export function setFairyHybridEnabled(enabled, options = {}) {
    if (!hasBrowserRuntime()) return false;
    const value = enabled ? (options.force ? 'force' : '1') : '0';
    window.__TIMUR_FAIRY_HYBRID__ = enabled ? value : false;
    try {
        window.localStorage?.setItem(HYBRID_STORAGE_KEY, value);
    } catch {
        // Hybrid mode should never fail gameplay because storage is unavailable.
    }
    return isFairyHybridEnabled();
}

export function isFairyForkEnabled() {
    const flag = readForkFlag();
    if (flag == null || flag === '') return DEFAULT_FAIRY_FORK_ENABLED;

    const normalized = String(flag).toLowerCase();
    if (normalized === '0' || normalized === 'false' || normalized === 'off') return false;
    return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'production';
}

export function setFairyForkEnabled(enabled) {
    if (!hasBrowserRuntime()) return false;
    window.__TIMUR_FAIRY_FORK__ = Boolean(enabled);
    try {
        window.localStorage?.setItem(FORK_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
        // Fork mode should never fail gameplay because storage is unavailable.
    }
    return isFairyForkEnabled();
}

function readDebugDepth() {
    const fromUrl = Number(readUrlFlag('fairyDepth'));
    const fromGlobal = hasBrowserRuntime() ? Number(window.__TIMUR_FAIRY_DEPTH__) : NaN;
    const value = Number.isFinite(fromUrl) && fromUrl > 0
        ? fromUrl
        : (Number.isFinite(fromGlobal) && fromGlobal > 0 ? fromGlobal : DEFAULT_DEPTH);
    return Math.min(8, Math.max(1, Math.round(value)));
}

function normalizeFairyTimeControlId(id) {
    const value = String(id || TIME_CONTROL_IDS.NONE);
    if (value === '5') return TIME_CONTROL_IDS.FIVE_MINUTES;
    if (value === '15') return TIME_CONTROL_IDS.FIFTEEN_MINUTES;
    if (value === '30') return TIME_CONTROL_IDS.THIRTY_MINUTES;
    return getTimeControl(value).id;
}

function clampFairyMovetime(value) {
    return Math.max(90, Math.min(1800, Math.round(Number(value || 0))));
}

function classifyFairyClockPressure(remainingMs, initialMs) {
    if (!Number.isFinite(remainingMs) || !Number.isFinite(initialMs) || initialMs <= 0) return 'none';
    const ratio = remainingMs / initialMs;
    if (remainingMs <= 30_000 || ratio <= 0.10) return 'critical';
    if (remainingMs <= 60_000 || ratio <= 0.20) return 'low';
    return 'healthy';
}

function buildFairyMovetimeCap(gameState, clock, timeControl, now) {
    const baseId = resolveFairyTimeStrength(gameState);
    const baseCap = FAIRY_CLOCK_MOVETIME_CAPS[timeControl.id]?.[baseId];
    if (!Number.isFinite(baseCap)) return null;

    const sideToMove = gameState?.currentTurn || clock?.activeColor || COLORS.BLACK;
    const remainingMs = getClockRemainingMs(clock, sideToMove, now);
    const pressure = classifyFairyClockPressure(remainingMs, timeControl.initialMs);
    let cap = baseCap;
    if (pressure === 'critical') cap *= 0.45;
    else if (pressure === 'low') cap *= 0.65;
    return clampFairyMovetime(cap);
}

export function buildFairyClockLimits(gameState, now = Date.now()) {
    const clock = gameState?.clock || null;
    const timeControl = getTimeControl(normalizeFairyTimeControlId(gameState?.timeControl || clock?.timeControl));
    if (!hasClock(clock) || !Number.isFinite(timeControl.initialMs)) return null;

    const wtime = getClockRemainingMs(clock, COLORS.WHITE, now);
    const btime = getClockRemainingMs(clock, COLORS.BLACK, now);
    if (!Number.isFinite(wtime) || !Number.isFinite(btime)) return null;

    const incrementMs = Math.max(0, Math.round(Number(timeControl.incrementMs || 0)));
    return {
        wtime: Math.max(1, Math.round(wtime)),
        btime: Math.max(1, Math.round(btime)),
        winc: incrementMs,
        binc: incrementMs,
        movetime: buildFairyMovetimeCap(gameState, clock, timeControl, now)
    };
}

export function buildFairyGoCommand({
    useNativeTimeProfile = false,
    depth = DEFAULT_DEPTH,
    clockLimits = null
} = {}) {
    if (
        useNativeTimeProfile
        && Number.isFinite(clockLimits?.wtime)
        && Number.isFinite(clockLimits?.btime)
    ) {
        const command = [
            'go',
            'wtime', String(Math.max(1, Math.round(clockLimits.wtime))),
            'btime', String(Math.max(1, Math.round(clockLimits.btime))),
            'winc', String(Math.max(0, Math.round(Number(clockLimits.winc || 0)))),
            'binc', String(Math.max(0, Math.round(Number(clockLimits.binc || 0))))
        ];
        if (Number.isFinite(clockLimits.movetime)) {
            command.push('movetime', String(clampFairyMovetime(clockLimits.movetime)));
        }
        return command.join(' ');
    }

    return useNativeTimeProfile ? 'go' : `go depth ${Math.min(8, Math.max(1, Math.round(depth || DEFAULT_DEPTH)))}`;
}

export function resolveFairySearchDepth(gameState, options = {}) {
    if (Number.isInteger(options.depth) && options.depth > 0) {
        return Math.min(8, Math.max(1, options.depth));
    }

    if (!options.fairyPrimary) {
        return readDebugDepth();
    }

    const botLevel = getBotLevelFromId(gameState?.aiBotId);
    let depth = DEFAULT_DEPTH;

    if (botLevel > 0) {
        depth = Math.min(8, Math.max(2, Math.ceil(botLevel / 2)));
    } else if (gameState?.difficulty === 'easy') {
        depth = 2;
    } else if (gameState?.difficulty === 'medium') {
        depth = 4;
    } else if (gameState?.difficulty === 'hard') {
        depth = 6;
    }

    const timeControl = normalizeFairyTimeControlId(gameState?.timeControl || gameState?.clock?.timeControl);
    if (timeControl === TIME_CONTROL_IDS.FIVE_MINUTES) depth -= 1;
    if (timeControl === TIME_CONTROL_IDS.THIRTY_MINUTES || timeControl === TIME_CONTROL_IDS.NONE) depth += 1;

    return Math.min(8, Math.max(1, Math.round(depth)));
}

function resolveFairyTimeStrength(gameState) {
    const botLevel = getBotLevelFromId(gameState?.aiBotId);
    if (botLevel > 0) {
        if (botLevel <= 5) return 'easy';
        if (botLevel <= 10) return 'medium';
        return 'hard';
    }

    if (gameState?.difficulty === 'easy') return 'easy';
    if (gameState?.difficulty === 'medium') return 'medium';
    return 'hard';
}

function resolveFairySkillLevel(gameState) {
    const botLevel = getBotLevelFromId(gameState?.aiBotId);
    if (botLevel > 0) {
        return Math.min(20, Math.max(3, Math.round(2 + botLevel * 1.2)));
    }

    if (gameState?.difficulty === 'easy') return 4;
    if (gameState?.difficulty === 'medium') return 12;
    return 20;
}

function resolveFairyPersona(gameState) {
    const personaId = String(gameState?.aiPersonaId || 'timur');
    if (personaId === 'ulu_bey') return 'ulug_bey';
    if (['timur', 'beyazid', 'ulug_bey', 'saray_veziri', 'neutral'].includes(personaId)) {
        return personaId;
    }
    return 'timur';
}

function loadStockfishScript() {
    if (!hasBrowserRuntime()) {
        return Promise.reject(new Error('fairy_debug_browser_required'));
    }
    if (typeof window.Stockfish === 'function') {
        return Promise.resolve();
    }
    if (stockfishScriptPromise) {
        return stockfishScriptPromise;
    }

    stockfishScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${ASSET_ROOT}/stockfish.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('fairy_debug_script_load_failed'));
        document.head.appendChild(script);
    });

    return stockfishScriptPromise;
}

function waitForLine(lines, predicate, timeoutMs, label, fromIndex = 0) {
    return new Promise((resolve, reject) => {
        const existing = lines.slice(fromIndex).find(predicate);
        if (existing) {
            resolve(existing);
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error(`${label}_timeout`));
        }, timeoutMs);

        lines.waiters.push((line) => {
            if (!predicate(line)) return false;
            clearTimeout(timeout);
            resolve(line);
            return true;
        });
    });
}

function attachEngineLogger(engine) {
    const lines = [];
    lines.waiters = [];

    engine.addMessageListener((line) => {
        const text = String(line);
        lines.push(text);
        lines.waiters = lines.waiters.filter((waiter) => !waiter(text));
    });

    return lines;
}

async function createEngineSession() {
    await loadStockfishScript();

    if (typeof window.Stockfish !== 'function') {
        throw new Error('fairy_debug_stockfish_missing');
    }

    const engine = await window.Stockfish({
        locateFile: (filename) => `${ASSET_ROOT}/${filename}`,
        mainScriptUrlOrBlob: `${ASSET_ROOT}/stockfish.js`
    });
    const lines = attachEngineLogger(engine);

    let startIndex = lines.length;
    engine.postMessage('uci');
    await waitForLine(lines, (line) => line.includes('uciok'), 20000, 'fairy_uciok', startIndex);

    startIndex = lines.length;
    engine.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'), 20000, 'fairy_readyok', startIndex);

    engine.postMessage(`setoption name UCI_Variant value ${VARIANT_NAME}`);
    engine.postMessage('setoption name Threads value 1');
    engine.postMessage('setoption name Hash value 16');
    engine.postMessage('setoption name Timur Time Profile value true');

    startIndex = lines.length;
    engine.postMessage('isready');
    await waitForLine(lines, (line) => line.includes('readyok'), 20000, 'fairy_timur_readyok', startIndex);

    return { engine, lines, artifact: 'singlethread', variant: VARIANT_NAME };
}

function getEngineSession() {
    if (!engineSessionPromise) {
        engineSessionPromise = createEngineSession().catch((error) => {
            engineSessionPromise = null;
            throw error;
        });
    }
    return engineSessionPromise;
}

function enqueueSearch(task) {
    const queued = searchQueue.then(task, task);
    searchQueue = queued.catch(() => {});
    return queued;
}

export function parseFairyPerftRootMoves(lines) {
    return [...new Set(lines
        .map(parseFairyPerftRootMove)
        .filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseFairyPerftRootMove(line) {
    const text = String(line || '').trim().toLowerCase();
    return text.match(/^(citadel_exchange:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@(blackcitadel|whitecitadel)):\s+\d+$/)?.[1]
        || text.match(/^(royal_swap:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@ransom):\s+\d+$/)?.[1]
        || text.match(/^(pawn_cycle:[a-k](?:10|[1-9]):[a-k](?:10|[1-9])@(stage2|stage3|adventitious)):\s+\d+$/)?.[1]
        || text.match(/^([a-k](?:10|[1-9])@(blackcitadel|whitecitadel)):\s+\d+$/)?.[1]
        || text.match(/^([a-k](?:10|[1-9])(?:[a-k](?:10|[1-9]))[a-z]*):\s+\d+$/)?.[1]
        || null;
}

async function requestFairyRootMoves(session, fen, timeoutMs) {
    const startIndex = session.lines.length;
    const startedAt = performance.now();

    session.engine.postMessage('ucinewgame');
    session.engine.postMessage(`position fen ${fen}`);
    session.engine.postMessage('go perft 1');

    await waitForLine(
        session.lines,
        (line) => /^Nodes searched:\s+\d+/i.test(line),
        timeoutMs,
        'fairy_root_moves',
        startIndex
    );

    return {
        rootMoves: parseFairyPerftRootMoves(session.lines.slice(startIndex)),
        rootMoveThinkMs: Math.round(performance.now() - startedAt),
        rootMovesError: null
    };
}

async function tryRequestFairyRootMoves(session, fen, options = {}) {
    if (!options.collectRootMoves) {
        return { rootMoves: null, rootMoveThinkMs: null, rootMovesError: null };
    }

    try {
        return await requestFairyRootMoves(
            session,
            fen,
            Math.max(250, Number(options.rootMovesTimeoutMs || DEFAULT_ROOT_MOVES_TIMEOUT_MS))
        );
    } catch (error) {
        return {
            rootMoves: null,
            rootMoveThinkMs: null,
            rootMovesError: error?.message || 'fairy_root_moves_failed'
        };
    }
}

async function requestFairyBestMove(fen, depth, options = {}) {
    return enqueueSearch(async () => {
        const session = await getEngineSession();
        const rootMoveProbe = await tryRequestFairyRootMoves(session, fen, options);
        const startIndex = session.lines.length;
        const startedAt = performance.now();
        const useNativeTimeProfile = Boolean(options.engineTimeProfile);
        const timeStrength = options.timeStrength || 'hard';
        const skillLevel = Number.isFinite(options.skillLevel) ? options.skillLevel : 20;
        const persona = options.persona || 'timur';
        const clockLimits = options.clockLimits || null;

        session.engine.postMessage('ucinewgame');
        if (useNativeTimeProfile) {
            session.engine.postMessage('setoption name Timur Time Profile value true');
            session.engine.postMessage(`setoption name Timur Time Strength value ${timeStrength}`);
        }
        session.engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
        session.engine.postMessage(`setoption name Timur Persona value ${persona}`);
        session.engine.postMessage(`position fen ${fen}`);
        session.engine.postMessage(buildFairyGoCommand({ useNativeTimeProfile, depth, clockLimits }));

        const bestmove = await waitForLine(
            session.lines,
            (line) => /^bestmove\s+\S+/.test(line),
            30000,
            'fairy_bestmove',
            startIndex
        );

        return {
            ok: true,
            bestmove,
            thinkMs: Math.round(performance.now() - startedAt),
            rootMoves: rootMoveProbe.rootMoves,
            rootMoveCount: Array.isArray(rootMoveProbe.rootMoves) ? rootMoveProbe.rootMoves.length : 0,
            rootMoveThinkMs: rootMoveProbe.rootMoveThinkMs,
            rootMovesError: rootMoveProbe.rootMovesError,
            tail: session.lines.slice(startIndex).slice(-12),
            artifact: session.artifact,
            variant: session.variant,
            depth,
            timeMode: useNativeTimeProfile ? 'engine-native' : 'fixed-depth',
            timeStrength,
            skillLevel,
            persona
        };
    });
}

export function startFairyShadowProbe(gameState, options = {}) {
    const fairyPrimary = Boolean(options.fairyPrimary || isFairyForkEnabled());
    if (!isFairyDebugEnabled() && !isFairyHybridEnabled() && !fairyPrimary) return null;

    const depth = resolveFairySearchDepth(gameState, { ...options, fairyPrimary });
    const timeStrength = resolveFairyTimeStrength(gameState);
    const skillLevel = resolveFairySkillLevel(gameState);
    const persona = resolveFairyPersona(gameState);
    const clockLimits = buildFairyClockLimits(gameState);
    try {
        const fen = stateToFairyFen(gameState);
        const collectRootMoves = options.collectRootMoves ?? (isFairyDebugEnabled() || isFairyHybridEnabled());
        return requestFairyBestMove(fen, depth, {
            collectRootMoves,
            rootMovesTimeoutMs: options.rootMovesTimeoutMs,
            engineTimeProfile: fairyPrimary,
            timeStrength,
            skillLevel,
            persona,
            clockLimits
        }).catch((error) => ({
            ok: false,
            errorCode: error?.message || 'fairy_debug_unknown_error',
            thinkMs: 0,
            rootMoves: null,
            rootMoveCount: 0,
            rootMoveThinkMs: null,
            rootMovesError: error?.message || 'fairy_debug_unknown_error',
            artifact: 'singlethread',
            variant: VARIANT_NAME,
            depth,
            timeMode: fairyPrimary ? 'engine-native' : 'fixed-depth',
            timeStrength,
            skillLevel,
            persona
        }));
    } catch (error) {
        return Promise.resolve({
            ok: false,
            errorCode: error?.message || 'fairy_debug_fen_error',
            thinkMs: 0,
            rootMoves: null,
            rootMoveCount: 0,
            rootMoveThinkMs: null,
            rootMovesError: error?.message || 'fairy_debug_fen_error',
            artifact: 'singlethread',
            variant: VARIANT_NAME,
            depth,
            timeMode: fairyPrimary ? 'engine-native' : 'fixed-depth',
            timeStrength,
            skillLevel,
            persona
        });
    }
}

function timeoutResult(timeoutMs) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                ok: false,
                timeout: true,
                errorCode: 'fairy_debug_timeout',
                thinkMs: timeoutMs,
                artifact: 'singlethread',
                variant: VARIANT_NAME,
                depth: readDebugDepth()
            });
        }, timeoutMs);
    });
}

function normalizeJsMove(jsMove) {
    if (!jsMove) return null;
    const uci = jsMove.uci || moveToFairyUci(jsMove.fromRow, jsMove.fromCol, jsMove.toRow, jsMove.toCol);
    return {
        uci,
        fromRow: jsMove.fromRow,
        fromCol: jsMove.fromCol,
        toRow: jsMove.toRow,
        toCol: jsMove.toCol,
        specialMove: jsMove.specialMove || null
    };
}

function normalizeAcceptedMoveForApplication(move) {
    if (!move || move.unsupported) return null;
    if (!Number.isInteger(move.fromRow) || !Number.isInteger(move.fromCol)) return null;
    if (!Number.isInteger(move.toRow) || !Number.isInteger(move.toCol)) return null;

    return {
        fromRow: move.fromRow,
        fromCol: move.fromCol,
        toRow: move.toRow,
        toCol: move.toCol,
        specialMove: move.specialMove || null
    };
}

function getBotLevelFromId(botId) {
    const match = String(botId || '').match(/^bot_(\d+)/);
    return match ? Number(match[1]) : 0;
}

function isHybridProfileEligible(gameState, options = {}) {
    if (options.fairyPrimary) return true;
    if (options.forceHybrid) return true;
    if (gameState?.difficulty === 'hard') return true;
    if (getBotLevelFromId(gameState?.aiBotId) >= 10) return true;
    return false;
}

function buildHybridApplicationDecision(gameState, decision, normalizedJsMove, options = {}) {
    if (!options.allowHybrid) {
        return { applied: false, reason: 'hybrid_disabled' };
    }

    if (!decision?.accepted) {
        return { applied: false, reason: decision?.reason || 'fairy_not_accepted' };
    }

    if (!decision.selectedMove || decision.selectedMove.unsupported) {
        return { applied: false, reason: 'unsupported_fairy_move' };
    }

    if (!isHybridProfileEligible(gameState, options)) {
        return { applied: false, reason: 'profile_not_eligible' };
    }

    const appliedMove = normalizeAcceptedMoveForApplication(decision.selectedMove);
    if (!appliedMove) {
        return { applied: false, reason: 'invalid_fairy_application_move' };
    }

    if (
        normalizedJsMove?.uci
        && decision.selectedMove.uci === normalizedJsMove.uci
    ) {
        return { applied: false, reason: 'matches_js_ai_move', eligible: true };
    }

    return {
        applied: true,
        reason: options.fairyPrimary ? 'fairy_fork_move_accepted' : 'fairy_hybrid_move_accepted',
        eligible: true,
        appliedMove
    };
}

function summarizeShadowModeReport(report) {
    return {
        enabled: true,
        status: report.status,
        authoritativeSource: report.authoritativeSource,
        rootComparisonAvailable: report.rootComparisonAvailable,
        exactMatch: report.exactMatch,
        onlyExpectedDiffs: report.onlyExpectedDiffs,
        missingWrapperCount: report.stats.missingWrapperCount,
        rejectedFairyCount: report.stats.rejectedFairyCount,
        unexpectedJsOnlyCount: report.stats.unexpectedJsOnlyCount,
        unexpectedFairyOnlyCount: report.stats.unexpectedFairyOnlyCount,
        nativeBestMoveStatus: report.nativeBestMove?.status || null,
        nativeBestMoveReason: report.nativeBestMove?.reason || null
    };
}

function buildFailedProbeShadowModeMetadata(probe) {
    return {
        enabled: true,
        status: 'probe_failed',
        authoritativeSource: 'js',
        rootComparisonAvailable: false,
        exactMatch: false,
        onlyExpectedDiffs: true,
        missingWrapperCount: 0,
        rejectedFairyCount: 0,
        unexpectedJsOnlyCount: 0,
        unexpectedFairyOnlyCount: 0,
        nativeBestMoveStatus: 'rejected',
        nativeBestMoveReason: probe?.errorCode || 'fairy_debug_probe_failed'
    };
}

function buildShadowLogContext(gameState) {
    return {
        moveIndex: Array.isArray(gameState?.moveHistory) ? gameState.moveHistory.length + 1 : null,
        sideToMove: gameState?.currentTurn || null
    };
}

function attachShadowLogMetadata(metadata, gameState) {
    const entry = buildFairyShadowLogEntry(metadata, buildShadowLogContext(gameState));
    metadata.shadowLogEntry = entry;
    recordFairyShadowLogEntry(entry);
    return metadata;
}

export function recordFairyShadowLogEntry(entry, options = {}) {
    if (!entry || !hasBrowserRuntime()) return entry || null;

    const current = Array.isArray(window[SHADOW_LOG_GLOBAL_KEY])
        ? window[SHADOW_LOG_GLOBAL_KEY]
        : [];
    window[SHADOW_LOG_GLOBAL_KEY] = appendFairyShadowLogEntry(current, entry, {
        maxEntries: options.maxEntries || DEFAULT_SHADOW_LOG_LIMIT
    });
    return entry;
}

export function getFairyShadowLogEntries() {
    if (!hasBrowserRuntime()) return [];
    return Array.isArray(window[SHADOW_LOG_GLOBAL_KEY])
        ? [...window[SHADOW_LOG_GLOBAL_KEY]]
        : [];
}

export function getFairyShadowLogReport() {
    return buildFairyShadowLogReport(getFairyShadowLogEntries());
}

export function clearFairyShadowLog() {
    if (!hasBrowserRuntime()) return [];
    window[SHADOW_LOG_GLOBAL_KEY] = [];
    return [];
}

export function buildFairyProbeDecision(gameState, jsMove, probe, options = {}) {
    const normalizedJsMove = normalizeJsMove(jsMove);
    const jsMoves = collectTimurLegalMoves(gameState);
    const fallbackMove = normalizedJsMove?.uci
        ? jsMoves.find((move) => move.uci === normalizedJsMove.uci) || null
        : null;
    const mode = options.fairyPrimary ? 'fairy_fork' : (options.allowHybrid ? 'hybrid' : 'shadow');

    if (!probe?.ok) {
        const metadata = {
            enabled: true,
            mode,
            shadowOnly: true,
            appliedToGame: false,
            artifact: probe?.artifact || 'singlethread',
            variant: probe?.variant || VARIANT_NAME,
            depth: probe?.depth || DEFAULT_DEPTH,
            fairyBestMove: null,
            fairyAccepted: false,
            fairyRejectedReason: probe?.errorCode || 'fairy_debug_probe_failed',
            fallbackUsed: true,
            fairyThinkMs: probe?.thinkMs ?? null,
            rootMovesAvailable: Array.isArray(probe?.rootMoves),
            rootMoveCount: Array.isArray(probe?.rootMoves) ? probe.rootMoves.length : 0,
            rootMoveThinkMs: probe?.rootMoveThinkMs ?? null,
            rootMovesError: probe?.rootMovesError || null,
            jsAiMove: normalizedJsMove?.uci || null,
            fairySelectedMove: fallbackMove?.uci || null,
            fairyMatchesJsMove: false,
            timeout: Boolean(probe?.timeout),
            errorCode: probe?.errorCode || null,
            hybridEligible: false,
            hybridApplied: false,
            hybridRejectedReason: probe?.errorCode || 'fairy_debug_probe_failed',
            fairyForkEnabled: Boolean(options.fairyPrimary),
            shadowMode: buildFailedProbeShadowModeMetadata(probe)
        };

        return { metadata: attachShadowLogMetadata(metadata, gameState), appliedMove: null, decision: null };
    }

    const decision = selectSafeTimurMoveFromFairyBestMove(gameState, probe.bestmove, {
        jsMoves,
        fallbackMove
    });
    const fairySelectedMove = decision.selectedMove?.uci || null;
    const fairyMatchesJsMove = Boolean(
        decision.accepted
        && normalizedJsMove?.uci
        && fairySelectedMove === normalizedJsMove.uci
    );
    const hybridDecision = buildHybridApplicationDecision(gameState, decision, normalizedJsMove, options);
    const hybridApplied = Boolean(hybridDecision.applied && hybridDecision.appliedMove);
    const shadowReport = buildFairyShadowModeReport(gameState, {
        jsMoves,
        nativeRootMoves: Array.isArray(probe.rootMoves) ? probe.rootMoves : null,
        nativeBestMove: probe.bestmove,
        fallbackMove
    });

    const metadata = {
        enabled: true,
        mode,
        shadowOnly: !hybridApplied,
        appliedToGame: hybridApplied,
        artifact: probe.artifact || 'singlethread',
        variant: probe.variant || VARIANT_NAME,
        depth: probe.depth || DEFAULT_DEPTH,
        fairyBestMove: decision.normalizedBestMove || probe.bestmove || null,
        fairyAccepted: Boolean(decision.accepted),
        fairyRejectedReason: decision.accepted ? null : decision.reason,
        fallbackUsed: !decision.accepted,
        fairyThinkMs: probe.thinkMs ?? null,
        rootMovesAvailable: Array.isArray(probe.rootMoves),
        rootMoveCount: Array.isArray(probe.rootMoves) ? probe.rootMoves.length : 0,
        rootMoveThinkMs: probe.rootMoveThinkMs ?? null,
        rootMovesError: probe.rootMovesError || null,
        jsAiMove: normalizedJsMove?.uci || null,
        fairySelectedMove,
        fairyMatchesJsMove,
        timeout: false,
        errorCode: null,
        hybridEligible: Boolean(hybridDecision.eligible),
        hybridApplied,
        hybridRejectedReason: hybridApplied ? null : hybridDecision.reason,
        fairyForkEnabled: Boolean(options.fairyPrimary),
        shadowMode: summarizeShadowModeReport(shadowReport)
    };

    return {
        metadata: attachShadowLogMetadata(metadata, gameState),
        appliedMove: hybridApplied ? hybridDecision.appliedMove : null,
        decision
    };
}

export function buildFairyShadowMetadataFromProbe(gameState, jsMove, probe) {
    return buildFairyProbeDecision(gameState, jsMove, probe, { allowHybrid: false }).metadata;
}

export async function finalizeFairyShadowProbe(gameState, jsMove, probePromise, options = {}) {
    return (await finalizeFairyDecisionProbe(gameState, jsMove, probePromise, {
        ...options,
        allowHybrid: false
    }))?.metadata || null;
}

export async function finalizeFairyDecisionProbe(gameState, jsMove, probePromise, options = {}) {
    if (!probePromise) return { metadata: null, appliedMove: null, decision: null };

    const timeoutMs = Math.max(100, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
    const probe = await Promise.race([probePromise, timeoutResult(timeoutMs)]);
    const fairyPrimary = Boolean(options.fairyPrimary && isFairyForkEnabled());
    return buildFairyProbeDecision(gameState, jsMove, probe, {
        ...options,
        fairyPrimary,
        allowHybrid: Boolean(fairyPrimary || (options.allowHybrid && isFairyHybridEnabled())),
        forceHybrid: Boolean(fairyPrimary || options.forceHybrid || isFairyHybridForced())
    });
}

if (hasBrowserRuntime()) {
    window.timurFairyDebug = {
        enable: () => setFairyDebugEnabled(true),
        disable: () => setFairyDebugEnabled(false),
        enableHybrid: (options = {}) => setFairyHybridEnabled(true, options),
        disableHybrid: () => setFairyHybridEnabled(false),
        enableFork: () => setFairyForkEnabled(true),
        disableFork: () => setFairyForkEnabled(false),
        status: () => ({
            enabled: isFairyDebugEnabled(),
            hybridEnabled: isFairyHybridEnabled(),
            hybridForced: isFairyHybridForced(),
            forkEnabled: isFairyForkEnabled(),
            depth: readDebugDepth(),
            storageKey: DEBUG_STORAGE_KEY,
            hybridStorageKey: HYBRID_STORAGE_KEY,
            forkStorageKey: FORK_STORAGE_KEY
        }),
        shadowLog: () => getFairyShadowLogEntries(),
        shadowReport: () => getFairyShadowLogReport(),
        clearShadowLog: () => clearFairyShadowLog()
    };
}
