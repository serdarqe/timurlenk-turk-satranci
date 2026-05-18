import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAITimeBudget, getTimeAdjustedSearchPlan } from '../src/ai/AITimeBudget.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';
import { GameState } from '../src/game/GameState.js';
import { King, Rook } from '../src/game/PieceFactory.js';
import { TIME_CONTROL_IDS } from '../src/game/TimeControls.js';
import { COLORS } from '../src/utils/constants.js';

function makeState({ timeControl = TIME_CONTROL_IDS.NONE, pieces = 20, moveCount = 16, aiPressure = 'healthy', playerPressure = 'healthy' } = {}) {
    const state = new GameState('hard');
    state.timeControl = timeControl;
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.board.pieces = Array.from({ length: pieces }, (_, index) => ({ type: 'stub', color: index % 2 ? COLORS.WHITE : COLORS.BLACK }));
    state.aiTimeContext = {
        timeControl,
        isTimed: timeControl !== TIME_CONTROL_IDS.NONE,
        initialMs: timeControl === TIME_CONTROL_IDS.FIVE_MINUTES ? 300_000 : 900_000,
        aiColor: COLORS.BLACK,
        playerColor: COLORS.WHITE,
        currentTurn: COLORS.BLACK,
        aiRemainingMs: aiPressure === 'critical' ? 25_000 : 240_000,
        playerRemainingMs: playerPressure === 'critical' ? 25_000 : 240_000,
        aiClockPressure: aiPressure,
        playerClockPressure: playerPressure,
        sideToMoveClockPressure: aiPressure,
        moveCount
    };
    return state;
}

function makeDecisiveState({ difficulty = 'hard', timeControl = TIME_CONTROL_IDS.FIFTEEN_MINUTES, moveCount = 24 } = {}) {
    const state = new GameState(difficulty);
    state.aiColor = COLORS.BLACK;
    state.playerColor = COLORS.WHITE;
    state.currentTurn = COLORS.BLACK;
    state.timeControl = timeControl;
    state.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    state.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    state.board.setPiece(0, 5, new Rook(COLORS.BLACK, 0, 5));
    state.aiTimeContext = {
        timeControl,
        isTimed: timeControl !== TIME_CONTROL_IDS.NONE,
        aiClockPressure: 'healthy',
        playerClockPressure: 'healthy',
        sideToMoveClockPressure: 'healthy',
        moveCount
    };
    return state;
}

test('5 dakika modu hard AI aramasini daha cevik hale getirir', () => {
    const state = makeState({ timeControl: TIME_CONTROL_IDS.FIVE_MINUTES, pieces: 20, moveCount: 18 });
    const plan = getTimeAdjustedSearchPlan(state, getAIProfile('hard'));

    assert.equal(plan.baseDepth, 5);
    assert.equal(plan.depth, 4);
    assert.ok(plan.budget.maxThinkMs <= 520);
    assert.ok(plan.profile.search.branchMoveLimit < getAIProfile('hard').search.branchMoveLimit);
});

test('30 dakika modu orta oyun sonunda daha derin dusunmeye izin verir', () => {
    const state = makeState({ timeControl: TIME_CONTROL_IDS.THIRTY_MINUTES, pieces: 6, moveCount: 42 });
    const plan = getTimeAdjustedSearchPlan(state, getAIProfile('medium'));

    assert.equal(plan.baseDepth, 4);
    assert.equal(plan.depth, 5);
    assert.ok(plan.budget.reasons.includes('endgame-precision'));
    assert.ok(plan.profile.search.branchMoveLimit > getAIProfile('medium').search.branchMoveLimit);
});

test('kritik kendi saatinde AI derinligi ve aday limitini kisar', () => {
    const state = makeState({
        timeControl: TIME_CONTROL_IDS.FIFTEEN_MINUTES,
        pieces: 20,
        moveCount: 26,
        aiPressure: 'critical',
        playerPressure: 'healthy'
    });
    const plan = getTimeAdjustedSearchPlan(state, getAIProfile('hard'));

    assert.equal(plan.depth, 4);
    assert.equal(plan.budget.ownClockPressure, 'critical');
    assert.equal(plan.budget.opponentClockPressure, 'healthy');
    assert.ok(plan.budget.maxThinkMs < 500);
    assert.ok(plan.profile.search.rootMoveLimit < getAIProfile('hard').search.rootMoveLimit);
    assert.ok(plan.budget.reasons.includes('own-clock-critical'));
});

test('zaman baglami yoksa eski adaptif derinlik korunur', () => {
    const state = new GameState('hard');
    state.board.pieces = Array.from({ length: 20 }, () => ({}));

    const plan = getTimeAdjustedSearchPlan(state, getAIProfile('hard'));

    assert.equal(plan.baseDepth, 5);
    assert.equal(plan.depth, 5);
});

test('acilista sure baglami varsa AI kitabi hizli takip edecek butce alir', () => {
    const state = makeState({ timeControl: TIME_CONTROL_IDS.NONE, pieces: 30, moveCount: 2 });
    const budget = calculateAITimeBudget(state, getAIProfile('medium'));

    assert.equal(budget.phase, 'opening');
    assert.ok(budget.maxThinkMs < 650);
    assert.ok(budget.reasons.includes('opening-fast-play'));
});

