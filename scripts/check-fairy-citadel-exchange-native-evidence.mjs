import { getCitadelExchangeNativeEvidenceReport } from '../src/fairy/FairyCitadelExchangeNativeEvidence.js';
import { runCitadelExchangeNativeSmoke } from './fairy-citadel-exchange-smoke-runner.mjs';
import {
    getCitadelExchangeSourceEvidence,
    getCitadelDrawWasmRebuildEvidence
} from './fairy-native-source-evidence.mjs';

const sourceEvidence = getCitadelExchangeSourceEvidence();
const wasmEvidence = getCitadelDrawWasmRebuildEvidence();
const exchangeSmoke = await runCitadelExchangeNativeSmoke();
const report = getCitadelExchangeNativeEvidenceReport({
    nativeSourceMarker: sourceEvidence.nativeSourceMarker,
    wasmRebuilt: wasmEvidence.wasmRebuilt,
    wasmRebuildEvidence: wasmEvidence,
    exchangeSmoke
});

console.log('Fairy citadel_exchange native evidence report');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence phase: ${report.evidencePhase}`);
console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Native source marker: ${sourceEvidence.nativeSourceMarker ? 'present' : 'missing'}`);
console.log(`Native position skeleton: ${sourceEvidence.nativePositionSkeleton ? 'present' : 'missing'}`);
console.log(`WASM rebuild evidence: ${wasmEvidence.wasmRebuilt ? 'present' : 'missing'}`);
console.log(`WASM bundles: ${wasmEvidence.bundles.map((item) => `${item.bundle}:${item.ok ? 'ok' : 'stale'}`).join(', ')}`);
console.log(`Off-board citadels: ${report.offboardCitadels.map((item) => `${item.fairySquare}@${item.row},${item.col}`).join(', ')}`);
console.log(`Exchange semantics cases: ${report.exchangeSemanticsCases.length}`);
console.log(`Exchange smoke cases: ${exchangeSmoke.cases.length}`);
console.log(`Native off-board bridge smoke: ${exchangeSmoke.nativeOffboardCitadelSemantics ? 'passed' : 'missing'}`);
console.log(`Native dual-relocation smoke: ${exchangeSmoke.nativeDualRelocationSemantics ? 'passed' : 'missing'}`);
console.log(`Native one-time flag smoke: ${exchangeSmoke.nativeOneTimeFlagSemantics ? 'passed' : 'missing'}`);
console.log(`Native apply/revert smoke: ${exchangeSmoke.nativeApplyRevertParity ? 'passed' : 'missing'}`);
console.log(`Native engine smoke: ${exchangeSmoke.nativeEngineSmoke ? 'passed' : 'missing'}`);
console.log(`Required evidence: ${report.requiredNativeEvidence.join(', ')}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!sourceEvidence.nativeSourceMarker) {
    console.error(`Missing source markers: ${sourceEvidence.missingMarkers.join(', ')}`);
    process.exit(1);
}

if (!report.blockers.includes('native_offboard_citadel_semantics_missing')) {
    console.log('Native off-board citadel semantics gate passed.');
}

if (!report.blockers.includes('native_dual_relocation_semantics_missing')) {
    console.log('Native dual-relocation semantics gate passed.');
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

console.log(`Safe state: citadel_exchange evidence is ${report.ready ? 'complete; ready for controlled promotion' : 'incomplete; remains JS-authoritative'}.`);
