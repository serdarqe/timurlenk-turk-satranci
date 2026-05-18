import { TIME_CONTROL_IDS } from '../game/TimeControls.js';
import { getAdaptiveSearchDepth } from './AiStrategy.js';
import { calculateAIPositionCriticality } from './AIPositionCriticality.js';

const PROFILE_DEPTH_LIMITS = Object.freeze({
    easy: Object.freeze({ min: 1, max: 2 }),
    medium: Object.freeze({ min: 1, max: 5 }),
    hard: Object.freeze({ min: 2, max: 7 })
});

const TIME_MODE_BUDGETS = Object.freeze({
    [TIME_CONTROL_IDS.NONE]: Object.freeze({
        maxThinkMs: Object.freeze({ easy: 260, medium: 650, hard: 1300 }),
        depthDelta: 0,
        rootScale: 1,
        branchScale: 1
    }),
    [TIME_CONTROL_IDS.FIVE_MINUTES]: Object.freeze({
        maxThinkMs: Object.freeze({ easy: 120, medium: 260, hard: 520 }),
        depthDelta: -1,
        rootScale: 1,
        branchScale: 0.82
    }),
    [TIME_CONTROL_IDS.FIFTEEN_MINUTES]: Object.freeze({
        maxThinkMs: Object.freeze({ easy: 160, medium: 420, hard: 850 }),
        depthDelta: 0,
        rootScale: 1,
        branchScale: 0.95
    }),
    [TIME_CONTROL_IDS.THIRTY_MINUTES]: Object.freeze({
        maxThinkMs: Object.freeze({ easy: 210, medium: 620, hard: 1200 }),
        depthDelta: 1,
        rootScale: 1.05,
        branchScale: 1.08
    })
});

const EASY_TEMPO_SLOT = Object.freeze({
    OVERTHINK: 1,
    RUSH: 3
});

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getProfileBaseId(profile) {
    return profile?.baseId || profile?.id?.split(':')[0] || 'medium';
}

function getGamePhase(pieceCount, moveCount) {
    if (pieceCount > 0 && pieceCount <= 8) return 'endgame';
    if ((moveCount || 0) <= 10) return 'opening';
    return 'middlegame';
}

function getTimeModeBudget(timeControl) {
    return TIME_MODE_BUDGETS[timeControl] || TIME_MODE_BUDGETS[TIME_CONTROL_IDS.NONE];
}

function applyClockPressure(budget, timeContext, baseId) {
    if (!timeContext?.isTimed) return budget;

    const ownPressure = timeContext.aiClockPressure || timeContext.sideToMoveClockPressure;
    const opponentPressure = timeContext.playerClockPressure;
    const next = { ...budget, reasons: [...budget.reasons] };

    if (ownPressure === 'critical') {
        next.maxThinkMs *= 0.45;
        next.depthDelta -= baseId === 'easy' ? 0 : 1;
        next.rootScale *= 0.78;
        next.branchScale *= 0.68;
        next.reasons.push('own-clock-critical');
        return next;
    }

    if (ownPressure === 'low') {
        next.maxThinkMs *= 0.65;
        next.depthDelta -= baseId === 'hard' ? 1 : 0;
        next.branchScale *= 0.78;
        next.reasons.push('own-clock-low');
    }

    if ((opponentPressure === 'critical' || opponentPressure === 'low') && ownPressure !== 'low') {
        next.maxThinkMs *= 0.85;
        next.branchScale *= 0.92;
        next.reasons.push('opponent-clock-pressure');
    }

    return next;
}

function applyPhaseBudget(budget, phase, timeControl) {
    const next = { ...budget, reasons: [...budget.reasons] };

    if (phase === 'opening') {
        next.maxThinkMs *= 0.62;
        next.depthDelta -= 1;
        next.branchScale *= 0.88;
        next.reasons.push('opening-fast-play');
        return next;
    }

    if (phase === 'endgame') {
        next.maxThinkMs *= 1.18;
        if (timeControl === TIME_CONTROL_IDS.FIFTEEN_MINUTES || timeControl === TIME_CONTROL_IDS.THIRTY_MINUTES || timeControl === TIME_CONTROL_IDS.NONE) {
            next.depthDelta += 1;
        }
        next.reasons.push('endgame-precision');
    }

    return next;
}

