import { getCitadelExchangeParityCases } from './FairyCitadelExchangeParity.js';
import { CITADEL_OFFBOARD_SQUARES } from './FairyCitadelDrawNativeEvidence.js';
import { getSpecialRuleNativeTransitionVerdict } from './FairySpecialRuleNativeRisk.js';

export const CITADEL_EXCHANGE_NATIVE_REQUIRED_EVIDENCE = Object.freeze([
    'wasm_rebuild_after_native_source',
    'native_offboard_citadel_semantics',
    'native_dual_relocation_semantics',
    'native_one_time_flag_semantics',
    'native_apply_revert_parity',
    'native_engine_smoke'
]);

export function getCitadelExchangeNativeEvidenceReport(evidence = {}) {
    const mergedEvidence = mergeExchangeSmokeEvidence(evidence);
    const verdict = getCitadelExchangeNativeEvidenceVerdict(mergedEvidence);

    return {
        ruleId: 'citadel_exchange',
        evidencePhase: 'native_preparation',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        offboardCitadels: CITADEL_OFFBOARD_SQUARES.map((square) => ({ ...square })),
        exchangeSemanticsCases: getCitadelExchangeParityCases(),
        requiredNativeEvidence: [...CITADEL_EXCHANGE_NATIVE_REQUIRED_EVIDENCE],
        wasmRebuildEvidence: mergedEvidence.wasmRebuildEvidence || null,
        exchangeSmoke: mergedEvidence.exchangeSmoke || null,
        blockers: verdict.blockers,
        notes: [
            'Citadel exchange relocates two royal pieces through an off-board citadel square.',
            'Native promotion requires off-board citadel support, dual relocation semantics, one-time flag semantics, apply/revert parity and engine smoke proof.'
        ]
    };
}

export function getCitadelExchangeNativeEvidenceVerdict(evidence = {}) {
    return getSpecialRuleNativeTransitionVerdict('citadel_exchange', mergeExchangeSmokeEvidence(evidence));
}

function mergeExchangeSmokeEvidence(evidence = {}) {
    const exchangeSmoke = evidence.exchangeSmoke || {};

    return {
        ...evidence,
        nativeOffboardCitadelSemantics: evidence.nativeOffboardCitadelSemantics
            ?? exchangeSmoke.nativeOffboardCitadelSemantics,
        nativeDualRelocationSemantics: evidence.nativeDualRelocationSemantics
            ?? exchangeSmoke.nativeDualRelocationSemantics,
        nativeOneTimeFlagSemantics: evidence.nativeOneTimeFlagSemantics
            ?? exchangeSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: evidence.nativeApplyRevertParity
            ?? exchangeSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: evidence.nativeEngineSmoke
            ?? exchangeSmoke.nativeEngineSmoke
    };
}
