export const DEFAULT_AI_PERSONA_ID = 'timur';

function freezePersona(persona) {
    return Object.freeze({
        ...persona,
        labels: Object.freeze({ ...persona.labels }),
        descriptions: Object.freeze({ ...persona.descriptions }),
        modifiers: Object.freeze({ ...persona.modifiers }),
        decisionStyleModifiers: Object.freeze({ ...(persona.decisionStyleModifiers || {}) }),
        timeStyle: Object.freeze({ ...(persona.timeStyle || {}) }),
        selectionModifiers: Object.freeze({ ...(persona.selectionModifiers || {}) })
    });
}

export const AI_PERSONAS = Object.freeze({
    timur: freezePersona({
        id: 'timur',
        labelKey: 'ai.persona.timur',
        descriptionKey: 'ai.persona.timur_desc',
        labels: { tr: 'Timur', en: 'Timur' },
        descriptions: {
            tr: 'Baskı kurar, üstünlüğü kazanca çevirmeyi sever.',
            en: 'Builds pressure and converts advantages firmly.'
        },
        style: 'conqueror',
        modifiers: {
            pressure: 1.18,
            conversion: 1.16,
            repetition: 1.12,
            material: 1.0
        },
        decisionStyleModifiers: {
            pressure: 1.18,
            conversion: 1.18,
            safety: 1.02,
            riskTolerance: 0.9
        },
        timeStyle: {
            profile: 'conqueror',
            criticalThink: 1.08,
            pressureThink: 1.06,
            branchScale: 1.04
        },
        selectionModifiers: {
            maxRepetitionSeverityDelta: -1,
            unsafeScoreToleranceDelta: -2
        }
    }),
    beyazid: freezePersona({
        id: 'beyazid',
        labelKey: 'ai.persona.beyazid',
        descriptionKey: 'ai.persona.beyazid_desc',
        labels: { tr: 'Beyazıd', en: 'Bayezid' },
        descriptions: {
            tr: 'Cesur saldırır, alan ve tempo arar.',
            en: 'Attacks boldly and looks for space and tempo.'
        },
        style: 'bold_attacker',
        modifiers: {
            pressure: 1.2,
            material: 0.96,
            royalSafety: 0.95,
            mobility: 1.1
        },
        decisionStyleModifiers: {
            pressure: 1.28,
            tempo: 1.18,
            riskTolerance: 1.35,
            safety: 0.88,
            precision: 0.96,
            bookTrust: 0.94
        },
        timeStyle: {
            profile: 'tempo_attacker',
            quietThink: 0.9,
            tacticalRootScale: 1.06,
            tacticalBranchScale: 1.03
        },
        selectionModifiers: {
            maxDangerLevelDelta: 1,
            unsafeScoreToleranceDelta: -6,
            preferBestProbabilityDelta: 0.04
        }
    }),
    ulu_bey: freezePersona({
        id: 'ulu_bey',
        labelKey: 'ai.persona.ulu_bey',
        descriptionKey: 'ai.persona.ulu_bey_desc',
        labels: { tr: 'Uluğ Bey', en: 'Ulugh Beg' },
        descriptions: {
            tr: 'Hesaplı oynar, güvenli kral ve dengeli taş değeri arar.',
            en: 'Plays carefully, valuing royal safety and balance.'
        },
        style: 'calculated',
        modifiers: {
            royalSafety: 1.15,
            repetition: 1.08,
            material: 1.04,
            pressure: 1.0
        },
        decisionStyleModifiers: {
            precision: 1.18,
            safety: 1.12,
            conversion: 1.08,
            riskTolerance: 0.72,
            bookTrust: 1.04
        },
        timeStyle: {
            profile: 'calculated',
            criticalThink: 1.14,
            endgameThink: 1.1,
            branchScale: 1.05
        },
        selectionModifiers: {
            maxRepetitionSeverityDelta: -1,
            unsafeScoreToleranceDelta: 4,
            preferBestProbabilityDelta: 0.06
        }
    }),
    saray_veziri: freezePersona({
        id: 'saray_veziri',
        labelKey: 'ai.persona.saray_veziri',
        descriptionKey: 'ai.persona.saray_veziri_desc',
        labels: { tr: 'Saray Veziri', en: 'Palace Vizier' },
        descriptions: {
            tr: 'Savunmayı önce tutar, taş güvenliğini korur.',
            en: 'Prioritizes defense and keeps pieces secure.'
        },
        style: 'defensive',
        modifiers: {
            royalSafety: 1.25,
            material: 1.05,
            pressure: 0.92,
            conversion: 0.95
        },
        decisionStyleModifiers: {
            safety: 1.25,
            precision: 1.08,
            riskTolerance: 0.55,
            pressure: 0.9,
            tempo: 0.86,
            bookTrust: 0.96
        },
        timeStyle: {
            profile: 'defensive',
            quietThink: 0.94,
            safetyBranchScale: 1.04,
            lowClockThink: 0.9
        },
        selectionModifiers: {
            maxDangerLevelDelta: -1,
            unsafeScoreToleranceDelta: 12,
            preferBestProbabilityDelta: -0.04
        }
    })
});

export function isAIPersonaId(id) {
    return Boolean(id && AI_PERSONAS[id]);
}

export function getAIPersona(id = DEFAULT_AI_PERSONA_ID) {
    return AI_PERSONAS[id] || AI_PERSONAS[DEFAULT_AI_PERSONA_ID];
}

export function getAIPersonaLabel(id = DEFAULT_AI_PERSONA_ID, locale = 'tr') {
    const persona = getAIPersona(id);
    return persona.labels?.[locale] || persona.labels?.tr || persona.id;
}

export function getAllAIPersonas() {
    return AI_PERSONAS;
}
