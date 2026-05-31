export const NATIVE_PROMOTION_BLOCKERS = [
    'native_source_marker_missing',
    'js_native_parity_test_missing',
    'wasm_rebuild_missing'
];

export const TIMUR_NATIVE_RULE_TRANSITION = Object.freeze({
    giraffe_movement: {
        status: 'native_authoritative',
        wrapperReason: 'giraffe_requires_wrapper',
        notes: 'Native C++ movegen supports Zürafa; the wrapper reason remains only for old/plain POC comparisons.'
    },
    picket_minimum_distance: {
        status: 'native_authoritative',
        wrapperReason: 'picket_minimum_distance_rule',
        notes: 'Native C++ movegen enforces the minimum two-square diagonal distance; the wrapper reason remains for old/plain POC comparisons.'
    },
    royal_swap: {
        status: 'native_ready_wrapper_guarded',
        wrapperReason: 'royal_swap_requires_wrapper',
        notes: 'Native royal-swap smoke evidence is complete, but JS wrapper validation remains as a safety guard during controlled promotion.'
    },
    citadel_exchange: {
        status: 'native_ready_wrapper_guarded',
        wrapperReason: 'citadel_exchange_requires_wrapper',
        notes: 'Native exchange smoke evidence is complete, but JS wrapper validation remains as a safety guard during controlled promotion.'
    },
    citadel_draw: {
        status: 'native_ready_wrapper_guarded',
        wrapperReason: 'citadel_requires_wrapper',
        notes: 'Native citadel draw evidence is complete, but JS wrapper validation remains as a safety guard during controlled promotion.'
    },
    royal_hierarchy: {
        status: 'wrapper_guarded',
        wrapperReason: 'royal_hierarchy_requires_wrapper',
        notes: 'Prince/adventitious king movement exists natively, but royal elimination hierarchy remains JS authoritative.'
    },
    promotion_suffix: {
        status: 'native_authoritative',
        wrapperReason: null,
        notes: 'Fixed Timur pawn subtype promotion suffixes are accepted after parity matrix coverage and rebuilt native Fairy artifacts.'
    },
    pawn_of_pawns_cycle: {
        status: 'native_ready_wrapper_guarded',
        wrapperReason: 'promotion_suffix_requires_wrapper',
        notes: 'Native pawn-of-pawns cycle smoke evidence is complete, but JS wrapper validation remains as a safety guard during controlled promotion.'
    },
    threefold_repetition: {
        status: 'native_authoritative',
        wrapperReason: null,
        notes: 'Native variant source sets nFoldRule = 3; JS also keeps rule-level safety.'
    },
    fifty_move_draw: {
        status: 'native_authoritative',
        wrapperReason: null,
        notes: 'Native variant source sets nMoveRule = 50; JS also keeps rule-level safety.'
    },
    stalemate_win: {
        status: 'native_authoritative',
        wrapperReason: null,
        notes: 'Native variant source sets stalemateValue = VALUE_MATE.'
    }
});

export function getNativeTransitionRule(ruleId) {
    return TIMUR_NATIVE_RULE_TRANSITION[ruleId] || null;
}

export function getWrapperReasons() {
    return [...new Set(
        Object.values(TIMUR_NATIVE_RULE_TRANSITION)
            .map((rule) => rule.wrapperReason)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
}

export function isRuleNativeAuthoritative(ruleId) {
    return getNativeTransitionRule(ruleId)?.status === 'native_authoritative';
}

export function isRuleControlledNativePromotion(ruleId) {
    return getNativeTransitionRule(ruleId)?.status === 'native_ready_wrapper_guarded';
}

export function validateNativeRulePromotion(ruleId, evidence = {}) {
    const rule = getNativeTransitionRule(ruleId);
    if (!rule) {
        return buildVerdict(ruleId, false, ['unknown_rule']);
    }

    if (rule.status === 'native_authoritative') {
        return buildVerdict(ruleId, true, []);
    }

    const blockers = [];
    if (!evidence.nativeSourceMarker) blockers.push('native_source_marker_missing');
    if (!evidence.parityTest) blockers.push('js_native_parity_test_missing');
    if (!evidence.wasmRebuilt) blockers.push('wasm_rebuild_missing');
    if (ruleId === 'promotion_suffix' && !evidence.promotionParityMatrix) {
        blockers.push('promotion_parity_matrix_missing');
    }
    if (ruleId === 'citadel_draw' && !evidence.citadelParityMatrix) {
        blockers.push('citadel_parity_matrix_missing');
    }
    if (ruleId === 'citadel_exchange' && !evidence.citadelExchangeParityMatrix) {
        blockers.push('citadel_exchange_parity_matrix_missing');
    }
    if (ruleId === 'royal_swap' && !evidence.royalSwapParityMatrix) {
        blockers.push('royal_swap_parity_matrix_missing');
    }
    if (ruleId === 'pawn_of_pawns_cycle' && !evidence.pawnOfPawnsCycleMatrix) {
        blockers.push('pawn_of_pawns_cycle_matrix_missing');
    }

    return buildVerdict(ruleId, blockers.length === 0, blockers);
}

function buildVerdict(ruleId, allowed, blockers) {
    return {
        ruleId,
        allowed,
        blockers
    };
}
