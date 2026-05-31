import { runCitadelOffboardNativeSmoke } from './fairy-citadel-offboard-smoke-runner.mjs';

const report = await runCitadelOffboardNativeSmoke();

console.log('Fairy citadel_draw off-board native smoke');
console.log(`Rule: ${report.ruleId}`);
console.log(`Evidence: ${report.evidence}`);
console.log(`Native off-board semantics: ${report.nativeOffboardCitadelSemantics ? 'YES' : 'NO'}`);

for (const smokeCase of report.cases) {
    console.log(`- ${smokeCase.id}`);
    console.log(`  JS move: ${smokeCase.jsMoveId} => ${smokeCase.jsMovePresent ? 'present' : 'missing'}`);
    console.log(`  Native token: ${smokeCase.nativeOffboardToken} => ${smokeCase.nativeOffboardMovePresent ? 'present' : 'missing'}`);
    console.log(`  Native root moves: ${smokeCase.nativeRootMoves.join(', ') || 'none'}`);
}

console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

const jsMissing = report.cases.filter((smokeCase) => !smokeCase.jsMovePresent);
if (jsMissing.length > 0) {
    console.error('JS wrapper no longer exposes required citadel moves:');
    for (const smokeCase of jsMissing) {
        console.error(`- ${smokeCase.id}`);
    }
    process.exit(1);
}

if (!report.nativeOffboardCitadelSemantics) {
    console.error('Native off-board citadel semantics are required at this phase.');
    process.exit(1);
} else {
    console.log('Native off-board citadel semantics detected. Next gate: game-result semantics smoke.');
}
