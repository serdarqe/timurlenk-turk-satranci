import test from 'node:test';
import assert from 'node:assert/strict';

import { getAIProfile } from '../src/ai/AIProfiles.js';
import {
    applyDecisionStyleToCandidates,
    scoreCandidateDecisionStyle
} from '../src/ai/AIStylePolicy.js';
import { COLORS, PIECE_TYPES } from '../src/utils/constants.js';

function makeCandidate(overrides = {}) {
    return {
        score: 100,
        move: 'candidate',
        repetitionRisk: { severity: 0 },
        tacticalRisk: { dangerLevel: 0 },
        staticExchange: { score: 0, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        endgamePlan: { score: 0, reasons: [] },
        opponentReplyThreat: { bestCaptureValue: 0 },
        clockPressure: { bonus: 0 },
        metadata: {
            captures: false,
            givesCheck: false,
            opponentMobility: 8
        },
        ...overrides,
        metadata: {
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            ...(overrides.metadata || {})
        }
    };
}

test('difficulty style keeps easy forgiving but hard rejects risky material grab', () => {
    const riskyGrab = makeCandidate({
        score: 120,
        move: 'greedy-grab',
        repetitionRisk: { severity: 2 },
        tacticalRisk: { dangerLevel: 2 },
        staticExchange: { score: -35, favorable: false, captures: true, captureValue: 40, recaptureRisk: 75 },
        opponentReplyThreat: { bestCaptureValue: 70 },
        metadata: { captures: true, givesCheck: false, opponentMobility: 7 }
    });
    const quietSafe = makeCandidate({
        score: 112,
        move: 'quiet-safe'
    });

    const easyRanked = applyDecisionStyleToCandidates([riskyGrab, quietSafe], getAIProfile('easy'));
    const hardRanked = applyDecisionStyleToCandidates([riskyGrab, quietSafe], getAIProfile('hard'));

    assert.equal(easyRanked[0].move, 'greedy-grab');
    assert.equal(hardRanked[0].move, 'quiet-safe');
    assert.ok(hardRanked[1].styleAdjustment.score < easyRanked[0].styleAdjustment.score);
});

test('personas adjust the same candidates toward their own decision style', () => {
    const pressureMove = makeCandidate({
        score: 100,
        move: 'force-pressure',
        tacticalRisk: { dangerLevel: 1 },
        opponentReplyThreat: { bestCaptureValue: 24 },
        metadata: { captures: true, givesCheck: true, opponentMobility: 2 }
    });
    const safeMove = makeCandidate({
        score: 100,
        move: 'keep-formation'
    });

    const timurPressure = scoreCandidateDecisionStyle(pressureMove, getAIProfile('medium', 'timur'));
    const timurSafe = scoreCandidateDecisionStyle(safeMove, getAIProfile('medium', 'timur'));
    const beyazidPressure = scoreCandidateDecisionStyle(pressureMove, getAIProfile('medium', 'beyazid'));
    const beyazidSafe = scoreCandidateDecisionStyle(safeMove, getAIProfile('medium', 'beyazid'));
    const sarayPressure = scoreCandidateDecisionStyle(pressureMove, getAIProfile('medium', 'saray_veziri'));
    const saraySafe = scoreCandidateDecisionStyle(safeMove, getAIProfile('medium', 'saray_veziri'));

    assert.ok(timurSafe.score > timurPressure.score);
    assert.ok(timurPressure.reasons.includes('style-risk-penalty'));
    assert.ok(beyazidSafe.score > beyazidPressure.score);
    assert.ok(beyazidPressure.reasons.includes('style-pressure'));
    assert.ok(beyazidPressure.reasons.includes('style-beyazid-risk-control'));
    assert.ok(beyazidSafe.score < saraySafe.score);
    assert.ok(saraySafe.score > sarayPressure.score);
    assert.ok(sarayPressure.reasons.includes('style-risk-penalty'));
});

test('persona profiles expose clear decision style knobs', () => {
    const beyazid = getAIProfile('medium', 'beyazid');
    const uluBey = getAIProfile('medium', 'ulu_bey');
    const sarayVeziri = getAIProfile('medium', 'saray_veziri');

    assert.ok(beyazid.decisionStyle.riskTolerance > sarayVeziri.decisionStyle.riskTolerance);
    assert.ok(beyazid.decisionStyle.tempo > uluBey.decisionStyle.tempo);
    assert.ok(uluBey.decisionStyle.precision > beyazid.decisionStyle.precision);
    assert.ok(sarayVeziri.decisionStyle.safety > beyazid.decisionStyle.safety);
});

test('hard Timur converts a winning position with forcing pressure over quiet material play', () => {
    const quietMaterial = makeCandidate({
        score: 142,
        move: 'quiet-material-collect',
        staticExchange: { score: 18, favorable: true, captures: true, captureValue: 30, recaptureRisk: 0 },
        metadata: { isWinningSide: true, captures: true, givesCheck: false, opponentMobility: 9 }
    });
    const forcingNet = makeCandidate({
        score: 118,
        move: 'force-royal-net',
        metadata: { isWinningSide: true, captures: false, givesCheck: true, opponentMobility: 2 }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietMaterial, forcingNet],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'force-royal-net');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-conversion'));
});

test('hard Timur penalizes quiet drift when already winning and the opponent still has mobility', () => {
    const quietDrift = makeCandidate({
        score: 100,
        move: 'quiet-winning-drift',
        metadata: { isWinningSide: true, captures: false, givesCheck: false, opponentMobility: 9 }
    });

    const adjustment = scoreCandidateDecisionStyle(quietDrift, getAIProfile('hard', 'timur'));

    assert.ok(adjustment.components.conversion < 0);
    assert.ok(adjustment.score < 0);
});

test('winning conversion pressure scales from easy to medium to hard', () => {
    const quietMaterial = makeCandidate({
        score: 150,
        move: 'quiet-material-collect',
        staticExchange: { score: 18, favorable: true, captures: true, captureValue: 30, recaptureRisk: 0 },
        metadata: { isWinningSide: true, captures: true, givesCheck: false, opponentMobility: 9 }
    });
    const forcingNet = makeCandidate({
        score: 110,
        move: 'force-royal-net',
        metadata: { isWinningSide: true, captures: false, givesCheck: true, opponentMobility: 2 }
    });

    const easyRanked = applyDecisionStyleToCandidates([quietMaterial, forcingNet], getAIProfile('easy'));
    const mediumRanked = applyDecisionStyleToCandidates([quietMaterial, forcingNet], getAIProfile('medium'));
    const hardRanked = applyDecisionStyleToCandidates([quietMaterial, forcingNet], getAIProfile('hard', 'timur'));

    assert.equal(easyRanked[0].move, 'quiet-material-collect');
    assert.equal(mediumRanked[0].move, 'force-royal-net');
    assert.equal(hardRanked[0].move, 'force-royal-net');
    assert.ok(
        easyRanked.find((candidate) => candidate.move === 'force-royal-net').styleAdjustment.components.conversion
        < mediumRanked.find((candidate) => candidate.move === 'force-royal-net').styleAdjustment.components.conversion
    );
});

test('medium conversion stays below hard when the quiet move has a large base lead', () => {
    const quietMaterial = makeCandidate({
        score: 176,
        move: 'quiet-large-base-lead',
        staticExchange: { score: 24, favorable: true, captures: true, captureValue: 40, recaptureRisk: 0 },
        metadata: { isWinningSide: true, captures: true, givesCheck: false, opponentMobility: 8 }
    });
    const forcingNet = makeCandidate({
        score: 110,
        move: 'force-royal-net',
        metadata: { isWinningSide: true, captures: false, givesCheck: true, opponentMobility: 2 }
    });

    const mediumRanked = applyDecisionStyleToCandidates([quietMaterial, forcingNet], getAIProfile('medium'));
    const hardRanked = applyDecisionStyleToCandidates([quietMaterial, forcingNet], getAIProfile('hard', 'timur'));

    assert.equal(mediumRanked[0].move, 'quiet-large-base-lead');
    assert.equal(hardRanked[0].move, 'force-royal-net');
});

test('hard winning side rejects repetition draw even when raw score is high', () => {
    const repeatLoop = makeCandidate({
        score: 520,
        move: 'repeat-winning-loop',
        repetitionRisk: {
            severity: 7,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            moveCount: 72,
            planProgress: 0,
            planDrift: 18
        }
    });
    const progressNet = makeCandidate({
        score: 170,
        move: 'force-progress-net',
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            moveCount: 72,
            planProgress: 18,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([repeatLoop, progressNet], getAIProfile('hard', 'timur'));

    assert.equal(ranked[0].move, 'force-progress-net');
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-winning-repetition-avoidance'));
});

test('hard classic late route repetition gets a strong loop-breaking penalty', () => {
    const routeLoop = makeCandidate({
        score: 100,
        move: 'classic-hard-route-loop',
        repetitionRisk: {
            severity: 1,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: false,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            moveCount: 188,
            planProgress: 0,
            planDrift: 24
        }
    });

    const adjustment = scoreCandidateDecisionStyle(routeLoop, getAIProfile('hard', 'timur'));

    assert.ok(adjustment.components.repetition <= -420);
    assert.ok(adjustment.reasons.includes('style-winning-repetition-avoidance'));
});

test('hard black side pushes a winning net instead of quiet drift', () => {
    const blackQuietDrift = makeCandidate({
        score: 600,
        move: {
            id: 'black-quiet-drift',
            piece: { type: PIECE_TYPES.ROOK, color: COLORS.BLACK, row: 2, col: 5 },
            move: { row: 2, col: 6 }
        },
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: false,
            opponentMobility: 10,
            moveCount: 104,
            planProgress: 0,
            planDrift: 20
        }
    });
    const blackForcingNet = makeCandidate({
        score: 170,
        move: {
            id: 'black-force-net',
            piece: { type: PIECE_TYPES.ROOK, color: COLORS.BLACK, row: 2, col: 5 },
            move: { row: 7, col: 5 }
        },
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: true,
            opponentMobility: 1,
            moveCount: 104,
            planProgress: 22,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [blackQuietDrift, blackForcingNet],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move.id, 'black-force-net');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-black-conversion'));
});

test('hard Beyazid breaks winning repetition instead of looping attacks', () => {
    const repeatedAttack = makeCandidate({
        score: 760,
        move: 'beyazid-repeat-attack',
        repetitionRisk: {
            severity: 2,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            moveCount: 92,
            planProgress: 0,
            planDrift: 18
        }
    });
    const tempoBreak = makeCandidate({
        score: 190,
        move: 'beyazid-tempo-break',
        metadata: {
            isWinningSide: true,
            captures: true,
            givesCheck: true,
            opponentMobility: 2,
            moveCount: 92,
            planProgress: 18,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [repeatedAttack, tempoBreak],
        getAIProfile('hard', 'beyazid')
    );

    assert.equal(ranked[0].move, 'beyazid-tempo-break');
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-persona-repeat-break'));
});

test('hard style rejects a material gain that gives back a bigger reply', () => {
    const poisonedCapture = makeCandidate({
        score: 132,
        move: 'poisoned-capture',
        staticExchange: { score: -45, favorable: false, captures: true, captureValue: 60, recaptureRisk: 105 },
        opponentReplyThreat: { bestCaptureValue: 105 },
        metadata: { captures: true, givesCheck: false, opponentMobility: 8 }
    });
    const strategicSafe = makeCandidate({
        score: 112,
        move: 'strategic-safe',
        metadata: { captures: false, givesCheck: false, opponentMobility: 5 }
    });

    const ranked = applyDecisionStyleToCandidates([poisonedCapture, strategicSafe], getAIProfile('hard', 'timur'));

    assert.equal(ranked[0].move, 'strategic-safe');
    assert.ok(ranked[1].styleAdjustment.components.risk < -60);
});

test('book trust turns into penalty when an opening move carries tactical debt', () => {
    const unsafeBook = makeCandidate({
        score: 100,
        move: { openingBook: true },
        staticExchange: { score: -35, favorable: false, captures: false, captureValue: 0, recaptureRisk: 80 },
        opponentReplyThreat: { bestCaptureValue: 100 },
        tacticalRisk: { dangerLevel: 1 }
    });

    const adjustment = scoreCandidateDecisionStyle(unsafeBook, getAIProfile('hard'));

    assert.ok(adjustment.components.opening < 0);
    assert.ok(adjustment.reasons.includes('style-opening-risk'));
});

test('opening discipline penalizes unsupported early piece raids', () => {
    const unsupportedRaid = makeCandidate({
        score: 152,
        move: {
            piece: { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK, row: 1, col: 7, hasMoved: true },
            move: { row: 4, col: 5 }
        },
        staticExchange: { score: 10, favorable: true, captures: true, captureValue: 10, recaptureRisk: 0 },
        metadata: {
            moveCount: 8,
            captures: true,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 0,
            planProgress: 10,
            planDrift: 4
        }
    });
    const safeDevelopment = makeCandidate({
        score: 120,
        move: {
            piece: { type: PIECE_TYPES.CAMEL, color: COLORS.BLACK, row: 1, col: 9, hasMoved: false },
            move: { row: 2, col: 8 }
        },
        staticExchange: { score: 4, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        metadata: {
            moveCount: 8,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 1,
            planProgress: 14,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([unsupportedRaid, safeDevelopment], getAIProfile('hard'));

    assert.equal(ranked[0].move, safeDevelopment.move);
    assert.ok(ranked[1].styleAdjustment.components.opening < -30);
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-opening-risk'));
});

test('opening discipline rejects poisoned low-value capture in medium profile', () => {
    const poisonedPawn = makeCandidate({
        score: 210,
        move: {
            piece: { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK, row: 2, col: 5, hasMoved: true },
            move: { row: 5, col: 4 }
        },
        tacticalRisk: { dangerLevel: 2 },
        opponentReplyThreat: { bestCaptureValue: 72.5 },
        staticExchange: { score: -57.5, favorable: false, captures: true, captureValue: 10, recaptureRisk: 72.5 },
        metadata: {
            moveCount: 10,
            captures: true,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 0,
            planProgress: 12,
            planDrift: 25
        }
    });
    const safeDevelop = makeCandidate({
        score: 150,
        move: {
            piece: { type: PIECE_TYPES.CAMEL, color: COLORS.BLACK, row: 1, col: 9, hasMoved: false },
            move: { row: 2, col: 8 }
        },
        metadata: {
            moveCount: 10,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 1,
            planProgress: 14,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([poisonedPawn, safeDevelop], getAIProfile('medium'));

    assert.equal(ranked[0].move, safeDevelop.move);
    assert.ok(ranked[1].styleAdjustment.components.opening < -80);
});

test('opening discipline catches white early deep pawn leaps', () => {
    const whitePawnRaid = makeCandidate({
        score: 190,
        move: {
            piece: { type: PIECE_TYPES.PAWN, color: COLORS.WHITE, row: 8, col: 1, hasMoved: false },
            move: { row: 6, col: 2 }
        },
        metadata: {
            moveCount: 2,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 1,
            planProgress: 12,
            planDrift: 0
        }
    });
    const compactDevelopment = makeCandidate({
        score: 150,
        move: {
            piece: { type: PIECE_TYPES.PAWN, color: COLORS.WHITE, row: 7, col: 4, hasMoved: false },
            move: { row: 6, col: 4 }
        },
        metadata: {
            moveCount: 2,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planSupportAfter: 2,
            planProgress: 10,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([whitePawnRaid, compactDevelopment], getAIProfile('medium', 'timur'));

    assert.equal(ranked[0].move, compactDevelopment.move);
    assert.ok(ranked[1].styleAdjustment.components.opening < -1000);
});

test('hard style targets 120-move games by preferring progress over quiet drift', () => {
    const quietSafe = makeCandidate({
        score: 134,
        move: 'quiet-safe-but-long',
        metadata: {
            moveCount: 124,
            captures: false,
            givesCheck: false,
            opponentMobility: 12,
            tempoLoss: 1
        }
    });
    const forcingProgress = makeCandidate({
        score: 116,
        move: 'forcing-progress',
        staticExchange: { score: 20, favorable: true, captures: true, captureValue: 40, recaptureRisk: 0 },
        metadata: {
            moveCount: 124,
            captures: true,
            givesCheck: true,
            opponentMobility: 4,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([quietSafe, forcingProgress], getAIProfile('hard', 'timur'));

    assert.equal(ranked[0].move, 'forcing-progress');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-pace-pressure'));
    assert.ok(ranked[1].styleAdjustment.components.pace < 0);
});

test('hard winning side closes a mate net over late-game quiet drift', () => {
    const quietLateDrift = makeCandidate({
        score: 760,
        move: 'quiet-late-drift',
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: false,
            opponentMobility: 11,
            moveCount: 152,
            planProgress: 0,
            planDrift: 24,
            tempoLoss: 1
        }
    });
    const mateNetClosure = makeCandidate({
        score: 220,
        move: 'mate-net-closure',
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: true,
            opponentMobility: 1,
            moveCount: 152,
            planProgress: 28,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietLateDrift, mateNetClosure],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'mate-net-closure');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-mate-net-closure'));
});

test('120-move pace pressure scales by difficulty', () => {
    const longGameProgress = makeCandidate({
        score: 100,
        move: 'long-game-progress',
        staticExchange: { score: 12, favorable: true, captures: true, captureValue: 35, recaptureRisk: 0 },
        metadata: {
            moveCount: 132,
            captures: true,
            givesCheck: true,
            opponentMobility: 3,
            tempoLoss: 0
        }
    });

    const easy = scoreCandidateDecisionStyle(longGameProgress, getAIProfile('easy'));
    const medium = scoreCandidateDecisionStyle(longGameProgress, getAIProfile('medium'));
    const hard = scoreCandidateDecisionStyle(longGameProgress, getAIProfile('hard'));

    assert.ok(easy.components.pace > 0);
    assert.ok(medium.components.pace > easy.components.pace);
    assert.ok(hard.components.pace > medium.components.pace);
});

test('hard style applies planned pressure from the opening instead of waiting for late game', () => {
    const passiveSafe = makeCandidate({
        score: 126,
        move: 'passive-safe',
        metadata: {
            moveCount: 8,
            captures: false,
            givesCheck: false,
            opponentMobility: 13,
            ownMobilityBefore: 24,
            ownMobilityAfter: 23,
            tempoLoss: 1,
            planProgress: -6,
            planDrift: 8
        }
    });
    const plannedDevelopment = makeCandidate({
        score: 108,
        move: 'planned-development',
        metadata: {
            moveCount: 8,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            ownMobilityBefore: 24,
            ownMobilityAfter: 30,
            tempoLoss: 0,
            planProgress: 18,
            planDrift: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates([passiveSafe, plannedDevelopment], getAIProfile('hard', 'timur'));

    assert.equal(ranked[0].move, 'planned-development');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-plan-pressure'));
    assert.ok(ranked[1].styleAdjustment.components.plan < 0);
});

test('planned pressure scales by difficulty without making easy perfect', () => {
    const plannedMove = makeCandidate({
        score: 100,
        move: 'spread-and-pressure',
        metadata: {
            moveCount: 10,
            captures: false,
            givesCheck: false,
            opponentMobility: 7,
            ownMobilityBefore: 24,
            ownMobilityAfter: 31,
            planProgress: 16,
            planDrift: 0
        }
    });

    const easy = scoreCandidateDecisionStyle(plannedMove, getAIProfile('easy'));
    const medium = scoreCandidateDecisionStyle(plannedMove, getAIProfile('medium'));
    const hard = scoreCandidateDecisionStyle(plannedMove, getAIProfile('hard'));

    assert.ok(easy.components.plan > 0);
    assert.ok(medium.components.plan > easy.components.plan);
    assert.ok(hard.components.plan > medium.components.plan);
});

test('Uluğ Bey breaks long calculated repetition instead of accepting a draw loop', () => {
    const calculatedLoop = makeCandidate({
        score: 820,
        move: 'ulug-safe-loop',
        repetitionRisk: {
            severity: 3,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: true,
            moveCount: 184,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            ownMobilityBefore: 28,
            ownMobilityAfter: 27,
            planProgress: 0,
            planDrift: 18,
            tempoLoss: 1
        }
    });
    const calculatedProgress = makeCandidate({
        score: 155,
        move: 'ulug-calculated-progress',
        metadata: {
            isWinningSide: true,
            moveCount: 184,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            ownMobilityBefore: 28,
            ownMobilityAfter: 32,
            planProgress: 24,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [calculatedLoop, calculatedProgress],
        getAIProfile('medium', 'ulu_bey')
    );

    assert.equal(ranked[0].move, 'ulug-calculated-progress');
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-winning-repetition-avoidance'));
});

test('Aksak Demir closes very long winning games instead of preserving a safe drawish edge', () => {
    const safeButDrawish = makeCandidate({
        score: 1720,
        move: 'aksak-safe-drawish-edge',
        repetitionRisk: {
            severity: 2,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: true,
            moveCount: 224,
            captures: false,
            givesCheck: false,
            opponentMobility: 10,
            ownMobilityBefore: 34,
            ownMobilityAfter: 33,
            planProgress: 0,
            planDrift: 30,
            tempoLoss: 1
        }
    });
    const closingNet = makeCandidate({
        score: 240,
        move: 'aksak-closing-net',
        staticExchange: { score: 30, favorable: true, captures: true, captureValue: 45, recaptureRisk: 0 },
        metadata: {
            isWinningSide: true,
            moveCount: 224,
            captures: true,
            givesCheck: true,
            opponentMobility: 1,
            ownMobilityBefore: 34,
            ownMobilityAfter: 39,
            planProgress: 34,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [safeButDrawish, closingNet],
        getAIProfile('hard', null, 'bot_15_aksak_demir')
    );

    assert.equal(ranked[0].move, 'aksak-closing-net');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-mate-net-closure'));
    assert.ok(ranked[1].styleAdjustment.score < -500);
});

test('top bot breaks balanced late repetition before it becomes threefold', () => {
    const balancedLoop = makeCandidate({
        score: 280,
        move: 'aksak-balanced-loop',
        repetitionRisk: {
            severity: 1,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: false,
            moveCount: 188,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            ownMobilityBefore: 32,
            ownMobilityAfter: 31,
            planProgress: 0,
            planDrift: 16,
            tempoLoss: 1
        }
    });
    const activeBreak = makeCandidate({
        score: 205,
        move: 'aksak-active-break',
        staticExchange: { score: 18, favorable: true, captures: true, captureValue: 40, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 188,
            captures: true,
            givesCheck: true,
            opponentMobility: 4,
            ownMobilityBefore: 32,
            ownMobilityAfter: 36,
            planProgress: 18,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [balancedLoop, activeBreak],
        getAIProfile('hard', null, 'bot_15_aksak_demir')
    );

    assert.equal(ranked[0].move, 'aksak-active-break');
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-winning-repetition-avoidance'));
});

test('hard late conversion pressure rejects quiet max-move drift for a clean forcing plan', () => {
    const quietMaxMoveDrift = makeCandidate({
        score: 310,
        move: 'quiet-max-move-drift',
        metadata: {
            isWinningSide: false,
            moveCount: 260,
            captures: false,
            givesCheck: false,
            opponentMobility: 12,
            ownMobilityBefore: 32,
            ownMobilityAfter: 31,
            planProgress: 0,
            planDrift: 34,
            tempoLoss: 2
        }
    });
    const forcingClosure = makeCandidate({
        score: 180,
        move: 'forcing-late-closure',
        staticExchange: { score: 26, favorable: true, captures: true, captureValue: 45, recaptureRisk: 0 },
        endgamePlan: { score: 260, reasons: ['restrict-king'] },
        metadata: {
            isWinningSide: false,
            moveCount: 260,
            captures: true,
            givesCheck: true,
            opponentMobility: 2,
            ownMobilityBefore: 32,
            ownMobilityAfter: 36,
            planProgress: 28,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietMaxMoveDrift, forcingClosure],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'forcing-late-closure');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-late-conversion'));
    assert.ok(ranked[1].styleAdjustment.components.lateConversion < 0);
});

test('hard cautious personas stop preserving drawish late-game loops', () => {
    const quietLock = makeCandidate({
        score: 420,
        move: 'cautious-safe-loop',
        repetitionRisk: {
            severity: 2,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: false,
            moveCount: 268,
            captures: false,
            givesCheck: false,
            opponentMobility: 11,
            ownMobilityBefore: 30,
            ownMobilityAfter: 29,
            planProgress: 0,
            planDrift: 32,
            tempoLoss: 1
        }
    });
    const forcingBreak = makeCandidate({
        score: 185,
        move: 'cautious-forcing-break',
        staticExchange: { score: 28, favorable: true, captures: true, captureValue: 50, recaptureRisk: 0 },
        endgamePlan: { score: 320, reasons: ['mate-net'] },
        metadata: {
            isWinningSide: false,
            moveCount: 268,
            captures: true,
            givesCheck: true,
            opponentMobility: 2,
            ownMobilityBefore: 30,
            ownMobilityAfter: 35,
            planProgress: 34,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    for (const personaId of ['ulu_bey', 'saray_veziri']) {
        const ranked = applyDecisionStyleToCandidates(
            [quietLock, forcingBreak],
            getAIProfile('hard', personaId)
        );

        assert.equal(ranked[0].move, 'cautious-forcing-break');
        assert.ok(ranked[0].styleAdjustment.reasons.includes('style-late-conversion'));
        assert.ok(ranked[1].styleAdjustment.components.repetition < -600);
    }
});

test('winning material edge gets more urgent after move 180 instead of drifting to adjudication', () => {
    const quietNetDrift = makeCandidate({
        score: 360,
        move: 'winning-quiet-net-drift',
        metadata: {
            isWinningSide: true,
            moveCount: 212,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            planProgress: 0,
            planDrift: 26,
            tempoLoss: 1
        }
    });
    const closingMove = makeCandidate({
        score: 170,
        move: 'winning-closing-move',
        endgamePlan: { score: 280, reasons: ['box-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 212,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            planProgress: 28,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietNetDrift, closingMove],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'winning-closing-move');
    assert.ok(ranked[0].styleAdjustment.components.mateNetClosure > 300);
    assert.ok(ranked[1].styleAdjustment.components.mateNetClosure < 0);
});

test('medium Uluğ Bey treats repeated route loops as worse than active progress', () => {
    const calculatedLoop = makeCandidate({
        score: 360,
        move: 'medium-ulug-route-loop',
        repetitionRisk: {
            severity: 2,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: false,
            moveCount: 176,
            captures: false,
            givesCheck: false,
            opponentMobility: 10,
            ownMobilityBefore: 27,
            ownMobilityAfter: 26,
            planProgress: 0,
            planDrift: 22,
            tempoLoss: 1
        }
    });
    const activeProgress = makeCandidate({
        score: 205,
        move: 'medium-ulug-active-progress',
        staticExchange: { score: 16, favorable: true, captures: true, captureValue: 35, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 176,
            captures: true,
            givesCheck: true,
            opponentMobility: 4,
            ownMobilityBefore: 27,
            ownMobilityAfter: 31,
            planProgress: 18,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [calculatedLoop, activeProgress],
        getAIProfile('medium', 'ulu_bey')
    );

    assert.equal(ranked[0].move, 'medium-ulug-active-progress');
    assert.ok(ranked[1].styleAdjustment.components.repetition < -250);
});

test('hard winning route loops escalate after repeated routes', () => {
    const shallowLoop = makeCandidate({
        score: 260,
        move: 'hard-winning-shallow-loop',
        repetitionRisk: {
            severity: 3,
            routeRepeatCount: 2,
            repeatsMoveRoute: true
        },
        metadata: {
            isWinningSide: true,
            moveCount: 238,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planProgress: 0,
            planDrift: 18,
            tempoLoss: 1
        }
    });
    const deepLoop = makeCandidate({
        score: 260,
        move: 'hard-winning-deep-loop',
        repetitionRisk: {
            severity: 7,
            routeRepeatCount: 5,
            repeatsMoveRoute: true,
            repeatsRecentPosition: true,
            isImmediateReverse: true
        },
        metadata: {
            isWinningSide: true,
            moveCount: 238,
            captures: false,
            givesCheck: false,
            opponentMobility: 8,
            planProgress: 0,
            planDrift: 18,
            tempoLoss: 1
        }
    });

    const shallow = scoreCandidateDecisionStyle(shallowLoop, getAIProfile('hard', 'timur'));
    const deep = scoreCandidateDecisionStyle(deepLoop, getAIProfile('hard', 'timur'));

    assert.ok(deep.components.repetition < shallow.components.repetition * 2);
    assert.ok(deep.reasons.includes('style-winning-repetition-avoidance'));
});

test('hard profile prefers a forcing mate net over a stalemate terminal win', () => {
    const stalemateNow = makeCandidate({
        score: 620,
        move: 'stalemate-now',
        metadata: {
            isWinningSide: true,
            terminalWin: true,
            terminalResultType: 'stalemate',
            moveCount: 224,
            captures: false,
            givesCheck: false,
            opponentMobility: 0,
            planProgress: 8,
            planDrift: 0,
            tempoLoss: 0
        }
    });
    const forcingMateNet = makeCandidate({
        score: 260,
        move: 'forcing-mate-net',
        endgamePlan: { score: 360, reasons: ['box-king'] },
        metadata: {
            isWinningSide: true,
            terminalWin: false,
            moveCount: 224,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            planProgress: 32,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [stalemateNow, forcingMateNet],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'forcing-mate-net');
    assert.ok(ranked[1].styleAdjustment.components.stalemateRisk < -1000);
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-stalemate-risk'));
});

test('hard mat aginda aktif kapanis tekrar cezasina takilmadan one gecer', () => {
    const repeatedCheckNet = makeCandidate({
        score: 96,
        move: 'repeat-check-net',
        repetitionRisk: {
            severity: 2,
            repeatsRecentPosition: true,
            repeatsMoveRoute: false,
            routeRepeatCount: 1
        },
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: true,
            opponentMobility: 1,
            moveCount: 188,
            matingNetActive: true,
            matingNetScore: 520,
            planProgress: 28
        }
    });
    const quietDrift = makeCandidate({
        score: 136,
        move: 'quiet-net-drift',
        metadata: {
            isWinningSide: true,
            captures: false,
            givesCheck: false,
            opponentMobility: 7,
            moveCount: 188,
            planDrift: 34
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietDrift, repeatedCheckNet],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'repeat-check-net');
    assert.ok(ranked[0].styleAdjustment.components.activeClosure > 0);
    assert.ok(ranked[0].styleAdjustment.components.repetition > -120);
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-active-closure'));
});

test('medium profile avoids stalemate-like lock when it has active late conversion', () => {
    const quietLock = makeCandidate({
        score: 260,
        move: 'quiet-stalemate-lock',
        metadata: {
            isWinningSide: true,
            terminalWin: false,
            moveCount: 232,
            captures: false,
            givesCheck: false,
            opponentMobility: 1,
            planProgress: 0,
            planDrift: 20,
            tempoLoss: 1
        }
    });
    const activeConversion = makeCandidate({
        score: 205,
        move: 'active-conversion-check',
        endgamePlan: { score: 240, reasons: ['restrict-king'] },
        metadata: {
            isWinningSide: true,
            terminalWin: false,
            moveCount: 232,
            captures: true,
            givesCheck: true,
            opponentMobility: 3,
            planProgress: 22,
            planDrift: 0,
            tempoLoss: 0
        },
        staticExchange: { score: 22, favorable: true, captures: true, captureValue: 35, recaptureRisk: 0 }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietLock, activeConversion],
        getAIProfile('medium', 'ulu_bey')
    );

    assert.equal(ranked[0].move, 'active-conversion-check');
    assert.ok(ranked[1].styleAdjustment.components.stalemateRisk < -500);
});

test('hard late route repetition is rejected before it becomes another threefold loop', () => {
    const routeLoop = makeCandidate({
        score: 520,
        move: 'hard-route-loop',
        repetitionRisk: {
            severity: 3,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true,
            routeRepeatCount: 5
        },
        metadata: {
            isWinningSide: true,
            moveCount: 168,
            captures: false,
            givesCheck: false,
            opponentMobility: 10,
            planProgress: 0,
            planDrift: 34,
            tempoLoss: 1
        }
    });
    const forcingBreak = makeCandidate({
        score: 210,
        move: 'hard-route-break',
        staticExchange: { score: 26, favorable: true, captures: true, captureValue: 45, recaptureRisk: 0 },
        endgamePlan: { score: 260, reasons: ['restrict-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 168,
            captures: true,
            givesCheck: true,
            opponentMobility: 3,
            planProgress: 30,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [routeLoop, forcingBreak],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'hard-route-break');
    assert.ok(ranked[1].styleAdjustment.components.repetition < -1000);
    assert.ok(ranked[1].styleAdjustment.components.activeClosure < 0);
});

test('hard Saray Veziri converts late winning positions instead of defending a loop', () => {
    const palaceLoop = makeCandidate({
        score: 540,
        move: 'saray-safe-route-loop',
        repetitionRisk: {
            severity: 3,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true,
            routeRepeatCount: 4
        },
        metadata: {
            isWinningSide: true,
            moveCount: 184,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            ownMobilityBefore: 30,
            ownMobilityAfter: 29,
            planProgress: 0,
            planDrift: 30,
            tempoLoss: 1
        }
    });
    const activeNet = makeCandidate({
        score: 235,
        move: 'saray-active-net',
        staticExchange: { score: 24, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        endgamePlan: { score: 340, reasons: ['box-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 184,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            ownMobilityBefore: 30,
            ownMobilityAfter: 34,
            planProgress: 36,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [palaceLoop, activeNet],
        getAIProfile('hard', 'saray_veziri')
    );

    assert.equal(ranked[0].move, 'saray-active-net');
    assert.ok(ranked[0].styleAdjustment.components.lateConversion > 250);
    assert.ok(ranked[1].styleAdjustment.components.repetition < -1200);
});

test('medium Beyazid prefers clean progress over a low-value repeated attack loop', () => {
    const repeatedAttack = makeCandidate({
        score: 355,
        move: 'medium-beyazid-repeat-attack',
        repetitionRisk: {
            severity: 2,
            repeatsMoveRoute: true,
            routeRepeatCount: 4
        },
        metadata: {
            isWinningSide: false,
            moveCount: 148,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            ownMobilityBefore: 28,
            ownMobilityAfter: 27,
            planProgress: 0,
            planDrift: 26,
            tempoLoss: 1
        }
    });
    const cleanProgress = makeCandidate({
        score: 250,
        move: 'medium-beyazid-clean-progress',
        staticExchange: { score: 20, favorable: true, captures: true, captureValue: 35, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 148,
            captures: true,
            givesCheck: true,
            opponentMobility: 4,
            ownMobilityBefore: 28,
            ownMobilityAfter: 33,
            planProgress: 22,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [repeatedAttack, cleanProgress],
        getAIProfile('medium', 'beyazid')
    );

    assert.equal(ranked[0].move, 'medium-beyazid-clean-progress');
    assert.ok(ranked[0].styleAdjustment.components.plan > 40);
    assert.ok(ranked[1].styleAdjustment.components.plan < 0);
});

test('hard balanced late game breaks draw loops with structural progress', () => {
    const quietBalanceLoop = makeCandidate({
        score: 430,
        move: 'balanced-quiet-loop',
        repetitionRisk: {
            severity: 2,
            repeatsMoveRoute: true,
            routeRepeatCount: 4
        },
        metadata: {
            isWinningSide: false,
            moveCount: 188,
            materialBalanceAbs: 45,
            captures: false,
            givesCheck: false,
            opponentMobility: 12,
            ownMobilityBefore: 34,
            ownMobilityAfter: 33,
            planProgress: 0,
            planDrift: 28,
            tempoLoss: 1
        }
    });
    const structuralBreak = makeCandidate({
        score: 295,
        move: 'balanced-structural-break',
        staticExchange: { score: 12, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 188,
            materialBalanceAbs: 45,
            captures: false,
            givesCheck: false,
            opponentMobility: 7,
            ownMobilityBefore: 34,
            ownMobilityAfter: 40,
            planProgress: 46,
            planDrift: 0,
            tempoLoss: 0,
            pawnAdvance: 2,
            lineOpening: true
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietBalanceLoop, structuralBreak],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'balanced-structural-break');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-balanced-draw-break'));
    assert.ok(ranked[0].styleAdjustment.components.drawBreak > 100);
    assert.ok(ranked[1].styleAdjustment.components.drawBreak < 0);
});

test('hard winning endgame penalizes quiet no-progress moves near max cap even without repetition', () => {
    const quietNoProgress = makeCandidate({
        score: 520,
        move: 'quiet-no-progress-cap-drift',
        repetitionRisk: { severity: 0 },
        metadata: {
            isWinningSide: true,
            moveCount: 268,
            materialBalanceAbs: 760,
            captures: false,
            givesCheck: false,
            opponentMobility: 10,
            ownMobilityBefore: 32,
            ownMobilityAfter: 31,
            planProgress: 0,
            planDrift: 58,
            tempoLoss: 1
        }
    });
    const endgameProgress = makeCandidate({
        score: 260,
        move: 'force-endgame-progress',
        staticExchange: { score: 34, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        endgamePlan: { score: 260, reasons: ['restrict-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 268,
            materialBalanceAbs: 760,
            captures: false,
            givesCheck: true,
            opponentMobility: 3,
            ownMobilityBefore: 32,
            ownMobilityAfter: 36,
            planProgress: 42,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietNoProgress, endgameProgress],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'force-endgame-progress');
    assert.ok(ranked[0].styleAdjustment.components.endgameProgress > 180);
    assert.ok(ranked[1].styleAdjustment.components.endgameProgress < -450);
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-endgame-progress'));
});

test('medium winning endgame starts conversion pressure before max cap', () => {
    const quietMaterialHold = makeCandidate({
        score: 760,
        move: 'quiet-material-hold-long-endgame',
        repetitionRisk: { severity: 0 },
        metadata: {
            isWinningSide: true,
            moveCount: 232,
            materialBalanceAbs: 920,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            ownMobilityBefore: 30,
            ownMobilityAfter: 30,
            planProgress: 0,
            planDrift: 54,
            tempoLoss: 1
        }
    });
    const boxKingProgress = makeCandidate({
        score: 420,
        move: 'box-king-progress-before-cap',
        staticExchange: { score: 18, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        endgamePlan: { score: 210, reasons: ['box-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 232,
            materialBalanceAbs: 920,
            captures: false,
            givesCheck: false,
            opponentMobility: 4,
            ownMobilityBefore: 30,
            ownMobilityAfter: 33,
            planProgress: 36,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [quietMaterialHold, boxKingProgress],
        getAIProfile('medium', 'ulu_bey')
    );

    assert.equal(ranked[0].move, 'box-king-progress-before-cap');
    assert.ok(ranked[0].styleAdjustment.components.endgameProgress > 80);
    assert.ok(ranked[1].styleAdjustment.components.endgameProgress < -160);
});

test('medium Beyazid treats unsafe aggression as risk instead of free attack bonus', () => {
    const flashyUnsafeAttack = makeCandidate({
        score: 330,
        move: 'beyazid-flashy-unsafe-attack',
        tacticalRisk: { dangerLevel: 2 },
        opponentReplyThreat: { bestCaptureValue: 135 },
        opponentContinuationThreat: { bestCaptureValue: 90, penalty: -210 },
        staticExchange: { score: -72, favorable: false, captures: true, captureValue: 35, recaptureRisk: 120 },
        metadata: {
            isWinningSide: false,
            moveCount: 108,
            captures: true,
            givesCheck: true,
            opponentMobility: 4,
            ownMobilityBefore: 30,
            ownMobilityAfter: 27,
            planProgress: 8,
            planDrift: 18,
            tempoLoss: 1
        }
    });
    const controlledPressure = makeCandidate({
        score: 230,
        move: 'beyazid-controlled-pressure',
        tacticalRisk: { dangerLevel: 0 },
        opponentReplyThreat: { bestCaptureValue: 0 },
        opponentContinuationThreat: { bestCaptureValue: 0, penalty: 0 },
        staticExchange: { score: 18, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 108,
            captures: false,
            givesCheck: true,
            opponentMobility: 3,
            ownMobilityBefore: 30,
            ownMobilityAfter: 34,
            planProgress: 28,
            planDrift: 0,
            tempoLoss: 0
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [flashyUnsafeAttack, controlledPressure],
        getAIProfile('medium', 'beyazid')
    );

    assert.equal(ranked[0].move, 'beyazid-controlled-pressure');
    assert.ok(ranked[1].styleAdjustment.components.beyazidRisk < -160);
    assert.ok(ranked[1].styleAdjustment.reasons.includes('style-beyazid-risk-control'));
});

test('hard winning side does not repeat a checking net into threefold when a box-king break exists', () => {
    const repeatedCheckNet = makeCandidate({
        score: 620,
        move: 'repeat-check-net-threefold',
        repetitionRisk: {
            severity: 3,
            repeatsRecentPosition: true,
            repeatsMoveRoute: true,
            routeRepeatCount: 17,
            isImmediateReverse: true
        },
        metadata: {
            isWinningSide: true,
            moveCount: 256,
            materialBalanceAbs: 820,
            captures: false,
            givesCheck: true,
            opponentMobility: 2,
            matingNetActive: true,
            matingNetScore: 420,
            planProgress: 8,
            planDrift: 6,
            tempoLoss: 0
        }
    });
    const boxKingBreak = makeCandidate({
        score: 330,
        move: 'break-loop-box-king',
        staticExchange: { score: 22, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        endgamePlan: { score: 260, reasons: ['box-king'] },
        metadata: {
            isWinningSide: true,
            moveCount: 256,
            materialBalanceAbs: 820,
            captures: false,
            givesCheck: false,
            opponentMobility: 3,
            matingNetActive: true,
            matingNetScore: 360,
            ownMobilityBefore: 32,
            ownMobilityAfter: 36,
            planProgress: 42,
            planDrift: 0,
            tempoLoss: 0,
            lineOpening: true
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [repeatedCheckNet, boxKingBreak],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'break-loop-box-king');
    assert.ok(ranked[1].styleAdjustment.components.repetition < -1800);
});

test('hard fast policy performs critical reply control before trusting a high score move', () => {
    const unsafeHighScore = makeCandidate({
        score: 420,
        move: 'unsafe-high-score',
        opponentReplyThreat: { bestCaptureValue: 115 },
        opponentContinuationThreat: { bestCaptureValue: 90, penalty: -180 },
        tacticalRisk: { dangerLevel: 2 },
        staticExchange: { score: -18, favorable: false, captures: false, captureValue: 0, recaptureRisk: 40 },
        metadata: {
            isWinningSide: false,
            moveCount: 96,
            captures: false,
            givesCheck: false,
            opponentMobility: 9,
            ownMobilityBefore: 30,
            ownMobilityAfter: 29,
            planProgress: 0,
            planDrift: 18,
            tempoLoss: 1,
            criticalReplyCheck: true
        }
    });
    const checkedSafeMove = makeCandidate({
        score: 305,
        move: 'checked-safe-move',
        opponentReplyThreat: { bestCaptureValue: 0 },
        opponentContinuationThreat: { bestCaptureValue: 0, penalty: 0 },
        staticExchange: { score: 18, favorable: true, captures: false, captureValue: 0, recaptureRisk: 0 },
        metadata: {
            isWinningSide: false,
            moveCount: 96,
            captures: false,
            givesCheck: false,
            opponentMobility: 6,
            ownMobilityBefore: 30,
            ownMobilityAfter: 34,
            planProgress: 24,
            planDrift: 0,
            tempoLoss: 0,
            criticalReplyCheck: true
        }
    });

    const ranked = applyDecisionStyleToCandidates(
        [unsafeHighScore, checkedSafeMove],
        getAIProfile('hard', 'timur')
    );

    assert.equal(ranked[0].move, 'checked-safe-move');
    assert.ok(ranked[0].styleAdjustment.reasons.includes('style-critical-reply-control'));
    assert.ok(ranked[1].styleAdjustment.components.criticalReply < -200);
});
