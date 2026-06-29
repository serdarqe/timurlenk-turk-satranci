import { getNativeReadinessReport } from './FairyNativeReadiness.js';
import { getCitadelDrawNativeEvidenceReport } from './FairyCitadelDrawNativeEvidence.js';
import { getCitadelExchangeNativeEvidenceReport } from './FairyCitadelExchangeNativeEvidence.js';
import { getPawnCycleNativeEvidenceReport } from './FairyPawnCycleNativeEvidence.js';
import { getPawnOfPawnsNativeRiskReport } from './FairyPawnCycleNativeRisk.js';
import { getRoyalSwapNativeEvidenceReport } from './FairyRoyalSwapNativeEvidence.js';
import {
    SPECIAL_NATIVE_RISK_RULE_IDS,
    getSpecialRuleNativeRiskReport
} from './FairySpecialRuleNativeRisk.js';

export function buildFairyPhase4Report(evidenceByRule = {}) {
    const readiness = getNativeReadinessReport();
    const citadelDrawRuleEvidence = evidenceByRule.citadel_draw || {};
    const citadelDrawEvidence = getCitadelDrawNativeEvidenceReport(citadelDrawRuleEvidence);
    const highRiskReports = [
        getPawnOfPawnsNativeRiskReport(evidenceByRule.pawn_of_pawns_cycle),
        ...SPECIAL_NATIVE_RISK_RULE_IDS.map((ruleId) => (
            getSpecialRuleNativeRiskReport(ruleId, evidenceByRule[ruleId])
        ))
    ];
    const jsAuthoritativeRules = highRiskReports.filter((entry) => entry.jsAuthoritative);
    const readyStateChangingRules = highRiskReports.filter((entry) => entry.ready);
    const controlledPromotionRules = readyStateChangingRules.filter((entry) => entry.controlledPromotion);
    const nextSafeStep = buildNextSafeStep({
        citadelDrawEvidence,
        citadelDrawRuleEvidence,
        evidenceByRule,
        jsAuthoritativeRules
    });

    return {
        phase: 'phase4_native_transition',
        nativeAuthoritativeRules: readiness.nativeAuthoritativeRules,
        jsAuthoritativeRules,
        readyStateChangingRules,
        controlledPromotionRules,
        summary: {
            nativeAuthoritativeCount: readiness.nativeAuthoritativeRules.length,
            stateChangingCandidateCount: highRiskReports.length,
            highRiskBlockedCount: jsAuthoritativeRules.length,
            readyStateChangingCount: readyStateChangingRules.length,
            controlledPromotionCount: controlledPromotionRules.length
        },
        nextSafeStep
    };
}

export function formatFairyPhase4Report(report = buildFairyPhase4Report()) {
    const lines = [
        'Fairy Phase 4 Native Transition Report',
        '',
        `Native authoritative (${report.summary.nativeAuthoritativeCount})`,
        ...report.nativeAuthoritativeRules.map((entry) => `- ${entry.ruleId}`),
        '',
        `JS authoritative high-risk rules (${report.summary.highRiskBlockedCount})`,
        ...report.jsAuthoritativeRules.map(formatBlockedRule),
        '',
        `Ready state-changing rules: ${report.summary.readyStateChangingCount}`,
        `Controlled promotions: ${formatControlledPromotions(report.controlledPromotionRules)}`,
        `Next safe step: ${report.nextSafeStep.ruleId}`,
        `Evidence phase: ${report.nextSafeStep.evidencePhase}`,
        `Source marker: ${report.nextSafeStep.sourceMarkerPresent ? 'present' : 'missing'}`,
        `Native model contract: ${report.nextSafeStep.nativeModelContractPresent ? 'present' : 'missing'}`,
        `WASM rebuilt: ${report.nextSafeStep.wasmRebuilt ? 'yes' : 'no'}`,
        `Required evidence: ${report.nextSafeStep.requiredNativeEvidence.join(', ')}`,
        `Result semantics cases: ${report.nextSafeStep.resultSemanticsCaseCount}`,
        `Reason: ${report.nextSafeStep.reason}`
    ];

    return lines.join('\n');
}

function formatControlledPromotions(entries = []) {
    if (entries.length === 0) return 'none';
    return entries.map((entry) => entry.ruleId).join(', ');
}

