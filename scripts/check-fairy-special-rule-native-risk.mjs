import {
    SPECIAL_NATIVE_RISK_RULE_IDS,
    getSpecialRuleNativeRiskReport
} from '../src/fairy/FairySpecialRuleNativeRisk.js';

console.log('Fairy special-rule native baseline risk report');

let hasUnexpectedReadyRule = false;

for (const ruleId of SPECIAL_NATIVE_RISK_RULE_IDS) {
    const report = getSpecialRuleNativeRiskReport(ruleId);

    console.log('');
    console.log(`Rule: ${report.ruleId}`);
    console.log(`Severity: ${report.severity}`);
    console.log(`Ready: ${report.ready ? 'YES' : 'NO'}`);
    console.log(`Coverage cases: ${report.coverageCases.join(', ')}`);
    console.log(`State effects: ${report.stateEffects.join(', ')}`);
    console.log(`Blockers: ${report.blockers.join(', ') || 'none'}`);

    if (report.ready) {
        hasUnexpectedReadyRule = true;
    }

    if (!report.blockers.includes('native_apply_revert_parity_missing')) {
        console.error(`Missing safety blocker for ${report.ruleId}: native_apply_revert_parity_missing`);
        process.exit(1);
    }
}

if (hasUnexpectedReadyRule) {
    console.error('Unexpected state: at least one state-changing special rule is marked ready without explicit evidence input.');
    process.exit(1);
}

console.log('');
console.log('Safe state: without explicit evidence input, special rules stay blocked by design. Evidence commands show current controlled-promotion readiness.');
