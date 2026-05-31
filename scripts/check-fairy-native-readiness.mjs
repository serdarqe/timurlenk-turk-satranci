import { getNativeReadinessReport } from '../src/fairy/FairyNativeReadiness.js';
import {
    getCitadelDrawSourceEvidence,
    getCitadelExchangeSourceEvidence,
    getPawnCycleSourceEvidence,
    getRoyalSwapSourceEvidence,
    getCitadelDrawWasmRebuildEvidence
} from './fairy-native-source-evidence.mjs';
import { runCitadelGameResultNativeSmoke } from './fairy-citadel-game-result-smoke-runner.mjs';
import { runCitadelExchangeNativeSmoke } from './fairy-citadel-exchange-smoke-runner.mjs';
import { runPawnCycleNativeSmoke } from './fairy-pawn-cycle-smoke-runner.mjs';
import { runRoyalSwapNativeSmoke } from './fairy-royal-swap-smoke-runner.mjs';
import {
    createEngine,
    initializeTimurVariant,
    shutdownEngine
} from './fairy-citadel-offboard-smoke-runner.mjs';

const citadelDrawSourceEvidence = getCitadelDrawSourceEvidence();
const citadelExchangeSourceEvidence = getCitadelExchangeSourceEvidence();
const pawnCycleSourceEvidence = getPawnCycleSourceEvidence();
const royalSwapSourceEvidence = getRoyalSwapSourceEvidence();
const citadelDrawWasmEvidence = getCitadelDrawWasmRebuildEvidence();
const sharedEngine = await createEngine();
await initializeTimurVariant(sharedEngine);
const citadelDrawGameResultSmoke = await runCitadelGameResultNativeSmoke({
    engine: sharedEngine,
    initialize: false
});
const citadelExchangeSmoke = await runCitadelExchangeNativeSmoke({
    engine: sharedEngine,
    initialize: false
});
const royalSwapSmoke = await runRoyalSwapNativeSmoke({
    engine: sharedEngine,
    initialize: false
});
const pawnCycleSmoke = await runPawnCycleNativeSmoke({
    engine: sharedEngine,
    initialize: false
});
shutdownEngine(sharedEngine);
const report = getNativeReadinessReport({
    pawn_of_pawns_cycle: {
        nativeSourceMarker: pawnCycleSourceEvidence.nativeSourceMarker,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        nativeStageEncoding: pawnCycleSmoke.nativeStageEncoding,
        nativeRepatriationSemantics: pawnCycleSmoke.nativeRepatriationSemantics,
        nativeApplyRevertParity: pawnCycleSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: pawnCycleSmoke.nativeEngineSmoke
    },
    citadel_draw: {
        nativeSourceMarker: citadelDrawSourceEvidence.nativeSourceMarker,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        nativeOffboardCitadelSemantics: citadelDrawGameResultSmoke.nativeGameResultSemantics,
        nativeGameResultSemantics: citadelDrawGameResultSmoke.nativeGameResultSemantics,
        nativeApplyRevertParity: citadelDrawGameResultSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: citadelDrawGameResultSmoke.nativeEngineSmoke
    },
    citadel_exchange: {
        nativeSourceMarker: citadelExchangeSourceEvidence.nativeSourceMarker,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        nativeOffboardCitadelSemantics: citadelExchangeSmoke.nativeOffboardCitadelSemantics,
        nativeDualRelocationSemantics: citadelExchangeSmoke.nativeDualRelocationSemantics,
        nativeOneTimeFlagSemantics: citadelExchangeSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: citadelExchangeSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: citadelExchangeSmoke.nativeEngineSmoke
    },
    royal_swap: {
        nativeSourceMarker: royalSwapSourceEvidence.nativeSourceMarker,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        nativeCheckEscapeSemantics: royalSwapSmoke.nativeCheckEscapeSemantics,
        nativeRoyalSwapSemantics: royalSwapSmoke.nativeRoyalSwapSemantics,
        nativeOneTimeFlagSemantics: royalSwapSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: royalSwapSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: royalSwapSmoke.nativeEngineSmoke
    }
});
const notAuthoritative = report.nativeAuthoritativeRules.filter((rule) => !rule.ready);
const allowedReadyStateRules = new Set(['pawn_of_pawns_cycle', 'citadel_draw', 'citadel_exchange', 'royal_swap']);
const unexpectedPromotions = report.stateChangingRules.filter((rule) => (
    rule.ready && !allowedReadyStateRules.has(rule.ruleId)
));
const missingParity = report.stateChangingRules.filter((rule) => !rule.parityCovered);

console.log('Fairy native readiness report');
console.log(`Native authoritative: ${report.nativeAuthoritativeRules.map((rule) => rule.ruleId).join(', ')}`);
console.log('State-changing candidates:');

for (const rule of report.stateChangingRules) {
    const status = rule.ready ? 'READY' : 'BLOCKED';
    const mode = rule.controlledPromotion ? ' (controlled)' : '';
    const blockers = rule.blockers.length > 0 ? rule.blockers.join(', ') : 'none';
    console.log(`- ${rule.ruleId}: ${status}${mode}; blockers: ${blockers}`);
}

if (notAuthoritative.length > 0) {
    console.error('Expected native-authoritative rules are not ready:');
    for (const rule of notAuthoritative) {
        console.error(`- ${rule.ruleId}`);
    }
    process.exit(1);
}

if (missingParity.length > 0) {
    console.error('State-changing rules missing parity coverage:');
    for (const rule of missingParity) {
        console.error(`- ${rule.ruleId}`);
    }
    process.exit(1);
}

if (unexpectedPromotions.length > 0) {
    console.error('Unexpected state-changing rules were promoted before source/WASM evidence was recorded:');
    for (const rule of unexpectedPromotions) {
        console.error(`- ${rule.ruleId}`);
    }
    process.exit(1);
}

console.log('Safe state: pure rules are native-authoritative; ready state-changing rules keep JS wrapper guards; remaining state-changing rules stay JS-authoritative.');
