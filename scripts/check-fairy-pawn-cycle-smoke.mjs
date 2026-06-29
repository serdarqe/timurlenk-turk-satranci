import { runPawnCycleNativeSmoke } from './fairy-pawn-cycle-smoke-runner.mjs';

const report = await runPawnCycleNativeSmoke();

console.log('Fairy pawn_of_pawns_cycle native smoke');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence: ${report.evidence}`);
console.log(`Native stage encoding: ${report.nativeStageEncoding ? 'YES' : 'NO'}`);
console.log(`Native repatriation semantics: ${report.nativeRepatriationSemantics ? 'YES' : 'NO'}`);
console.log(`Native apply/revert parity: ${report.nativeApplyRevertParity ? 'YES' : 'NO'}`);
console.log(`Native engine smoke: ${report.nativeEngineSmoke ? 'YES' : 'NO'}`);
if (report.engineInitError) {
    console.log(`Engine init note: ${report.engineInitError}`);
}
console.log(`Note: ${report.note}`);

for (const smokeCase of report.cases) {
    console.log(`- ${smokeCase.id}`);
    console.log(`  Native pawn-cycle token: ${smokeCase.nativePawnCycleToken} => ${smokeCase.nativePawnCycleMovePresent ? 'present' : 'missing'}`);
    console.log(`  Source/skeleton: ${smokeCase.nativeSourceMarker ? 'source-ok' : 'source-missing'} / ${smokeCase.nativePositionSkeleton ? 'position-ok' : 'position-missing'} / ${smokeCase.nativeApplyRevertSkeleton ? 'apply-revert-ok' : 'apply-revert-missing'}`);
    console.log(`  JS stage encoding: ${smokeCase.jsStageEncoding ? 'match' : 'mismatch'}`);
    console.log(`  JS repatriation: ${smokeCase.jsRepatriationSemantics ? 'match' : 'mismatch'}`);
    console.log(`  JS apply/revert: ${smokeCase.jsApplyRevertParity ? 'match' : 'mismatch'}`);
    console.log(`  Native root moves: ${smokeCase.nativeRootMoves.join(', ') || 'none'}`);
}

console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!report.nativeStageEncoding
    || !report.nativeRepatriationSemantics
    || !report.nativeApplyRevertParity) {
    console.error('Pawn-cycle JS bridge/native skeleton smoke failed. Keep the rule JS-authoritative.');
    process.exit(1);
}

if (!report.nativeEngineSmoke) {
    console.log('Safe state: native bridge smoke passed, but real engine token is still missing; pawn_of_pawns_cycle remains JS-authoritative.');
} else {
    console.log('All pawn_of_pawns_cycle smoke gates passed. Promotion readiness can now be evaluated.');
}
