export const ANALYTICS_EVENTS = Object.freeze({
    app_open: ['screen_name'],
    session_start: ['screen_name'],
    session_end: ['screen_name', 'duration_seconds'],
    main_menu_viewed: ['screen_name'],
    mode_selected: ['mode'],
    difficulty_selected: ['difficulty'],
    ai_persona_selected: ['ai_persona'],
    time_control_selected: ['time_control'],
    settings_opened: ['screen_name'],
    piece_letters_toggled: ['enabled'],
    advantage_meter_toggled: ['enabled'],
    privacy_policy_opened: ['location'],
    game_started: ['mode', 'difficulty', 'ai_persona', 'ai_bot_id', 'ai_bot_level', 'ai_bot_stars', 'local_color', 'ai_color', 'is_online', 'is_scripted', 'time_control'],
    game_finished: ['mode', 'difficulty', 'ai_persona', 'ai_bot_id', 'ai_bot_level', 'ai_bot_stars', 'winner', 'result_type', 'move_count', 'duration_seconds', 'special_event_count', 'analysis_ready'],
    game_abandoned: ['mode', 'difficulty', 'ai_persona', 'ai_bot_id', 'ai_bot_level', 'ai_bot_stars', 'move_count', 'elapsed_seconds'],
    special_rule_used: ['special_rule', 'color', 'move_index'],
    analysis_generated: ['mode', 'move_count', 'result_type'],
    analysis_viewed: ['mode', 'move_count', 'result_type'],
    analysis_tab_opened: ['analysis_tab', 'result_type', 'move_count'],
    analysis_practice_started: ['entry_index', 'quality'],
    analysis_practice_solved: ['entry_index', 'quality'],
    analysis_practice_failed: ['entry_index', 'quality'],
    tutorial_opened: ['entry_point'],
    tutorial_completed: ['lesson_id'],
    puzzle_started: ['puzzle_id'],
    puzzle_completed: ['puzzle_id', 'duration_seconds', 'attempt_count'],
    puzzle_failed: ['puzzle_id', 'duration_seconds', 'attempt_count'],
    online_room_created: ['mode'],
    online_room_join_attempted: ['mode'],
    online_room_joined: ['mode'],
    online_match_started: ['local_color'],
    online_match_finished: ['winner', 'result_type', 'move_count'],
    online_disconnect: ['phase', 'had_reconnect'],
    consent_shown: ['platform'],
    consent_completed: ['platform', 'status'],
    ad_request: ['ad_type', 'placement'],
    ad_loaded: ['ad_type', 'placement'],
    ad_failed: ['ad_type', 'placement', 'error_code'],
    ad_shown: ['ad_type', 'placement'],
    ad_closed: ['ad_type', 'placement'],
    app_error: ['scope', 'error_code'],
    worker_error: ['worker_type', 'stage', 'error_code']
});

const FORBIDDEN_KEYS = new Set([
    'room_code',
    'ip',
    'peer_id',
    'error_message',
    'raw_error',
    'stack'
]);

export function isAllowedAnalyticsEvent(eventName) {
    return Boolean(ANALYTICS_EVENTS[eventName]);
}

export function sanitizeAnalyticsPayload(eventName, payload = {}) {
    if (!isAllowedAnalyticsEvent(eventName)) return {};

    const allowedKeys = new Set(ANALYTICS_EVENTS[eventName]);

    return Object.fromEntries(
        Object.entries(payload).filter(([key, value]) => {
            if (FORBIDDEN_KEYS.has(key)) return false;
            if (!allowedKeys.has(key)) return false;
            return value !== undefined;
        })
    );
}
