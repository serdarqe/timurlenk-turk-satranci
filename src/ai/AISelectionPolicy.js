import { getAIProfile } from './AIProfiles.js';

function resolveProfile(profileInput = 'medium') {
    return typeof profileInput === 'string' ? getAIProfile(profileInput) : profileInput;
}

function getCandidatePool(sortedCandidates, selection) {
    if (!sortedCandidates.length) return [];

    const bestScore = sortedCandidates[0].score;
    return sortedCandidates
        .filter((candidate) => candidate.score >= bestScore - selection.scoreWindow)
        .slice(0, selection.poolSize);
}

function getCandidateRepetitionSeverity(candidate) {
    return candidate?.repetitionRisk?.severity ?? 0;
}

function getMaxRepetitionSeverity(selection) {
    return Number.isFinite(selection.maxRepetitionSeverity)
        ? selection.maxRepetitionSeverity
        : Infinity;
}

function getCandidateRepetitionDebt(candidate, selection, profile) {
    const severityDebt = Math.max(0, getCandidateRepetitionSeverity(candidate) - getMaxRepetitionSeverity(selection));
    if (!severityDebt) return 0;

    const baseDifficulty = getBaseDifficultyId(profile);
    const baseDebt = baseDifficulty === 'hard'
        ? 150
        : (baseDifficulty === 'medium' ? 95 : 55);
    const risk = candidate?.repetitionRisk || {};
    const directLoopMultiplier = risk.repeatsRecentPosition || risk.repeatsSearchHistory ? 1.25 : 1;
    const routeLoopMultiplier = risk.repeatsMoveRoute ? 1.35 : 1;

    return severityDebt * baseDebt * directLoopMultiplier * routeLoopMultiplier;
}

function getCandidateDangerLevel(candidate) {
    return candidate?.tacticalRisk?.dangerLevel ?? 0;
}

function getCandidateReplyCaptureValue(candidate) {
    return candidate?.opponentReplyThreat?.bestCaptureValue ?? 0;
}

function getCandidateContinuationDebt(candidate) {
    const penalty = candidate?.opponentContinuationThreat?.penalty;
    return Number.isFinite(penalty) ? Math.max(0, -penalty) : 0;
}

function getMaxContinuationDebt(selection, profile) {
    if (Number.isFinite(selection.maxContinuationDebt)) return selection.maxContinuationDebt;

    const baseDifficulty = getBaseDifficultyId(profile);
    if (baseDifficulty === 'easy') return 240;
    if (baseDifficulty === 'hard') return 72;
    return 130;
}

function getCandidateCaptureValue(candidate) {
    const captureValue = candidate?.staticExchange?.captureValue;
    return Number.isFinite(captureValue) ? Math.max(0, captureValue) : 0;
}

function getCandidateStaticExchangeScore(candidate) {
    const score = candidate?.staticExchange?.score;
    return Number.isFinite(score) ? score : 0;
}

function getCandidateStaticExchangeDebt(candidate) {
    const exchangeDebt = candidate?.staticExchange?.exchangeDebt;
    if (Number.isFinite(exchangeDebt)) return Math.max(0, exchangeDebt);

    return Math.max(0, -getCandidateStaticExchangeScore(candidate));
}

function getCandidateTempoLoss(candidate) {
    const tempoLoss = candidate?.metadata?.tempoLoss;
    if (tempoLoss === true) return 1;
    if (tempoLoss === false || tempoLoss == null) return 0;
    return Number.isFinite(tempoLoss) ? Math.max(0, tempoLoss) : 0;
}

function getCandidateMoveCount(candidate) {
    const moveCount = candidate?.metadata?.moveCount;
    return Number.isFinite(moveCount) ? moveCount : null;
}

function getCandidateOpeningDebt(candidate) {
    const openingScore = candidate?.styleAdjustment?.components?.opening;
    return Number.isFinite(openingScore) ? Math.max(0, -openingScore) : 0;
}

function getMaxOpeningDebt(selection) {
    return Number.isFinite(selection.maxOpeningDebt) ? selection.maxOpeningDebt : 120;
}

function getBaseDifficultyId(profile) {
    return profile?.baseId || String(profile?.id || 'medium').split(':')[0];
}

function isCautiousPersona(profile) {
    return profile?.personaId === 'ulu_bey' || profile?.personaId === 'saray_veziri';
}

