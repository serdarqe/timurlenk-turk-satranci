import { getAIPersona, isAIPersonaId } from './AIPersonas.js';
import { getAIBot, isAIBotId } from './AIBots.js';

const AI_PROFILES = Object.freeze({
    easy: Object.freeze({
        id: 'easy',
        label: 'Kolay',
        depth: Object.freeze({
            base: 1,
            narrowEndgame: 2,
            sparseEndgame: 2
        }),
        search: Object.freeze({
            rootMoveLimit: 18,
            branchMoveLimit: 8
        }),
        weights: Object.freeze({
            material: 1.15,
            center: 0.85,
            pawnAdvance: 0.9,
            citadel: 0.8,
            mobility: 0.55,
            royalSafety: 0.9,
            winningEndgame: 0.6,
            repetition: 1.05
        }),
        ordering: Object.freeze({
            capture: 1.25,
            promotion: 1.0,
            specialMove: 0.85,
            pressure: 0.65,
            center: 0.95
        }),
        decisionStyle: Object.freeze({
            precision: 0.45,
            riskTolerance: 0.85,
            pressure: 0.65,
            conversion: 0.55,
            safety: 0.55,
            tempo: 0.9,
            bookTrust: 0.78
        }),
        selection: Object.freeze({
            alwaysPickBest: false,
            mode: 'biased',
            scoreWindow: 16,
            poolSize: 2,
            preferBestProbability: 0.64,
            avoidRepetition: true,
            maxRepetitionSeverity: 1,
            avoidUnsafe: true,
            maxDangerLevel: 2,
            maxReplyCaptureValue: 75,
            unsafeScoreTolerance: 4
        })
    }),
    medium: Object.freeze({
        id: 'medium',
        label: 'Orta',
        depth: Object.freeze({
            base: 2,
            narrowEndgame: 3,
            sparseEndgame: 4
        }),
        search: Object.freeze({
            rootMoveLimit: 24,
            branchMoveLimit: 10
        }),
        weights: Object.freeze({
            material: 1.0,
            center: 1.0,
            pawnAdvance: 1.0,
            citadel: 1.0,
            mobility: 0.95,
            royalSafety: 1.0,
            winningEndgame: 1.0,
            repetition: 1.0
        }),
        ordering: Object.freeze({
            capture: 1.05,
            promotion: 1.05,
            specialMove: 1.0,
            pressure: 1.0,
            center: 1.0
        }),
        decisionStyle: Object.freeze({
            precision: 0.75,
            riskTolerance: 0.35,
            pressure: 0.9,
            conversion: 0.9,
            safety: 0.85,
            tempo: 0.75,
            bookTrust: 0.9
        }),
        selection: Object.freeze({
            alwaysPickBest: false,
            mode: 'biased',
            scoreWindow: 6,
            poolSize: 2,
            preferBestProbability: 0.9,
            avoidRepetition: true,
            maxRepetitionSeverity: 2,
            avoidUnsafe: true,
            maxDangerLevel: 1,
            maxReplyCaptureValue: 45,
            unsafeScoreTolerance: 14
        })
    }),
    hard: Object.freeze({
        id: 'hard',
        label: 'Zor',
        depth: Object.freeze({
            base: 5,
            narrowEndgame: 6,
            sparseEndgame: 7
        }),
        search: Object.freeze({
            rootMoveLimit: 36,
            branchMoveLimit: 14
        }),
        weights: Object.freeze({
            material: 1.0,
            center: 1.05,
            pawnAdvance: 1.05,
            citadel: 1.1,
            mobility: 1.2,
            royalSafety: 1.3,
            winningEndgame: 1.9,
            repetition: 2.0
        }),
        ordering: Object.freeze({
            capture: 1.0,
            promotion: 1.2,
            specialMove: 1.2,
            pressure: 1.55,
            center: 1.0
        }),
        decisionStyle: Object.freeze({
            precision: 1.35,
            riskTolerance: 0.03,
            pressure: 1.22,
            conversion: 1.5,
            safety: 1.35,
            tempo: 0.65,
            bookTrust: 1.02
        }),
        selection: Object.freeze({
            alwaysPickBest: true,
            mode: 'best',
            scoreWindow: 0,
            poolSize: 1,
            avoidUnsafe: true,
            maxDangerLevel: 0,
            maxReplyCaptureValue: 12,
            unsafeScoreTolerance: 70
        })
    })
});

