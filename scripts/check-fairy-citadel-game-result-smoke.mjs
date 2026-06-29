import { runCitadelGameResultNativeSmoke } from './fairy-citadel-game-result-smoke-runner.mjs';

const report = await runCitadelGameResultNativeSmoke();

console.log('Fairy citadel_draw game-result native smoke');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence: ${report.evidence}`);
console.log(`Native game-result bridge semantics: ${report.nativeGameResultSemantics ? 'YES' : 'NO'}`);
console.log(`Native apply/revert parity: ${report.nativeApplyRevertParity ? 'YES' : 'NO'}`);
console.log(`Native engine smoke: ${report.nativeEngineSmoke ? 'YES' : 'NO'}`);
console.log(`Note: ${report.note}`);

for (const smokeCase of report.cases) {
    console.log(`- ${smokeCase.id}`);
    console.log(`  Native token: ${smokeCase.nativeOffboardToken} => ${smokeCase.nativeOffboardMovePresent ? 'present' : 'missing'}`);
    console.log(`  JS result: ${smokeCase.jsStatus || 'none'} / ${smokeCase.jsWinner || 'none'} => ${smokeCase.jsResultMatches ? 'match' : 'mismatch'}`);
    console.log(`  Apply/revert: ${smokeCase.applyRevertParity ? 'match' : 'mismatch'}`);
    console.log(`  Native root moves: ${smokeCase.nativeRootMoves.join(', ') || 'none'}`);
}

console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (!report.nativeGameResultSemantics || !report.nativeApplyRevertParity || !report.nativeEngineSmoke) {
    console.error('All citadel_draw native bridge gates are required before promotion readiness.');
    process.exit(1);
}

console.log('All citadel_draw native bridge gates passed. Promotion readiness can now be evaluated.');
