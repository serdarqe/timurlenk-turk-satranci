import { getAIProfile } from './AIProfiles.js';
import { COLORS, PIECE_TYPES } from '../utils/constants.js';

const DEFAULT_DECISION_STYLE = Object.freeze({
    precision: 0.75,
    riskTolerance: 0.35,
    pressure: 0.9,
    conversion: 0.9,
    safety: 0.85,
    tempo: 0.75,
    bookTrust: 0.9
});

const CONVERSION_DIFFICULTY_TUNING = Object.freeze({
    easy: Object.freeze({
        forcing: 0.45,
        driftPenalty: 0.45,
        pace: 0.45
    }),
    medium: Object.freeze({
        forcing: 0.72,
        driftPenalty: 0.75,
        pace: 0.78
    }),
    hard: Object.freeze({
        forcing: 1,
        driftPenalty: 1,
        pace: 1.18
    })
});

const PLAN_DIFFICULTY_TUNING = Object.freeze({
    easy: 0.55,
    medium: 0.88,
    hard: 1.35
});

const MATE_NET_DIFFICULTY_TUNING = Object.freeze({
    easy: 0.42,
    medium: 0.85,
    hard: 1.45
});

const TARGET_DECISIVE_MOVE_COUNT = 120;
const PACE_PRESSURE_START_MOVE = 84;
const OPENING_DISCIPLINE_MOVE_LIMIT = 18;
const ROYAL_PIECE_TYPES = new Set([
    PIECE_TYPES.KING,
    PIECE_TYPES.PRINCE,
    PIECE_TYPES.ADVENTITIOUS_KING
]);

