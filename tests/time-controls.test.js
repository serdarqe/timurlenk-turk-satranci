import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TIME_CONTROL_IDS,
    createClockState,
    formatClockMs,
    getClockRemainingMs,
    switchClockAfterMove
} from '../src/game/TimeControls.js';
import { COLORS } from '../src/utils/constants.js';

test('createClockState creates disabled clock for untimed games', () => {
    const clock = createClockState(TIME_CONTROL_IDS.NONE, COLORS.WHITE, 1000);

    assert.equal(clock.running, false);
    assert.equal(clock.whiteMs, null);
    assert.equal(formatClockMs(clock.whiteMs), '--:--');
});

test('clock decreases active side and switches after move', () => {
    const clock = createClockState(TIME_CONTROL_IDS.FIVE_MINUTES, COLORS.WHITE, 1000);

    assert.equal(getClockRemainingMs(clock, COLORS.WHITE, 31_000), 270_000);
    switchClockAfterMove(clock, COLORS.BLACK, TIME_CONTROL_IDS.FIVE_MINUTES, 31_000);

    assert.equal(clock.whiteMs, 270_000);
    assert.equal(clock.activeColor, COLORS.BLACK);
    assert.equal(getClockRemainingMs(clock, COLORS.BLACK, 61_000), 270_000);
});

test('formatClockMs rounds up visible seconds', () => {
    assert.equal(formatClockMs(300_000), '5:00');
    assert.equal(formatClockMs(29_200), '0:30');
});
