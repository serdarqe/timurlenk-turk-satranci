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
    const sarayPressure = scoreCandidateDecisionStyle(pressureMove, getAIProfile('medium', 'saray_veziri'));
    const saraySafe = scoreCandidateDecisionStyle(safeMove, getAIProfile('medium', 'saray_veziri'));

    assert.ok(timurPressure.score > timurSafe.score);
    assert.ok(timurPressure.reasons.includes('style-pressure'));
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
