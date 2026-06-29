import { COLORS } from '../utils/constants.js';

export const TIME_CONTROL_IDS = Object.freeze({
    NONE: 'none',
    FIVE_MINUTES: '5m',
    FIFTEEN_MINUTES: '15m',
    THIRTY_MINUTES: '30m',
});

export const TIME_CONTROLS = Object.freeze({
    [TIME_CONTROL_IDS.NONE]: Object.freeze({
        id: TIME_CONTROL_IDS.NONE,
        labelKey: 'time.none',
        minutes: null,
        initialMs: null,
        incrementMs: 0,
    }),
    [TIME_CONTROL_IDS.FIVE_MINUTES]: Object.freeze({
        id: TIME_CONTROL_IDS.FIVE_MINUTES,
        labelKey: 'time.five_minutes',
        minutes: 5,
        initialMs: 5 * 60 * 1000,
        incrementMs: 0,
    }),
    [TIME_CONTROL_IDS.FIFTEEN_MINUTES]: Object.freeze({
        id: TIME_CONTROL_IDS.FIFTEEN_MINUTES,
        labelKey: 'time.fifteen_minutes',
        minutes: 15,
        initialMs: 15 * 60 * 1000,
        incrementMs: 0,
    }),
    [TIME_CONTROL_IDS.THIRTY_MINUTES]: Object.freeze({
        id: TIME_CONTROL_IDS.THIRTY_MINUTES,
        labelKey: 'time.thirty_minutes',
        minutes: 30,
        initialMs: 30 * 60 * 1000,
        incrementMs: 0,
    }),
});

export function getTimeControl(id = TIME_CONTROL_IDS.NONE) {
    return TIME_CONTROLS[id] || TIME_CONTROLS[TIME_CONTROL_IDS.NONE];
}

export function hasClock(clock) {
    return Number.isFinite(clock?.whiteMs) && Number.isFinite(clock?.blackMs);
}

export function createClockState(timeControlId = TIME_CONTROL_IDS.NONE, activeColor = COLORS.WHITE, now = Date.now()) {
    const timeControl = getTimeControl(timeControlId);
    if (!Number.isFinite(timeControl.initialMs)) {
        return {
            timeControl: TIME_CONTROL_IDS.NONE,
            whiteMs: null,
            blackMs: null,
            activeColor,
            running: false,
            lastTickAt: null,
            expiredColor: null,
        };
    }

    return {
        timeControl: timeControl.id,
        whiteMs: timeControl.initialMs,
        blackMs: timeControl.initialMs,
        activeColor,
        running: true,
        lastTickAt: now,
        expiredColor: null,
    };
}

export function getClockRemainingMs(clock, color, now = Date.now()) {
    if (!hasClock(clock)) {
        return null;
    }

    const key = color === COLORS.BLACK ? 'blackMs' : 'whiteMs';
    let remainingMs = clock[key];

    if (clock.running && clock.activeColor === color && Number.isFinite(clock.lastTickAt)) {
        remainingMs -= Math.max(0, now - clock.lastTickAt);
    }

    return Math.max(0, Math.round(remainingMs));
}

export function commitActiveClock(clock, now = Date.now()) {
    if (!hasClock(clock) || !clock.running || !clock.activeColor) {
        return clock;
    }

    const key = clock.activeColor === COLORS.BLACK ? 'blackMs' : 'whiteMs';
    clock[key] = getClockRemainingMs(clock, clock.activeColor, now);
    clock.lastTickAt = now;

    if (clock[key] <= 0) {
        clock.expiredColor = clock.activeColor;
        clock.running = false;
    }

    return clock;
}

export function switchClockAfterMove(clock, nextActiveColor, timeControlId = TIME_CONTROL_IDS.NONE, now = Date.now()) {
    if (!hasClock(clock)) {
        return clock;
    }

    const movedColor = clock.activeColor;
    commitActiveClock(clock, now);

    if (clock.expiredColor) {
        return clock;
    }

    const timeControl = getTimeControl(timeControlId || clock.timeControl);
    const movedKey = movedColor === COLORS.BLACK ? 'blackMs' : 'whiteMs';
    clock[movedKey] += timeControl.incrementMs || 0;
    clock.activeColor = nextActiveColor;
    clock.lastTickAt = now;
    clock.running = true;
    return clock;
}

export function stopClock(clock, now = Date.now()) {
    if (!clock) {
        return clock;
    }

    commitActiveClock(clock, now);
    clock.running = false;
    return clock;
}

export function formatClockMs(ms) {
    if (!Number.isFinite(ms)) {
        return '--:--';
    }

    const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
