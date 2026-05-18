import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_AI_PERSONA_ID,
    getAIPersona,
    getAllAIPersonas,
    isAIPersonaId
} from '../src/ai/AIPersonas.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';

test('AI persona tanimlari varsayilan karakter ve etiketleri tasir', () => {
    const personas = getAllAIPersonas();

    assert.equal(DEFAULT_AI_PERSONA_ID, 'timur');
    assert.equal(Object.keys(personas).length, 4);
    assert.equal(getAIPersona('timur').style, 'conqueror');
    assert.equal(getAIPersona('beyazid').labelKey, 'ai.persona.beyazid');
    assert.equal(isAIPersonaId('ulu_bey'), true);
    assert.equal(isAIPersonaId('unknown'), false);
    assert.equal(getAIPersona('unknown').id, DEFAULT_AI_PERSONA_ID);
});

test('aynı zorlukta persona modifierlari farkli oyun oncelikleri uretir', () => {
    const base = getAIProfile('medium');
    const timur = getAIProfile('medium', 'timur');
    const beyazid = getAIProfile('medium', 'beyazid');
    const uluBey = getAIProfile('medium', 'ulu_bey');
    const sarayVeziri = getAIProfile('medium', 'saray_veziri');

    assert.equal(timur.personaId, 'timur');
    assert.equal(beyazid.personaId, 'beyazid');
    assert.ok(timur.weights.winningEndgame > base.weights.winningEndgame);
    assert.ok(beyazid.ordering.pressure > base.ordering.pressure);
    assert.ok(beyazid.weights.royalSafety < base.weights.royalSafety);
    assert.ok(uluBey.weights.royalSafety > base.weights.royalSafety);
    assert.ok(sarayVeziri.weights.royalSafety > beyazid.weights.royalSafety);
    assert.notDeepEqual(beyazid.weights, uluBey.weights);
});

test('personalar ayni zorlukta hamle secim risklerini de ayristirir', () => {
    const beyazid = getAIProfile('medium', 'beyazid');
    const uluBey = getAIProfile('medium', 'ulu_bey');
    const sarayVeziri = getAIProfile('medium', 'saray_veziri');
    const hardBeyazid = getAIProfile('hard', 'beyazid');

    assert.ok(beyazid.selection.maxDangerLevel > sarayVeziri.selection.maxDangerLevel);
    assert.ok(uluBey.selection.maxRepetitionSeverity < beyazid.selection.maxRepetitionSeverity);
    assert.ok(sarayVeziri.selection.unsafeScoreTolerance > beyazid.selection.unsafeScoreTolerance);
    assert.equal(hardBeyazid.selection.maxDangerLevel, 0);
});