function isTerminalWinCandidate(candidate) {
    return Boolean(
        candidate?.metadata?.terminalWin
        && candidate?.metadata?.terminalResultType !== 'stalemate'
    );
}

function isStalemateWinCandidate(candidate) {
    return Boolean(
        candidate?.metadata?.terminalWin
        && candidate?.metadata?.terminalResultType === 'stalemate'
    );
}

function isLateConversionProfile(profile) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    return baseDifficulty === 'hard' || botLevel >= 13;
}

function getLateConversionStartMove(profile) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (botLevel >= 13) return 144;
    if (baseDifficulty === 'hard' && isCautiousPersona(profile)) return 132;
    if (baseDifficulty === 'hard') return 156;
    if (baseDifficulty === 'medium') return 210;
    return 260;
}

function isLateConversionPosition(candidate, profile) {
    const moveCount = getCandidateMoveCount(candidate);
    return (
        isLateConversionProfile(profile)
        && moveCount != null
        && moveCount >= getLateConversionStartMove(profile)
    );
}

function isCandidateForcingProgress(candidate) {
    const metadata = candidate?.metadata || {};
    const endgamePlanScore = candidate?.endgamePlan?.score;
    const opponentMobility = Number.isFinite(metadata.opponentMobility) ? metadata.opponentMobility : 8;
    const planProgress = Number.isFinite(metadata.planProgress) ? metadata.planProgress : 0;

    return (
        isTerminalWinCandidate(candidate)
        || Boolean(metadata.givesCheck)
        || (
            Boolean(metadata.captures)
            && getCandidateCaptureValue(candidate) >= 20
            && getCandidateStaticExchangeScore(candidate) >= -8
        )
        || opponentMobility <= 3
        || (Number.isFinite(endgamePlanScore) && endgamePlanScore >= 120)
        || planProgress >= 20
    );
}

function isCandidateQuietDrift(candidate) {
    const metadata = candidate?.metadata || {};
    const opponentMobility = Number.isFinite(metadata.opponentMobility) ? metadata.opponentMobility : 8;
    const planProgress = Number.isFinite(metadata.planProgress) ? metadata.planProgress : 0;
    const planDrift = Number.isFinite(metadata.planDrift) ? metadata.planDrift : 0;
    const tempoLoss = getCandidateTempoLoss(candidate);
    const moveCount = getCandidateMoveCount(candidate) || 0;
    const repetitionSeverity = getCandidateRepetitionSeverity(candidate);

    return (
        !isTerminalWinCandidate(candidate)
        && !metadata.givesCheck
        && !metadata.captures
        && opponentMobility >= 6
        && planProgress < 16
        && (
            planDrift >= 8
            || tempoLoss > 0
            || repetitionSeverity > 0
            || moveCount >= 240
        )
    );
}

function getCandidateRouteRepeatCount(candidate) {
    const routeRepeatCount = candidate?.repetitionRisk?.routeRepeatCount;
    return Number.isFinite(routeRepeatCount) ? Math.max(0, routeRepeatCount) : 0;
}

function isCandidateLoopingConversion(candidate, profile) {
    const repetitionSeverity = getCandidateRepetitionSeverity(candidate);
    if (repetitionSeverity <= 0) return false;

    const metadata = candidate?.metadata || {};
    const risk = candidate?.repetitionRisk || {};
    const moveCount = getCandidateMoveCount(candidate) || 0;
    const baseDifficulty = getBaseDifficultyId(profile);
    const startMove = baseDifficulty === 'hard'
        ? 112
        : (baseDifficulty === 'medium' ? 148 : 196);
    const routeRepeatCount = getCandidateRouteRepeatCount(candidate);

    return Boolean(
        metadata.isWinningSide
        || moveCount >= startMove
        || risk.repeatsRecentPosition
        || risk.repeatsSearchHistory
        || routeRepeatCount >= 3
        || repetitionSeverity >= 5
    );
}

function isThreefoldRepetitionCandidate(candidate) {
    const risk = candidate?.repetitionRisk || {};
    if (risk.wouldCauseThreefold) return true;

    const severity = getCandidateRepetitionSeverity(candidate);
    const routeRepeatCount = getCandidateRouteRepeatCount(candidate);
    return Boolean(
        severity >= 5
        && (
            (risk.repeatsRecentPosition && risk.repeatsSearchHistory)
            || (risk.repeatsRecentPosition && risk.repeatsMoveRoute && routeRepeatCount >= 4)
        )
    );
}