function buildNextSafeStep({ citadelDrawEvidence, citadelDrawRuleEvidence, evidenceByRule, jsAuthoritativeRules }) {
    if (!citadelDrawEvidence.ready) {
        return {
            ruleId: 'citadel_draw',
            evidencePhase: citadelDrawEvidence.evidencePhase,
            requiredNativeEvidence: citadelDrawEvidence.requiredNativeEvidence,
            resultSemanticsCaseCount: citadelDrawEvidence.resultSemanticsCases.length,
            offboardCitadels: citadelDrawEvidence.offboardCitadels,
            blockers: citadelDrawEvidence.blockers,
            sourceMarkerPresent: Boolean(citadelDrawRuleEvidence.nativeSourceMarker),
            nativeModelContractPresent: Boolean(citadelDrawRuleEvidence.nativeModelContract),
            wasmRebuilt: Boolean(citadelDrawRuleEvidence.wasmRebuilt),
            wasmRebuildBundles: (citadelDrawRuleEvidence.wasmRebuildEvidence?.bundles || [])
                .filter((bundle) => bundle.ok)
                .map((bundle) => bundle.bundle),
            reason: 'smallest state-changing rule to prove next: off-board citadel entry plus game-result semantics.'
        };
    }

    const priority = ['citadel_exchange', 'royal_swap', 'pawn_of_pawns_cycle'];
    const nextRule = priority
        .map((ruleId) => jsAuthoritativeRules.find((entry) => entry.ruleId === ruleId))
        .find(Boolean);

    if (nextRule?.ruleId === 'citadel_exchange') {
        const exchangeEvidence = getCitadelExchangeNativeEvidenceReport(evidenceByRule.citadel_exchange || {});
        const onlyEngineSmokeMissing = exchangeEvidence.blockers.length === 1
            && exchangeEvidence.blockers[0] === 'native_engine_smoke_missing';
        return {
            ruleId: 'citadel_exchange',
            evidencePhase: exchangeEvidence.evidencePhase,
            requiredNativeEvidence: exchangeEvidence.requiredNativeEvidence,
            resultSemanticsCaseCount: exchangeEvidence.exchangeSemanticsCases.length,
            offboardCitadels: exchangeEvidence.offboardCitadels,
            blockers: exchangeEvidence.blockers,
            sourceMarkerPresent: Boolean(evidenceByRule.citadel_exchange?.nativeSourceMarker),
            nativeModelContractPresent: Boolean(evidenceByRule.citadel_exchange?.nativeModelContract),
            wasmRebuilt: Boolean(evidenceByRule.citadel_exchange?.wasmRebuilt),
            wasmRebuildBundles: (evidenceByRule.citadel_exchange?.wasmRebuildEvidence?.bundles || [])
                .filter((bundle) => bundle.ok)
                .map((bundle) => bundle.bundle),
            reason: onlyEngineSmokeMissing
                ? 'citadel_exchange bridge semantics are proven; next safe step is real native movegen/engine smoke for the exchange token.'
                : 'citadel_draw is controlled-promotion ready; prove citadel_exchange dual relocation and one-time state next.'
        };
    }

    if (nextRule?.ruleId === 'royal_swap') {
        const swapEvidence = getRoyalSwapNativeEvidenceReport(evidenceByRule.royal_swap || {});
        return {
            ruleId: 'royal_swap',
            evidencePhase: swapEvidence.evidencePhase,
            requiredNativeEvidence: swapEvidence.requiredNativeEvidence,
            resultSemanticsCaseCount: swapEvidence.swapSemanticsCases.length,
            offboardCitadels: [],
            blockers: swapEvidence.blockers,
            sourceMarkerPresent: Boolean(evidenceByRule.royal_swap?.nativeSourceMarker),
            nativeModelContractPresent: Boolean(evidenceByRule.royal_swap?.nativeModelContract),
            wasmRebuilt: Boolean(evidenceByRule.royal_swap?.wasmRebuilt),
            wasmRebuildBundles: (evidenceByRule.royal_swap?.wasmRebuildEvidence?.bundles || [])
                .filter((bundle) => bundle.ok)
                .map((bundle) => bundle.bundle),
            reason: 'citadel rules are controlled-promotion ready; prove royal_swap check escape, swap state and one-time flag next.'
        };
    }

    if (nextRule?.ruleId === 'pawn_of_pawns_cycle') {
        const pawnCycleEvidence = getPawnCycleNativeEvidenceReport(evidenceByRule.pawn_of_pawns_cycle || {});
        return {
            ruleId: 'pawn_of_pawns_cycle',
            evidencePhase: pawnCycleEvidence.evidencePhase,
            requiredNativeEvidence: pawnCycleEvidence.requiredNativeEvidence,
            resultSemanticsCaseCount: pawnCycleEvidence.cycleSemanticsCases.length,
            offboardCitadels: [],
            blockers: pawnCycleEvidence.blockers,
            sourceMarkerPresent: Boolean(evidenceByRule.pawn_of_pawns_cycle?.nativeSourceMarker),
            nativeModelContractPresent: Boolean(evidenceByRule.pawn_of_pawns_cycle?.nativeModelContract),
            wasmRebuilt: Boolean(evidenceByRule.pawn_of_pawns_cycle?.wasmRebuilt),
            wasmRebuildBundles: (evidenceByRule.pawn_of_pawns_cycle?.wasmRebuildEvidence?.bundles || [])
                .filter((bundle) => bundle.ok)
                .map((bundle) => bundle.bundle),
            reason: 'citadel and royal_swap rules are controlled-promotion ready; prove pawn-of-pawns stage/repatriation/apply-revert semantics next.'
        };
    }

    return {
        ruleId: nextRule?.ruleId || 'none',
        evidencePhase: 'native_preparation',
        requiredNativeEvidence: [],
        resultSemanticsCaseCount: 0,
        offboardCitadels: [],
        blockers: nextRule?.blockers || [],
        sourceMarkerPresent: !nextRule,
        nativeModelContractPresent: !nextRule,
        wasmRebuilt: !nextRule,
        wasmRebuildBundles: [],
        reason: nextRule
            ? 'citadel and royal_swap rules are controlled-promotion ready; continue with the next state-changing special rule.'
            : 'all tracked state-changing special rules are ready.'
    };
}

function formatBlockedRule(entry) {
    return [
        `- ${entry.ruleId}: BLOCKED`,
        `  State effects: ${entry.stateEffects.join(', ')}`,
        `  Blockers: ${entry.blockers.join(', ')}`
    ].join('\n');
}