test('kritik sah pozisyonu sure varsa arama butcesini yukseltir', () => {
    const quietState = new GameState('hard');
    quietState.aiColor = COLORS.BLACK;
    quietState.playerColor = COLORS.WHITE;
    quietState.currentTurn = COLORS.BLACK;
    quietState.timeControl = TIME_CONTROL_IDS.FIVE_MINUTES;
    quietState.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    quietState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    quietState.aiTimeContext = {
        timeControl: TIME_CONTROL_IDS.FIVE_MINUTES,
        isTimed: true,
        aiClockPressure: 'healthy',
        playerClockPressure: 'healthy',
        sideToMoveClockPressure: 'healthy',
        moveCount: 24
    };

    const decisiveState = new GameState('hard');
    decisiveState.aiColor = COLORS.BLACK;
    decisiveState.playerColor = COLORS.WHITE;
    decisiveState.currentTurn = COLORS.BLACK;
    decisiveState.timeControl = TIME_CONTROL_IDS.FIVE_MINUTES;
    decisiveState.board.setPiece(9, 10, new King(COLORS.BLACK, 9, 10));
    decisiveState.board.setPiece(0, 0, new King(COLORS.WHITE, 0, 0));
    decisiveState.board.setPiece(0, 5, new Rook(COLORS.BLACK, 0, 5));
    decisiveState.aiTimeContext = { ...quietState.aiTimeContext };

    const quietPlan = getTimeAdjustedSearchPlan(quietState, getAIProfile('hard'));
    const decisivePlan = getTimeAdjustedSearchPlan(decisiveState, getAIProfile('hard'));

    assert.ok(decisivePlan.depth > quietPlan.depth);
    assert.ok(decisivePlan.budget.maxThinkMs > quietPlan.budget.maxThinkMs);
    assert.ok(decisivePlan.budget.reasons.includes('position-decisive'));
});

test('zorluk sure zekasi kritik pozisyonda kademeli davranir', () => {
    const easyPlan = getTimeAdjustedSearchPlan(makeDecisiveState({ difficulty: 'easy' }), getAIProfile('easy'));
    const mediumPlan = getTimeAdjustedSearchPlan(makeDecisiveState({ difficulty: 'medium' }), getAIProfile('medium'));
    const hardPlan = getTimeAdjustedSearchPlan(makeDecisiveState({ difficulty: 'hard' }), getAIProfile('hard'));

    assert.ok(easyPlan.depth <= 2);
    assert.ok(mediumPlan.depth > easyPlan.depth);
    assert.ok(hardPlan.depth > mediumPlan.depth);
    assert.ok(easyPlan.budget.reasons.includes('easy-limited-time-awareness'));
    assert.ok(mediumPlan.budget.reasons.includes('medium-balanced-time-awareness'));
    assert.ok(hardPlan.budget.reasons.includes('hard-strategic-time-awareness'));
});

test('kolay mod sakin oyunda bazen fazla bekler bazen acele eder', () => {
    const overthinkPlan = getTimeAdjustedSearchPlan(
        makeState({ timeControl: TIME_CONTROL_IDS.FIFTEEN_MINUTES, pieces: 20, moveCount: 17 }),
        getAIProfile('easy')
    );
    const rushPlan = getTimeAdjustedSearchPlan(
        makeState({ timeControl: TIME_CONTROL_IDS.FIFTEEN_MINUTES, pieces: 20, moveCount: 19 }),
        getAIProfile('easy')
    );

    assert.ok(overthinkPlan.budget.maxThinkMs > 160);
    assert.ok(rushPlan.budget.maxThinkMs < 160);
    assert.ok(overthinkPlan.budget.reasons.includes('easy-overthinks-quiet-tempo'));
    assert.ok(rushPlan.budget.reasons.includes('easy-rushes-tempo'));
});

test('AI karakterleri ayni sure modunda farkli zaman stili uygular', () => {
    const decisiveState = makeDecisiveState({ difficulty: 'hard', timeControl: TIME_CONTROL_IDS.FIFTEEN_MINUTES, moveCount: 24 });
    const quietState = makeState({ timeControl: TIME_CONTROL_IDS.FIFTEEN_MINUTES, pieces: 20, moveCount: 20 });

    const timurPlan = getTimeAdjustedSearchPlan(decisiveState, getAIProfile('hard', 'timur'));
    const uluBeyPlan = getTimeAdjustedSearchPlan(decisiveState, getAIProfile('hard', 'ulu_bey'));
    const beyazidPlan = getTimeAdjustedSearchPlan(quietState, getAIProfile('hard', 'beyazid'));
    const sarayPlan = getTimeAdjustedSearchPlan(quietState, getAIProfile('hard', 'saray_veziri'));

    assert.ok(timurPlan.budget.reasons.includes('persona-conqueror-clock'));
    assert.ok(uluBeyPlan.budget.maxThinkMs > timurPlan.budget.maxThinkMs);
    assert.ok(uluBeyPlan.budget.reasons.includes('persona-calculated-clock'));
    assert.ok(beyazidPlan.budget.maxThinkMs < getTimeAdjustedSearchPlan(quietState, getAIProfile('hard')).budget.maxThinkMs);
    assert.ok(beyazidPlan.budget.reasons.includes('persona-tempo-attacker-clock'));
    assert.ok(sarayPlan.profile.search.branchMoveLimit >= getTimeAdjustedSearchPlan(quietState, getAIProfile('hard')).profile.search.branchMoveLimit);
    assert.ok(sarayPlan.budget.reasons.includes('persona-defensive-clock'));
});