function getCandidateMaterialBalanceForMover(candidate) {
    const balance = candidate?.metadata?.materialBalanceForMover;
    return Number.isFinite(balance) ? balance : 0;
}

function isDefensiveDrawSave(candidate) {
    return (
        isThreefoldRepetitionCandidate(candidate)
        && getCandidateMaterialBalanceForMover(candidate) <= -350
        && !isTerminalWinCandidate(candidate)
    );
}

function hasMeaningfulRepetitionImprovement(candidate, selectedCandidate, selection) {
    const candidateSeverity = getCandidateRepetitionSeverity(candidate);
    const selectedSeverity = getCandidateRepetitionSeverity(selectedCandidate);
    if (candidateSeverity <= getMaxRepetitionSeverity(selection)) return true;
    return candidateSeverity <= Math.max(0, selectedSeverity - 2);
}

function getCandidateSafetyDebt(candidate, selection, profile = null) {
    const maxDangerLevel = Number.isFinite(selection.maxDangerLevel)
        ? selection.maxDangerLevel
        : getCandidateDangerLevel(candidate);
    const maxReplyCaptureValue = Number.isFinite(selection.maxReplyCaptureValue)
        ? selection.maxReplyCaptureValue
        : getCandidateReplyCaptureValue(candidate);

    const dangerDebt = Math.max(0, getCandidateDangerLevel(candidate) - maxDangerLevel) * 90;
    const replyDebt = Math.max(0, getCandidateReplyCaptureValue(candidate) - maxReplyCaptureValue) * 2.4;
    const exchangeDebt = getCandidateStaticExchangeDebt(candidate) * 1.35;
    const tempoDebt = getCandidateTempoLoss(candidate) * 8;
    const repetitionDebt = getCandidateRepetitionDebt(candidate, selection, profile);
    const openingDebt = Math.max(0, getCandidateOpeningDebt(candidate) - getMaxOpeningDebt(selection)) * 1.15;
    const continuationDebt = Math.max(
        0,
        getCandidateContinuationDebt(candidate) - getMaxContinuationDebt(selection, profile)
    ) * 0.9;

    return dangerDebt + replyDebt + exchangeDebt + tempoDebt + repetitionDebt + openingDebt + continuationDebt;
}

function reduceRepetitionRisk(pool, selection) {
    if (!selection.avoidRepetition || pool.length <= 1) return pool;

    const minimumSeverity = Math.min(...pool.map(getCandidateRepetitionSeverity));
    const severityThreshold = Math.min(
        minimumSeverity,
        Number.isFinite(selection.maxRepetitionSeverity) ? selection.maxRepetitionSeverity : minimumSeverity
    );

    const filtered = pool.filter((candidate) => getCandidateRepetitionSeverity(candidate) <= severityThreshold);
    return filtered.length ? filtered : pool;
}

function reduceTacticalDanger(pool, selection) {
    if (!selection.avoidUnsafe || pool.length <= 1) return pool;

    const minimumDanger = Math.min(...pool.map(getCandidateDangerLevel));
    const dangerThreshold = Math.min(
        minimumDanger,
        Number.isFinite(selection.maxDangerLevel) ? selection.maxDangerLevel : minimumDanger
    );

    const filtered = pool.filter((candidate) => getCandidateDangerLevel(candidate) <= dangerThreshold);
    return filtered.length ? filtered : pool;
}

function reduceReplyThreat(pool, selection) {
    if (!selection.avoidUnsafe || pool.length <= 1) return pool;
    if (!Number.isFinite(selection.maxReplyCaptureValue)) return pool;

    const filtered = pool.filter((candidate) => (
        isTerminalWinCandidate(candidate)
        || getCandidateReplyCaptureValue(candidate) <= selection.maxReplyCaptureValue
    ));

    return filtered.length ? filtered : pool;
}

