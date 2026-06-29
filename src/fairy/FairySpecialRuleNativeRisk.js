import { getCitadelDrawParityCases } from './FairyCitadelParity.js';
import { getCitadelExchangeParityCases } from './FairyCitadelExchangeParity.js';
import {
    getNativeTransitionRule,
    isRuleControlledNativePromotion,
    validateNativeRulePromotion
} from './FairyNativeTransition.js';
import { getRoyalSwapParityCases } from './FairyRoyalSwapParity.js';

export const SPECIAL_NATIVE_RISK_RULE_IDS = Object.freeze([
    'citadel_draw',
    'citadel_exchange',
    'royal_swap'
]);

const SPECIAL_NATIVE_RISK_RULES = Object.freeze({
    citadel_draw: {
        parityEvidenceField: 'citadelParityMatrix',
        coverageCases: () => getCitadelDrawParityCases().map((item) => item.id),
        stateEffects: [
            'offboard_citadel_square',
            'opponent_citadel_entry',
            'game_result_mutation',
            'draw_winner_label',
            'apply_revert_required'
        ],
        extraEvidence: [
            ['nativeOffboardCitadelSemantics', 'native_offboard_citadel_semantics_missing'],
            ['nativeGameResultSemantics', 'native_game_result_semantics_missing'],
            ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
            ['nativeEngineSmoke', 'native_engine_smoke_missing']
        ],
        notes: [
            'Citadel draw uses off-board citadel coordinates.',
            'It mutates game status and draw winner labels, so JS remains authoritative until native result semantics are proven.'
        ]
    },
    citadel_exchange: {
        parityEvidenceField: 'citadelExchangeParityMatrix',
        coverageCases: () => getCitadelExchangeParityCases().map((item) => item.id),
        stateEffects: [
            'offboard_citadel_square',
            'dual_royal_relocation',
            'citadel_exchange_flag_consumption',
            'target_royal_square_replacement',
            'apply_revert_required'
        ],
        extraEvidence: [
            ['nativeOffboardCitadelSemantics', 'native_offboard_citadel_semantics_missing'],
            ['nativeDualRelocationSemantics', 'native_dual_relocation_semantics_missing'],
            ['nativeOneTimeFlagSemantics', 'native_one_time_flag_semantics_missing'],
            ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
            ['nativeEngineSmoke', 'native_engine_smoke_missing']
        ],
        notes: [
            'Citadel exchange relocates two royal pieces through an off-board square.',
            'It consumes a one-time state right, so native apply/revert parity must be explicit before promotion.'
        ]
    },
    royal_swap: {
        parityEvidenceField: 'royalSwapParityMatrix',
        coverageCases: () => getRoyalSwapParityCases().map((item) => item.id),
        stateEffects: [
            'check_escape_only',
            'king_target_square_swap',
            'ransom_flag_consumption',
            'one_time_right_tracking',
            'apply_revert_required'
        ],
        extraEvidence: [
            ['nativeCheckEscapeSemantics', 'native_check_escape_semantics_missing'],
            ['nativeRoyalSwapSemantics', 'native_royal_swap_semantics_missing'],
            ['nativeOneTimeFlagSemantics', 'native_one_time_flag_semantics_missing'],
            ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
            ['nativeEngineSmoke', 'native_engine_smoke_missing']
        ],
        notes: [
            'Royal swap is only legal as a check escape.',
            'It swaps king position and consumes a one-time ransom flag, so native state tracking must be proven first.'
        ]
    }
});

export function getSpecialRuleNativeRiskReport(ruleId, evidence = {}) {
    const rule = getRiskRule(ruleId);
    const transitionRule = getNativeTransitionRule(ruleId);
    const verdict = getSpecialRuleNativeTransitionVerdict(ruleId, evidence);

    return {
        ruleId,
        severity: 'high',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        controlledPromotion: isRuleControlledNativePromotion(ruleId),
        wrapperGuardRetained: isRuleControlledNativePromotion(ruleId) && Boolean(transitionRule?.wrapperReason),
        wrapperReason: transitionRule?.wrapperReason ?? null,
        parityCovered: true,
        coverageCases: rule.coverageCases(),
        stateEffects: [...rule.stateEffects],
        blockers: verdict.blockers,
        notes: [...rule.notes]
    };
}

export function getSpecialRuleNativeTransitionVerdict(ruleId, evidence = {}) {
    const rule = getRiskRule(ruleId);
    const baseVerdict = validateNativeRulePromotion(ruleId, {
        parityTest: true,
        [rule.parityEvidenceField]: true,
        ...evidence
    });
    const blockers = [...baseVerdict.blockers];

    for (const [field, blocker] of rule.extraEvidence) {
        if (!evidence[field]) blockers.push(blocker);
    }

    return {
        ruleId,
        allowed: blockers.length === 0,
        blockers
    };
}

function getRiskRule(ruleId) {
    const rule = SPECIAL_NATIVE_RISK_RULES[ruleId];
    if (!rule) {
        throw new Error(`Unknown special native risk rule: ${ruleId}`);
    }
    return rule;
}
