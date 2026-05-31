import { getPawnOfPawnsNativeRiskReport } from '../src/fairy/FairyPawnCycleNativeRisk.js';

const report = getPawnOfPawnsNativeRiskReport();

console.log('Fairy pawn-of-pawns native baseline risk report');
console.log(`Rule: ${report.ruleId}`);
console.log(`Severity: ${report.severity}`);
console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
console.log(`Stage flow: ${report.stageFlow.join(' -> ')}`);
console.log(`State effects: ${report.stateEffects.join(', ')}`);
console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

if (report.ready) {
    console.error('Unexpected state: pawn-of-pawns is marked ready without explicit evidence input.');
    process.exit(1);
}

if (!report.blockers.includes('native_stage_encoding_missing')) {
    console.error('Missing safety blocker: native_stage_encoding_missing');
    process.exit(1);
}

if (!report.blockers.includes('native_repatriation_semantics_missing')) {
    console.error('Missing safety blocker: native_repatriation_semantics_missing');
    process.exit(1);
}

console.log('Safe state: without explicit evidence input, pawn-of-pawns stays blocked by design. Use fairy:pawn-cycle:evidence for the current controlled-promotion verdict.');