function getUnsafeScoreTolerance(selection, bestSafetyDebt, profile) {
    const baseTolerance = Number.isFinite(selection.unsafeScoreTolerance)
        ? selection.unsafeScoreTolerance
        : selection.scoreWindow;

    const baseDifficulty = getBaseDifficultyId(profile);
    if (baseDifficulty === 'easy') {
        // Easy may still blunder, but should avoid a free major-piece drop when a close safe move exists.
        return Math.max(baseTolerance, Math.min(54, baseTolerance + bestSafetyDebt * 0.22));
    }

    if (baseDifficulty === 'medium') {
        // Medium should keep personality variance without ignoring clear reply-captures.
        return Math.max(baseTolerance, Math.min(92, baseTolerance + bestSafetyDebt * 0.55));
    }

    if (baseDifficulty !== 'hard') {
        return Math.max(baseTolerance, Math.min(72, baseTolerance + bestSafetyDebt * 0.35));
    }

    // Hard mode should prefer a clean continuation over a flashy move that drops material.
    return Math.max(baseTolerance, Math.min(180, baseTolerance + bestSafetyDebt * 0.75));
}

function hasMeaningfulSafetyImprovement(candidateDebt, bestDebt) {
    if (candidateDebt <= 0) return true;
    return candidateDebt <= bestDebt - 30 || candidateDebt <= bestDebt * 0.45;
}

function isCandidateCleanEnough(candidate, selection, profile = null) {
    if (isTerminalWinCandidate(candidate)) return true;

    const maxDangerLevel = Number.isFinite(selection.maxDangerLevel)
        ? selection.maxDangerLevel
        : getCandidateDangerLevel(candidate);
    const maxReplyCaptureValue = Number.isFinite(selection.maxReplyCaptureValue)
        ? selection.maxReplyCaptureValue
        : getCandidateReplyCaptureValue(candidate);

    return (
        getCandidateDangerLevel(candidate) <= maxDangerLevel
        && getCandidateReplyCaptureValue(candidate) <= maxReplyCaptureValue
        && getCandidateRepetitionSeverity(candidate) <= getMaxRepetitionSeverity(selection)
        && getCandidateStaticExchangeDebt(candidate) <= 0
        && getCandidateOpeningDebt(candidate) <= getMaxOpeningDebt(selection)
        && getCandidateContinuationDebt(candidate) <= getMaxContinuationDebt(selection, profile)
    );
}

function getCleanCaptureOverrideTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    if (baseDifficulty === 'easy') return Math.min(190, 80 + selectedSafetyDebt * 0.6);
    if (baseDifficulty === 'medium') return Math.min(380, 150 + selectedSafetyDebt * 1.05);
    if (baseDifficulty === 'hard') return Math.min(560, 220 + selectedSafetyDebt * 1.25);
    return Math.min(300, 120 + selectedSafetyDebt);
}

function findCleanHighValueCapture(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    const selectedCaptureValue = getCandidateCaptureValue(selectedCandidate);
    const overrideTolerance = getCleanCaptureOverrideTolerance(profile, selectedSafetyDebt);
    const minimumCaptureValue = getBaseDifficultyId(profile) === 'easy' ? 75 : 50;

    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && isCandidateCleanEnough(candidate, selection, profile)
            && getCandidateCaptureValue(candidate) >= minimumCaptureValue
            && getCandidateStaticExchangeScore(candidate) >= 35
            && getCandidateCaptureValue(candidate) >= selectedCaptureValue
        ))
        .sort((a, b) => (
            getCandidateStaticExchangeScore(b) - getCandidateStaticExchangeScore(a)
            || getCandidateCaptureValue(b) - getCandidateCaptureValue(a)
            || b.score - a.score
        ))[0] || null;
}

function getLateConversionOverrideTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (botLevel >= 15) return Math.min(720, 320 + selectedSafetyDebt * 1.35);
    if (botLevel >= 13) return Math.min(620, 280 + selectedSafetyDebt * 1.25);
    if (baseDifficulty === 'hard' && isCautiousPersona(profile)) {
        return Math.min(640, 300 + selectedSafetyDebt * 1.22);
    }
    if (baseDifficulty === 'hard') return Math.min(520, 240 + selectedSafetyDebt * 1.1);
    if (baseDifficulty === 'medium') return Math.min(300, 140 + selectedSafetyDebt * 0.8);
    return Math.min(150, 70 + selectedSafetyDebt * 0.45);
}

