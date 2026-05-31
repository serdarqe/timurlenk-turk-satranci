import {
    getNativeTransitionRule,
    isRuleControlledNativePromotion,
    validateNativeRulePromotion
} from './FairyNativeTransition.js';

export const NATIVE_AUTHORITATIVE_RULES = Object.freeze([
    'giraffe_movement',
    'picket_minimum_distance',
    'promotion_suffix',
    'threefold_repetition',
    'fifty_move_draw',
    'stalemate_win'
]);

export const STATE_CHANGING_NATIVE_CANDIDATES = Object.freeze([
    {
        ruleId: 'pawn_of_pawns_cycle',
        parityEvidence: {
            parityTest: true,
            pawnOfPawnsCycleMatrix: true
        }
    },
    {
        ruleId: 'citadel_draw',
        parityEvidence: {
            parityTest: true,
            citadelParityMatrix: true
        }
    },
    {
        ruleId: 'citadel_exchange',
        parityEvidence: {
            parityTest: true,
            citadelExchangeParityMatrix: true
        }
    },
    {
        ruleId: 'royal_swap',
        parityEvidence: {
            parityTest: true,
            royalSwapParityMatrix: true
        }
    }
]);

const STATE_CHANGING_SEMANTIC_BLOCKERS = Object.freeze({
    pawn_of_pawns_cycle: [
        ['nativeStageEncoding', 'native_stage_encoding_missing'],
        ['nativeRepatriationSemantics', 'native_repatriation_semantics_missing'],
        ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
        ['nativeEngineSmoke', 'native_engine_smoke_missing']
    ],
    citadel_draw: [
        ['nativeOffboardCitadelSemantics', 'native_offboard_citadel_semantics_missing'],
        ['nativeGameResultSemantics', 'native_game_result_semantics_missing'],
        ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
        ['nativeEngineSmoke', 'native_engine_smoke_missing']
    ],
    citadel_exchange: [
        ['nativeOffboardCitadelSemantics', 'native_offboard_citadel_semantics_missing'],
        ['nativeDualRelocationSemantics', 'native_dual_relocation_semantics_missing'],
        ['nativeOneTimeFlagSemantics', 'native_one_time_flag_semantics_missing'],
        ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
        ['nativeEngineSmoke', 'native_engine_smoke_missing']
    ],
    royal_swap: [
        ['nativeCheckEscapeSemantics', 'native_check_escape_semantics_missing'],
        ['nativeRoyalSwapSemantics', 'native_royal_swap_semantics_missing'],
        ['nativeOneTimeFlagSemantics', 'native_one_time_flag_semantics_missing'],
        ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
        ['nativeEngineSmoke', 'native_engine_smoke_missing']
    ]
});

export function getNativeReadinessReport(extraEvidenceByRule = {}) {
    return {
        nativeAuthoritativeRules: NATIVE_AUTHORITATIVE_RULES.map(buildNativeAuthoritativeEntry),
        stateChangingRules: STATE_CHANGING_NATIVE_CANDIDATES.map((candidate) => (
            getStateChangingRuleReadiness(candidate.ruleId, extraEvidenceByRule[candidate.ruleId])
        ))
    };
}

export function getStateChangingRuleReadiness(ruleId, extraEvidence = {}) {
    const candidate = STATE_CHANGING_NATIVE_CANDIDATES.find((entry) => entry.ruleId === ruleId);
    if (!candidate) {
        return {
            ruleId,
            ready: false,
            parityCovered: false,
            blockers: ['unknown_state_changing_rule'],
            wrapperReason: null,
            notes: null
        };
    }

    const rule = getNativeTransitionRule(ruleId);
    const evidence = {
        ...candidate.parityEvidence,
        ...extraEvidence
    };
    const verdict = validateNativeRulePromotion(ruleId, evidence);
    const blockers = appendSemanticBlockers(ruleId, verdict.blockers, evidence);

    return {
        ruleId,
        ready: blockers.length === 0,
        controlledPromotion: isRuleControlledNativePromotion(ruleId),
        parityCovered: candidateParityCovered(candidate.parityEvidence),
        blockers,
        wrapperReason: rule?.wrapperReason ?? null,
        notes: rule?.notes ?? null
    };
}

function buildNativeAuthoritativeEntry(ruleId) {
    const rule = getNativeTransitionRule(ruleId);

    return {
        ruleId,
        ready: rule?.status === 'native_authoritative',
        wrapperReason: rule?.wrapperReason ?? null,
        notes: rule?.notes ?? null
    };
}

function candidateParityCovered(parityEvidence) {
    return Object.values(parityEvidence).every(Boolean);
}

function appendSemanticBlockers(ruleId, baseBlockers, evidence) {
    const blockers = [...baseBlockers];
    const semanticChecks = STATE_CHANGING_SEMANTIC_BLOCKERS[ruleId] || [];
    const baseProofMissing = blockers.includes('native_source_marker_missing')
        || blockers.includes('wasm_rebuild_missing');

    if (baseProofMissing) {
        return blockers;
    }

    for (const [field, blocker] of semanticChecks) {
        if (!evidence[field]) blockers.push(blocker);
    }

    return blockers;
}
