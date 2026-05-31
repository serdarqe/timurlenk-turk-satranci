import { getPawnCycleNativeEvidenceReport } from '../src/fairy/FairyPawnCycleNativeEvidence.js';
import { runPawnCycleNativeSmoke } from './fairy-pawn-cycle-smoke-runner.mjs';
import {
    getCitadelDrawWasmRebuildEvidence,
    getPawnCycleSourceEvidence
} from './fairy-native-source-evidence.mjs';

const sourceEvidence = getPawnCycleSourceEvidence();
const wasmEvidence = getCitadelDrawWasmRebuildEvidence();
const pawnCycleSmoke = await runPawnCycleNativeSmoke();
const report = getPawnCycleNativeEvidenceReport({
    nativeSourceMarker: sourceEvidence.nativeSourceMarker,
    wasmRebuilt: wasmEvidence.wasmRebuilt,
    wasmRebuildEvidence: wasmEvidence,
    pawnCycleSmoke
});

console.log('Fairy pawn_of_pawns_cycle native evidence report');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence phase: ${report.evidencePhase}`);
console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Native source marker: ${sourceEvidence.nativeSourceMarker ? 'present' : 'missing'}`);
console.log(`Native position skeleton: ${sourceEvidence.nativePositionSkeleton ? 'present' : 'missing'}`);
console.log(`WASM rebuild evidence: ${wasmEvidence.wasmRebuilt ? 'present' : 'missing'}`);
console.log(`WASM bundles: ${wasmEvidence.bundles.map((item) => `${item.bundle}:${item.ok ? 'ok' : 'stale'}`).join(', ')}`);
console.log(`Cycle semantics cases: ${report.cycleSemanticsCases.length}`);
console.log(`Cycle smoke cases: ${pawnCycleSmoke.cases.length}`);
console.log(`Native stage encoding smoke: ${pawnCycleSmoke.nativeStageEncoding ? 'passed' : 'missing'}`);
console.log(`Native repatriation smoke: ${pawnCycleSmoke.nativeRepatriationSemantics ? 'passed' : 'missing'}`);
console.log(`Native apply/revert smoke: ${pawnCycleSmoke.nativeApplyRevertParity ? 'passed' : 'missing'}`);
console.log(`Native engine smoke: ${pawnCycleSmoke.nativeEngineSmoke ? 'passed' : 'missing'}`);
console.log(`Required evidence: ${report.requiredNativeEvidence.join(', ')}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!sourceEvidence.nativeSourceMarker) {
    console.error(`Missing source markers: ${sourceEvidence.missingMarkers.join(', ')}`);
    process.exit(1);
}

if (!report.blockers.includes('native_stage_encoding_missing')) {
    console.log('Native stage encoding gate passed.');
}

if (!report.blockers.includes('native_repatriation_semantics_missing')) {
    console.log('Native repatriation semantics gate passed.');
}

if (!report.blockers.includes('native_apply_revert_parity_missing')) {
    console.log('Native apply/revert parity gate passed.');
}

if (!report.blockers.includes('native_engine_smoke_missing')) {
    console.log('Native engine smoke gate passed.');
}

console.log(`Safe state: pawn_of_pawns_cycle evidence is ${report.ready ? 'complete; ready for controlled promotion' : 'incomplete; remains JS-authoritative'}.`);