function getForcingProgressRank(candidate) {
    const metadata = candidate?.metadata || {};
    const endgamePlanScore = Number.isFinite(candidate?.endgamePlan?.score)
        ? candidate.endgamePlan.score
        : 0;
    const opponentMobility = Number.isFinite(metadata.opponentMobility) ? metadata.opponentMobility : 8;
    const planProgress = Number.isFinite(metadata.planProgress) ? metadata.planProgress : 0;

    return (
        (isTerminalWinCandidate(candidate) ? 10000 : 0)
        + (metadata.givesCheck ? 900 : 0)
        + Math.max(0, 12 - opponentMobility) * 42
        + Math.max(0, planProgress) * 18
        + Math.max(0, endgamePlanScore) * 0.8
        + getCandidateStaticExchangeScore(candidate) * 1.5
        + getCandidateCaptureValue(candidate) * 1.2
        - getCandidateTempoLoss(candidate) * 20
    );
}

function isCandidateStructuralProgress(candidate) {
    const metadata = candidate?.metadata || {};
    const endgamePlanScore = Number.isFinite(candidate?.endgamePlan?.score)
        ? candidate.endgamePlan.score
        : 0;
    const opponentMobility = Number.isFinite(metadata.opponentMobility) ? metadata.opponentMobility : 8;
    const planProgress = Number.isFinite(metadata.planProgress) ? metadata.planProgress : 0;
    const ownMobilityBefore = Number.isFinite(metadata.ownMobilityBefore) ? metadata.ownMobilityBefore : null;
    const ownMobilityAfter = Number.isFinite(metadata.ownMobilityAfter) ? metadata.ownMobilityAfter : null;
    const mobilityGain = ownMobilityBefore != null && ownMobilityAfter != null
        ? ownMobilityAfter - ownMobilityBefore
        : 0;

    return Boolean(
        isCandidateForcingProgress(candidate)
        || planProgress >= 10
        || endgamePlanScore >= 80
        || opponentMobility <= 5
        || metadata.lineOpening
        || (Number.isFinite(metadata.pawnAdvance) && metadata.pawnAdvance > 0)
        || mobilityGain >= 3
    );
}

function getStructuralProgressRank(candidate) {
    const metadata = candidate?.metadata || {};
    const ownMobilityBefore = Number.isFinite(metadata.ownMobilityBefore) ? metadata.ownMobilityBefore : null;
    const ownMobilityAfter = Number.isFinite(metadata.ownMobilityAfter) ? metadata.ownMobilityAfter : null;
    const mobilityGain = ownMobilityBefore != null && ownMobilityAfter != null
        ? ownMobilityAfter - ownMobilityBefore
        : 0;

    return (
        getForcingProgressRank(candidate)
        + (metadata.lineOpening ? 120 : 0)
        + (Number.isFinite(metadata.pawnAdvance) ? Math.max(0, metadata.pawnAdvance) * 90 : 0)
        + Math.max(0, mobilityGain) * 36
        - Math.max(0, getCandidateRepetitionSeverity(candidate)) * 80
    );
}

function getThreefoldVetoTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (botLevel >= 13) return Math.min(2200, 860 + selectedSafetyDebt * 0.72);
    if (baseDifficulty === 'hard') return Math.min(1900, 760 + selectedSafetyDebt * 0.64);
    if (baseDifficulty === 'medium') return Math.min(900, 360 + selectedSafetyDebt * 0.34);
    return Math.min(240, 80 + selectedSafetyDebt * 0.1);
}

function findThreefoldVetoAlternative(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    if (!isThreefoldRepetitionCandidate(selectedCandidate)) return null;
    if (isDefensiveDrawSave(selectedCandidate)) return null;

    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (baseDifficulty === 'easy' && botLevel < 7) return null;

    const overrideTolerance = getThreefoldVetoTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && hasMeaningfulRepetitionImprovement(candidate, selectedCandidate, selection)
            && isCandidateStructuralProgress(candidate)
            && !isCandidateQuietDrift(candidate)
            && (
                isCandidateCleanEnough(candidate, selection, profile)
                || hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt)
            )
        ))
        .sort((a, b) => (
            getCandidateRepetitionSeverity(a) - getCandidateRepetitionSeverity(b)
            || getStructuralProgressRank(b) - getStructuralProgressRank(a)
            || getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || b.score - a.score
        ))[0] || null;
}

