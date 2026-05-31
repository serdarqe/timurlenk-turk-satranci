import { runCitadelExchangeNativeSmoke } from './fairy-citadel-exchange-smoke-runner.mjs';

const report = await runCitadelExchangeNativeSmoke();

console.log('Fairy citadel_exchange native smoke');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence: ${report.evidence}`);
console.log(`Native off-board bridge semantics: ${report.nativeOffboardCitadelSemantics ? 'YES' : 'NO'}`);
console.log(`Native dual-relocation semantics: ${report.nativeDualRelocationSemantics ? 'YES' : 'NO'}`);
console.log(`Native one-time flag semantics: ${report.nativeOneTimeFlagSemantics ? 'YES' : 'NO'}`);
console.log(`Native apply/revert parity: ${report.nativeApplyRevertParity ? 'YES' : 'NO'}`);
console.log(`Native engine smoke: ${report.nativeEngineSmoke ? 'YES' : 'NO'}`);
if (report.engineInitError) {
    console.log(`Engine init note: ${report.engineInitError}`);
}
console.log(`Note: ${report.note}`);

for (const smokeCase of report.cases) {
    console.log(`- ${smokeCase.id}`);
    console.log(`  Native citadel-entry token: ${smokeCase.nativeOffboardToken} => ${smokeCase.nativeOffboardMovePresent ? 'present' : 'missing'}`);
    console.log(`  Native exchange token: ${smokeCase.nativeExchangeToken} => ${smokeCase.nativeExchangeMovePresent ? 'present' : 'missing'}`);
    console.log(`  Source/skeleton: ${smokeCase.nativeSourceMarker ? 'source-ok' : 'source-missing'} / ${smokeCase.nativePositionSkeleton ? 'position-ok' : 'position-missing'} / ${smokeCase.nativeApplyRevertSkeleton ? 'apply-revert-ok' : 'apply-revert-missing'}`);
    console.log(`  JS dual relocation: ${smokeCase.jsDualRelocationMatches ? 'match' : 'mismatch'}`);
    console.log(`  JS one-time flag: ${smokeCase.jsOneTimeFlagSemantics ? 'match' : 'mismatch'}`);
    console.log(`  JS apply/revert: ${smokeCase.jsApplyRevertParity ? 'match' : 'mismatch'}`);
    console.log(`  Native root moves: ${smokeCase.nativeRootMoves.join(', ') || 'none'}`);
}

console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!report.nativeOffboardCitadelSemantics
    || !report.nativeDualRelocationSemantics
    || !report.nativeOneTimeFlagSemantics
    || !report.nativeApplyRevertParity) {
    console.error('Citadel exchange JS bridge/native skeleton smoke failed. Keep the rule JS-authoritative.');
    process.exit(1);
}

if (!report.nativeEngineSmoke) {
    console.log('Safe state: native bridge smoke passed, but real engine token is still missing; citadel_exchange remains JS-authoritative.');
} else {
    console.log('All citadel_exchange smoke gates passed. Promotion readiness can now be evaluated.');
}
