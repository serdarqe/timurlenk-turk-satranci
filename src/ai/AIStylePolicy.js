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
const LATE_CONVERSION_START_MOVE = Object.freeze({
    easy: 260,
    medium: 210,
    hard: 156
});
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

function getLateConversionPressure(profile, moveCount) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const personaId = getPersonaId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    let startMove = botLevel >= 13
        ? Math.min(LATE_CONVERSION_START_MOVE[baseDifficulty] || 210, 144)
        : (LATE_CONVERSION_START_MOVE[baseDifficulty] || 210);
    if (baseDifficulty === 'hard' && isCautiousPersonaId(personaId)) {
        // Defensive/calculated personas are allowed to be solid early, but late games must stop drifting.
        startMove = Math.min(startMove, personaId === 'saray_veziri' ? 124 : 132);
    }
    const pressure = clampRatio((moveCount - startMove) / 96);
    const emergency = clampRatio((moveCount - 280) / 70);
    return pressure + emergency * 0.85;
}

function getLateConversionTuning(profile) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const personaId = getPersonaId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    const difficultyMultiplier = baseDifficulty === 'hard'
        ? 1.3
        : (baseDifficulty === 'medium' ? 0.72 : 0.22);
    const botMultiplier = botLevel >= 15
        ? 1.55
        : (botLevel >= 13 ? 1.35 : 1);
    const personaMultiplier = personaId === 'timur'
        ? 1.2
        : (personaId === 'beyazid'
            ? 1.14
            : (personaId === 'ulu_bey'
                ? 1.22
                : (personaId === 'saray_veziri' ? (baseDifficulty === 'hard' ? 1.36 : 1.18) : 1)));
    return difficultyMultiplier * botMultiplier * personaMultiplier;
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