function applyCriticalityBudget(budget, criticality, baseId) {
    if (!criticality || criticality.level === 'quiet') return budget;

    const next = { ...budget, reasons: [...budget.reasons] };

    if (criticality.level === 'decisive') {
        next.maxThinkMs *= 1.32;
        next.depthDelta += baseId === 'easy' ? 0 : 1;
        next.rootScale *= 1.1;
        next.branchScale *= 1.16;
        next.reasons.push('position-decisive');
        return next;
    }

    if (criticality.level === 'critical') {
        next.maxThinkMs *= 1.24;
        next.depthDelta += baseId === 'easy' ? 0 : 1;
        next.rootScale *= 1.06;
        next.branchScale *= 1.12;
        next.reasons.push('position-critical');
        return next;
    }

    next.maxThinkMs *= 1.12;
    next.depthDelta += baseId === 'hard' ? 1 : 0;
    next.branchScale *= 1.06;
    next.reasons.push('position-sharp');
    return next;
}

function applyDifficultyTimeStyle(budget, baseId) {
    const next = { ...budget, reasons: [...budget.reasons] };
    const criticalityLevel = budget.criticality?.level || 'quiet';
    const moveCount = budget.moveCount || 0;

    if (baseId === 'easy') {
        if (criticalityLevel !== 'quiet') {
            next.maxThinkMs *= 0.82;
            next.branchScale *= 0.9;
            next.depthDelta -= criticalityLevel === 'sharp' ? 1 : 0;
            next.reasons.push('easy-limited-time-awareness');
        }

        const tempoSlot = moveCount % 4;
        if (tempoSlot === EASY_TEMPO_SLOT.OVERTHINK && budget.phase !== 'opening') {
            next.maxThinkMs *= 1.22;
            next.rootScale *= 1.05;
            next.reasons.push('easy-overthinks-quiet-tempo');
        } else if (tempoSlot === EASY_TEMPO_SLOT.RUSH && criticalityLevel !== 'decisive') {
            next.maxThinkMs *= 0.76;
            next.branchScale *= 0.86;
            next.reasons.push('easy-rushes-tempo');
        }

        return next;
    }

    if (baseId === 'medium') {
        if (criticalityLevel === 'sharp' && moveCount % 5 === 2) {
            next.maxThinkMs *= 0.93;
            next.branchScale *= 0.94;
            next.reasons.push('medium-imperfect-sharp-read');
        } else if (criticalityLevel === 'critical' || criticalityLevel === 'decisive') {
            next.maxThinkMs *= 1.03;
            next.reasons.push('medium-balanced-time-awareness');
        }

        return next;
    }

    if (baseId === 'hard') {
        if (criticalityLevel !== 'quiet') {
            next.maxThinkMs *= 1.08;
            next.rootScale *= 1.04;
            next.branchScale *= 1.06;
            if ((budget.criticality?.score || 0) >= 75) {
                next.depthDelta += 1;
            }
            next.reasons.push('hard-strategic-time-awareness');
        }

        return next;
    }

    return next;
}

function applyPersonaTimeStyle(budget, profile) {
    const style = profile?.personaTimeStyle;
    if (!style?.profile) return budget;

    const next = { ...budget, reasons: [...budget.reasons] };
    const criticalityLevel = budget.criticality?.level || 'quiet';
    const opponentPressure = budget.opponentClockPressure;

    if (budget.ownClockPressure === 'critical') {
        return budget;
    }

    if (style.profile === 'conqueror') {
        const hasPressureMoment = criticalityLevel === 'critical'
            || criticalityLevel === 'decisive'
            || opponentPressure === 'low'
            || opponentPressure === 'critical';
        if (hasPressureMoment) {
            next.maxThinkMs *= criticalityLevel === 'quiet'
                ? (style.pressureThink || 1.04)
                : (style.criticalThink || 1.06);
            next.rootScale *= 1.02;
            next.branchScale *= style.branchScale || 1.03;
            next.reasons.push('persona-conqueror-clock');
        }
        return next;
    }

    if (style.profile === 'tempo_attacker') {
        if (criticalityLevel === 'quiet') {
            next.maxThinkMs *= style.quietThink || 0.92;
        } else {
            next.maxThinkMs *= 0.96;
            next.rootScale *= style.tacticalRootScale || 1.04;
            next.branchScale *= style.tacticalBranchScale || 1.02;
        }
        next.reasons.push('persona-tempo-attacker-clock');
        return next;
    }

    if (style.profile === 'calculated') {
        if (criticalityLevel === 'critical' || criticalityLevel === 'decisive') {
            next.maxThinkMs *= style.criticalThink || 1.1;
            next.branchScale *= style.branchScale || 1.04;
            if (budget.baseId !== 'easy') {
                next.depthDelta += 1;
            }
            next.reasons.push('persona-calculated-clock');
        } else if (budget.phase === 'endgame') {
            next.maxThinkMs *= style.endgameThink || 1.08;
            next.branchScale *= style.branchScale || 1.04;
            next.reasons.push('persona-calculated-clock');
        }
        return next;
    }

    if (style.profile === 'defensive') {
        next.maxThinkMs *= style.quietThink || 0.96;
        next.branchScale *= style.safetyBranchScale || 1.03;
        if (budget.ownClockPressure === 'low') {
            next.maxThinkMs *= style.lowClockThink || 0.9;
        }
        next.reasons.push('persona-defensive-clock');
        return next;
    }

    return budget;
}