function findLateConversionAlternative(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    if (!isLateConversionPosition(selectedCandidate, profile)) return null;
    if (!isCandidateQuietDrift(selectedCandidate)) return null;

    const overrideTolerance = getLateConversionOverrideTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && isCandidateForcingProgress(candidate)
            && (
                isCandidateCleanEnough(candidate, selection, profile)
                || hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt)
            )
        ))
        .sort((a, b) => (
            getForcingProgressRank(b) - getForcingProgressRank(a)
            || getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || b.score - a.score
        ))[0] || null;
}

function getConversionLoopOverrideTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (botLevel >= 15) return Math.min(1080, 380 + selectedSafetyDebt * 0.54);
    if (botLevel >= 13) return Math.min(980, 340 + selectedSafetyDebt * 0.5);
    if (baseDifficulty === 'hard') return Math.min(860, 300 + selectedSafetyDebt * 0.46);
    if (baseDifficulty === 'medium') return Math.min(520, 170 + selectedSafetyDebt * 0.36);
    return Math.min(230, 78 + selectedSafetyDebt * 0.18);
}

function findConversionLoopAlternative(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    if (!isCandidateLoopingConversion(selectedCandidate, profile)) return null;

    const overrideTolerance = getConversionLoopOverrideTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && hasMeaningfulRepetitionImprovement(candidate, selectedCandidate, selection)
            && isCandidateForcingProgress(candidate)
            && !isCandidateQuietDrift(candidate)
            && (
                isCandidateCleanEnough(candidate, selection, profile)
                || hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt)
            )
        ))
        .sort((a, b) => (
            getForcingProgressRank(b) - getForcingProgressRank(a)
            || getCandidateRepetitionSeverity(a) - getCandidateRepetitionSeverity(b)
            || getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || b.score - a.score
        ))[0] || null;
}

function getStalemateOverrideTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const botLevel = Number.isFinite(profile?.botLevel) ? profile.botLevel : 0;
    if (botLevel >= 13) return Math.min(78000, 56000 + selectedSafetyDebt * 1.2);
    if (baseDifficulty === 'hard') return Math.min(70000, 50000 + selectedSafetyDebt);
    if (baseDifficulty === 'medium') return Math.min(32000, 18000 + selectedSafetyDebt * 0.6);
    return Math.min(9000, 3600 + selectedSafetyDebt * 0.25);
}

function findAlternativeForStalemateWin(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    if (!isStalemateWinCandidate(selectedCandidate)) return null;

    const overrideTolerance = getStalemateOverrideTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && !isStalemateWinCandidate(candidate)
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && isCandidateForcingProgress(candidate)
            && (
                isCandidateCleanEnough(candidate, selection, profile)
                || hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt)
            )
        ))
        .sort((a, b) => (
            getForcingProgressRank(b) - getForcingProgressRank(a)
            || getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || b.score - a.score
        ))[0] || null;
}

function getRiskyLowValueCaptureTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    if (baseDifficulty === 'easy') return Math.min(120, 44 + selectedSafetyDebt * 0.28);
    if (baseDifficulty === 'medium') return Math.min(170, 74 + selectedSafetyDebt * 0.42);
    if (baseDifficulty === 'hard') return Math.min(260, 110 + selectedSafetyDebt * 0.55);
    return Math.min(150, 60 + selectedSafetyDebt * 0.35);
}

function findSaferAlternativeForRiskyLowValueCapture(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    if (getCandidateCaptureValue(selectedCandidate) > 25 || selectedSafetyDebt < 120) return null;

    const overrideTolerance = getRiskyLowValueCaptureTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => (
            candidate !== selectedCandidate
            && candidate.score >= selectedCandidate.score - overrideTolerance
            && (
                isCandidateCleanEnough(candidate, selection, profile)
                || hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt)
            )
        ))
        .sort((a, b) => (
            getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || getCandidateStaticExchangeScore(b) - getCandidateStaticExchangeScore(a)
            || b.score - a.score
        ))[0] || null;
}

function getCatastrophicSafetyTolerance(profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    if (baseDifficulty === 'hard') return Math.min(1800, 520 + selectedSafetyDebt * 0.42);
    if (baseDifficulty === 'medium') return Math.min(920, 260 + selectedSafetyDebt * 0.26);
    return Math.min(360, 120 + selectedSafetyDebt * 0.12);
}

