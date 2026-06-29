import { getPawnOfPawnsNativeTransitionVerdict } from './FairyPawnCycleNativeRisk.js';
import { getPawnCycleNativeSmokeCases } from './FairyPawnCycleNativeSmoke.js';

export const PAWN_CYCLE_NATIVE_REQUIRED_EVIDENCE = Object.freeze([
    'wasm_rebuild_after_native_source',
    'native_stage_encoding',
    'native_repatriation_semantics',
    'native_apply_revert_parity',
    'native_engine_smoke'
]);

export function getPawnCycleNativeEvidenceReport(evidence = {}) {
    const mergedEvidence = mergePawnCycleSmokeEvidence(evidence);
    const verdict = getPawnCycleNativeEvidenceVerdict(mergedEvidence);

    return {
        ruleId: 'pawn_of_pawns_cycle',
        evidencePhase: 'native_preparation',
        ready: verdict.allowed,
        jsAuthoritative: !verdict.allowed,
        cycleSemanticsCases: getPawnCycleNativeSmokeCases(),
        requiredNativeEvidence: [...PAWN_CYCLE_NATIVE_REQUIRED_EVIDENCE],
        wasmRebuildEvidence: mergedEvidence.wasmRebuildEvidence || null,
        pawnCycleSmoke: mergedEvidence.pawnCycleSmoke || null,
        blockers: verdict.blockers,
        notes: [
            'Pawn-of-pawns is a state-changing cycle, not a simple promotion suffix.',
            'Native promotion requires stage encoding, repatriation semantics, apply/revert parity and engine smoke proof.'
        ]
    };
}

export function getPawnCycleNativeEvidenceVerdict(evidence = {}) {
    return getPawnOfPawnsNativeTransitionVerdict(mergePawnCycleSmokeEvidence(evidence));
}

function mergePawnCycleSmokeEvidence(evidence = {}) {
    const pawnCycleSmoke = evidence.pawnCycleSmoke || {};

    return {
        ...evidence,
        nativeStageEncoding: evidence.nativeStageEncoding
            ?? pawnCycleSmoke.nativeStageEncoding,
        nativeRepatriationSemantics: evidence.nativeRepatriationSemantics
            ?? pawnCycleSmoke.nativeRepatriationSemantics,
        nativeApplyRevertParity: evidence.nativeApplyRevertParity
            ?? pawnCycleSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: evidence.nativeEngineSmoke
            ?? pawnCycleSmoke.nativeEngineSmoke
    };
}
