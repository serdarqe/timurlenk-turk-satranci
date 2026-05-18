import test from 'node:test';
import assert from 'node:assert/strict';

import { AnalyticsManager } from '../src/utils/AnalyticsManager.js';

test('track adds anonymous common context', () => {
    const calls = [];
    const adapter = { track: (event, payload) => calls.push({ event, payload }) };
    const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

    manager.track('game_started', { mode: 'ai', difficulty: 'medium' });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].payload.install_id_hash, 'anon-install');
    assert.equal(calls[0].payload.session_id, 'session-1');
});

test('track ignores unknown events', () => {
    const calls = [];
    const adapter = { track: (event, payload) => calls.push({ event, payload }) };
    const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

    manager.track('unknown_event', { foo: 'bar' });

    assert.equal(calls.length, 0);
});

test('manager can create a stable anonymous install id', () => {
    const store = new Map();
    const manager = new AnalyticsManager({
        adapter: { track() {} },
        storage: {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value)
        }
    });

    const first = manager.ensureInstallId();
    const second = manager.ensureInstallId();

    assert.equal(first, second);
});

test('game finish payload keeps result fields and strips room code', () => {
    const calls = [];
    const adapter = { track: (event, payload) => calls.push({ event, payload }) };
    const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

    manager.track('game_finished', {
        mode: 'ai',
        difficulty: 'hard',
        winner: 'black',
        result_type: 'stalemate_win',
        move_count: 88,
        duration_seconds: 502,
        special_event_count: 5,
        analysis_ready: false,
        room_code: 'SECRET'
    });

    assert.equal(calls[0].payload.result_type, 'stalemate_win');
    assert.equal(calls[0].payload.room_code, undefined);
});

test('ad failure payload keeps only safe fields', () => {
    const calls = [];
    const adapter = { track: (event, payload) => calls.push({ event, payload }) };
    const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

    manager.track('ad_failed', {
        ad_type: 'interstitial',
        placement: 'between_matches',
        error_code: 'NO_FILL',
        stack: 'sensitive stack'
    });

    assert.equal(calls[0].payload.error_code, 'NO_FILL');
    assert.equal(calls[0].payload.stack, undefined);
});