function findAlternativeForCatastrophicSafetyDebt(selectedCandidate, sortedCandidates, selection, profile, selectedSafetyDebt) {
    const baseDifficulty = getBaseDifficultyId(profile);
    const catastrophicThreshold = baseDifficulty === 'hard'
        ? 520
        : (baseDifficulty === 'medium' ? 760 : 1180);
    if (selectedSafetyDebt < catastrophicThreshold) return null;

    const overrideTolerance = getCatastrophicSafetyTolerance(profile, selectedSafetyDebt);
    return sortedCandidates
        .filter((candidate) => {
            if (candidate === selectedCandidate) return false;
            if (candidate.score < selectedCandidate.score - overrideTolerance) return false;
            if (isTerminalWinCandidate(candidate)) return true;

            const debt = getCandidateSafetyDebt(candidate, selection, profile);
            return (
                debt <= 90
                || debt <= selectedSafetyDebt * 0.18
                || (
                    hasMeaningfulSafetyImprovement(debt, selectedSafetyDebt)
                    && getCandidateStaticExchangeDebt(candidate) <= 20
                    && getCandidateReplyCaptureValue(candidate) <= getCandidateReplyCaptureValue(selectedCandidate) * 0.35
                )
            );
        })
        .sort((a, b) => (
            getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile)
            || getCandidateStaticExchangeScore(b) - getCandidateStaticExchangeScore(a)
            || b.score - a.score
        ))[0] || null;
}