function clampRatio(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function getPacePressure(moveCount) {
    const pressure = clampRatio((moveCount - PACE_PRESSURE_START_MOVE) / (TARGET_DECISIVE_MOVE_COUNT - PACE_PRESSURE_START_MOVE));
    const overdue = clampRatio((moveCount - TARGET_DECISIVE_MOVE_COUNT) / 48);
    return pressure + overdue * 0.45;
}

function resolveProfile(profileInput = 'medium') {
    return typeof profileInput === 'string' ? getAIProfile(profileInput) : (profileInput || getAIProfile('medium'));
}

function getDecisionStyle(profile) {
    return {
        ...DEFAULT_DECISION_STYLE,
        ...(profile?.decisionStyle || {})
    };
}

function finiteNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function clampPositive(value, max) {
    return Math.max(0, Math.min(max, value));
}

function addReason(reasons, key, value) {
    if (Math.abs(value) >= 1) reasons.push(key);
}

function getBaseDifficultyId(profile) {
    return profile?.baseId || String(profile?.id || 'medium').split(':')[0];
}

function getPersonaId(profile) {
    return profile?.personaId || String(profile?.id || '').split(':')[1] || null;
}

function getConversionDifficultyTuning(profile) {
    return CONVERSION_DIFFICULTY_TUNING[getBaseDifficultyId(profile)] || CONVERSION_DIFFICULTY_TUNING.medium;
}

function getPlanDifficultyTuning(profile) {
    return PLAN_DIFFICULTY_TUNING[getBaseDifficultyId(profile)] || PLAN_DIFFICULTY_TUNING.medium;
}

function getMateNetDifficultyTuning(profile) {
    return MATE_NET_DIFFICULTY_TUNING[getBaseDifficultyId(profile)] || MATE_NET_DIFFICULTY_TUNING.medium;
}

function isDevelopmentPiece(piece) {
    if (!piece || ROYAL_PIECE_TYPES.has(piece.type)) return false;
    if (piece.type !== PIECE_TYPES.PAWN) return true;
    return true;
}

function getMoveTarget(move = {}) {
    return move.move || move;
}

function getMoveColor(candidate, metadata) {
    return (
        candidate?.move?.piece?.color
        || candidate?.move?.move?.piece?.color
        || metadata?.color
        || candidate?.color
        || null
    );
}

function getForwardDelta(piece, target) {
    if (!piece || !target || !Number.isFinite(piece.row) || !Number.isFinite(target.row)) return 0;
    return piece.color === COLORS.BLACK ? target.row - piece.row : piece.row - target.row;
}

function getForwardDepth(piece, target) {
    if (!piece || !target || !Number.isFinite(target.row)) return 0;
    return piece.color === COLORS.BLACK ? target.row : 9 - target.row;
}

function getOpeningDisciplinePenalty(candidate, metadata, profile, signals) {
    const move = candidate.move || {};
    const piece = move.piece;
    const target = getMoveTarget(move);
    const moveCount = finiteNumber(metadata.moveCount);
    if (moveCount > OPENING_DISCIPLINE_MOVE_LIMIT || !isDevelopmentPiece(piece)) return 0;

    const supportAfter = finiteNumber(metadata.planSupportAfter);
    const forwardDelta = getForwardDelta(piece, target);
    const forwardDepth = getForwardDepth(piece, target);
    const unsupported = supportAfter <= 0;
    const lightlySupported = supportAfter <= 1;
    const lowValueCapture = Boolean(metadata.captures) && signals.captureValue <= 20;
    const badTrade = signals.badExchangeValue > 10 || signals.replyCaptureValue > 40 || signals.dangerLevel > 0;
    const deepRaid = forwardDepth >= 4;
    const repeatedPiece = Boolean(piece.hasMoved);
    const baseDifficulty = getBaseDifficultyId(profile);
    const strictness = baseDifficulty === 'hard' ? 1.35 : (baseDifficulty === 'medium' ? 1 : 1.05);
    let penalty = 0;

    if (!metadata.captures && forwardDelta >= 3 && (unsupported || lightlySupported || forwardDepth >= 3)) {
        penalty += 420 + Math.max(0, forwardDepth - 3) * 24 + (unsupported ? 40 : 0);
    }

    if (!metadata.captures && moveCount <= 8 && forwardDelta >= 2) {
        penalty += 5000 + Math.max(0, forwardDepth - 3) * 120 + (supportAfter <= 2 ? 180 : 0);
    }

    if (!metadata.captures && forwardDelta >= 2 && forwardDepth >= 5) {
        penalty += 5000 + Math.max(0, forwardDepth - 5) * 80 + (supportAfter <= 2 ? 160 : 0);
    }

    if (lowValueCapture && lightlySupported) {
        penalty += 28 + (unsupported ? 18 : 0) + Math.max(0, forwardDepth - 3) * 8;
    }

    if (repeatedPiece && lightlySupported && forwardDelta > 0 && deepRaid) {
        penalty += 34 + Math.max(0, forwardDepth - 4) * 8;
    }

    if (repeatedPiece && !metadata.captures && forwardDelta > 0 && deepRaid) {
        penalty += 5000 + Math.max(0, forwardDepth - 4) * 80 + (supportAfter <= 2 ? 160 : 0);
    }

    if (lowValueCapture && badTrade) {
        penalty += (
            signals.dangerLevel * 34
            + Math.max(0, signals.replyCaptureValue - signals.captureValue) * 0.55
            + signals.badExchangeValue * 0.65
        );
    }

    return penalty * strictness;
}

export function scoreCandidateDecisionStyle(candidate = {}, profileInput = 'medium') {
    const profile = resolveProfile(profileInput);
    const style = getDecisionStyle(profile);
    const conversionTuning = getConversionDifficultyTuning(profile);
    const reasons = [];
    const components = {
        pressure: 0,
        conversion: 0,
        safety: 0,
        tempo: 0,
        risk: 0,
        opening: 0,
        pace: 0,
        plan: 0,
        blackConversion: 0,
        mateNetClosure: 0,
        repetition: 0
    };

    const metadata = candidate.metadata || {};
    const personaId = getPersonaId(profile);
    const tacticalRisk = candidate.tacticalRisk || {};
    const opponentReplyThreat = candidate.opponentReplyThreat || {};
    const opponentContinuationThreat = candidate.opponentContinuationThreat || {};
    const staticExchange = candidate.staticExchange || {};
    const repetitionRisk = candidate.repetitionRisk || {};
    const endgamePlan = candidate.endgamePlan || {};
    const clockPressure = candidate.clockPressure || {};
    const isWinningSide = Boolean(metadata.isWinningSide);
    const moveCount = finiteNumber(metadata.moveCount);
    const moveColor = getMoveColor(candidate, metadata);
    const pacePressure = getPacePressure(moveCount);
    const planTuning = getPlanDifficultyTuning(profile);
    const mateNetTuning = getMateNetDifficultyTuning(profile);

    const dangerLevel = finiteNumber(tacticalRisk.dangerLevel);
    const replyCaptureValue = finiteNumber(opponentReplyThreat.bestCaptureValue);
    const continuationCaptureValue = finiteNumber(opponentContinuationThreat.bestCaptureValue);
    const continuationPenalty = clampPositive(-finiteNumber(opponentContinuationThreat.penalty), 600);
    const badExchangeValue = clampPositive(-finiteNumber(staticExchange.score), 140);
    const recaptureRisk = clampPositive(finiteNumber(staticExchange.recaptureRisk), 160);
    const captureValueForRisk = finiteNumber(staticExchange.captureValue);
    const moveCapturesForRisk = Boolean(staticExchange.captures && captureValueForRisk > 0);
    const postGainLossRisk = moveCapturesForRisk
        ? clampPositive(replyCaptureValue - captureValueForRisk, 160)
        : 0;
    const repetitionSeverity = finiteNumber(repetitionRisk.severity);
    const riskSignal = (
        dangerLevel * 30
        + replyCaptureValue * 0.3
        + continuationCaptureValue * 0.18
        + continuationPenalty * 0.32
        + badExchangeValue * 0.45
        + recaptureRisk * 0.5
        + postGainLossRisk * 0.75
        + repetitionSeverity * 7
    );
    const riskStrictness = Math.max(0, style.safety + style.precision - style.riskTolerance);
    components.risk = -riskSignal * riskStrictness * 0.22;

    if (isWinningSide && repetitionSeverity > 0) {
        const directRepeatMultiplier = (
            repetitionRisk.repeatsRecentPosition || repetitionRisk.repeatsSearchHistory
                ? 1.35
                : 1
        );
        const routeLoopMultiplier = repetitionRisk.repeatsMoveRoute ? 1.2 : 1;
        const conversionStrictness = Math.max(0.45, style.conversion * style.precision);
        const personaRepeatBreakMultiplier = personaId === 'beyazid'
            ? 1.65
            : (personaId === 'saray_veziri' ? 1.25 : 1);
        components.repetition = -repetitionSeverity
            * 32
            * conversionStrictness
            * conversionTuning.driftPenalty
            * directRepeatMultiplier
            * routeLoopMultiplier
            * personaRepeatBreakMultiplier;
    }

    const opponentMobility = finiteNumber(metadata.opponentMobility, 8);
    const tempoLoss = finiteNumber(metadata.tempoLoss);
    const captureValue = finiteNumber(staticExchange.captureValue);
    const pressureSignal = (
        (metadata.givesCheck ? 36 : 0)
        + (metadata.captures ? clampPositive(captureValue, 120) * 0.12 : 0)
        + clampPositive(10 - opponentMobility, 10) * 5
        + clampPositive(finiteNumber(clockPressure.bonus), 180) * 0.16
    );
    components.pressure = pressureSignal * style.pressure * 0.22;

    const endgameConversionSignal = clampPositive(finiteNumber(endgamePlan.score), 5000) * 0.035;
    const winningConversionSignal = isWinningSide ? (
        (metadata.givesCheck ? 52 : 0)
        + clampPositive(10 - opponentMobility, 10) * 8
        + (metadata.captures ? clampPositive(captureValue, 120) * 0.08 : 0)
        + clampPositive(finiteNumber(clockPressure.bonus), 180) * 0.08
    ) : 0;
    const quietWinningDriftPenalty = (
        isWinningSide
        && !metadata.givesCheck
        && !metadata.captures
        && opponentMobility >= 6
    )
        ? (10 + opponentMobility * 1.5) * Math.max(0.6, style.precision)
        : 0;
    components.conversion = (
        endgameConversionSignal
        + winningConversionSignal * 0.55 * conversionTuning.forcing
        - quietWinningDriftPenalty * conversionTuning.driftPenalty
    ) * style.conversion;

    if (isWinningSide) {
        const lowMobilityPressure = clampPositive(14 - opponentMobility, 14);
        const planProgressForNet = clampPositive(finiteNumber(metadata.planProgress), 40);
        const planDriftForNet = clampPositive(finiteNumber(metadata.planDrift), 60);
        const shouldCloseMateNet = (
            metadata.terminalWin
            || moveCount >= 72
            || planProgressForNet >= 16
        );

        if (shouldCloseMateNet) {
            const closureUrgency = 0.75 + clampRatio((moveCount - 72) / 72) * 0.95;
            const closureSignal = (
                (metadata.terminalWin ? 420 : 0)
                + (metadata.givesCheck ? 92 : 0)
                + Math.min(360, lowMobilityPressure * lowMobilityPressure * 1.7)
                + planProgressForNet * 2.15
                + (metadata.captures ? clampPositive(captureValue, 120) * 0.06 : 0)
                + endgameConversionSignal * 0.5
            );
            const passiveNetDrift = (
                !metadata.terminalWin
                && !metadata.givesCheck
                && !metadata.captures
                && opponentMobility >= 5
            )
                ? (22 + opponentMobility * 2.8 + planDriftForNet * 1.35 + repetitionSeverity * 12)
                : 0;

            components.mateNetClosure = (
                closureSignal
                - passiveNetDrift * conversionTuning.driftPenalty
            ) * mateNetTuning * Math.max(0.65, style.conversion) * closureUrgency;
        }
    }

    if (isWinningSide && moveColor === COLORS.BLACK) {
        const planProgress = finiteNumber(metadata.planProgress);
        const planDrift = clampPositive(finiteNumber(metadata.planDrift), 60);
        const blackForceSignal = (
            (metadata.givesCheck ? 70 : 0)
            + clampPositive(12 - opponentMobility, 12) * 6
            + clampPositive(planProgress, 36) * 1.5
            + (metadata.captures ? clampPositive(captureValue, 120) * 0.08 : 0)
            + endgameConversionSignal * 0.4
        );
        const blackDriftSignal = (
            !metadata.givesCheck
            && !metadata.captures
            && opponentMobility >= 6
        )
            ? (28 + opponentMobility * 2 + planDrift * 1.2)
            : 0;
        components.blackConversion = (
            blackForceSignal
            - blackDriftSignal * conversionTuning.driftPenalty
        ) * style.conversion * conversionTuning.forcing * 0.36;
    }

    const safetySignal = (
        (dangerLevel === 0 ? 10 : 0)
        + (replyCaptureValue === 0 ? 8 : 0)
        + clampPositive(finiteNumber(staticExchange.score), 100) * 0.18
        + (repetitionSeverity === 0 ? 4 : 0)
    );
    components.safety = safetySignal * style.safety * 0.18;

    const tempoSignal = (
        (metadata.givesCheck ? 12 : 0)
        + (metadata.captures ? clampPositive(captureValue, 120) * 0.12 : 0)
        + (candidate.move?.move?.specialMove || candidate.move?.specialMove ? 16 : 0)
    );
    const tempoLossMultiplier = getBaseDifficultyId(profile) === 'hard'
        ? 7.5
        : (getBaseDifficultyId(profile) === 'medium' ? 3.2 : 1.4);
    components.tempo = (tempoSignal * 0.22 - tempoLoss * tempoLossMultiplier) * style.tempo;

    const ownMobilityBefore = finiteNumber(metadata.ownMobilityBefore);
    const ownMobilityAfter = finiteNumber(metadata.ownMobilityAfter);
    const mobilityGain = Number.isFinite(metadata.ownMobilityAfter) && Number.isFinite(metadata.ownMobilityBefore)
        ? ownMobilityAfter - ownMobilityBefore
        : 0;
    const hasPlanMetadata = (
        Number.isFinite(metadata.planProgress)
        || Number.isFinite(metadata.planDrift)
        || (
            Number.isFinite(metadata.ownMobilityBefore)
            && Number.isFinite(metadata.ownMobilityAfter)
        )
    );
    const planProgress = finiteNumber(metadata.planProgress);
    const planDrift = clampPositive(finiteNumber(metadata.planDrift), 60);
    const planSignal = (
        planProgress
        + Math.max(0, mobilityGain) * 2.6
        + clampPositive(12 - opponentMobility, 12) * 1.9
        + (metadata.givesCheck ? 8 : 0)
        + (metadata.captures ? clampPositive(captureValue, 120) * 0.08 : 0)
        + clampPositive(finiteNumber(staticExchange.score), 80) * 0.08
    );
    const planPenalty = (
        planDrift * 1.55
        + Math.max(0, -mobilityGain) * 2.8
        + tempoLoss * 2.2
        + repetitionSeverity * 2.5
        + dangerLevel * 7
        + badExchangeValue * 0.08
        + postGainLossRisk * 0.12
    );
    components.plan = (
        hasPlanMetadata
            ? (planSignal * 1.18 - planPenalty)
            : 0
    ) * planTuning * Math.max(0.55, (style.pressure + style.tempo + style.precision) / 3);

    if (candidate.move?.openingBook) {
        const openingDebt = (
            dangerLevel * 16
            + replyCaptureValue * 0.18
            + badExchangeValue * 0.3
            + recaptureRisk * 0.18
            + repetitionSeverity * 6
        );
        components.opening = 18 * style.bookTrust - openingDebt * Math.max(0.7, style.precision);
    }

    const openingDisciplinePenalty = getOpeningDisciplinePenalty(candidate, metadata, profile, {
        captureValue,
        captureValueForRisk,
        dangerLevel,
        replyCaptureValue,
        badExchangeValue
    });
    if (openingDisciplinePenalty > 0) {
        components.opening -= openingDisciplinePenalty * Math.max(0.65, (style.safety + style.precision) / 2);
    }

    if (pacePressure > 0) {
        const progressSignal = (
            (metadata.terminalWin ? 220 : 0)
            + (metadata.givesCheck ? 34 : 0)
            + (metadata.captures ? clampPositive(captureValue, 130) * 0.22 : 0)
            + clampPositive(finiteNumber(staticExchange.score), 120) * 0.2
            + clampPositive(12 - opponentMobility, 12) * 5
            + endgameConversionSignal * 0.45
        );
        const quietDriftSignal = (
            (!metadata.givesCheck && !metadata.captures && !metadata.terminalWin)
                ? (12 + opponentMobility * 1.2)
                : 0
        );
        const noProgressPenalty = (
            quietDriftSignal
            + tempoLoss * 7
            + repetitionSeverity * 9
        );
        components.pace = (
            progressSignal * 0.28
            - noProgressPenalty * 0.55
        ) * pacePressure * conversionTuning.pace * Math.max(0.55, style.conversion);
    }

    addReason(reasons, 'style-pressure', components.pressure);
    addReason(reasons, 'style-conversion', components.conversion);
    addReason(reasons, 'style-safety', components.safety);
    addReason(reasons, 'style-tempo', components.tempo);
    addReason(reasons, 'style-risk-penalty', components.risk);
    addReason(reasons, 'style-winning-repetition-avoidance', components.repetition);
    if (personaId === 'beyazid' && components.repetition < -1) {
        reasons.push('style-persona-repeat-break');
    }
    addReason(reasons, 'style-black-conversion', components.blackConversion);
    addReason(reasons, 'style-mate-net-closure', components.mateNetClosure);
    addReason(reasons, 'style-pace-pressure', components.pace);
    addReason(reasons, 'style-plan-pressure', components.plan);
    if (components.opening < -1) {
        reasons.push('style-opening-risk');
    } else {
        addReason(reasons, 'style-opening-trust', components.opening);
    }

    const score = Object.values(components).reduce((sum, value) => sum + value, 0);
    return Object.freeze({
        score,
        components: Object.freeze(components),
        reasons: Object.freeze(reasons),
        style: Object.freeze(style)
    });
}

export function applyDecisionStyleToCandidates(candidates = [], profileInput = 'medium') {
    const profile = resolveProfile(profileInput);

    return candidates
        .map((candidate) => {
            const styleAdjustment = scoreCandidateDecisionStyle(candidate, profile);
            const baseScore = finiteNumber(candidate.score);
            return {
                ...candidate,
                baseScore,
                score: baseScore + styleAdjustment.score,
                styleAdjustment
            };
        })
        .sort((a, b) => b.score - a.score);
}