function isCautiousPersonaId(personaId) {
    return personaId === 'ulu_bey' || personaId === 'saray_veziri';
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
        lateConversion: 0,
        repetition: 0,
        royalDrift: 0,
        stalemateRisk: 0,
        activeClosure: 0,
        drawBreak: 0,
        criticalReply: 0,
        endgameProgress: 0,
        beyazidRisk: 0
    };

    const metadata = candidate.metadata || {};
    const baseDifficulty = getBaseDifficultyId(profile);
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
    const lateConversionPressure = getLateConversionPressure(profile, moveCount);
    const planTuning = getPlanDifficultyTuning(profile);
    const mateNetTuning = getMateNetDifficultyTuning(profile);
    const movePieceType = candidate.move?.piece?.type || candidate.move?.move?.piece?.type || null;
    const isRoyalMove = (
        movePieceType === PIECE_TYPES.KING
        || movePieceType === PIECE_TYPES.PRINCE
        || movePieceType === PIECE_TYPES.ADVENTITIOUS_KING
    );
    const isQuietRoyalDrift = (
        isRoyalMove
        && !metadata.ownInCheckBefore
        && !metadata.terminalWin
        && !metadata.givesCheck
        && !metadata.captures
        && !isWinningSide
        && !(candidate.move?.move?.specialMove || candidate.move?.specialMove)
    );

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
    const routeRepeatCount = finiteNumber(repetitionRisk.routeRepeatCount);
    const routeRepeatEscalation = repetitionRisk.repeatsMoveRoute
        ? 1 + clampPositive(routeRepeatCount - 2, 5) * 0.34
        : 1;
    const reverseLoopEscalation = repetitionRisk.isImmediateReverse ? 1.22 : 1;
    const opponentMobility = finiteNumber(metadata.opponentMobility, 8);
    const tempoLoss = finiteNumber(metadata.tempoLoss);
    const captureValue = finiteNumber(staticExchange.captureValue);
    const matingNetActive = Boolean(metadata.matingNetActive);
    const matingNetScore = clampPositive(finiteNumber(metadata.matingNetScore), 900);
    const matingNetRepeatScale = matingNetActive
        ? (
            repetitionRisk.repeatsMoveRoute && routeRepeatCount >= 6
                ? (opponentMobility <= 2 || metadata.givesCheck ? 0.48 : 0.62)
                : (opponentMobility <= 2 || metadata.givesCheck ? 0.12 : 0.28)
        )
        : 1;
    const isQuietNonTerminalMove = (
        !metadata.terminalWin
        && !metadata.givesCheck
        && !metadata.captures
    );
    const hardLateRouteLockMultiplier = (
        baseDifficulty === 'hard'
        && isQuietNonTerminalMove
        && repetitionRisk.repeatsMoveRoute
        && routeRepeatCount >= 3
        && moveCount >= 120
    )
        ? (
            1.55
            + clampRatio((moveCount - 120) / 120) * 0.95
            + clampPositive(routeRepeatCount - 3, 4) * 0.18
        )
        : 1;
    const mediumBeyazidRouteLockMultiplier = (
        baseDifficulty === 'medium'
        && personaId === 'beyazid'
        && isQuietNonTerminalMove
        && repetitionRisk.repeatsMoveRoute
        && moveCount >= 96
    )
        ? (1.45 + clampRatio((moveCount - 120) / 100) * 0.45)
        : 1;
    const routeLockMultiplier = hardLateRouteLockMultiplier * mediumBeyazidRouteLockMultiplier;
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

    if (isQuietRoyalDrift) {
        const driftPenalty = getBaseDifficultyId(profile) === 'hard'
            ? 210
            : (getBaseDifficultyId(profile) === 'medium' ? 95 : 28);
        components.royalDrift = -driftPenalty * Math.max(0.55, style.precision) * Math.max(0.55, style.safety);
    }

    if (isWinningSide && repetitionSeverity > 0) {
        const directRepeatMultiplier = (
            repetitionRisk.repeatsRecentPosition || repetitionRisk.repeatsSearchHistory
                ? 1.35
                : 1
        );
        const routeLoopMultiplier = repetitionRisk.repeatsMoveRoute ? 1.85 : 1;
        const conversionStrictness = Math.max(0.45, style.conversion * style.precision);
        const personaRepeatBreakMultiplier = personaId === 'beyazid'
            ? 1.65
            : (personaId === 'ulu_bey'
                ? 1.45
                : (personaId === 'saray_veziri'
                    ? (baseDifficulty === 'hard' && moveCount >= 140 ? 1.62 : 1.32)
                    : 1));
        const lateWinningLoopUrgency = 1
            + clampRatio((moveCount - 120) / 120) * 1.15
            + clampRatio((moveCount - 220) / 80) * 0.85;
        const quietLoopMultiplier = (!metadata.captures && !metadata.givesCheck) ? 1.45 : 1;
        const planDriftMultiplier = 1 + clampPositive(finiteNumber(metadata.planDrift), 56) / 140;
        components.repetition = -repetitionSeverity
            * 56
            * conversionStrictness
            * conversionTuning.driftPenalty
            * directRepeatMultiplier
            * routeLoopMultiplier
            * routeRepeatEscalation
            * reverseLoopEscalation
            * personaRepeatBreakMultiplier
            * lateWinningLoopUrgency
            * quietLoopMultiplier
            * planDriftMultiplier
            * routeLockMultiplier
            * matingNetRepeatScale;
    } else {
        const repetitionStartMove = baseDifficulty === 'hard'
            ? 72
            : (baseDifficulty === 'medium' ? 84 : 112);
        if (repetitionSeverity > 0 && moveCount >= repetitionStartMove) {
            const directRepeatMultiplier = (
                repetitionRisk.repeatsRecentPosition || repetitionRisk.repeatsSearchHistory
                    ? 1.35
                    : 1
            );
            const routeLoopMultiplier = repetitionRisk.repeatsMoveRoute ? 1.75 : 1;
            const lateLoopUrgency = 1 + clampRatio((moveCount - repetitionStartMove) / 96);
            const lateLoopEscalation = 1
                + clampRatio((moveCount - 160) / 120) * 1.15
                + clampRatio((moveCount - 260) / 80) * 0.85;
            const difficultyMultiplier = baseDifficulty === 'hard' ? 1.6 : (baseDifficulty === 'medium' ? 1.18 : 0.62);
            const cautiousLockMultiplier = (
                baseDifficulty === 'hard'
                && isCautiousPersonaId(personaId)
                && !metadata.captures
                && !metadata.givesCheck
            ) ? (personaId === 'saray_veziri' && moveCount >= 140 ? 1.72 : 1.38) : 1;
            const quietLoopMultiplier = (!metadata.captures && !metadata.givesCheck) ? 1.42 : 1;
            const planDriftMultiplier = 1 + clampPositive(finiteNumber(metadata.planDrift), 48) / 160;
            components.repetition = -repetitionSeverity
                * 58
                * Math.max(0.55, style.conversion * style.precision)
                * directRepeatMultiplier
                * routeLoopMultiplier
                * routeRepeatEscalation
                * reverseLoopEscalation
                * lateLoopUrgency
                * lateLoopEscalation
                * difficultyMultiplier
                * cautiousLockMultiplier
                * quietLoopMultiplier
                * planDriftMultiplier
                * routeLockMultiplier
                * matingNetRepeatScale;
        }
    }

    const terminalStalemate = metadata.terminalResultType === 'stalemate';
    const stalemateLikeLock = (
        isWinningSide
        && !metadata.terminalWin
        && !metadata.givesCheck
        && opponentMobility <= 1
    );
    if (terminalStalemate || stalemateLikeLock) {
        const baseDifficulty = getBaseDifficultyId(profile);
        const basePenalty = baseDifficulty === 'hard'
            ? 1450
            : (baseDifficulty === 'medium' ? 860 : 260);
        const lateUrgency = 1
            + clampRatio((moveCount - 120) / 120) * 1.15
            + clampRatio((moveCount - 220) / 80) * 0.85;
        const personaLockMultiplier = isCautiousPersonaId(personaId) ? 1.18 : 1;
        const terminalMultiplier = terminalStalemate ? 1.35 : 1;
        components.stalemateRisk = -basePenalty
            * lateUrgency
            * personaLockMultiplier
            * terminalMultiplier
            * Math.max(0.65, style.precision)
            * Math.max(0.65, style.conversion);
    }

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
            const materialConversionUrgency = 1
                + clampRatio((moveCount - 160) / 100) * 0.78
                + clampRatio((moveCount - 240) / 80) * 0.62;
            const closureSignal = (
                (metadata.terminalWin ? 420 : 0)
                + (metadata.givesCheck ? 118 : 0)
                + Math.min(460, lowMobilityPressure * lowMobilityPressure * 2.15)
                + planProgressForNet * 2.7
                + (metadata.captures ? clampPositive(captureValue, 120) * 0.06 : 0)
                + endgameConversionSignal * 0.78
            );
            const passiveNetDrift = (
                !metadata.terminalWin
                && !metadata.givesCheck
                && !metadata.captures
                && opponentMobility >= 5
            )
                ? (
                    30
                    + opponentMobility * 3.3
                    + planDriftForNet * 1.65
                    + repetitionSeverity * 12
                    + (moveCount >= 180 ? 52 : 0)
                )
                : 0;

            components.mateNetClosure = (
                closureSignal
                - passiveNetDrift * conversionTuning.driftPenalty
            ) * mateNetTuning * Math.max(0.65, style.conversion) * closureUrgency * materialConversionUrgency;
        }

        const activeClosureEnabled = (
            matingNetActive
            || baseDifficulty === 'hard'
            || moveCount >= 180
        );
        const hardWinningClosureUrgency = (
            baseDifficulty === 'hard'
            && isWinningSide
        )
            ? (
                1
                + clampRatio((moveCount - 150) / 90) * 0.45
                + clampRatio((moveCount - 220) / 60) * 0.35
            )
            : 1;
        const activeClosurePressure = activeClosureEnabled
            ? (
                baseDifficulty === 'hard'
                    ? 1.05
                    : (baseDifficulty === 'medium' ? (matingNetActive ? 0.42 : 0.16) : (matingNetActive ? 0.16 : 0))
            )
            : 0;
        const activeClosureSignal = (
            (metadata.terminalWin ? 360 : 0)
            + (metadata.givesCheck ? 132 : 0)
            + (metadata.captures ? clampPositive(captureValue, 140) * 0.32 : 0)
            + clampPositive(finiteNumber(staticExchange.score), 180) * 0.32
            + clampPositive(14 - opponentMobility, 14) * 12
            + clampPositive(finiteNumber(metadata.planProgress), 72) * 4.4
            + matingNetScore * 0.28
            + endgameConversionSignal * 0.92
        );
        const inactiveDriftPenalty = (
            !metadata.terminalWin
            && !metadata.givesCheck
            && !metadata.captures
            && opponentMobility >= 4
        )
            ? (
                36
                + opponentMobility * 3.6
                + clampPositive(finiteNumber(metadata.planDrift), 80) * 2.1
                + tempoLoss * 8
                + repetitionSeverity * 14 * routeRepeatEscalation
            )
            : 0;
        components.activeClosure = (
            activeClosureSignal
            - inactiveDriftPenalty * conversionTuning.driftPenalty
        ) * activeClosurePressure * hardWinningClosureUrgency * Math.max(0.6, style.pressure) * Math.max(0.65, style.conversion);
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

    const criticalReplyEnabled = (
        baseDifficulty === 'hard'
        || Boolean(metadata.criticalReplyCheck)
        || (baseDifficulty === 'medium' && moveCount >= 120)
    );
    if (criticalReplyEnabled) {
        const criticalPressure = baseDifficulty === 'hard'
            ? 0.68
            : (baseDifficulty === 'medium' ? 0.34 : 0.12);
        const replyDanger = (
            clampPositive(replyCaptureValue - 32, 180) * 1.9
            + clampPositive(continuationCaptureValue - 24, 180) * 1.25
            + continuationPenalty * 1.08
            + dangerLevel * 56
            + badExchangeValue * 0.74
            + recaptureRisk * 0.46
            + postGainLossRisk * 1.05
        );
        const verifiedSafeProgress = (
            (replyCaptureValue <= 0 ? 22 : 0)
            + (dangerLevel === 0 ? 14 : 0)
            + clampPositive(finiteNumber(staticExchange.score), 140) * 0.46
            + clampPositive(planProgress, 56) * 1.2
            + Math.max(0, mobilityGain) * 4.4
            + clampPositive(10 - opponentMobility, 10) * 3.2
            + (metadata.givesCheck ? 28 : 0)
            + (metadata.captures ? clampPositive(captureValue, 120) * 0.16 : 0)
        );
        components.criticalReply = (verifiedSafeProgress - replyDanger)
            * criticalPressure
            * Math.max(0.72, style.precision)
            * Math.max(0.72, style.safety);
    }

    const materialBalanceAbs = finiteNumber(metadata.materialBalanceAbs, Infinity);
    const materialBalanceForMover = finiteNumber(metadata.materialBalanceForMover);
    const materialEdgeAbs = Number.isFinite(metadata.materialBalanceAbs)
        ? materialBalanceAbs
        : Math.abs(materialBalanceForMover);
    const balancedDrawBreakPressure = (
        !isWinningSide
        && moveCount >= 150
        && materialBalanceAbs <= 180
    )
        ? (
            baseDifficulty === 'hard'
                ? 1.08
                : (baseDifficulty === 'medium' ? 0.58 : 0.18)
        )
        : 0;
    if (balancedDrawBreakPressure > 0) {
        const pawnAdvance = clampPositive(finiteNumber(metadata.pawnAdvance), 4);
        const lineOpeningBonus = metadata.lineOpening ? 46 : 0;
        const structuralProgress = (
            clampPositive(planProgress, 72) * 3.35
            + Math.max(0, mobilityGain) * 7.8
            + pawnAdvance * 24
            + lineOpeningBonus
            + clampPositive(finiteNumber(metadata.planCenterGain), 8) * 8
            + clampPositive(finiteNumber(staticExchange.score), 120) * 0.22
            + clampPositive(12 - opponentMobility, 12) * 3.6
            + (metadata.givesCheck ? 36 : 0)
            + (metadata.captures ? clampPositive(captureValue, 120) * 0.18 : 0)
        );
        const balancedLoopDebt = isQuietNonTerminalMove
            ? (
                46
                + clampPositive(opponentMobility - 5, 12) * 4.4
                + planDrift * 3.8
                + tempoLoss * 14
                + repetitionSeverity * 42 * routeRepeatEscalation * reverseLoopEscalation
                + (repetitionRisk.repeatsMoveRoute ? 54 : 0)
            )
            : 0;
        components.drawBreak = (structuralProgress - balancedLoopDebt)
            * balancedDrawBreakPressure
            * Math.max(0.65, style.pressure)
            * Math.max(0.65, style.precision);
    }

    const endgameProgressPressure = (
        isWinningSide
        && moveCount >= 150
        && materialEdgeAbs >= 220
    )
        ? (
            0.55
            + clampRatio((moveCount - 150) / 120) * 0.95
            + clampRatio((moveCount - 230) / 50) * 0.9
            + clampRatio((materialEdgeAbs - 220) / 760) * 0.55
        ) * (
            baseDifficulty === 'hard'
                ? 1.16
                : (baseDifficulty === 'medium' ? 0.72 : 0.28)
        )
        : 0;
    if (endgameProgressPressure > 0) {
        const safeExchangeScore = clampPositive(finiteNumber(staticExchange.score), 180);
        const mobilityGainForProgress = Number.isFinite(metadata.ownMobilityAfter) && Number.isFinite(metadata.ownMobilityBefore)
            ? metadata.ownMobilityAfter - metadata.ownMobilityBefore
            : 0;
        const progressSignal = (
            (metadata.terminalWin ? 760 : 0)
            + (metadata.givesCheck ? 160 : 0)
            + (metadata.captures ? clampPositive(captureValue, 160) * 0.5 : 0)
            + safeExchangeScore * 0.55
            + clampPositive(13 - opponentMobility, 13) * 24
            + clampPositive(finiteNumber(metadata.planProgress), 72) * 6.6
            + clampPositive(finiteNumber(endgamePlan.score), 900) * 0.38
            + Math.max(0, mobilityGainForProgress) * 12
            + (metadata.lineOpening ? 56 : 0)
            + clampPositive(finiteNumber(metadata.pawnAdvance), 4) * 46
        );
        const noProgressDebt = (
            isQuietNonTerminalMove
                ? (
                    132
                    + clampPositive(opponentMobility - 3, 12) * 14
                    + clampPositive(finiteNumber(metadata.planDrift), 90) * 5.4
                    + tempoLoss * 44
                    + Math.max(0, -mobilityGainForProgress) * 22
                    + clampRatio((moveCount - 210) / 90) * (
                        baseDifficulty === 'hard'
                            ? 180
                            : (baseDifficulty === 'medium' ? 260 : 50)
                    )
                    + clampRatio((materialEdgeAbs - 700) / 520) * (
                        baseDifficulty === 'hard'
                            ? 120
                            : (baseDifficulty === 'medium' ? 180 : 36)
                    )
                    + (moveCount >= 240 ? 92 : 0)
                    + (moveCount >= 270 ? 140 : 0)
                )
                : 0
        );
        components.endgameProgress = (
            progressSignal - noProgressDebt
        )
            * endgameProgressPressure
            * 0.14
            * Math.max(0.72, style.conversion)
            * Math.max(0.72, style.precision);
    }

    if (baseDifficulty === 'medium' && personaId === 'beyazid' && moveCount >= 96) {
        const beyazidProgressSignal = (
            (metadata.givesCheck ? 30 : 0)
            + (metadata.captures ? clampPositive(captureValue, 120) * 0.22 : 0)
            + clampPositive(finiteNumber(staticExchange.score), 120) * 0.24
            + Math.max(0, mobilityGain) * 3.2
            + clampPositive(planProgress, 48) * 2.2
            + clampPositive(12 - opponentMobility, 12) * 2.4
        );
        const beyazidRepeatedAttackDebt = (
            isQuietNonTerminalMove
            && repetitionRisk.repeatsMoveRoute
        )
            ? (
                74
                + repetitionSeverity * 28 * routeRepeatEscalation
                + clampPositive(finiteNumber(metadata.planDrift), 64) * 1.6
                + tempoLoss * 12
            )
            : 0;
        components.plan += (beyazidProgressSignal - beyazidRepeatedAttackDebt)
            * 0.68
            * Math.max(0.7, style.precision)
            * Math.max(0.7, style.pressure);
    }

    if (personaId === 'beyazid') {
        const attackIntent = Boolean(
            metadata.givesCheck
            || metadata.captures
            || opponentMobility <= 5
            || finiteNumber(metadata.planProgress) >= 10
        );
        if (attackIntent) {
            const unsafeAttackSignal = (
                dangerLevel * 82
                + clampPositive(replyCaptureValue - 18, 180) * 0.7
                + clampPositive(continuationCaptureValue - 18, 180) * 0.42
                + continuationPenalty * 0.64
                + badExchangeValue * 1.08
                + recaptureRisk * 0.78
                + postGainLossRisk * 1.04
                + tempoLoss * 26
            );
            const controlledAttackSignal = (
                (metadata.givesCheck ? 34 : 0)
                + clampPositive(finiteNumber(staticExchange.score), 140) * 0.52
                + clampPositive(finiteNumber(metadata.planProgress), 56) * 0.7
                + Math.max(0, mobilityGain) * 2.4
                + clampPositive(10 - opponentMobility, 10) * 2.2
                + (replyCaptureValue <= 0 ? 18 : 0)
            );
            const beyazidRiskPressure = baseDifficulty === 'hard'
                ? 0.52
                : (baseDifficulty === 'medium' ? 0.38 : 0.18);
            components.beyazidRisk = -Math.max(0, unsafeAttackSignal - controlledAttackSignal)
                * beyazidRiskPressure
                * Math.max(0.75, style.precision)
                * Math.max(0.75, style.safety);
        }
    }

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

    if (lateConversionPressure > 0) {
        const latePlanProgress = clampPositive(finiteNumber(metadata.planProgress), 64);
        const latePlanDrift = clampPositive(finiteNumber(metadata.planDrift), 80);
        const lowMobilityPressure = clampPositive(14 - opponentMobility, 14);
        const safeExchangeScore = clampPositive(finiteNumber(staticExchange.score), 180);
        const maxMoveUrgency = 1
            + clampRatio((moveCount - 180) / 100) * 0.85
            + clampRatio((moveCount - 240) / 70) * 0.9;
        const cautiousLockPressure = (
            getBaseDifficultyId(profile) === 'hard'
            && isCautiousPersonaId(personaId)
        ) ? 1.28 : 1;
        const cleanCaptureSignal = metadata.captures
            ? clampPositive(captureValue, 150) * 0.42 + safeExchangeScore * 0.52
            : 0;
        const forcingSignal = (
            (metadata.terminalWin ? 900 : 0)
            + (metadata.givesCheck ? 220 : 0)
            + cleanCaptureSignal
            + Math.min(720, lowMobilityPressure * lowMobilityPressure * 3.05)
            + latePlanProgress * 8.2
            + endgameConversionSignal * 2.25
        );
        const quietDriftPenalty = (
            !metadata.terminalWin
            && !metadata.givesCheck
            && !metadata.captures
        )
            ? (
                78
                + opponentMobility * 8
                + latePlanDrift * 3.2
                + tempoLoss * 22
                + repetitionSeverity * 52 * routeRepeatEscalation * reverseLoopEscalation
                + (isCautiousPersonaId(personaId) ? 58 : 0)
            )
            : 0;
        const tacticalDebt = (
            dangerLevel * 54
            + badExchangeValue * 0.72
            + postGainLossRisk * 0.9
            + replyCaptureValue * 0.22
            + continuationPenalty * 0.28
        );

        components.lateConversion = (
            forcingSignal
            - quietDriftPenalty * conversionTuning.driftPenalty
            - tacticalDebt
        ) * lateConversionPressure * maxMoveUrgency * cautiousLockPressure * getLateConversionTuning(profile) * Math.max(0.72, style.conversion);
    }

    addReason(reasons, 'style-pressure', components.pressure);
    addReason(reasons, 'style-conversion', components.conversion);
    addReason(reasons, 'style-safety', components.safety);
    addReason(reasons, 'style-tempo', components.tempo);
    addReason(reasons, 'style-risk-penalty', components.risk);
    addReason(reasons, 'style-royal-drift-penalty', components.royalDrift);
    addReason(reasons, 'style-winning-repetition-avoidance', components.repetition);
    if (personaId === 'beyazid' && components.repetition < -1) {
        reasons.push('style-persona-repeat-break');
    }
    addReason(reasons, 'style-black-conversion', components.blackConversion);
    addReason(reasons, 'style-mate-net-closure', components.mateNetClosure);
    addReason(reasons, 'style-late-conversion', components.lateConversion);
    addReason(reasons, 'style-stalemate-risk', components.stalemateRisk);
    addReason(reasons, 'style-active-closure', components.activeClosure);
    addReason(reasons, 'style-balanced-draw-break', components.drawBreak);
    addReason(reasons, 'style-critical-reply-control', components.criticalReply);
    addReason(reasons, 'style-endgame-progress', components.endgameProgress);
    addReason(reasons, 'style-beyazid-risk-control', components.beyazidRisk);
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
