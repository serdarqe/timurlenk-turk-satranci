import { getCitadelDrawNativeEvidenceReport } from '../src/fairy/FairyCitadelDrawNativeEvidence.js';
import {
    getCitadelDrawSourceEvidence,
    getCitadelDrawWasmRebuildEvidence
} from './fairy-native-source-evidence.mjs';
import { runCitadelGameResultNativeSmoke } from './fairy-citadel-game-result-smoke-runner.mjs';

const sourceEvidence = getCitadelDrawSourceEvidence();
const wasmEvidence = getCitadelDrawWasmRebuildEvidence();
const gameResultSmoke = await runCitadelGameResultNativeSmoke();
const report = getCitadelDrawNativeEvidenceReport({
    nativeSourceMarker: sourceEvidence.nativeSourceMarker,
    wasmRebuilt: wasmEvidence.wasmRebuilt,
    wasmRebuildEvidence: wasmEvidence,
    nativeOffboardCitadelSemantics: gameResultSmoke.nativeGameResultSemantics,
    nativeGameResultSemantics: gameResultSmoke.nativeGameResultSemantics,
    nativeApplyRevertParity: gameResultSmoke.nativeApplyRevertParity,
    nativeEngineSmoke: gameResultSmoke.nativeEngineSmoke,
    gameResultSmoke
});

console.log('Fairy citadel_draw native evidence report');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence phase: ${report.evidencePhase}`);
console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Native source marker: ${sourceEvidence.nativeSourceMarker ? 'present' : 'missing'}`);
console.log(`Native model contract: ${sourceEvidence.nativeModelContract ? 'present' : 'missing'}`);
console.log(`WASM rebuild evidence: ${wasmEvidence.wasmRebuilt ? 'present' : 'missing'}`);
console.log(`WASM bundles: ${wasmEvidence.bundles.map((item) => `${item.bundle}:${item.ok ? 'ok' : 'stale'}`).join(', ')}`);
console.log(`Native off-board smoke: ${gameResultSmoke.nativeGameResultSemantics ? 'present' : 'missing'}`);
console.log(`Native game-result bridge smoke: ${gameResultSmoke.nativeGameResultSemantics ? 'present' : 'missing'}`);
console.log(`Native apply/revert parity: ${gameResultSmoke.nativeApplyRevertParity ? 'present' : 'missing'}`);
console.log(`Native engine smoke: ${gameResultSmoke.nativeEngineSmoke ? 'present' : 'missing'}`);
console.log(`Off-board citadels: ${report.offboardCitadels.map((item) => `${item.fairySquare}@${item.row},${item.col}`).join(', ')}`);
console.log(`Result semantics cases: ${report.resultSemanticsCases.length}`);
console.log(`Game-result smoke cases: ${report.gameResultSmoke?.cases?.length || 0}`);
console.log(`Own citadel no-draw cases: ${report.ownCitadelNoDrawCases.length}`);
console.log(`Required evidence: ${report.requiredNativeEvidence.join(', ')}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!sourceEvidence.nativeSourceMarker) {
    console.error(`Missing source markers: ${sourceEvidence.missingMarkers.join(', ')}`);
    process.exit(1);
}

if (!wasmEvidence.wasmRebuilt) {
    console.error(`Missing WASM rebuild evidence: ${wasmEvidence.blockers.join(', ')}`);
    process.exit(1);
}

if (!report.blockers.includes('native_offboard_citadel_semantics_missing')) {
    console.log('Native off-board citadel semantics gate passed.');
}

if (report.resultSemanticsCases.length !== 6) {
    console.error('Missing citadel_draw result semantics coverage.');
    process.exit(1);
}

if (!report.blockers.includes('native_game_result_semantics_missing')) {
    console.log('Native game-result bridge semantics gate passed.');
}

if (!report.blockers.includes('native_apply_revert_parity_missing')) {
    console.log('Native apply/revert parity gate passed.');
}

if (!report.blockers.includes('native_engine_smoke_missing')) {
    console.log('Native engine smoke gate passed.');
}

console.log(`Safe state: citadel_draw evidence is ${report.ready ? 'complete; ready for controlled promotion' : 'incomplete; remains JS-authoritative'}.`);
