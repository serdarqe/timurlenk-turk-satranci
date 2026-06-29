import {
    buildFairyPhase4Report,
    formatFairyPhase4Report
} from '../src/fairy/FairyPhase4Report.js';
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
const report = buildFairyPhase4Report({
    pawn_of_pawns_cycle: {
        nativeSourceMarker: pawnCycleSourceEvidence.nativeSourceMarker,
        nativeModelContract: pawnCycleSourceEvidence.nativePositionSkeleton,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        wasmRebuildEvidence: citadelDrawWasmEvidence,
        pawnCycleSmoke,
        nativeStageEncoding: pawnCycleSmoke.nativeStageEncoding,
        nativeRepatriationSemantics: pawnCycleSmoke.nativeRepatriationSemantics,
        nativeApplyRevertParity: pawnCycleSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: pawnCycleSmoke.nativeEngineSmoke
    },
    citadel_draw: {
        nativeSourceMarker: citadelDrawSourceEvidence.nativeSourceMarker,
        nativeModelContract: citadelDrawSourceEvidence.nativeModelContract,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        wasmRebuildEvidence: citadelDrawWasmEvidence,
        nativeOffboardCitadelSemantics: citadelDrawGameResultSmoke.nativeGameResultSemantics,
        nativeGameResultSemantics: citadelDrawGameResultSmoke.nativeGameResultSemantics,
        nativeApplyRevertParity: citadelDrawGameResultSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: citadelDrawGameResultSmoke.nativeEngineSmoke,
        gameResultSmoke: citadelDrawGameResultSmoke
    },
    citadel_exchange: {
        nativeSourceMarker: citadelExchangeSourceEvidence.nativeSourceMarker,
        nativeModelContract: citadelExchangeSourceEvidence.nativePositionSkeleton,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        wasmRebuildEvidence: citadelDrawWasmEvidence,
        exchangeSmoke: citadelExchangeSmoke,
        nativeOffboardCitadelSemantics: citadelExchangeSmoke.nativeOffboardCitadelSemantics,
        nativeDualRelocationSemantics: citadelExchangeSmoke.nativeDualRelocationSemantics,
        nativeOneTimeFlagSemantics: citadelExchangeSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: citadelExchangeSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: citadelExchangeSmoke.nativeEngineSmoke
    },
    royal_swap: {
        nativeSourceMarker: royalSwapSourceEvidence.nativeSourceMarker,
        nativeModelContract: royalSwapSourceEvidence.nativePositionSkeleton,
        wasmRebuilt: citadelDrawWasmEvidence.wasmRebuilt,
        wasmRebuildEvidence: citadelDrawWasmEvidence,
        swapSmoke: royalSwapSmoke,
        nativeCheckEscapeSemantics: royalSwapSmoke.nativeCheckEscapeSemantics,
        nativeRoyalSwapSemantics: royalSwapSmoke.nativeRoyalSwapSemantics,
        nativeOneTimeFlagSemantics: royalSwapSmoke.nativeOneTimeFlagSemantics,
        nativeApplyRevertParity: royalSwapSmoke.nativeApplyRevertParity,
        nativeEngineSmoke: royalSwapSmoke.nativeEngineSmoke
    }
});

console.log(formatFairyPhase4Report(report));

const allowedReadyRules = new Set(['pawn_of_pawns_cycle', 'citadel_draw', 'citadel_exchange', 'royal_swap']);
const unexpectedReady = report.readyStateChangingRules.filter((entry) => !allowedReadyRules.has(entry.ruleId));
if (unexpectedReady.length > 0) {
    console.error('Unexpected state: an unapproved high-risk state-changing rule is marked native-ready.');
    process.exit(1);
}

if (!report.readyStateChangingRules.some((entry) => entry.ruleId === 'pawn_of_pawns_cycle')) {
    console.error('Unexpected state: pawn_of_pawns_cycle should be ready after all evidence gates pass.');
    process.exit(1);
}

console.log('');
console.log('Safe state: Phase 4 native transition boundaries are explicit; ready state-changing rules keep wrapper guards.');
