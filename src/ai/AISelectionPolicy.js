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

function isTerminalWinCandidate(candidate) {
    return Boolean(candidate?.metadata?.terminalWin);
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
    const openingDebt = Math.max(0, getCandidateOpeningDebt(candidate) - getMaxOpeningDebt(selection)) * 1.15;
    const continuationDebt = Math.max(
        0,
        getCandidateContinuationDebt(candidate) - getMaxContinuationDebt(selection, profile)
    ) * 0.9;

    return dangerDebt + replyDebt + exchangeDebt + tempoDebt + openingDebt + continuationDebt;
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

function selectSaferCandidateIfNeeded(selectedCandidate, sortedCandidates, selection, profile) {
    if (!selectedCandidate || !selection.avoidUnsafe || sortedCandidates.length <= 1) {
        return selectedCandidate;
    }
    if (isTerminalWinCandidate(selectedCandidate) || isCandidateCleanEnough(selectedCandidate, selection, profile)) {
        return selectedCandidate;
    }

    const selectedSafetyDebt = getCandidateSafetyDebt(selectedCandidate, selection, profile);
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

    if (isCandidateCleanEnough(bestCandidate, selection, profile)) {
        return bestCandidate;
    }

    const bestSafetyDebt = getCandidateSafetyDebt(bestCandidate, selection, profile);
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
