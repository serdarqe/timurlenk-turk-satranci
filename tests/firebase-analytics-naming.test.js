import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFirebaseEventName, mapFirebaseParams } from '../src/utils/FirebaseAnalyticsNaming.js';

test('firebase event names timur on ekiyle guvenli hale gelir', () => {
    assert.equal(mapFirebaseEventName('session_start'), 'timur_session_start');
    assert.equal(mapFirebaseEventName('Analysis Viewed!'), 'timur_analysis_viewed');
});

test('firebase param anahtarlari tm on ekiyle donusur ve tipler normalize edilir', () => {
    assert.deepEqual(mapFirebaseParams({
        screen_name: 'main_menu',
        enabled: true,
        duration_seconds: 12,
        optional: undefined
    }), {
        tm_screen_name: 'main_menu',
        tm_enabled: 1,
        tm_duration_seconds: 12
    });
});

test('firebase paramlari 25 alan ile sinirlanir', () => {
    const payload = Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [`field_${index}`, index])
    );

    assert.equal(Object.keys(mapFirebaseParams(payload)).length, 25);
});

