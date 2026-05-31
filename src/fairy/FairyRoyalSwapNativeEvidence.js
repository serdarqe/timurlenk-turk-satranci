import { getRoyalSwapParityCases } from './FairyRoyalSwapParity.js';
import { getSpecialRuleNativeTransitionVerdict } from './FairySpecialRuleNativeRisk.js';

export const ROYAL_SWAP_NATIVE_REQUIRED_EVIDENCE = Object.freeze([
    'wasm_rebuild_after_native_source',
    'native_check_escape_semantics',
    'native_royal_swap_semantics',
    'native_one_time_flag_semantics',
    'native_apply_revert_parity',
    'native_engine_smoke'
]);

export function getRoyalSwapNativeEvidenceReport(evidence = {}) {
    const mergedEvidence = mergeRoyalSwapSmokeEvidence(evidence);
    const verdict = getRoyalSwapNativeEvidenceVerdict(mergedEvidence);

    return {
        ruleId: 'royal_swap',
        evidencePhase: 'native_preparation',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        swapSemanticsCases: getRoyalSwapParityCases(),
        requiredNativeEvidence: [...ROYAL_SWAP_NATIVE_REQUIRED_EVIDENCE],
        wasmRebuildEvidence: mergedEvidence.wasmRebuildEvidence || null,
        swapSmoke: mergedEvidence.swapSmoke || null,
        blockers: verdict.blockers,
        notes: [
            'Royal swap is legal only as a check escape.',
            'Native promotion requires check-escape proof, king-target swap semantics, one-time ransom flag semantics, apply/revert parity and engine smoke proof.'
        ]
    };
}

export function getRoyalSwapNativeEvidenceVerdict(evidence = {}) {
    return getSpecialRuleNativeTransitionVerdict('royal_swap', mergeRoyalSwapSmokeEvidence(evidence));
}

function mergeRoyalSwapSmokeEvidence(evidence = {}) {
    const swapSmoke = evidence.swapSmoke || {};

    return {
        ...evidence,
        nativeCheckEscapeSemantics: evidence.nativeCheckEscapeSemantics
            ?? swapSmoke.nativeCheckEscapeSemantics,
        nativeRoyalSwapSemantics: evidence.nativeRoyalSwapSemantics
            ?? swapSmoke.nativeRoyalSwapSemantics,
        nativeOneTimeFlagSemantics: evidence.nativeOneTimeFlagSemantics
            ?? swapSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: evidence.nativeApplyRevertParity
            ?? swapSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: evidence.nativeEngineSmoke
            ?? swapSmoke.nativeEngineSmoke
    };
}
