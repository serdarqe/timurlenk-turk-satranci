function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function getDifficultyPressureWeight(profile) {
    const baseId = getProfileBaseId(profile);
    if (baseId === 'hard') return 1.16;
    if (baseId === 'medium') return 0.78;
    return 0.42;
}

function getPressureIntensity(pressure) {
    if (pressure === 'critical') return 1.55;
    if (pressure === 'low') return 1.0;
    return 0;
}

function isOwnClockUnsafe(pressure) {
    return pressure === 'critical' || pressure === 'low';
}

export function scoreOpponentClockPressureMove({ timeBudget = null, profile = null, moveTraits = {} } = {}) {
    const opponentIntensity = getPressureIntensity(timeBudget?.opponentClockPressure);
    if (!timeBudget?.isTimed || opponentIntensity <= 0) {
        return Object.freeze({ bonus: 0, reasons: [] });
    }

    if (isOwnClockUnsafe(timeBudget?.ownClockPressure)) {
        return Object.freeze({ bonus: 0, reasons: ['own-clock-safety-first'] });
    }

    const reasons = [];
    let rawBonus = 0;

    if (moveTraits.terminalWin) {
        rawBonus += 220;
        reasons.push('clock-pressure-terminal');
    }

    if (moveTraits.givesCheck) {
        rawBonus += 58;
        reasons.push('clock-pressure-check');
    }

    if (moveTraits.captures) {
        rawBonus += 18 + Math.min(72, (moveTraits.captureValue || 0) * 0.42);
        reasons.push('clock-pressure-capture');
    }

    if (moveTraits.specialMove) {
        rawBonus += 24;
        reasons.push('clock-pressure-special');
    }

    if (Number.isFinite(moveTraits.opponentMobility)) {
        const mobilityPressure = Math.max(0, 12 - moveTraits.opponentMobility) * 7;
        if (mobilityPressure > 0) {
            rawBonus += mobilityPressure;
            reasons.push('clock-pressure-low-mobility');
        }
    }

    const replyRisk = Math.max(0, moveTraits.opponentReplyBestCaptureValue || 0);
    const safetyPenalty = Math.min(80, replyRisk * 0.22);
    const weightedBonus = (rawBonus * opponentIntensity * getDifficultyPressureWeight(profile)) - safetyPenalty;
    const bonus = Math.max(0, Math.round(weightedBonus));

    return Object.freeze({
        bonus,
        reasons: bonus > 0 ? reasons : []
    });
}