const WEIGHT_ALIASES = Object.freeze({
    conversion: 'winningEndgame'
});

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function addSelectionDelta(selection, key, delta, min, max) {
    if (!Number.isFinite(selection[key]) || !Number.isFinite(delta)) return;
    selection[key] = clampNumber(selection[key] + delta, min, max);
}

function applyDecisionStyleModifiers(decisionStyle, modifiers) {
    const next = { ...decisionStyle };

    Object.entries(modifiers || {}).forEach(([key, multiplier]) => {
        if (Number.isFinite(next[key]) && Number.isFinite(multiplier)) {
            next[key] = clampNumber(next[key] * multiplier, 0, 2);
        }
    });

    return next;
}

function scaleSearchLimit(value, scale, min, max) {
    if (!Number.isFinite(value)) return min;
    if (!Number.isFinite(scale)) return clampNumber(Math.round(value), min, max);
    return clampNumber(Math.round(value * scale), min, max);
}

function scaleWeight(weights, key, scale, min = 0.2, max = 3) {
    if (!Number.isFinite(weights[key]) || !Number.isFinite(scale)) return;
    weights[key] = clampNumber(weights[key] * scale, min, max);
}

function applySelectionOverride(selection, key, value, min, max) {
    if (!Number.isFinite(value)) return;
    selection[key] = clampNumber(value, min, max);
}

function applyPersonaModifiers(profile, personaId) {
    if (!isAIPersonaId(personaId)) {
        return profile;
    }

    const persona = getAIPersona(personaId);
    const weights = { ...profile.weights };
    const ordering = { ...profile.ordering };
    const selection = { ...profile.selection };
    const decisionStyle = applyDecisionStyleModifiers(profile.decisionStyle, persona.decisionStyleModifiers);

    Object.entries(persona.modifiers || {}).forEach(([key, multiplier]) => {
        const weightKey = WEIGHT_ALIASES[key] || key;
        if (Number.isFinite(weights[weightKey]) && Number.isFinite(multiplier)) {
            weights[weightKey] *= multiplier;
            return;
        }

        if (Number.isFinite(ordering[key]) && Number.isFinite(multiplier)) {
            ordering[key] *= multiplier;
        }
    });

    addSelectionDelta(selection, 'maxDangerLevel', persona.selectionModifiers?.maxDangerLevelDelta, 0, 3);
    addSelectionDelta(selection, 'maxRepetitionSeverity', persona.selectionModifiers?.maxRepetitionSeverityDelta, 0, 4);
    addSelectionDelta(selection, 'unsafeScoreTolerance', persona.selectionModifiers?.unsafeScoreToleranceDelta, 0, 60);
    addSelectionDelta(selection, 'preferBestProbability', persona.selectionModifiers?.preferBestProbabilityDelta, 0, 1);

    if (profile.id === 'hard' && Number.isFinite(profile.selection.maxDangerLevel)) {
        selection.maxDangerLevel = Math.min(selection.maxDangerLevel, profile.selection.maxDangerLevel);
    }

    return Object.freeze({
        ...profile,
        id: `${profile.id}:${persona.id}`,
        baseId: profile.id,
        personaId: persona.id,
        personaStyle: persona.style,
        personaTimeStyle: Object.freeze({ ...(persona.timeStyle || {}) }),
        personaLabel: persona.labels?.tr || persona.id,
        depth: Object.freeze({ ...profile.depth }),
        search: Object.freeze({ ...profile.search }),
        weights: Object.freeze(weights),
        ordering: Object.freeze(ordering),
        decisionStyle: Object.freeze(decisionStyle),
        selection: Object.freeze(selection)
    });
}

