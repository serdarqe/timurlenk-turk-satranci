import { runRoyalSwapNativeSmoke } from './fairy-royal-swap-smoke-runner.mjs';

const report = await runRoyalSwapNativeSmoke();

console.log('Fairy royal_swap native smoke');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence: ${report.evidence}`);
console.log(`Native check-escape semantics: ${report.nativeCheckEscapeSemantics ? 'YES' : 'NO'}`);
console.log(`Native royal-swap semantics: ${report.nativeRoyalSwapSemantics ? 'YES' : 'NO'}`);
console.log(`Native one-time flag semantics: ${report.nativeOneTimeFlagSemantics ? 'YES' : 'NO'}`);
console.log(`Native apply/revert parity: ${report.nativeApplyRevertParity ? 'YES' : 'NO'}`);
console.log(`Native engine smoke: ${report.nativeEngineSmoke ? 'YES' : 'NO'}`);
if (report.engineInitError) {
    console.log(`Engine init note: ${report.engineInitError}`);
}
console.log(`Note: ${report.note}`);

for (const smokeCase of report.cases) {
    console.log(`- ${smokeCase.id}`);
    console.log(`  Native royal-swap token: ${smokeCase.nativeRoyalSwapToken} => ${smokeCase.nativeRoyalSwapMovePresent ? 'present' : 'missing'}`);
    console.log(`  Source/skeleton: ${smokeCase.nativeSourceMarker ? 'source-ok' : 'source-missing'} / ${smokeCase.nativePositionSkeleton ? 'position-ok' : 'position-missing'} / ${smokeCase.nativeApplyRevertSkeleton ? 'apply-revert-ok' : 'apply-revert-missing'}`);
    console.log(`  JS check escape: ${smokeCase.jsCheckEscapeSemantics ? 'match' : 'mismatch'}`);
    console.log(`  JS swap semantics: ${smokeCase.jsRoyalSwapSemantics ? 'match' : 'mismatch'}`);
    console.log(`  JS one-time flag: ${smokeCase.jsOneTimeFlagSemantics ? 'match' : 'mismatch'}`);
    console.log(`  JS apply/revert: ${smokeCase.jsApplyRevertParity ? 'match' : 'mismatch'}`);
    console.log(`  Native root moves: ${smokeCase.nativeRootMoves.join(', ') || 'none'}`);
}

console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!report.nativeCheckEscapeSemantics
    || !report.nativeRoyalSwapSemantics
    || !report.nativeOneTimeFlagSemantics
    || !report.nativeApplyRevertParity) {
    console.error('Royal swap JS bridge/native skeleton smoke failed. Keep the rule JS-authoritative.');
    process.exit(1);
}

if (!report.nativeEngineSmoke) {
    console.log('Safe state: native bridge smoke passed, but real engine token is still missing; royal_swap remains JS-authoritative.');
} else {
    console.log('All royal_swap smoke gates passed. Promotion readiness can now be evaluated.');
}
