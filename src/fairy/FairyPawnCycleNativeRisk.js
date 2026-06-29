import { getPawnOfPawnsCycleParity } from './FairyPromotionParity.js';
import {
    getNativeTransitionRule,
    isRuleControlledNativePromotion,
    validateNativeRulePromotion
} from './FairyNativeTransition.js';

export const PAWN_OF_PAWNS_NATIVE_STATE_EFFECTS = Object.freeze([
    'stage_mutation',
    'repatriation_to_start_row',
    'occupied_return_file_scan',
    'adventitious_king_creation',
    'apply_revert_required'
]);

export const PAWN_OF_PAWNS_NATIVE_EXTRA_EVIDENCE = Object.freeze([
    ['nativeStageEncoding', 'native_stage_encoding_missing'],
    ['nativeRepatriationSemantics', 'native_repatriation_semantics_missing'],
    ['nativeApplyRevertParity', 'native_apply_revert_parity_missing'],
    ['nativeEngineSmoke', 'native_engine_smoke_missing']
]);

export function getPawnOfPawnsNativeRiskReport(evidence = {}) {
    const transitionRule = getNativeTransitionRule('pawn_of_pawns_cycle');
    const verdict = getPawnOfPawnsNativeTransitionVerdict(evidence);

    return {
        ruleId: 'pawn_of_pawns_cycle',
        severity: 'high',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        controlledPromotion: isRuleControlledNativePromotion('pawn_of_pawns_cycle'),
        wrapperGuardRetained: isRuleControlledNativePromotion('pawn_of_pawns_cycle') && Boolean(transitionRule?.wrapperReason),
        wrapperReason: transitionRule?.wrapperReason ?? null,
        parityCovered: true,
        stageFlow: getStageFlow(),
        stateEffects: [...PAWN_OF_PAWNS_NATIVE_STATE_EFFECTS],
        blockers: verdict.blockers,
        notes: [
            'Pawn-of-pawns is not a normal promotion suffix.',
            'It mutates stage, moves the pawn back to a start row, scans for an empty return file, then finally creates an adventitious king.',
            'Native promotion is blocked until C++ source, WASM, state encoding, apply/revert parity and engine smoke evidence all exist.'
        ]
    };
}

export function getPawnOfPawnsNativeTransitionVerdict(evidence = {}) {
    const baseVerdict = validateNativeRulePromotion('pawn_of_pawns_cycle', {
        parityTest: true,
        pawnOfPawnsCycleMatrix: true,
        ...evidence
    });
    const blockers = [...baseVerdict.blockers];

    for (const [field, blocker] of PAWN_OF_PAWNS_NATIVE_EXTRA_EVIDENCE) {
        if (!evidence[field]) blockers.push(blocker);
    }

    return {
        ruleId: 'pawn_of_pawns_cycle',
        allowed: blockers.length === 0,
        blockers
    };
}

function getStageFlow() {
    return getPawnOfPawnsCycleParity().map((step) => {
        if (step.kind === 'pawn_cycle' && step.stageBefore === null) return 'initial_to_stage_2';
        if (step.kind === 'pawn_cycle' && step.stageBefore === 2) return 'stage_2_to_stage_3';
        if (step.kind === 'promotion' && step.stageBefore === 3) return 'stage_3_to_adventitious_king';
        return `unknown_${step.kind}`;
    });
}
