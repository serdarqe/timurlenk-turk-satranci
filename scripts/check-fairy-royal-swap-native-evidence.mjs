import { getRoyalSwapNativeEvidenceReport } from '../src/fairy/FairyRoyalSwapNativeEvidence.js';
import { runRoyalSwapNativeSmoke } from './fairy-royal-swap-smoke-runner.mjs';
import {
    getCitadelDrawWasmRebuildEvidence,
    getRoyalSwapSourceEvidence
} from './fairy-native-source-evidence.mjs';

const sourceEvidence = getRoyalSwapSourceEvidence();
const wasmEvidence = getCitadelDrawWasmRebuildEvidence();
const swapSmoke = await runRoyalSwapNativeSmoke();
const report = getRoyalSwapNativeEvidenceReport({
    nativeSourceMarker: sourceEvidence.nativeSourceMarker,
    wasmRebuilt: wasmEvidence.wasmRebuilt,
    wasmRebuildEvidence: wasmEvidence,
    swapSmoke
});

console.log('Fairy royal_swap native evidence report');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence phase: ${report.evidencePhase}`);
console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Native source marker: ${sourceEvidence.nativeSourceMarker ? 'present' : 'missing'}`);
console.log(`Native position skeleton: ${sourceEvidence.nativePositionSkeleton ? 'present' : 'missing'}`);
console.log(`WASM rebuild evidence: ${wasmEvidence.wasmRebuilt ? 'present' : 'missing'}`);
console.log(`WASM bundles: ${wasmEvidence.bundles.map((item) => `${item.bundle}:${item.ok ? 'ok' : 'stale'}`).join(', ')}`);
console.log(`Swap semantics cases: ${report.swapSemanticsCases.length}`);
console.log(`Swap smoke cases: ${swapSmoke.cases.length}`);
console.log(`Native check-escape smoke: ${swapSmoke.nativeCheckEscapeSemantics ? 'passed' : 'missing'}`);
console.log(`Native royal-swap smoke: ${swapSmoke.nativeRoyalSwapSemantics ? 'passed' : 'missing'}`);
console.log(`Native one-time flag smoke: ${swapSmoke.nativeOneTimeFlagSemantics ? 'passed' : 'missing'}`);
console.log(`Native apply/revert smoke: ${swapSmoke.nativeApplyRevertParity ? 'passed' : 'missing'}`);
console.log(`Native engine smoke: ${swapSmoke.nativeEngineSmoke ? 'passed' : 'missing'}`);
console.log(`Required evidence: ${report.requiredNativeEvidence.join(', ')}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!sourceEvidence.nativeSourceMarker) {
    console.error(`Missing source markers: ${sourceEvidence.missingMarkers.join(', ')}`);
    process.exit(1);
}

if (!report.blockers.includes('native_check_escape_semantics_missing')) {
    console.log('Native check-escape semantics gate passed.');
}

if (!report.blockers.includes('native_royal_swap_semantics_missing')) {
    console.log('Native royal-swap semantics gate passed.');
}

if (!report.blockers.includes('native_one_time_flag_semantics_missing')) {
    console.log('Native one-time flag semantics gate passed.');
}

if (!report.blockers.includes('native_apply_revert_parity_missing')) {
    console.log('Native apply/revert parity gate passed.');
}

if (!report.blockers.includes('native_engine_smoke_missing')) {
    console.log('Native engine smoke gate passed.');
}

console.log(`Safe state: royal_swap evidence is ${report.ready ? 'complete; ready for controlled promotion' : 'incomplete; remains JS-authoritative'}.`);
