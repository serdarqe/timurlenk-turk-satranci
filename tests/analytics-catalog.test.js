import test from 'node:test';
import assert from 'node:assert/strict';

import { isAllowedAnalyticsEvent, sanitizeAnalyticsPayload } from '../src/utils/AnalyticsCatalog.js';

test('known analytics events are accepted', () => {
    assert.equal(isAllowedAnalyticsEvent('game_started'), true);
    assert.equal(isAllowedAnalyticsEvent('analysis_tab_opened'), true);
    assert.equal(isAllowedAnalyticsEvent('advantage_meter_toggled'), true);
});

test('unknown analytics events are rejected', () => {
    assert.equal(isAllowedAnalyticsEvent('raw_move_dump'), false);
});

test('room code and raw error text are stripped from payloads', () => {
    const payload = sanitizeAnalyticsPayload('online_room_joined', {
        room_code: 'ABCD12',
        error_message: 'peer unavailable: ABCD12',
        mode: 'online'
    });

    assert.equal(payload.room_code, undefined);
    assert.equal(payload.error_message, undefined);
    assert.equal(payload.mode, 'online');
});

test('bot analytics fields are kept for ai game lifecycle events', () => {
    const started = sanitizeAnalyticsPayload('game_started', {
        mode: 'ai',
        difficulty: 'hard',
        ai_persona: 'timur',
        ai_bot_id: 'bot_15_aksak_demir',
        ai_bot_level: 15,
        ai_bot_stars: 5,
        ai_color: 'black',
        local_color: 'white',
        is_online: false,
        is_scripted: false,
        time_control: '15m'
    });

    const finished = sanitizeAnalyticsPayload('game_finished', {
        mode: 'ai',
        difficulty: 'hard',
        ai_persona: 'timur',
        ai_bot_id: 'bot_15_aksak_demir',
        ai_bot_level: 15,
        ai_bot_stars: 5,
        winner: 'black',
        result_type: 'checkmate',
        move_count: 84,
        duration_seconds: 420,
        special_event_count: 3,
        analysis_ready: true
    });

    const abandoned = sanitizeAnalyticsPayload('game_abandoned', {
        mode: 'ai',
        difficulty: 'hard',
        ai_persona: 'timur',
        ai_bot_id: 'bot_15_aksak_demir',
        ai_bot_level: 15,
        ai_bot_stars: 5,
        move_count: 12,
        elapsed_seconds: 95
    });

    assert.equal(started.ai_bot_id, 'bot_15_aksak_demir');
    assert.equal(started.ai_bot_level, 15);
    assert.equal(started.ai_bot_stars, 5);
    assert.equal(started.ai_color, 'black');
    assert.equal(finished.ai_bot_id, 'bot_15_aksak_demir');
    assert.equal(finished.ai_bot_level, 15);
    assert.equal(finished.ai_bot_stars, 5);
    assert.equal(abandoned.ai_bot_id, 'bot_15_aksak_demir');
});
