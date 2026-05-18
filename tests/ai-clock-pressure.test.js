import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreOpponentClockPressureMove } from '../src/ai/AIClockPressure.js';
import { getAIProfile } from '../src/ai/AIProfiles.js';

test('rakip saat baskisi yoksa hamle bonusu vermez', () => {
    const result = scoreOpponentClockPressureMove({
        timeBudget: {
            isTimed: true,
            ownClockPressure: 'healthy',
            opponentClockPressure: 'healthy'
        },
        profile: getAIProfile('hard'),
        moveTraits: {
            givesCheck: true,
            captures: true,
            captureValue: 100,
            opponentMobility: 2
        }
    });

    assert.equal(result.bonus, 0);
    assert.deepEqual(result.reasons, []);
});

test('rakibin suresi kritikse sah ve dusuk mobilite bonus alir', () => {
    const result = scoreOpponentClockPressureMove({
        timeBudget: {
            isTimed: true,
            ownClockPressure: 'healthy',
            opponentClockPressure: 'critical'
        },
        profile: getAIProfile('hard'),
        moveTraits: {
            givesCheck: true,
            captures: false,
            opponentMobility: 3,
            opponentReplyBestCaptureValue: 0
        }
    });

    assert.ok(result.bonus > 100);
    assert.ok(result.reasons.includes('clock-pressure-check'));
    assert.ok(result.reasons.includes('clock-pressure-low-mobility'));
});

test('zor mod rakip sure baskisini kolaydan daha stratejik kullanir', () => {
    const timeBudget = {
        isTimed: true,
        ownClockPressure: 'healthy',
        opponentClockPressure: 'low'
    };
    const moveTraits = {
        givesCheck: true,
        captures: true,
        captureValue: 80,
        opponentMobility: 4,
        opponentReplyBestCaptureValue: 0
    };

    const easy = scoreOpponentClockPressureMove({ timeBudget, profile: getAIProfile('easy'), moveTraits });
    const hard = scoreOpponentClockPressureMove({ timeBudget, profile: getAIProfile('hard'), moveTraits });

    assert.ok(hard.bonus > easy.bonus);
});

test('kendi suresi dusukken rakip baskisi yerine guvenlik oncelenir', () => {
    const result = scoreOpponentClockPressureMove({
        timeBudget: {
            isTimed: true,
            ownClockPressure: 'critical',
            opponentClockPressure: 'critical'
        },
        profile: getAIProfile('hard'),
        moveTraits: {
            givesCheck: true,
            captures: true,
            captureValue: 100,
            opponentMobility: 2
        }
    });

    assert.equal(result.bonus, 0);
    assert.deepEqual(result.reasons, ['own-clock-safety-first']);
});
