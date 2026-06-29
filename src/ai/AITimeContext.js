import { COLORS } from '../utils/constants.js';
import {
    getClockRemainingMs,
    getTimeControl,
    hasClock,
    TIME_CONTROL_IDS
} from '../game/TimeControls.js';

function getOppositeColor(color) {
    return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function clampRatio(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(1, value));
}

function getRemainingForColor(color, whiteRemainingMs, blackRemainingMs) {
    return color === COLORS.BLACK ? blackRemainingMs : whiteRemainingMs;
}

function getRatio(remainingMs, initialMs) {
    if (!Number.isFinite(remainingMs) || !Number.isFinite(initialMs) || initialMs <= 0) {
        return null;
    }

    return clampRatio(remainingMs / initialMs);
}

function classifyPressure(remainingMs, initialMs) {
    if (!Number.isFinite(remainingMs) || !Number.isFinite(initialMs) || initialMs <= 0) {
        return 'none';
    }

    const ratio = remainingMs / initialMs;
    if (remainingMs <= 30_000 || ratio <= 0.10) return 'critical';
    if (remainingMs <= 60_000 || ratio <= 0.20) return 'low';
    if (ratio <= 0.45) return 'medium';
    return 'healthy';
}

export function buildAITimeContext(gameState, now = Date.now()) {
    const aiColor = gameState?.aiColor || COLORS.BLACK;
    const playerColor = gameState?.playerColor || getOppositeColor(aiColor);
    const currentTurn = gameState?.currentTurn || COLORS.WHITE;
    const timeControl = getTimeControl(gameState?.timeControl || gameState?.clock?.timeControl || TIME_CONTROL_IDS.NONE);
    const clock = gameState?.clock || null;
    const isTimed = hasClock(clock) && Number.isFinite(timeControl.initialMs);
    const moveCount = Array.isArray(gameState?.moveHistory) ? gameState.moveHistory.length : 0;

    const whiteRemainingMs = isTimed ? getClockRemainingMs(clock, COLORS.WHITE, now) : null;
    const blackRemainingMs = isTimed ? getClockRemainingMs(clock, COLORS.BLACK, now) : null;
    const aiRemainingMs = getRemainingForColor(aiColor, whiteRemainingMs, blackRemainingMs);
    const playerRemainingMs = getRemainingForColor(playerColor, whiteRemainingMs, blackRemainingMs);
    const sideToMoveRemainingMs = getRemainingForColor(currentTurn, whiteRemainingMs, blackRemainingMs);
    const opponentColor = getOppositeColor(currentTurn);
    const opponentRemainingMs = getRemainingForColor(opponentColor, whiteRemainingMs, blackRemainingMs);
    const initialMs = Number.isFinite(timeControl.initialMs) ? timeControl.initialMs : null;

    return {
        timeControl: timeControl.id,
        isTimed,
        initialMs,
        incrementMs: timeControl.incrementMs || 0,
        activeColor: clock?.activeColor || currentTurn,
        currentTurn,
        aiColor,
        playerColor,
        whiteRemainingMs,
        blackRemainingMs,
        aiRemainingMs,
        playerRemainingMs,
        sideToMoveRemainingMs,
        opponentRemainingMs,
        whiteTimeRatio: getRatio(whiteRemainingMs, initialMs),
        blackTimeRatio: getRatio(blackRemainingMs, initialMs),
        aiTimeRatio: getRatio(aiRemainingMs, initialMs),
        playerTimeRatio: getRatio(playerRemainingMs, initialMs),
        aiClockPressure: classifyPressure(aiRemainingMs, initialMs),
        playerClockPressure: classifyPressure(playerRemainingMs, initialMs),
        sideToMoveClockPressure: classifyPressure(sideToMoveRemainingMs, initialMs),
        clockLeadMs: Number.isFinite(aiRemainingMs) && Number.isFinite(playerRemainingMs)
            ? aiRemainingMs - playerRemainingMs
            : null,
        moveCount,
        fullMoveNumber: Math.floor(moveCount / 2) + 1
    };
}
