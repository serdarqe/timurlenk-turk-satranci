import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAITimeContext } from '../src/ai/AITimeContext.js';
import { createBlackPerspectiveStateForWhiteAi } from '../src/ai/ai.worker.js';
import { GameState } from '../src/game/GameState.js';
import { createClockState, TIME_CONTROL_IDS } from '../src/game/TimeControls.js';
import { COLORS } from '../src/utils/constants.js';

function installLocalStorageMock() {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (key) => store.get(key) || null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear()
    };
}

test('ai time context carries untimed games safely', () => {
    const state = new GameState('medium');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.timeControl = TIME_CONTROL_IDS.NONE;
    state.clock = createClockState(TIME_CONTROL_IDS.NONE, COLORS.BLACK, 1_000);
    state.moveHistory = [{}, {}];

    const context = buildAITimeContext(state, 5_000);

    assert.equal(context.timeControl, TIME_CONTROL_IDS.NONE);
    assert.equal(context.isTimed, false);
    assert.equal(context.aiRemainingMs, null);
    assert.equal(context.playerRemainingMs, null);
    assert.equal(context.aiClockPressure, 'none');
    assert.equal(context.moveCount, 2);
    assert.equal(context.fullMoveNumber, 2);
});

test('ai time context exposes ai and player remaining time', () => {
    const state = new GameState('hard');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.timeControl = TIME_CONTROL_IDS.FIVE_MINUTES;
    state.clock = createClockState(TIME_CONTROL_IDS.FIVE_MINUTES, COLORS.BLACK, 1_000);
    state.moveHistory = Array.from({ length: 9 }, () => ({}));

    const context = buildAITimeContext(state, 31_000);

    assert.equal(context.timeControl, TIME_CONTROL_IDS.FIVE_MINUTES);
    assert.equal(context.isTimed, true);
    assert.equal(context.whiteRemainingMs, 300_000);
    assert.equal(context.blackRemainingMs, 270_000);
    assert.equal(context.aiRemainingMs, 270_000);
    assert.equal(context.playerRemainingMs, 300_000);
    assert.equal(context.sideToMoveRemainingMs, 270_000);
    assert.equal(context.opponentRemainingMs, 300_000);
    assert.equal(context.aiClockPressure, 'healthy');
    assert.equal(context.clockLeadMs, -30_000);
    assert.equal(context.fullMoveNumber, 5);
});

test('ai time context marks critical clock pressure', () => {
    const state = new GameState('hard');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.WHITE;
    state.timeControl = TIME_CONTROL_IDS.FIVE_MINUTES;
    state.clock = {
        timeControl: TIME_CONTROL_IDS.FIVE_MINUTES,
        whiteMs: 210_000,
        blackMs: 25_000,
        activeColor: COLORS.WHITE,
        running: true,
        lastTickAt: 1_000,
        expiredColor: null
    };

    const context = buildAITimeContext(state, 1_000);

    assert.equal(context.aiRemainingMs, 25_000);
    assert.equal(context.playerRemainingMs, 210_000);
    assert.equal(context.aiClockPressure, 'critical');
    assert.equal(context.playerClockPressure, 'healthy');
});

test('worker serialization includes time context for ai requests', async () => {
    installLocalStorageMock();
    const { serializeStateForWorker } = await import('../src/ai/AIEngine.js');
    const state = new GameState('medium');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.timeControl = TIME_CONTROL_IDS.FIFTEEN_MINUTES;
    state.clock = createClockState(TIME_CONTROL_IDS.FIFTEEN_MINUTES, COLORS.BLACK, 10_000);
    state.clock.running = false;

    const payload = serializeStateForWorker(state);

    assert.equal(payload.timeControl, TIME_CONTROL_IDS.FIFTEEN_MINUTES);
    assert.equal(payload.timeContext.timeControl, TIME_CONTROL_IDS.FIFTEEN_MINUTES);
    assert.equal(payload.timeContext.aiColor, COLORS.BLACK);
    assert.equal(payload.timeContext.playerColor, COLORS.WHITE);
    assert.equal(payload.timeContext.aiRemainingMs, 900_000);
});

test('worker serialization includes compact opening history for branch selection', async () => {
    installLocalStorageMock();
    const { serializeStateForWorker } = await import('../src/ai/AIEngine.js');
    const state = new GameState('hard');
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.moveHistory = [{
        index: 1,
        color: COLORS.WHITE,
        from: { row: 7, col: 4 },
        to: { row: 6, col: 4 }
    }];

    const payload = serializeStateForWorker(state);

    assert.equal(payload.openingHistory.length, 1);
    assert.deepEqual(payload.openingHistory[0], {
        index: 1,
        color: COLORS.WHITE,
        fromRow: 7,
        fromCol: 4,
        toRow: 6,
        toCol: 4
    });
});

test('worker serialization includes ai bot id for bot profile selection', async () => {
    installLocalStorageMock();
    const { serializeStateForWorker } = await import('../src/ai/AIEngine.js');
    const state = new GameState('medium');
    state.aiPersonaId = 'ulu_bey';
    state.aiBotId = 'bot_15_aksak_demir';

    const payload = serializeStateForWorker(state);

    assert.equal(payload.aiBotId, 'bot_15_aksak_demir');
});

test('white ai mirror keeps time context aligned to black-perspective search', () => {
    const state = new GameState('hard');
    state.aiColor = COLORS.WHITE;
    state.playerColor = COLORS.BLACK;
    state.currentTurn = COLORS.WHITE;
    state.timeControl = TIME_CONTROL_IDS.FIVE_MINUTES;
    state.aiTimeContext = {
        timeControl: TIME_CONTROL_IDS.FIVE_MINUTES,
        isTimed: true,
        activeColor: COLORS.WHITE,
        currentTurn: COLORS.WHITE,
        aiColor: COLORS.WHITE,
        playerColor: COLORS.BLACK,
        whiteRemainingMs: 120_000,
        blackRemainingMs: 210_000,
        aiRemainingMs: 120_000,
        playerRemainingMs: 210_000,
        whiteTimeRatio: 0.4,
        blackTimeRatio: 0.7,
        aiTimeRatio: 0.4,
        playerTimeRatio: 0.7
    };

    const mirrored = createBlackPerspectiveStateForWhiteAi(state);

    assert.equal(mirrored.aiTimeContext.aiColor, COLORS.BLACK);
    assert.equal(mirrored.aiTimeContext.playerColor, COLORS.WHITE);
    assert.equal(mirrored.aiTimeContext.currentTurn, COLORS.BLACK);
    assert.equal(mirrored.aiTimeContext.blackRemainingMs, 120_000);
    assert.equal(mirrored.aiTimeContext.whiteRemainingMs, 210_000);
    assert.equal(mirrored.aiTimeContext.aiRemainingMs, 120_000);
    assert.equal(mirrored.aiTimeContext.playerRemainingMs, 210_000);
});

test('white ai mirror flips opening history for branch selection', () => {
    const state = new GameState('hard');
    state.aiColor = COLORS.WHITE;
    state.playerColor = COLORS.BLACK;
    state.currentTurn = COLORS.WHITE;
    state.openingHistory = [{
        index: 1,
        color: COLORS.BLACK,
        fromRow: 1,
        fromCol: 4,
        toRow: 2,
        toCol: 4
    }];

    const mirrored = createBlackPerspectiveStateForWhiteAi(state);

    assert.deepEqual(mirrored.openingHistory[0], {
        index: 1,
        color: COLORS.WHITE,
        fromRow: 8,
        fromCol: 4,
        toRow: 7,
        toCol: 4
    });
});