function selectSaferCandidateIfNeeded(selectedCandidate, sortedCandidates, selection, profile) {
    if (!selectedCandidate || !selection.avoidUnsafe || sortedCandidates.length <= 1) {
        return selectedCandidate;
    }
    if (isTerminalWinCandidate(selectedCandidate)) {
        return selectedCandidate;
    }

    const selectedSafetyDebt = getCandidateSafetyDebt(selectedCandidate, selection, profile);
    if (isDefensiveDrawSave(selectedCandidate)) {
        return selectedCandidate;
    }

    const threefoldVetoAlternative = findThreefoldVetoAlternative(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (threefoldVetoAlternative) return threefoldVetoAlternative;

    const stalemateAlternative = findAlternativeForStalemateWin(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (stalemateAlternative) return stalemateAlternative;

    const conversionLoopAlternative = findConversionLoopAlternative(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (conversionLoopAlternative) return conversionLoopAlternative;

    const lateConversionAlternative = findLateConversionAlternative(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (lateConversionAlternative) return lateConversionAlternative;

    const catastrophicSafetyAlternative = findAlternativeForCatastrophicSafetyDebt(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (catastrophicSafetyAlternative) return catastrophicSafetyAlternative;

    if (isCandidateCleanEnough(selectedCandidate, selection, profile)) {
        return selectedCandidate;
    }

    const cleanHighValueCapture = findCleanHighValueCapture(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (cleanHighValueCapture) return cleanHighValueCapture;

    const saferLowValueAlternative = findSaferAlternativeForRiskyLowValueCapture(
        selectedCandidate,
        sortedCandidates,
        selection,
        profile,
        selectedSafetyDebt
    );
    if (saferLowValueAlternative) return saferLowValueAlternative;

    const unsafeScoreTolerance = getUnsafeScoreTolerance(selection, selectedSafetyDebt, profile);
    const candidatesInRange = sortedCandidates.filter((candidate) => (
        candidate !== selectedCandidate
        && candidate.score >= selectedCandidate.score - unsafeScoreTolerance
    ));

    const cleanCandidate = candidatesInRange
        .filter((candidate) => isCandidateCleanEnough(candidate, selection, profile))
        .sort((a, b) => getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile) || b.score - a.score)[0];
    if (cleanCandidate) return cleanCandidate;

    const leastUnsafeCandidate = candidatesInRange
        .filter((candidate) => hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), selectedSafetyDebt))
        .sort((a, b) => getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile) || b.score - a.score)[0];

    return leastUnsafeCandidate || selectedCandidate;
}

function selectBestWithSafetyGuard(sortedCandidates, selection, profile) {
    const bestCandidate = sortedCandidates[0];
    if (!selection.avoidUnsafe || sortedCandidates.length <= 1) return bestCandidate;
    if (isTerminalWinCandidate(bestCandidate)) return bestCandidate;

    const bestSafetyDebt = getCandidateSafetyDebt(bestCandidate, selection, profile);
    if (isDefensiveDrawSave(bestCandidate)) {
        return bestCandidate;
    }

    const threefoldVetoAlternative = findThreefoldVetoAlternative(
        bestCandidate,
        sortedCandidates,
        selection,
        profile,
        bestSafetyDebt
    );
    if (threefoldVetoAlternative) return threefoldVetoAlternative;

    const stalemateAlternative = findAlternativeForStalemateWin(
        bestCandidate,
        sortedCandidates,
        selection,
        profile,
        bestSafetyDebt
    );
    if (stalemateAlternative) return stalemateAlternative;

    const conversionLoopAlternative = findConversionLoopAlternative(
        bestCandidate,
        sortedCandidates,
        selection,
        profile,
        bestSafetyDebt
    );
    if (conversionLoopAlternative) return conversionLoopAlternative;

    const lateConversionAlternative = findLateConversionAlternative(
        bestCandidate,
        sortedCandidates,
        selection,
        profile,
        bestSafetyDebt
    );
    if (lateConversionAlternative) return lateConversionAlternative;

    const catastrophicSafetyAlternative = findAlternativeForCatastrophicSafetyDebt(
        bestCandidate,
        sortedCandidates,
        selection,
        profile,
        bestSafetyDebt
    );
    if (catastrophicSafetyAlternative) return catastrophicSafetyAlternative;

    if (isCandidateCleanEnough(bestCandidate, selection, profile)) {
        return bestCandidate;
    }

    const unsafeScoreTolerance = getUnsafeScoreTolerance(selection, bestSafetyDebt, profile);
    const candidatesInRange = sortedCandidates.filter((candidate) => (
        candidate !== bestCandidate
        && candidate.score >= bestCandidate.score - unsafeScoreTolerance
    ));
    const saferCandidate = candidatesInRange
        .filter((candidate) => isCandidateCleanEnough(candidate, selection, profile))
        .sort((a, b) => getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile) || b.score - a.score)[0];

    if (saferCandidate) return saferCandidate;

    const leastUnsafeCandidate = candidatesInRange
        .filter((candidate) => hasMeaningfulSafetyImprovement(getCandidateSafetyDebt(candidate, selection, profile), bestSafetyDebt))
        .sort((a, b) => getCandidateSafetyDebt(a, selection, profile) - getCandidateSafetyDebt(b, selection, profile) || b.score - a.score)[0];

    return leastUnsafeCandidate || bestCandidate;
}

export function selectMoveFromCandidates(candidates = [], profileInput = 'medium', randomValue = Math.random()) {
    if (!candidates.length) return null;

    const profile = resolveProfile(profileInput);
    const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score);
    const selection = profile.selection;

    if (selection.alwaysPickBest || sortedCandidates.length === 1) {
        return selectBestWithSafetyGuard(sortedCandidates, selection, profile);
    }

    const pool = reduceReplyThreat(
        reduceTacticalDanger(
            reduceRepetitionRisk(getCandidatePool(sortedCandidates, selection), selection),
            selection
        ),
        selection
    );
    if (pool.length <= 1) {
        return selectSaferCandidateIfNeeded(pool[0] || sortedCandidates[0], sortedCandidates, selection, profile);
    }

    if (selection.mode === 'spread') {
        const index = Math.min(pool.length - 1, Math.floor(randomValue * pool.length));
        return selectSaferCandidateIfNeeded(pool[index], sortedCandidates, selection, profile);
    }

    if (selection.mode === 'biased') {
        if (randomValue < selection.preferBestProbability) {
            return selectSaferCandidateIfNeeded(pool[0], sortedCandidates, selection, profile);
        }

        const alternatives = pool.slice(1);
        if (!alternatives.length) {
            return selectSaferCandidateIfNeeded(pool[0], sortedCandidates, selection, profile);
        }

        const normalized = (randomValue - selection.preferBestProbability) / (1 - selection.preferBestProbability);
        const index = Math.min(alternatives.length - 1, Math.floor(normalized * alternatives.length));
        return selectSaferCandidateIfNeeded(alternatives[index], sortedCandidates, selection, profile);
    }

    return selectSaferCandidateIfNeeded(sortedCandidates[0], sortedCandidates, selection, profile);
}