function scaleLimit(value, scale, min) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.round(value * scale));
}

function buildAdjustedProfile(profile, budget) {
    return Object.freeze({
        ...profile,
        id: `${profile.id}:time-${budget.timeControl}`,
        timeBudget: Object.freeze({ ...budget }),
        search: Object.freeze({
            ...profile.search,
            rootMoveLimit: scaleLimit(profile.search?.rootMoveLimit, budget.rootScale, 8),
            branchMoveLimit: scaleLimit(profile.search?.branchMoveLimit, budget.branchScale, 4)
        })
    });
}

export function calculateAITimeBudget(state, profileInput) {
    const profile = profileInput || {};
    const baseId = getProfileBaseId(profile);
    const timeContext = state?.aiTimeContext || state?.timeContext || null;
    const hasTimeContext = Boolean(timeContext);
    const timeControl = timeContext?.timeControl || state?.timeControl || TIME_CONTROL_IDS.NONE;
    const modeBudget = getTimeModeBudget(timeControl);
    const pieceCount = state?.board?.pieces?.length || 0;
    const moveCount = timeContext?.moveCount ?? state?.moveHistory?.length ?? 0;
    const phase = getGamePhase(pieceCount, moveCount);
    const ownClockPressure = timeContext?.aiClockPressure || timeContext?.sideToMoveClockPressure || 'none';
    const opponentClockPressure = timeContext?.playerClockPressure || 'none';
    const criticality = hasTimeContext
        ? calculateAIPositionCriticality(state, profile)
        : { score: 0, level: 'quiet', reasons: [] };

    let budget = {
        timeControl,
        phase,
        baseId,
        moveCount,
        isTimed: Boolean(timeContext?.isTimed),
        ownClockPressure,
        opponentClockPressure,
        clockLeadMs: Number.isFinite(timeContext?.clockLeadMs) ? timeContext.clockLeadMs : null,
        criticality,
        maxThinkMs: modeBudget.maxThinkMs[baseId] ?? modeBudget.maxThinkMs.medium,
        depthDelta: modeBudget.depthDelta,
        rootScale: modeBudget.rootScale,
        branchScale: modeBudget.branchScale,
        reasons: [`time-control-${timeControl}`]
    };

    if (hasTimeContext) {
        budget = applyPhaseBudget(budget, phase, timeControl);
        budget = applyCriticalityBudget(budget, criticality, baseId);
        budget = applyDifficultyTimeStyle(budget, baseId);
        budget = applyPersonaTimeStyle(budget, profile);
        budget = applyClockPressure(budget, timeContext, baseId);
    }

    budget.maxThinkMs = Math.round(clamp(budget.maxThinkMs, 90, 1800));
    budget.rootScale = clamp(budget.rootScale, 0.55, 1.2);
    budget.branchScale = clamp(budget.branchScale, 0.5, 1.2);
    budget.depthDelta = clamp(Math.round(budget.depthDelta), -2, 2);

    return Object.freeze(budget);
}

export function getTimeAdjustedSearchPlan(state, profileInput) {
    const profile = profileInput || {};
    const baseId = getProfileBaseId(profile);
    const baseDepth = getAdaptiveSearchDepth(state, profile);
    const budget = calculateAITimeBudget(state, profile);
    const limits = PROFILE_DEPTH_LIMITS[baseId] || PROFILE_DEPTH_LIMITS.medium;
    const depth = clamp(baseDepth + budget.depthDelta, limits.min, limits.max);
    const adjustedProfile = buildAdjustedProfile(profile, budget);

    return Object.freeze({
        baseDepth,
        depth,
        budget,
        profile: adjustedProfile
    });
}