function applyBotCalibration(profile, bot) {
    const calibration = bot?.calibration;
    if (!calibration) return profile;

    const depthBonus = Number.isFinite(calibration.search?.depthBonus)
        ? calibration.search.depthBonus
        : 0;
    const depth = {
        base: clampNumber((profile.depth?.base || 1) + depthBonus, 1, 8),
        narrowEndgame: clampNumber((profile.depth?.narrowEndgame || 2) + depthBonus, 1, 9),
        sparseEndgame: clampNumber((profile.depth?.sparseEndgame || 2) + depthBonus + (depthBonus >= 2 ? 1 : 0), 1, 10)
    };

    const search = {
        rootMoveLimit: scaleSearchLimit(profile.search?.rootMoveLimit, calibration.search?.rootMoveScale, 8, 52),
        branchMoveLimit: scaleSearchLimit(profile.search?.branchMoveLimit, calibration.search?.branchMoveScale, 4, 22)
    };

    const weights = { ...profile.weights };
    const ordering = { ...profile.ordering };
    scaleWeight(weights, 'winningEndgame', calibration.weights?.endgameScale);
    scaleWeight(weights, 'royalSafety', calibration.weights?.safetyScale);
    scaleWeight(weights, 'mobility', calibration.weights?.mobilityScale);
    scaleWeight(weights, 'repetition', calibration.weights?.repetitionScale);
    scaleWeight(ordering, 'pressure', calibration.weights?.pressureScale);

    const selection = { ...profile.selection };
    const selectionCalibration = calibration.selection || {};
    addSelectionDelta(selection, 'scoreWindow', selectionCalibration.scoreWindowDelta, 0, 36);
    addSelectionDelta(selection, 'poolSize', selectionCalibration.poolSizeDelta, 1, 4);
    addSelectionDelta(selection, 'preferBestProbability', selectionCalibration.preferBestProbabilityDelta, 0, 1);
    addSelectionDelta(selection, 'maxDangerLevel', selectionCalibration.maxDangerLevelDelta, 0, 3);
    addSelectionDelta(selection, 'maxRepetitionSeverity', selectionCalibration.maxRepetitionSeverityDelta, 0, 4);
    addSelectionDelta(selection, 'maxReplyCaptureValue', selectionCalibration.maxReplyCaptureValueDelta, 0, 120);
    addSelectionDelta(selection, 'unsafeScoreTolerance', selectionCalibration.unsafeScoreToleranceDelta, 0, 70);

    applySelectionOverride(selection, 'scoreWindow', selectionCalibration.scoreWindowOverride, 0, 36);
    applySelectionOverride(selection, 'poolSize', selectionCalibration.poolSizeOverride, 1, 4);
    applySelectionOverride(selection, 'preferBestProbability', selectionCalibration.preferBestProbabilityOverride, 0, 1);

    if (typeof selectionCalibration.alwaysPickBest === 'boolean') {
        selection.alwaysPickBest = selectionCalibration.alwaysPickBest;
        selection.mode = selectionCalibration.mode || (selection.alwaysPickBest ? 'best' : 'biased');
    }

    if (selection.alwaysPickBest) {
        selection.mode = 'best';
        selection.scoreWindow = 0;
        selection.poolSize = 1;
    } else if (!Number.isFinite(selection.preferBestProbability)) {
        selection.preferBestProbability = 0.92;
    }

    return Object.freeze({
        ...profile,
        depth: Object.freeze(depth),
        search: Object.freeze(search),
        weights: Object.freeze(weights),
        ordering: Object.freeze(ordering),
        selection: Object.freeze(selection)
    });
}

function applyBotModifiers(botId) {
    if (!isAIBotId(botId)) {
        return null;
    }

    const bot = getAIBot(botId);
    const baseProfile = AI_PROFILES[bot.difficulty] || AI_PROFILES.medium;
    const personaProfile = applyPersonaModifiers(baseProfile, bot.personaId);
    const calibratedProfile = applyBotCalibration(personaProfile, bot);
    const decisionStyle = applyDecisionStyleModifiers(calibratedProfile.decisionStyle, bot.engineModifiers);

    return Object.freeze({
        ...calibratedProfile,
        id: `${calibratedProfile.id}:${bot.id}`,
        botId: bot.id,
        botLevel: bot.level,
        botStars: bot.stars,
        botRating: bot.rating,
        botCalibration: bot.calibration,
        botLabel: bot.labels?.tr || bot.id,
        openingBookPreferences: Object.freeze([...(bot.openingBookPreferences || [])]),
        decisionStyle: Object.freeze(decisionStyle)
    });
}

export function getAIProfile(difficulty = 'medium', personaId = null, botId = null) {
    const botProfile = applyBotModifiers(botId);
    if (botProfile) {
        return botProfile;
    }

    const profile = AI_PROFILES[difficulty] || AI_PROFILES.medium;
    return personaId ? applyPersonaModifiers(profile, personaId) : profile;
}

export function getAllAIProfiles() {
    return AI_PROFILES;
}
